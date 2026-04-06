import { Router, Request, Response } from "express";
import { x402Middleware } from "../x402/middleware.js";
import { nanopayVehicleMiddleware, nanopayZoneMiddleware } from "../x402/gatewayMiddleware.js";
import { VehicleSimulator } from "../simulator/vehicleSimulator.js";
import { getZoneTrafficData, ZONES } from "../simulator/trafficEngine.js";

export function createTrafficRoutes(simulator: VehicleSimulator): Router {
  const router = Router();

  /**
   * GET /api/traffic/vehicles
   * x402 protected — returns current vehicle positions
   * Optional query param: ?zone=Kadikoy to filter by zone
   */
  router.get("/vehicles", x402Middleware, (req: Request, res: Response) => {
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
      payment: req.paymentInfo,
      vehicles: publicData,
    });
  });

  /**
   * GET /api/traffic/zone/:zoneName
   * x402 protected — returns zone-specific traffic data
   */
  router.get("/zone/:zoneName", x402Middleware, (req: Request, res: Response) => {
    const zoneName = String(req.params.zoneName);

    // Validate zone name
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
      payment: req.paymentInfo,
      data,
    });
  });

  /**
   * GET /api/traffic/nanopay/vehicles
   * Circle Nanopayments (Gateway) protected — same data, uses Circle's batched settlement
   */
  router.get("/nanopay/vehicles", nanopayVehicleMiddleware as any, (req: Request, res: Response) => {
    const vehicles = simulator.getVehicles().map((v) => ({
      id: v.id, type: v.type, lat: v.lat, lng: v.lng,
      speed: Math.round(v.speed * 10) / 10,
      heading: Math.round(v.heading * 10) / 10,
      zone: v.zone, status: v.status, lastUpdate: v.lastUpdate,
    }));

    res.json({
      success: true,
      count: vehicles.length,
      timestamp: Date.now(),
      paymentMethod: "circle-nanopayments",
      payment: (req as any).payment,
      vehicles,
    });
  });

  /**
   * GET /api/traffic/nanopay/zone/:zoneName
   * Circle Nanopayments protected zone data
   */
  router.get("/nanopay/zone/:zoneName", nanopayZoneMiddleware as any, (req: Request, res: Response) => {
    const zoneName = String(req.params.zoneName);
    const normalizedZone = ZONES.find((z) => z.toLowerCase() === zoneName.toLowerCase());

    if (!normalizedZone) {
      res.status(400).json({ success: false, error: `Unknown zone: ${zoneName}`, availableZones: ZONES });
      return;
    }

    const data = getZoneTrafficData(normalizedZone, simulator);
    res.json({
      success: true,
      timestamp: Date.now(),
      paymentMethod: "circle-nanopayments",
      payment: (req as any).payment,
      data,
    });
  });

  return router;
}
