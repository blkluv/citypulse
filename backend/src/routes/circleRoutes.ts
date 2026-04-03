import { Router, Request, Response } from "express";
import { circleWallets } from "../services/circleWallets.js";

export function createCircleRoutes(): Router {
  const router = Router();

  /**
   * GET /api/circle/status
   * Public — Circle integration status
   */
  router.get("/status", (_req: Request, res: Response) => {
    res.json({
      success: true,
      timestamp: Date.now(),
      wallets: circleWallets.getStatus(),
      infrastructure: {
        arc: { status: "active", network: "arc-testnet", chainId: 5042002 },
        usdc: { status: "active", type: "native gas token" },
        nanopayments: { status: "active", subCent: true },
        x402: { status: "active", version: "1.0" },
        bridgeKit: { status: "available", chains: ["arc-testnet", "base-sepolia", "avalanche-fuji"] },
        gateway: { status: "available", description: "Unified cross-chain USDC balance" },
      },
    });
  });

  /**
   * POST /api/circle/wallet/create
   * Create a Circle Programmable Wallet on Arc Testnet.
   * Requires Circle API key to be configured.
   */
  router.post("/wallet/create", async (req: Request, res: Response) => {
    if (!circleWallets.isConfigured()) {
      res.status(503).json({
        success: false,
        error: "Circle Wallets not configured. Set CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET.",
        fallback: "Use MetaMask wallet connection instead.",
      });
      return;
    }

    try {
      const { name } = req.body || {};
      const walletSetName = name || `CityPulse-User-${Date.now()}`;

      // Create wallet set
      const walletSet = await circleWallets.createWalletSet(walletSetName);
      if (!walletSet) {
        res.status(500).json({ success: false, error: "Failed to create wallet set" });
        return;
      }

      // Create wallet on Arc Testnet
      const wallet = await circleWallets.createWallet(walletSet.id);
      if (!wallet) {
        res.status(500).json({ success: false, error: "Failed to create wallet" });
        return;
      }

      res.json({
        success: true,
        wallet: {
          id: wallet.id,
          address: wallet.address,
          blockchain: wallet.blockchain,
          state: wallet.state,
          faucetUrl: "https://faucet.circle.com",
          note: "Fund this wallet with testnet USDC from the Circle faucet",
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: message });
    }
  });

  /**
   * GET /api/circle/wallet/:walletId/balance
   * Get wallet USDC balance.
   */
  router.get("/wallet/:walletId/balance", async (req: Request, res: Response) => {
    if (!circleWallets.isConfigured()) {
      res.status(503).json({ success: false, error: "Circle Wallets not configured" });
      return;
    }

    try {
      const walletId = req.params.walletId as string;
      const balance = await circleWallets.getBalance(walletId);
      res.json({ success: true, balance, currency: "USDC" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: message });
    }
  });

  return router;
}
