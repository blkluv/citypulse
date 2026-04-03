/**
 * Circle Developer-Controlled Wallets Service
 *
 * Provides wallet creation and management via Circle's Programmable Wallets API.
 * Requires CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET environment variables.
 *
 * Setup:
 * 1. Sign up at https://console.circle.com
 * 2. Create API key in the console
 * 3. Generate entity secret and register it
 * 4. Set env vars: CIRCLE_API_KEY, CIRCLE_ENTITY_SECRET
 */

import { config } from "../config.js";

interface CircleWalletConfig {
  apiKey: string;
  entitySecret: string;
}

interface CircleWallet {
  id: string;
  address: string;
  blockchain: string;
  state: string;
}

class CircleWalletService {
  private apiKey: string;
  private entitySecret: string;
  private baseUrl = "https://api.circle.com/v1/w3s";
  private initialized = false;

  constructor() {
    this.apiKey = process.env.CIRCLE_API_KEY || "";
    this.entitySecret = process.env.CIRCLE_ENTITY_SECRET || "";
    this.initialized = !!(this.apiKey && this.entitySecret);

    if (this.initialized) {
      console.log("[CircleWallets] Initialized with API key");
    } else {
      console.log("[CircleWallets] Not configured — set CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET");
    }
  }

  isConfigured(): boolean {
    return this.initialized;
  }

  /**
   * Create a wallet set (container for wallets).
   */
  async createWalletSet(name: string): Promise<{ id: string } | null> {
    if (!this.initialized) return null;

    try {
      const res = await fetch(`${this.baseUrl}/developer/walletSets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        console.error("[CircleWallets] Failed to create wallet set:", res.status);
        return null;
      }

      const data = await res.json();
      return { id: data.data?.walletSet?.id };
    } catch (err) {
      console.error("[CircleWallets] Error:", err instanceof Error ? err.message : err);
      return null;
    }
  }

  /**
   * Create a wallet on Arc Testnet.
   */
  async createWallet(walletSetId: string): Promise<CircleWallet | null> {
    if (!this.initialized) return null;

    try {
      const res = await fetch(`${this.baseUrl}/developer/wallets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          walletSetId,
          blockchains: ["ARC-TESTNET"],
          count: 1,
        }),
      });

      if (!res.ok) {
        console.error("[CircleWallets] Failed to create wallet:", res.status);
        return null;
      }

      const data = await res.json();
      const wallet = data.data?.wallets?.[0];
      if (!wallet) return null;

      return {
        id: wallet.id,
        address: wallet.address,
        blockchain: wallet.blockchain,
        state: wallet.state,
      };
    } catch (err) {
      console.error("[CircleWallets] Error:", err instanceof Error ? err.message : err);
      return null;
    }
  }

  /**
   * Get wallet balance.
   */
  async getBalance(walletId: string): Promise<string> {
    if (!this.initialized) return "0";

    try {
      const res = await fetch(`${this.baseUrl}/wallets/${walletId}/balances`, {
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
        },
      });

      if (!res.ok) return "0";

      const data = await res.json();
      const usdcBalance = data.data?.tokenBalances?.find(
        (b: { token: { symbol: string } }) => b.token.symbol === "USDC"
      );
      return usdcBalance?.amount || "0";
    } catch {
      return "0";
    }
  }

  /**
   * Get service status for health checks.
   */
  getStatus() {
    return {
      configured: this.initialized,
      provider: "Circle Programmable Wallets",
      network: "arc-testnet",
      features: [
        "Non-custodial MPC wallets",
        "No MetaMask required",
        "Embedded wallet experience",
        "PIN-based security",
      ],
    };
  }
}

export const circleWallets = new CircleWalletService();
