import { ethers } from "ethers";
import { config } from "../config.js";

export interface PaymentVerification {
  valid: boolean;
  amount: bigint;
  from: string;
  error?: string;
}

/**
 * Verify a payment transaction on the Arc testnet.
 * Checks that the tx is confirmed, sent to the correct contract, and value >= minAmount.
 */
export async function verifyPayment(
  txHash: string,
  minAmount: bigint,
): Promise<PaymentVerification> {
  try {
    const provider = new ethers.JsonRpcProvider(config.arcTestnetRpcUrl);

    // Fetch transaction
    const tx = await provider.getTransaction(txHash);
    if (!tx) {
      return { valid: false, amount: 0n, from: "", error: "Transaction not found" };
    }

    // Check recipient matches contract address
    if (tx.to?.toLowerCase() !== config.contractAddress.toLowerCase()) {
      return {
        valid: false,
        amount: tx.value,
        from: tx.from,
        error: `Transaction recipient ${tx.to} does not match contract ${config.contractAddress}`,
      };
    }

    // Check confirmation
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) {
      return {
        valid: false,
        amount: tx.value,
        from: tx.from,
        error: "Transaction not yet confirmed",
      };
    }

    if (receipt.status !== 1) {
      return {
        valid: false,
        amount: tx.value,
        from: tx.from,
        error: "Transaction reverted",
      };
    }

    const currentBlock = await provider.getBlockNumber();
    const confirmations = currentBlock - receipt.blockNumber + 1;
    if (confirmations < 1) {
      return {
        valid: false,
        amount: tx.value,
        from: tx.from,
        error: "Transaction not yet confirmed (0 confirmations)",
      };
    }

    // Check value
    if (tx.value < minAmount) {
      return {
        valid: false,
        amount: tx.value,
        from: tx.from,
        error: `Payment too low: ${ethers.formatUnits(tx.value, 6)} < ${ethers.formatUnits(minAmount, 6)} USDC`,
      };
    }

    return {
      valid: true,
      amount: tx.value,
      from: tx.from,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      valid: false,
      amount: 0n,
      from: "",
      error: `Verification error: ${message}`,
    };
  }
}
