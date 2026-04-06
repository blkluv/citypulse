/**
 * Circle Gateway Service — handles USDC deposit/withdraw/balance for Nanopayments.
 * Uses GatewayClient from @circle-fin/x402-batching/client.
 */

import { GatewayClient } from "@circle-fin/x402-batching/client";
import { config } from "../config.js";

class GatewayService {
  private client: GatewayClient | null = null;
  private initialized = false;

  constructor() {
    if (!config.privateKey) {
      console.log("[Gateway] No private key — Gateway disabled");
      return;
    }

    try {
      const pk = config.privateKey.startsWith("0x") ? config.privateKey : `0x${config.privateKey}`;
      this.client = new GatewayClient({
        chain: "arcTestnet",
        privateKey: pk as `0x${string}`,
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

  async deposit(amount: string) {
    if (!this.client) throw new Error("Gateway not initialized");

    const result = await this.client.deposit(amount);
    console.log(`[Gateway] Deposited ${result.formattedAmount} USDC — tx: ${result.depositTxHash}`);
    return {
      depositTxHash: result.depositTxHash,
      approvalTxHash: result.approvalTxHash,
      amount: result.formattedAmount,
    };
  }

  async withdraw(amount: string) {
    if (!this.client) throw new Error("Gateway not initialized");

    const result = await this.client.withdraw(amount);
    console.log(`[Gateway] Withdrew ${result.formattedAmount} USDC`);
    return {
      mintTxHash: result.mintTxHash,
      amount: result.formattedAmount,
    };
  }

  async pay(url: string, init?: Record<string, unknown>) {
    if (!this.client) throw new Error("Gateway not initialized");

    const result = await this.client.pay(url, init as any);
    return { status: result.status, data: result.data };
  }

  getStatus() {
    return {
      configured: this.initialized,
      address: this.client?.address || null,
      chain: "arcTestnet",
      provider: "Circle Gateway + Nanopayments",
    };
  }
}

export const gatewayService = new GatewayService();
