import { Router, Request, Response } from "express";
import { nanopayParkingMiddleware } from "../x402/gatewayMiddleware.js";
import type { PaymentRequest } from "../x402/gatewayMiddleware.js";
import { ibbClient } from "../data/ibbClient.js";
import { x402Verifier } from "../x402/verifier.js";

/** Haversine distance in meters */
function haversineM(
  lat1: number, lng1: number, lat2: number, lng2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getOccupancyColor(rate: number): "green" | "yellow" | "red" {
  if (rate < 0.5) return "green";
  if (rate < 0.8) return "yellow";
  return "red";
}

export function createParkingRoutes(): Router {
  const router = Router();

  /**
   * GET /api/parking/nearby?lat=40.99&lng=29.02&radius=1000
   * PUBLIC — Returns parking lot count only (no names, no locations).
   */
  router.get("/nearby", async (req: Request, res: Response) => {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radius = parseInt(req.query.radius as string, 10) || 1000;

    if (isNaN(lat) || isNaN(lng)) {
      res.status(400).json({ success: false, error: "Required query params: lat, lng (numbers)" });
      return;
    }

    if (lat < 40.5 || lat > 41.5 || lng < 28.5 || lng > 29.5) {
      res.status(400).json({ success: false, error: "Coordinates must be within Istanbul bounds" });
      return;
    }

    try {
      const allParking = await ibbClient.getParkingData();
      const nearby = allParking.filter((p) => haversineM(lat, lng, p.lat, p.lng) <= radius);

      res.json({
        success: true,
        timestamp: Date.now(),
        searchCenter: { lat, lng },
        radius,
        count: nearby.length,
        locked: true,
        note: "Pay with Circle Nanopayments to unlock locations and live availability.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: `Failed to fetch nearby parking: ${message}` });
    }
  });

  /**
   * GET /api/parking/availability?lat=40.99&lng=29.02&radius=1000
   * Circle Nanopayments protected — full data with live availability
   * Payment: $0.0001 USDC via Gateway batched settlement (gas-free)
   */
  router.get("/availability", nanopayParkingMiddleware as any, async (req: Request, res: Response) => {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radius = parseInt(req.query.radius as string, 10) || 1000;

    if (isNaN(lat) || isNaN(lng)) {
      res.status(400).json({ success: false, error: "Required query params: lat, lng (numbers)" });
      return;
    }

    if (lat < 40.5 || lat > 41.5 || lng < 28.5 || lng > 29.5) {
      res.status(400).json({ success: false, error: "Coordinates must be within Istanbul bounds" });
      return;
    }

    try {
      const allParking = await ibbClient.getParkingData();
      const nearby = allParking
        .filter((p) => haversineM(lat, lng, p.lat, p.lng) <= radius)
        .map((p) => ({
          id: p.id,
          name: p.name,
          lat: p.lat,
          lng: p.lng,
          capacity: p.capacity,
          emptyCapacity: p.emptyCapacity,
          occupied: p.capacity - p.emptyCapacity,
          available: p.emptyCapacity,
          occupancyRate: Math.round(p.occupancyRate * 100),
          status: !p.isOpen ? "closed" as const : p.emptyCapacity === 0 ? "full" as const : "open" as const,
          color: getOccupancyColor(p.occupancyRate),
          district: p.district,
          parkType: p.parkType,
          distance: Math.round(haversineM(lat, lng, p.lat, p.lng)),
        }))
        .sort((a, b) => a.occupancyRate - b.occupancyRate);

      res.json({
        success: true,
        timestamp: Date.now(),
        searchCenter: { lat, lng },
        radius,
        count: nearby.length,
        locked: false,
        paymentMethod: "circle-nanopayments",
        payment: (req as PaymentRequest).payment,
        validFor: 15 * 60 * 1000,
        validUntil: Date.now() + 15 * 60 * 1000,
        parkingLots: nearby,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: `Failed to fetch parking availability: ${message}` });
    }
  });

  /**
   * GET /api/parking/stats
   * PUBLIC — Dashboard stats for parking queries.
   */
  router.get("/stats", async (_req: Request, res: Response) => {
    try {
      const contractStats = await x402Verifier.getContractStats();
      const parkingData = await ibbClient.getParkingData();

      const totalCapacity = parkingData.reduce((sum, p) => sum + p.capacity, 0);
      const totalEmpty = parkingData.reduce((sum, p) => sum + p.emptyCapacity, 0);
      const openLots = parkingData.filter((p) => p.isOpen).length;

      res.json({
        success: true,
        timestamp: Date.now(),
        parkingQueries: contractStats.totalParkingQueries || 0,
        parkingQueryPrice: contractStats.parkingQueryPrice || "0",
        totalParkingLots: parkingData.length,
        openParkingLots: openLots,
        totalCapacity,
        totalAvailable: totalEmpty,
        overallOccupancy: totalCapacity > 0 ? Math.round((1 - totalEmpty / totalCapacity) * 100) : 0,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: `Failed to fetch parking stats: ${message}` });
    }
  });

  return router;
}
