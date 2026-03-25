import { Router, Request, Response } from "express";
import { x402Middleware } from "../x402/middleware.js";
import { VehicleSimulator } from "../simulator/vehicleSimulator.js";
import { calculateRoute } from "../services/routingService.js";
import { osrmService } from "../services/osrmService.js";

export function createRouteOptimizerRoutes(simulator: VehicleSimulator): Router {
  const router = Router();

  /**
   * POST /api/route/baseline
   * PUBLIC — Free OSRM baseline route (no vehicle data, no x402 payment)
   * This is what Google Maps / any routing engine would give you.
   * Body: { from: { lat, lng }, to: { lat, lng } }
   */
  router.post("/baseline", async (req: Request, res: Response) => {
    const { from, to } = req.body;

    if (!from || !to || typeof from.lat !== "number" || typeof from.lng !== "number" ||
        typeof to.lat !== "number" || typeof to.lng !== "number") {
      res.status(400).json({
        success: false,
        error: "Invalid request body. Expected: { from: { lat, lng }, to: { lat, lng } }",
      });
      return;
    }

    const isInBounds = (lat: number, lng: number) =>
      lat >= 40.80 && lat <= 41.30 && lng >= 28.50 && lng <= 29.40;

    if (!isInBounds(from.lat, from.lng) || !isInBounds(to.lat, to.lng)) {
      res.status(400).json({
        success: false,
        error: "Coordinates must be within Istanbul bounds",
      });
      return;
    }

    try {
      const osrmResult = await osrmService.getRoute(from, to);

      if (osrmResult.error || osrmResult.routes.length === 0) {
        res.status(502).json({
          success: false,
          error: "Could not calculate baseline route",
        });
        return;
      }

      const route = osrmResult.routes[0];
      res.json({
        success: true,
        timestamp: Date.now(),
        route: route.geometry,
        distance: Math.round(route.distance),
        duration: Math.round(route.duration / 60), // minutes
        source: "osrm-baseline",
        note: "This is a free baseline route without real-time traffic data. Pay with x402 to get the CityPulse optimized route.",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({
        success: false,
        error: `Baseline route failed: ${message}`,
      });
    }
  });

  /**
   * POST /api/route
   * x402 PROTECTED — CityPulse optimized route using OSRM + live vehicle data
   * Requires on-chain payment verification via X-PAYMENT-TX header.
   * Body: { from: { lat, lng }, to: { lat, lng } }
   */
  router.post("/", x402Middleware, async (req: Request, res: Response) => {
    const { from, to } = req.body;

    if (!from || !to || typeof from.lat !== "number" || typeof from.lng !== "number" ||
        typeof to.lat !== "number" || typeof to.lng !== "number") {
      res.status(400).json({
        success: false,
        error: "Invalid request body. Expected: { from: { lat, lng }, to: { lat, lng } }",
      });
      return;
    }

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
      const result = await calculateRoute(from, to, simulator);

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
        routeDetails: result.routeDetails,
        steps: result.steps,
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
