/**
 * Circle Gateway Service — handles USDC deposit/withdraw/balance for Nanopayments.
 * Uses dynamic import for ESM-only @circle-fin/x402-batching/client.
 */

import { config } from "../config.js";

// Dynamic import type for GatewayClient
type GatewayClientType = {
  address: string;
  getBalances: () => Promise<{
    wallet: { formatted: string };
    gateway: { formattedAvailable: string; available: bigint };
  }>;
  deposit: (amount: string) => Promise<{
    depositTxHash: string;
    approvalTxHash?: string;
    formattedAmount: string;
  }>;
  withdraw: (amount: string) => Promise<{
    mintTxHash: string;
    formattedAmount: string;
  }>;
  pay: (url: string, init?: RequestInit) => Promise<{
    status: number;
    data: Record<string, unknown>;
  }>;
};

class GatewayService {
  private client: GatewayClientType | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    if (!config.privateKey) {
      console.log("[Gateway] No private key — Gateway disabled");
      return;
    }
    // Start async init
    this.initPromise = this.init();
  }

  private async init() {
    try {
      // Dynamic import for ESM-only package
      const { GatewayClient } = await import("@circle-fin/x402-batching/client");
      const pk = config.privateKey.startsWith("0x") ? config.privateKey : `0x${config.privateKey}`;

      this.client = new GatewayClient({
        chain: "arcTestnet",
        privateKey: pk as `0x${string}`,
      }) as unknown as GatewayClientType;

      this.initialized = true;
      console.log(`[Gateway] Initialized on Arc Testnet — address: ${this.client.address}`);
    } catch (err) {
      console.error("[Gateway] Init failed:", err instanceof Error ? err.message : err);
    }
  }

  private async ensureInit() {
    if (this.initPromise) await this.initPromise;
  }

  isConfigured(): boolean {
    return this.initialized;
  }

  getAddress(): string | null {
    return this.client?.address || null;
  }

  async getBalances() {
    await this.ensureInit();
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
    await this.ensureInit();
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
    await this.ensureInit();
    if (!this.client) throw new Error("Gateway not initialized");

    const result = await this.client.withdraw(amount);
    console.log(`[Gateway] Withdrew ${result.formattedAmount} USDC`);
    return {
      mintTxHash: result.mintTxHash,
      amount: result.formattedAmount,
    };
  }

  async pay(url: string, init?: RequestInit) {
    await this.ensureInit();
    if (!this.client) throw new Error("Gateway not initialized");

    const result = await this.client.pay(url, init);
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
