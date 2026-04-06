/**
 * Circle Gateway Service — handles USDC deposit/withdraw/balance for Nanopayments.
 *
 * Uses GatewayClient from @circle-fin/x402-batching/client with the demo private key.
 * Users deposit USDC into Gateway once, then all subsequent API payments are gas-free.
 */

import { GatewayClient } from "@circle-fin/x402-batching/client";
import { config } from "../config.js";

class GatewayService {
  private client: GatewayClient | null = null;
  private initialized = false;

  constructor() {
    if (!config.privateKey) {
      console.log("[Gateway] No private key configured — Gateway disabled");
      return;
    }

    try {
      this.client = new GatewayClient({
        chain: "arcTestnet",
        privateKey: config.privateKey as `0x${string}`,
      });
      this.initialized = true;
      console.log(`[Gateway] Initialized on Arc Testnet — address: ${this.client.address}`);
    } catch (err) {
      console.error("[Gateway] Init failed:", err instanceof Error ? err.message : err);
    }
  }

  isConfigured(): boolean {
    return this.initialized;
  }

  getAddress(): string | null {
    return this.client?.address || null;
  }

  /**
   * Get wallet + gateway balances.
   */
  async getBalances() {
    if (!this.client) return { wallet: "0", gateway: "0" };

    try {
      const balances = await this.client.getBalances();
      return {
        wallet: balances.wallet.formatted,
        gateway: balances.gateway.formattedAvailable,
      };
    } catch (err) {
      console.error("[Gateway] Balance check failed:", err instanceof Error ? err.message : err);
      return { wallet: "0", gateway: "0" };
    }
  }

  /**
   * Deposit USDC into Gateway for gas-free payments.
   */
  async deposit(amount: string) {
    if (!this.client) throw new Error("Gateway not initialized");

    try {
      const result = await this.client.deposit(amount);
      console.log(`[Gateway] Deposited ${result.formattedAmount} USDC — tx: ${result.depositTxHash}`);
      return {
        depositTxHash: result.depositTxHash,
        approvalTxHash: result.approvalTxHash,
        amount: result.formattedAmount,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[Gateway] Deposit failed:", message);
      throw new Error(`Deposit failed: ${message}`);
    }
  }

  /**
   * Withdraw USDC from Gateway back to wallet.
   */
  async withdraw(amount: string) {
    if (!this.client) throw new Error("Gateway not initialized");

    try {
      const result = await this.client.withdraw(amount);
      console.log(`[Gateway] Withdrew ${result.formattedAmount} USDC`);
      return {
        mintTxHash: result.mintTxHash,
        amount: result.formattedAmount,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[Gateway] Withdraw failed:", message);
      throw new Error(`Withdraw failed: ${message}`);
    }
  }

  /**
   * Make a paid request to an x402-protected URL.
   * Signs EIP-3009 authorization (gas-free) and handles 402 flow.
   */
  async pay(url: string) {
    if (!this.client) throw new Error("Gateway not initialized");

    try {
      const result = await this.client.pay(url);
      return {
        status: result.status,
        data: result.data,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[Gateway] Pay failed:", message);
      throw new Error(`Payment failed: ${message}`);
    }
  }

  getStatus() {
    return {
      configured: this.initialized,
      address: this.client?.address || null,
      chain: "arcTestnet",
      provider: "Circle Gateway + Nanopayments",
      features: [
        "Gas-free USDC payments via EIP-3009",
        "Batched on-chain settlement",
        "Sub-cent transactions ($0.000001 minimum)",
        "Cross-chain withdrawal support",
      ],
    };
  }
}

export const gatewayService = new GatewayService();
