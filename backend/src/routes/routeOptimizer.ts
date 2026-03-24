import { Router, Request, Response } from "express";
import { x402Middleware } from "../x402/middleware.js";
import { VehicleSimulator } from "../simulator/vehicleSimulator.js";
import { calculateRoute } from "../services/routingService.js";

export function createRouteOptimizerRoutes(simulator: VehicleSimulator): Router {
  const router = Router();

  /**
   * POST /api/route
   * x402 protected — optimized route using live vehicle data
   * Body: { from: { lat, lng }, to: { lat, lng } }
   */
  router.post("/", x402Middleware, (req: Request, res: Response) => {
    const { from, to } = req.body;

    // Validate input
    if (!from || !to || typeof from.lat !== "number" || typeof from.lng !== "number" ||
        typeof to.lat !== "number" || typeof to.lng !== "number") {
      res.status(400).json({
        success: false,
        error: "Invalid request body. Expected: { from: { lat, lng }, to: { lat, lng } }",
      });
      return;
    }

    // Validate coordinates are roughly within Istanbul
    const isInBounds = (lat: number, lng: number) =>
      lat >= 40.80 && lat <= 41.30 && lng >= 28.50 && lng <= 29.40;

    if (!isInBounds(from.lat, from.lng) || !isInBounds(to.lat, to.lng)) {
      res.status(400).json({
        success: false,
        error: "Coordinates must be within Istanbul bounds (lat: 40.80-41.30, lng: 28.50-29.40)",
      });
      return;
    }

    try {
      const result = calculateRoute(from, to, simulator);

      res.json({
        success: true,
        timestamp: Date.now(),
        payment: req.paymentInfo,
        optimizedRoute: result.optimizedRoute,
        normalRoute: result.normalRoute,
        normalTime: result.normalTime,
        optimizedTime: result.optimizedTime,
        savedMinutes: result.savedMinutes,
        vehiclesUsed: result.vehiclesUsed,
        cost: result.cost,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({
        success: false,
        error: `Route calculation failed: ${message}`,
      });
    }
  });

  return router;
}
