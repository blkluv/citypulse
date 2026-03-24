import { Router, Request, Response } from "express";
import { demoSimulator } from "../services/demoSimulator.js";

const router = Router();

/**
 * POST /api/demo/start
 * Start the demo simulator (real on-chain payments every 10-15s).
 */
router.post("/start", async (_req: Request, res: Response) => {
  try {
    await demoSimulator.start();
    res.json({
      success: true,
      message: "Demo mode started — real on-chain payments every 10-15s",
      ...demoSimulator.getStatus(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/demo/stop
 * Stop the demo simulator.
 */
router.post("/stop", (_req: Request, res: Response) => {
  demoSimulator.stop();
  res.json({
    success: true,
    message: "Demo mode stopped",
    ...demoSimulator.getStatus(),
  });
});

/**
 * GET /api/demo/status
 * Get current demo simulator status.
 */
router.get("/status", (_req: Request, res: Response) => {
  res.json({
    success: true,
    ...demoSimulator.getStatus(),
  });
});

export { router as demoRoutes };
