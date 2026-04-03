import { Router, Request, Response } from "express";
import { circleWallets } from "../services/circleWallets.js";
import { ethers } from "ethers";
import { config } from "../config.js";

// Contract ABI for encoding payForRoute / payForParking calls
const CONTRACT_ABI = [
  "function payForRoute(string fromZone, string toZone, uint256 vehiclesQueried) payable",
  "function payForParking(string zone) payable",
  "function queryPrice() view returns (uint256)",
  "function parkingQueryPrice() view returns (uint256)",
];

export function createCircleRoutes(): Router {
  const router = Router();

  /**
   * GET /api/circle/status
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
        wallets: { status: circleWallets.isConfigured() ? "active" : "not configured" },
      },
    });
  });

  /**
   * POST /api/circle/wallet/create
   * Create a Circle Programmable Wallet. Returns wallet address.
   */
  router.post("/wallet/create", async (req: Request, res: Response) => {
    if (!circleWallets.isConfigured()) {
      res.status(503).json({
        success: false,
        error: "Circle Wallets not configured on server",
      });
      return;
    }

    try {
      const result = await circleWallets.createWallet(req.body?.sessionId);
      if (!result) {
        res.status(500).json({ success: false, error: "Failed to create wallet" });
        return;
      }

      res.json({
        success: true,
        sessionId: result.sessionId,
        wallet: {
          id: result.wallet.id,
          address: result.wallet.address,
          blockchain: result.wallet.blockchain,
          state: result.wallet.state,
        },
        faucetUrl: "https://faucet.circle.com",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: message });
    }
  });

  /**
   * GET /api/circle/wallet/:sessionId
   * Get wallet info by session ID.
   */
  router.get("/wallet/:sessionId", (req: Request, res: Response) => {
    const wallet = circleWallets.getWalletBySession(req.params.sessionId as string);
    if (!wallet) {
      res.status(404).json({ success: false, error: "Wallet not found for this session" });
      return;
    }

    res.json({ success: true, wallet });
  });

  /**
   * GET /api/circle/wallet/:sessionId/balance
   * Get wallet USDC balance.
   */
  router.get("/wallet/:sessionId/balance", async (req: Request, res: Response) => {
    const wallet = circleWallets.getWalletBySession(req.params.sessionId as string);
    if (!wallet) {
      res.status(404).json({ success: false, error: "Wallet not found" });
      return;
    }

    try {
      const balance = await circleWallets.getBalance(wallet.id);
      res.json({ success: true, address: wallet.address, balance, currency: "USDC" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: message });
    }
  });

  /**
   * POST /api/circle/wallet/:sessionId/pay-route
   * Pay for route using Circle wallet (no MetaMask needed).
   * Body: { fromZone, toZone, vehicleCount }
   */
  router.post("/wallet/:sessionId/pay-route", async (req: Request, res: Response) => {
    const wallet = circleWallets.getWalletBySession(req.params.sessionId as string);
    if (!wallet) {
      res.status(404).json({ success: false, error: "Wallet not found" });
      return;
    }

    try {
      const { fromZone, toZone, vehicleCount } = req.body;
      if (!fromZone || !toZone || !vehicleCount) {
        res.status(400).json({ success: false, error: "Required: fromZone, toZone, vehicleCount" });
        return;
      }

      // Get query price from contract
      const provider = new ethers.JsonRpcProvider(config.arcTestnetRpcUrl);
      const contract = new ethers.Contract(config.contractAddress, CONTRACT_ABI, provider);
      const queryPrice = await contract.queryPrice();
      const totalCost = (queryPrice as bigint) * BigInt(vehicleCount);

      // Encode contract call
      const iface = new ethers.Interface(CONTRACT_ABI);
      const callData = iface.encodeFunctionData("payForRoute", [fromZone, toZone, vehicleCount]);

      const result = await circleWallets.sendContractCall(
        wallet.id,
        config.contractAddress,
        callData,
        ethers.formatEther(totalCost),
      );

      if (!result) {
        res.status(500).json({ success: false, error: "Transaction failed" });
        return;
      }

      res.json({
        success: true,
        txHash: result.txHash,
        cost: ethers.formatEther(totalCost),
        walletAddress: wallet.address,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: message });
    }
  });

  /**
   * POST /api/circle/wallet/:sessionId/pay-parking
   * Pay for parking using Circle wallet.
   * Body: { zone }
   */
  router.post("/wallet/:sessionId/pay-parking", async (req: Request, res: Response) => {
    const wallet = circleWallets.getWalletBySession(req.params.sessionId as string);
    if (!wallet) {
      res.status(404).json({ success: false, error: "Wallet not found" });
      return;
    }

    try {
      const { zone } = req.body;
      if (!zone) {
        res.status(400).json({ success: false, error: "Required: zone" });
        return;
      }

      const PARKING_ABI = [
        "function payForParking(string zone) payable",
        "function parkingQueryPrice() view returns (uint256)",
      ];
      const provider = new ethers.JsonRpcProvider(config.arcTestnetRpcUrl);
      const parkingContract = new ethers.Contract(config.parkingContractAddress, PARKING_ABI, provider);
      const parkingPrice = await parkingContract.parkingQueryPrice();

      const iface = new ethers.Interface(PARKING_ABI);
      const callData = iface.encodeFunctionData("payForParking", [zone]);

      const result = await circleWallets.sendContractCall(
        wallet.id,
        config.parkingContractAddress,
        callData,
        ethers.formatEther(parkingPrice as bigint),
      );

      if (!result) {
        res.status(500).json({ success: false, error: "Transaction failed" });
        return;
      }

      res.json({
        success: true,
        txHash: result.txHash,
        cost: ethers.formatEther(parkingPrice as bigint),
        walletAddress: wallet.address,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: message });
    }
  });

  /**
   * GET /api/circle/sessions
   * List all active wallet sessions (for debug/demo).
   */
  router.get("/sessions", (_req: Request, res: Response) => {
    const sessions = circleWallets.getAllSessions();
    res.json({
      success: true,
      count: sessions.length,
      sessions: sessions.map((s) => ({
        sessionId: s.sessionId,
        address: s.wallet.address,
        state: s.wallet.state,
      })),
    });
  });

  return router;
}
