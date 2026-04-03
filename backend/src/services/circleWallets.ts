/**
 * Circle Developer-Controlled Wallets Service
 * Uses @circle-fin/developer-controlled-wallets SDK for real wallet operations.
 */

import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

interface CityPulseWallet {
  id: string;
  address: string;
  walletSetId: string;
  blockchain: string;
  state: string;
}

// In-memory store: map sessionId -> wallet info
const walletStore = new Map<string, CityPulseWallet>();

class CircleWalletService {
  private client: ReturnType<typeof initiateDeveloperControlledWalletsClient> | null = null;
  private initialized = false;

  constructor() {
    const apiKey = process.env.CIRCLE_API_KEY || "";
    const entitySecret = process.env.CIRCLE_ENTITY_SECRET || "";

    if (apiKey && entitySecret) {
      try {
        this.client = initiateDeveloperControlledWalletsClient({
          apiKey,
          entitySecret,
        });
        this.initialized = true;
        console.log("[CircleWallets] SDK initialized");
      } catch (err) {
        console.error("[CircleWallets] SDK init failed:", err instanceof Error ? err.message : err);
      }
    } else {
      console.log("[CircleWallets] Not configured — set CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET");
    }
  }

  isConfigured(): boolean {
    return this.initialized;
  }

  /**
   * Create a new wallet for a user session.
   * Returns wallet address + session ID for future reference.
   */
  async createWallet(sessionId?: string): Promise<{
    sessionId: string;
    wallet: CityPulseWallet;
  } | null> {
    if (!this.client) return null;

    try {
      // Create wallet set
      const wsRes = await this.client.createWalletSet({
        name: `CityPulse-${Date.now()}`,
      });
      const walletSetId = wsRes.data?.walletSet?.id;
      if (!walletSetId) throw new Error("Failed to create wallet set");

      // Create wallet on EVM testnet (works on Arc Testnet)
      const wRes = await this.client.createWallets({
        walletSetId,
        blockchains: ["EVM-TESTNET"],
        count: 1,
      });
      const rawWallet = wRes.data?.wallets?.[0];
      if (!rawWallet) throw new Error("Failed to create wallet");

      const wallet: CityPulseWallet = {
        id: rawWallet.id,
        address: rawWallet.address,
        walletSetId,
        blockchain: rawWallet.blockchain,
        state: rawWallet.state,
      };

      // Store for session lookup
      const sid = sessionId || `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      walletStore.set(sid, wallet);

      console.log(`[CircleWallets] Created wallet ${wallet.address} for session ${sid}`);
      return { sessionId: sid, wallet };
    } catch (err) {
      console.error("[CircleWallets] Create wallet error:", err instanceof Error ? err.message : err);
      return null;
    }
  }

  /**
   * Get wallet by session ID.
   */
  getWalletBySession(sessionId: string): CityPulseWallet | null {
    return walletStore.get(sessionId) || null;
  }

  /**
   * Get native balance (USDC on Arc) for a wallet.
   */
  async getBalance(walletId: string): Promise<string> {
    if (!this.client) return "0";

    try {
      const res = await this.client.getWalletTokenBalance({ id: walletId });
      const balances = res.data?.tokenBalances || [];

      // Find native/USDC balance
      for (const b of balances) {
        if (b.token?.symbol === "USDC" || b.token?.isNative) {
          return b.amount || "0";
        }
      }

      // If no specific token, check native balance
      const nativeBalance = balances.find((b: { token?: { isNative?: boolean } }) => b.token?.isNative);
      return nativeBalance?.amount || "0";
    } catch (err) {
      console.error("[CircleWallets] Balance error:", err instanceof Error ? err.message : err);
      return "0";
    }
  }

  /**
   * Sign and send a contract transaction from Circle wallet.
   * Used for payForRoute / payForParking on-chain calls.
   */
  async sendContractCall(
    walletId: string,
    contractAddress: string,
    callData: string,
    value: string,
  ): Promise<{ txHash: string } | null> {
    if (!this.client) return null;

    try {
      const res = await this.client.createContractExecutionTransaction({
        walletId,
        contractAddress: contractAddress as `0x${string}`,
        callData: callData as `0x${string}`,
        amount: value,
        fee: {
          type: "level",
          config: { feeLevel: "MEDIUM" },
        },
      });

      const txId = res.data?.id;
      if (!txId) throw new Error("No transaction ID returned");

      // Poll for transaction completion
      let attempts = 0;
      while (attempts < 30) {
        await new Promise((r) => setTimeout(r, 2000));
        const txRes = await this.client!.getTransaction({ id: txId });
        const tx = txRes.data?.transaction;

        if (tx?.state === "COMPLETE") {
          return { txHash: tx.txHash || txId };
        }
        if (tx?.state === "FAILED" || tx?.state === "CANCELLED") {
          throw new Error(`Transaction ${tx.state}: ${tx.errorReason || "unknown"}`);
        }
        attempts++;
      }

      throw new Error("Transaction timed out");
    } catch (err) {
      console.error("[CircleWallets] Contract call error:", err instanceof Error ? err.message : err);
      return null;
    }
  }

  /**
   * List all wallets created by this service.
   */
  getAllSessions(): Array<{ sessionId: string; wallet: CityPulseWallet }> {
    const result: Array<{ sessionId: string; wallet: CityPulseWallet }> = [];
    walletStore.forEach((wallet, sessionId) => {
      result.push({ sessionId, wallet });
    });
    return result;
  }

  getStatus() {
    return {
      configured: this.initialized,
      provider: "Circle Programmable Wallets",
      network: "arc-testnet (EVM-TESTNET)",
      activeSessions: walletStore.size,
      features: [
        "Developer-controlled MPC wallets",
        "No MetaMask required",
        "One-click wallet creation",
        "Embedded wallet experience",
        "On-chain tx signing via Circle SDK",
      ],
    };
  }
}

export const circleWallets = new CircleWalletService();
