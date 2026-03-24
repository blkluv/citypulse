import { ethers } from "ethers";
import { config } from "../config.js";

const CITYPULSE_ABI = [
  "function payForRoute(string fromZone, string toZone, uint256 vehiclesQueried) payable",
  "function queryPrice() view returns (uint256)",
];

const ZONES = [
  "Eminonu",
  "Taksim",
  "Kadikoy",
  "Levent",
  "Bakirkoy",
  "Besiktas",
  "Fatih",
  "Sisli",
  "Beyoglu",
  "Uskudar",
];

export interface DemoPaymentInfo {
  txHash: string;
  fromZone: string;
  toZone: string;
  vehicleCount: number;
}

class DemoSimulator {
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;
  private running = false;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private paymentCount = 0;
  private listeners: Array<(info: DemoPaymentInfo) => void> = [];

  constructor() {
    const provider = new ethers.JsonRpcProvider(config.arcTestnetRpcUrl);
    this.wallet = new ethers.Wallet(config.privateKey, provider);
    this.contract = new ethers.Contract(config.contractAddress, CITYPULSE_ABI, this.wallet);
  }

  /**
   * Register a callback for when a demo payment is made.
   */
  onPayment(callback: (info: DemoPaymentInfo) => void): void {
    this.listeners.push(callback);
  }

  /**
   * Start the demo simulator. Makes real on-chain payments every 10-15 seconds.
   */
  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    console.log(`[DemoSimulator] Starting with wallet ${this.wallet.address}`);

    const makePayment = async (): Promise<void> => {
      if (!this.running) return;

      try {
        const fromZone = ZONES[Math.floor(Math.random() * ZONES.length)];
        let toZone = fromZone;
        while (toZone === fromZone) {
          toZone = ZONES[Math.floor(Math.random() * ZONES.length)];
        }
        const vehicleCount = Math.floor(Math.random() * 5) + 1;

        const queryPrice = (await this.contract.queryPrice()) as bigint;
        const cost = queryPrice * BigInt(vehicleCount);

        const tx = await this.contract.payForRoute(fromZone, toZone, vehicleCount, {
          value: cost,
        });
        await tx.wait();
        this.paymentCount++;

        const info: DemoPaymentInfo = {
          txHash: tx.hash,
          fromZone,
          toZone,
          vehicleCount,
        };

        console.log(
          `[DemoSimulator] Payment #${this.paymentCount}: ${fromZone} -> ${toZone}, ${vehicleCount} vehicles, tx: ${tx.hash}`,
        );

        // Notify listeners
        for (const listener of this.listeners) {
          try {
            listener(info);
          } catch (err) {
            console.error("[DemoSimulator] Listener error:", err instanceof Error ? err.message : err);
          }
        }
      } catch (err) {
        console.error("[DemoSimulator] Payment failed:", err instanceof Error ? err.message : err);
      }

      if (this.running) {
        const delay = 10000 + Math.random() * 5000; // 10-15s
        this.timeoutId = setTimeout(makePayment, delay);
      }
    };

    makePayment();
  }

  /**
   * Stop the demo simulator.
   */
  stop(): void {
    this.running = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    console.log("[DemoSimulator] Stopped");
  }

  /**
   * Get current status.
   */
  getStatus(): { active: boolean; paymentsMade: number; walletAddress: string } {
    return {
      active: this.running,
      paymentsMade: this.paymentCount,
      walletAddress: this.wallet.address,
    };
  }
}

export const demoSimulator = new DemoSimulator();
