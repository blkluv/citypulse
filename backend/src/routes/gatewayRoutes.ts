import { Router, Request, Response } from "express";
import { gatewayService } from "../services/gatewayService.js";

export function createGatewayRoutes(): Router {
  const router = Router();

  /**
   * GET /api/gateway/status
   * Public — Gateway service status + balances
   */
  router.get("/status", async (_req: Request, res: Response) => {
    try {
      const status = gatewayService.getStatus();
      const balances = await gatewayService.getBalances();

      res.json({
        success: true,
        timestamp: Date.now(),
        ...status,
        balances,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: message });
    }
  });

  /**
   * POST /api/gateway/deposit
   * Deposit USDC into Gateway for gas-free nanopayments.
   * Body: { amount: "1.0" }
   */
  router.post("/deposit", async (req: Request, res: Response) => {
    if (!gatewayService.isConfigured()) {
      res.status(503).json({ success: false, error: "Gateway not configured" });
      return;
    }

    try {
      const { amount } = req.body || {};
      if (!amount) {
        res.status(400).json({ success: false, error: "Required: amount (e.g. '1.0')" });
        return;
      }

      const result = await gatewayService.deposit(amount);
      res.json({ success: true, ...result });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: message });
    }
  });

  /**
   * POST /api/gateway/withdraw
   * Withdraw USDC from Gateway back to wallet.
   * Body: { amount: "1.0" }
   */
  router.post("/withdraw", async (req: Request, res: Response) => {
    if (!gatewayService.isConfigured()) {
      res.status(503).json({ success: false, error: "Gateway not configured" });
      return;
    }

    try {
      const { amount } = req.body || {};
      if (!amount) {
        res.status(400).json({ success: false, error: "Required: amount" });
        return;
      }

      const result = await gatewayService.withdraw(amount);
      res.json({ success: true, ...result });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: message });
    }
  });

  /**
   * GET /api/gateway/balances
   * Get wallet + gateway USDC balances.
   */
  router.get("/balances", async (_req: Request, res: Response) => {
    try {
      const balances = await gatewayService.getBalances();
      res.json({ success: true, ...balances });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: message });
    }
  });

  return router;
}
