import { Router, Request, Response } from "express";
import { nanopayVehicleMiddleware, nanopayZoneMiddleware } from "../x402/gatewayMiddleware.js";
import type { PaymentRequest } from "../x402/gatewayMiddleware.js";
import { VehicleSimulator } from "../simulator/vehicleSimulator.js";
import { getZoneTrafficData, ZONES } from "../simulator/trafficEngine.js";

export function createTrafficRoutes(simulator: VehicleSimulator): Router {
  const router = Router();

  /**
   * GET /api/traffic/vehicles
   * Circle Nanopayments protected — real-time vehicle positions
   * Payment: $0.001 USDC via Gateway batched settlement (gas-free)
   */
  router.get("/vehicles", nanopayVehicleMiddleware as any, (req: Request, res: Response) => {
    const zone = req.query.zone as string | undefined;

    let vehicles;
    if (zone) {
      vehicles = simulator.getVehiclesByZone(zone);
    } else {
      vehicles = simulator.getVehicles();
    }

    const publicData = vehicles.map((v) => ({
      id: v.id,
      type: v.type,
      lat: v.lat,
      lng: v.lng,
      speed: Math.round(v.speed * 10) / 10,
      heading: Math.round(v.heading * 10) / 10,
      zone: v.zone,
      status: v.status,
      lastUpdate: v.lastUpdate,
    }));

    res.json({
      success: true,
      count: publicData.length,
      zone: zone || "all",
      timestamp: Date.now(),
      paymentMethod: "circle-nanopayments",
      payment: (req as PaymentRequest).payment,
      vehicles: publicData,
    });
  });

  /**
   * GET /api/traffic/zone/:zoneName
   * Circle Nanopayments protected — zone-specific traffic data
   * Payment: $0.0005 USDC via Gateway batched settlement (gas-free)
   */
  router.get("/zone/:zoneName", nanopayZoneMiddleware as any, (req: Request, res: Response) => {
    const zoneName = String(req.params.zoneName);

    const normalizedZone = ZONES.find(
      (z) => z.toLowerCase() === zoneName.toLowerCase(),
    );

    if (!normalizedZone) {
      res.status(400).json({
        success: false,
        error: `Unknown zone: ${zoneName}`,
        availableZones: ZONES,
      });
      return;
    }

    const data = getZoneTrafficData(normalizedZone, simulator);

    res.json({
      success: true,
      timestamp: Date.now(),
      paymentMethod: "circle-nanopayments",
      payment: (req as PaymentRequest).payment,
      data,
    });
  });

  return router;
}
