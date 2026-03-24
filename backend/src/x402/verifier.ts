import { ethers } from "ethers";
import { config } from "../config.js";

const CITYPULSE_ABI = [
  "event QueryPaid(address indexed driver, uint256 amount, uint256 timestamp, string fromZone, string toZone, uint256 vehiclesQueried)",
  "function queryPrice() view returns (uint256)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)",
];

export interface VerificationResult {
  valid: boolean;
  error?: string;
  payment?: {
    driver: string;
    amount: string;
    fromZone: string;
    toZone: string;
    vehiclesQueried: number;
    txHash: string;
    blockNumber: number;
    timestamp: number;
  };
}

export interface ContractStats {
  totalQueries: number;
  totalRevenue: string;
  queryPrice: string;
  contractBalance: string;
}

class X402Verifier {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private usedTxHashes: Set<string> = new Set();

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.arcTestnetRpcUrl);
    this.contract = new ethers.Contract(config.contractAddress, CITYPULSE_ABI, this.provider);
  }

  async verifyPayment(txHash: string): Promise<VerificationResult> {
    // 1. Check replay protection
    if (this.usedTxHashes.has(txHash.toLowerCase())) {
      return { valid: false, error: "Transaction already used" };
    }

    try {
      // 2. Get transaction receipt (with 3s retry if not yet mined)
      let receipt = await this.provider.getTransactionReceipt(txHash);
      if (!receipt) {
        await new Promise((r) => setTimeout(r, 3000));
        receipt = await this.provider.getTransactionReceipt(txHash);
        if (!receipt) {
          return { valid: false, error: "Transaction not found or not yet confirmed" };
        }
      }

      // 3. Check tx was successful
      if (receipt.status !== 1) {
        return { valid: false, error: "Transaction failed on-chain" };
      }

      // 4. Check tx was to our contract
      if (receipt.to?.toLowerCase() !== config.contractAddress.toLowerCase()) {
        return { valid: false, error: "Transaction not sent to CityPulse contract" };
      }

      // 5. Parse QueryPaid event from logs
      const iface = new ethers.Interface(CITYPULSE_ABI);
      let queryPaidEvent = null;
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
          if (parsed?.name === "QueryPaid") {
            queryPaidEvent = parsed;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!queryPaidEvent) {
        return { valid: false, error: "No QueryPaid event found" };
      }

      // 6. Extract payment details
      const payment = {
        driver: queryPaidEvent.args[0] as string,
        amount: ethers.formatEther(queryPaidEvent.args[1]),
        timestamp: Number(queryPaidEvent.args[2]),
        fromZone: queryPaidEvent.args[3] as string,
        toZone: queryPaidEvent.args[4] as string,
        vehiclesQueried: Number(queryPaidEvent.args[5]),
        txHash,
        blockNumber: receipt.blockNumber,
      };

      // 7. Verify payment amount meets minimum
      const queryPrice = await this.contract.queryPrice();
      const requiredAmount = (queryPrice as bigint) * BigInt(payment.vehiclesQueried);
      if ((queryPaidEvent.args[1] as bigint) < requiredAmount) {
        return {
          valid: false,
          error: `Insufficient payment: paid ${payment.amount}, required ${ethers.formatEther(requiredAmount)}`,
        };
      }

      // 8. Mark tx as used (replay protection, cap at 10000)
      this.usedTxHashes.add(txHash.toLowerCase());
      if (this.usedTxHashes.size > 10000) {
        const entries = [...this.usedTxHashes];
        this.usedTxHashes = new Set(entries.slice(entries.length - 5000));
      }

      return { valid: true, payment };
    } catch (err) {
      return {
        valid: false,
        error: `Verification error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /**
   * Read contract stats for dashboard.
   */
  async getContractStats(): Promise<ContractStats> {
    try {
      const [totalQueries, totalRevenue, queryPrice, balance] = await this.contract.getStats();
      return {
        totalQueries: Number(totalQueries),
        totalRevenue: ethers.formatEther(totalRevenue),
        queryPrice: ethers.formatEther(queryPrice),
        contractBalance: ethers.formatEther(balance),
      };
    } catch (err) {
      console.error("[X402Verifier] Failed to get contract stats:", err instanceof Error ? err.message : err);
      return {
        totalQueries: 0,
        totalRevenue: "0",
        queryPrice: "0",
        contractBalance: "0",
      };
    }
  }

  getContract(): ethers.Contract {
    return this.contract;
  }

  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }
}

export const x402Verifier = new X402Verifier();
