import { ethers } from "ethers";
import { config } from "../config.js";

const CITYPULSE_ABI = [
  "event QueryPaid(address indexed driver, uint256 amount, uint256 timestamp, string fromZone, string toZone, uint256 vehiclesQueried)",
  "event ParkingQueryPaid(address indexed driver, uint256 amount, uint256 timestamp, string zone)",
];

export interface ContractPayment {
  driver: string;
  amount: string;
  timestamp: number;
  fromZone: string;
  toZone: string;
  vehiclesQueried: number;
  txHash: string;
  blockNumber: number;
  isReal: true;
  type?: "route" | "parking";
}

class ContractEventStream {
  private contract: ethers.Contract;
  private provider: ethers.JsonRpcProvider;
  private historicalPayments: ContractPayment[] = [];
  private listeners: Array<(payment: ContractPayment) => void> = [];
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private lastProcessedBlock = 0;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.arcTestnetRpcUrl);
    this.contract = new ethers.Contract(config.contractAddress, CITYPULSE_ABI, this.provider);
  }

  /**
   * Load historical payments from the last N blocks.
   */
  async loadHistory(blocksBack: number = 50000): Promise<ContractPayment[]> {
    try {
      const currentBlock = await this.provider.getBlockNumber();
      if (!currentBlock) return [];
      const fromBlock = Math.max(0, currentBlock - blocksBack);

      console.log(`[EventStream] Loading history from block ${fromBlock} to ${currentBlock}...`);

      // Arc testnet limits eth_getLogs to 10,000 block range — chunk requests
      const CHUNK_SIZE = 9999;
      const routeFilter = this.contract.filters.QueryPaid();
      const parkingFilter = this.contract.filters.ParkingQueryPaid();
      const routeEvents: ethers.EventLog[] = [];
      const parkingEvents: ethers.EventLog[] = [];
      for (let start = fromBlock; start <= currentBlock; start += CHUNK_SIZE + 1) {
        const end = Math.min(start + CHUNK_SIZE, currentBlock);
        try {
          const chunk = await this.contract.queryFilter(routeFilter, start, end);
          routeEvents.push(...(chunk as ethers.EventLog[]));
        } catch {
          // Skip failed chunks
        }
        try {
          const chunk = await this.contract.queryFilter(parkingFilter, start, end);
          parkingEvents.push(...(chunk as ethers.EventLog[]));
        } catch {
          // Skip failed chunks
        }
      }

      const routePayments: ContractPayment[] = routeEvents.map((event) => {
        const parsed = event as ethers.EventLog;
        return {
          driver: parsed.args[0] as string,
          amount: ethers.formatEther(parsed.args[1]),
          timestamp: Number(parsed.args[2]),
          fromZone: parsed.args[3] as string,
          toZone: parsed.args[4] as string,
          vehiclesQueried: Number(parsed.args[5]),
          txHash: parsed.transactionHash,
          blockNumber: parsed.blockNumber,
          isReal: true as const,
          type: "route" as const,
        };
      });

      const parkPayments: ContractPayment[] = parkingEvents.map((event) => {
        const parsed = event as ethers.EventLog;
        return {
          driver: parsed.args[0] as string,
          amount: ethers.formatEther(parsed.args[1]),
          timestamp: Number(parsed.args[2]),
          fromZone: parsed.args[3] as string,
          toZone: "", // parking has no destination zone
          vehiclesQueried: 0,
          txHash: parsed.transactionHash,
          blockNumber: parsed.blockNumber,
          isReal: true as const,
          type: "parking" as const,
        };
      });

      this.historicalPayments = [...routePayments, ...parkPayments].sort(
        (a, b) => a.blockNumber - b.blockNumber,
      );

      this.lastProcessedBlock = currentBlock;

      console.log(`[EventStream] Loaded ${this.historicalPayments.length} historical payments`);
      return this.historicalPayments;
    } catch (err) {
      console.error("[EventStream] Failed to load history:", err instanceof Error ? err.message : err);
      return [];
    }
  }

  /**
   * Register a callback for new payment events.
   */
  onNewPayment(callback: (payment: ContractPayment) => void): void {
    this.listeners.push(callback);
  }

  /**
   * Start polling for new events (more reliable than WebSocket subscriptions
   * on many RPC providers).
   */
  startPolling(intervalMs: number = 10000): void {
    if (this.pollingInterval) return;

    console.log(`[EventStream] Starting event polling every ${intervalMs / 1000}s...`);

    this.pollingInterval = setInterval(async () => {
      try {
        const currentBlock = await this.provider.getBlockNumber();
        if (currentBlock <= this.lastProcessedBlock) return;

        const fromBlock = this.lastProcessedBlock + 1;

        // Route events
        const routeFilter = this.contract.filters.QueryPaid();
        const routeEvents = await this.contract.queryFilter(routeFilter, fromBlock, currentBlock);

        for (const event of routeEvents) {
          const parsed = event as ethers.EventLog;
          const payment: ContractPayment = {
            driver: parsed.args[0] as string,
            amount: ethers.formatEther(parsed.args[1]),
            timestamp: Number(parsed.args[2]),
            fromZone: parsed.args[3] as string,
            toZone: parsed.args[4] as string,
            vehiclesQueried: Number(parsed.args[5]),
            txHash: parsed.transactionHash,
            blockNumber: parsed.blockNumber,
            isReal: true,
            type: "route",
          };

          this.historicalPayments.push(payment);
          for (const listener of this.listeners) {
            try { listener(payment); } catch (err) {
              console.error("[EventStream] Listener error:", err instanceof Error ? err.message : err);
            }
          }
        }

        // Parking events
        try {
          const parkingFilter = this.contract.filters.ParkingQueryPaid();
          const parkingEvents = await this.contract.queryFilter(parkingFilter, fromBlock, currentBlock);

          for (const event of parkingEvents) {
            const parsed = event as ethers.EventLog;
            const payment: ContractPayment = {
              driver: parsed.args[0] as string,
              amount: ethers.formatEther(parsed.args[1]),
              timestamp: Number(parsed.args[2]),
              fromZone: parsed.args[3] as string,
              toZone: "",
              vehiclesQueried: 0,
              txHash: parsed.transactionHash,
              blockNumber: parsed.blockNumber,
              isReal: true,
              type: "parking",
            };

            this.historicalPayments.push(payment);
            for (const listener of this.listeners) {
              try { listener(payment); } catch (err) {
                console.error("[EventStream] Listener error:", err instanceof Error ? err.message : err);
              }
            }
          }

          const totalNew = routeEvents.length + parkingEvents.length;
          if (totalNew > 0) {
            console.log(`[EventStream] Found ${totalNew} new payment(s) in blocks ${fromBlock}-${currentBlock}`);
          }
        } catch {
          // Parking filter may not exist on older contract
          if (routeEvents.length > 0) {
            console.log(`[EventStream] Found ${routeEvents.length} new route payment(s) in blocks ${fromBlock}-${currentBlock}`);
          }
        }

        this.lastProcessedBlock = currentBlock;
      } catch (err) {
        console.error("[EventStream] Polling error:", err instanceof Error ? err.message : err);
      }
    }, intervalMs);
  }

  /**
   * Stop polling.
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log("[EventStream] Polling stopped");
    }
  }

  /**
   * Get all historical payments (most recent first).
   */
  getHistorical(): ContractPayment[] {
    return [...this.historicalPayments].reverse();
  }

  /**
   * Get count of historical payments.
   */
  getCount(): number {
    return this.historicalPayments.length;
  }
}

export const eventStream = new ContractEventStream();
