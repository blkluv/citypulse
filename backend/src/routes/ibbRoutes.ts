import { Router, Request, Response } from "express";
import { ibbClient } from "../data/ibbClient.js";

export function createIBBRoutes(): Router {
  const router = Router();

  // GET /api/ibb/traffic-index — real-time traffic congestion index
  router.get("/traffic-index", async (_req: Request, res: Response) => {
    const data = await ibbClient.getTrafficIndex();
    res.json({ success: true, count: data.length, data });
  });

  // GET /api/ibb/buses — real IETT bus positions
  router.get("/buses", async (_req: Request, res: Response) => {
    const data = await ibbClient.getBusPositions();
    res.json({ success: true, count: data.length, data });
  });

  // GET /api/ibb/incidents — traffic incidents
  router.get("/incidents", async (_req: Request, res: Response) => {
    const data = await ibbClient.getTrafficIncidents();
    res.json({ success: true, count: data.length, data });
  });

  // GET /api/ibb/parking — ISPARK parking data
  router.get("/parking", async (_req: Request, res: Response) => {
    const data = await ibbClient.getParkingData();
    res.json({ success: true, count: data.length, data });
  });

  // GET /api/ibb/all — all IBB data at once
  router.get("/all", async (_req: Request, res: Response) => {
    const data = await ibbClient.getAllData();
    res.json({
      success: true,
      trafficIndex: data.trafficIndex.length,
      buses: data.busPositions.length,
      incidents: data.incidents.length,
      parking: data.parking.length,
      fetchedAt: data.fetchedAt,
      data,
    });
  });

  // GET /api/ibb/status — data quality/status
  router.get("/status", (_req: Request, res: Response) => {
    res.json({ success: true, ...ibbClient.getDataQuality() });
  });

  return router;
}
