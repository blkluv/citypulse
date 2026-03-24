import { Router, Request, Response } from "express";
import { VehicleSimulator } from "../simulator/vehicleSimulator.js";
import { getAllZoneCongestion, getHeatmapData } from "../simulator/trafficEngine.js";
import { x402Verifier } from "../x402/verifier.js";
import { eventStream } from "../services/eventStream.js";

interface PaymentRecord {
  id: string;
  txHash: string;
  from: string;
  endpoint: string;
  amount: string;
  timestamp: number;
  zone: string;
}

// In-memory payment store (mix of real and simulated)
const payments: PaymentRecord[] = [];
let totalQueries = 0;
let totalRevenue = 0;

/**
 * Record a payment (real or simulated).
 */
export function recordPayment(payment: PaymentRecord): void {
  payments.unshift(payment);
  if (payments.length > 200) {
    payments.length = 200; // Keep last 200
  }
  totalQueries++;
  totalRevenue += parseFloat(payment.amount);
}

/**
 * Increment query counter (for free endpoints too).
 */
export function recordQuery(): void {
  totalQueries++;
}

export function createDashboardRoutes(simulator: VehicleSimulator): Router {
  const router = Router();

  /**
   * GET /api/dashboard/stats
   * Public — returns overall system stats
   */
  router.get("/stats", (_req: Request, res: Response) => {
    const vehicles = simulator.getVehicles();
    const movingVehicles = vehicles.filter((v) => v.status === "moving");
    const avgSpeed =
      movingVehicles.length > 0
        ? movingVehicles.reduce((sum, v) => sum + v.speed, 0) / movingVehicles.length
        : 0;

    // Find busiest zone
    const zoneCounts: Record<string, number> = {};
    for (const v of vehicles) {
      zoneCounts[v.zone] = (zoneCounts[v.zone] || 0) + 1;
    }
    let busiestZone = "Unknown";
    let maxCount = 0;
    for (const [zone, count] of Object.entries(zoneCounts)) {
      if (count > maxCount) {
        maxCount = count;
        busiestZone = zone;
      }
    }

    const congestionData = getAllZoneCongestion();
    const avgCongestion =
      congestionData.reduce((sum, z) => sum + z.congestion, 0) / congestionData.length;

    res.json({
      success: true,
      timestamp: Date.now(),
      stats: {
        totalQueries,
        totalRevenue: Math.round(totalRevenue * 10000) / 10000,
        activeVehicles: vehicles.length,
        movingVehicles: movingVehicles.length,
        stoppedVehicles: vehicles.length - movingVehicles.length,
        avgSpeed: Math.round(avgSpeed * 10) / 10,
        busiestZone,
        busiestZoneVehicles: maxCount,
        avgCongestion: Math.round(avgCongestion * 100) / 100,
        zones: congestionData,
        vehiclesByType: {
          bus: vehicles.filter((v) => v.type === "bus").length,
          garbage_truck: vehicles.filter((v) => v.type === "garbage_truck").length,
          service: vehicles.filter((v) => v.type === "service").length,
          ambulance: vehicles.filter((v) => v.type === "ambulance").length,
          police: vehicles.filter((v) => v.type === "police").length,
        },
      },
    });
  });

  /**
   * GET /api/dashboard/heatmap
   * Public — congestion heatmap data
   */
  router.get("/heatmap", (_req: Request, res: Response) => {
    const heatmap = getHeatmapData(simulator);

    res.json({
      success: true,
      timestamp: Date.now(),
      count: heatmap.length,
      heatmap,
    });
  });

  /**
   * GET /api/dashboard/payments
   * Public — last 50 payments (includes both real on-chain and simulated)
   */
  router.get("/payments", (_req: Request, res: Response) => {
    // Merge in-memory payments with historical on-chain payments
    const onChainPayments = eventStream.getHistorical().map((p) => ({
      id: `chain_${p.txHash.slice(0, 16)}`,
      txHash: p.txHash,
      from: p.driver,
      endpoint: `/api/traffic/route/${p.fromZone}-${p.toZone}`,
      amount: p.amount,
      timestamp: p.timestamp * 1000 || Date.now(),
      zone: p.fromZone,
      fromZone: p.fromZone,
      toZone: p.toZone,
      vehiclesQueried: p.vehiclesQueried,
      blockNumber: p.blockNumber,
      isReal: true,
    }));

    // Combine: on-chain first, then in-memory, deduplicate by txHash
    const seen = new Set<string>();
    const combined = [];

    for (const p of onChainPayments) {
      if (!seen.has(p.txHash)) {
        seen.add(p.txHash);
        combined.push(p);
      }
    }
    for (const p of payments) {
      if (!seen.has(p.txHash)) {
        seen.add(p.txHash);
        combined.push({ ...p, isReal: false });
      }
    }

    // Sort by timestamp descending
    combined.sort((a, b) => b.timestamp - a.timestamp);

    res.json({
      success: true,
      timestamp: Date.now(),
      count: Math.min(combined.length, 50),
      totalQueries,
      totalRevenue: Math.round(totalRevenue * 10000) / 10000,
      onChainPayments: onChainPayments.length,
      payments: combined.slice(0, 50),
    });
  });

  /**
   * GET /api/dashboard/vehicles
   * Public — vehicle positions for the dashboard map (no payment required)
   */
  router.get("/vehicles", (_req: Request, res: Response) => {
    recordQuery();
    const publicData = simulator.getPublicData();

    res.json({
      success: true,
      timestamp: Date.now(),
      count: publicData.length,
      vehicles: publicData,
    });
  });

  /**
   * GET /api/dashboard/contract-stats
   * Public — live on-chain contract statistics
   */
  router.get("/contract-stats", async (_req: Request, res: Response) => {
    try {
      const contractStats = await x402Verifier.getContractStats();
      const historicalCount = eventStream.getCount();

      res.json({
        success: true,
        timestamp: Date.now(),
        contract: {
          address: process.env.CONTRACT_ADDRESS || "0xe551CbbF162e7d3A1fDF4ba994aC01c02176b9a5",
          network: "arc-testnet",
          chainId: 5042002,
          ...contractStats,
        },
        historicalPaymentsLoaded: historicalCount,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({
        success: false,
        error: `Failed to fetch contract stats: ${message}`,
      });
    }
  });

  return router;
}
