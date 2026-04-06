import { Router, Request, Response } from "express";
import { nanopayRouteMiddleware } from "../x402/gatewayMiddleware.js";
import type { PaymentRequest } from "../x402/gatewayMiddleware.js";
import { VehicleSimulator } from "../simulator/vehicleSimulator.js";
import { calculateRoute } from "../services/routingService.js";
import { osrmService } from "../services/osrmService.js";

export function createRouteOptimizerRoutes(simulator: VehicleSimulator): Router {
  const router = Router();

  /**
   * POST /api/route/baseline
   * PUBLIC — Free OSRM baseline route (no vehicle data, no payment)
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
        duration: Math.round(route.duration / 60),
        source: "osrm-baseline",
        note: "Free baseline route without real-time traffic data. Pay with Circle Nanopayments to get the CityPulse optimized route.",
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
   * Circle Nanopayments protected — CityPulse optimized route
   * Payment: $0.0005 USDC via Gateway batched settlement (gas-free)
   * Body: { from: { lat, lng }, to: { lat, lng } }
   */
  router.post("/", nanopayRouteMiddleware as any, async (req: Request, res: Response) => {
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
      const result = await calculateRoute(from, to, simulator);

      res.json({
        success: true,
        timestamp: Date.now(),
        paymentMethod: "circle-nanopayments",
        payment: (req as PaymentRequest).payment,
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
