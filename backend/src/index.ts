import express from "express";
import cors from "cors";
import { createServer } from "http";
import { config } from "./config.js";
import { VehicleSimulator } from "./simulator/vehicleSimulator.js";
import { getCongestion } from "./simulator/trafficEngine.js";
import { createTrafficRoutes } from "./routes/trafficRoutes.js";
import { createRouteOptimizerRoutes } from "./routes/routeOptimizer.js";
import { createDashboardRoutes } from "./routes/dashboardRoutes.js";
import { demoRoutes } from "./routes/demoRoutes.js";
import { setupWebSocket } from "./websocket/vehicleStream.js";
import { eventStream } from "./services/eventStream.js";
import { demoSimulator } from "./services/demoSimulator.js";
import { createIBBRoutes } from "./routes/ibbRoutes.js";
import { createParkingRoutes } from "./routes/parkingRoutes.js";
import { createNanopaymentRoutes } from "./routes/nanopaymentRoutes.js";
import { createCircleRoutes } from "./routes/circleRoutes.js";
import { createGatewayRoutes } from "./routes/gatewayRoutes.js";

// --- Initialize ---
const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors({
  origin: "*",
  exposedHeaders: ["PAYMENT-REQUIRED", "X-Payment-Protocol", "X-Payment-Network", "X-Payment-Currency", "X-Payment-Amount"],
}));
app.use(express.json());

// --- Vehicle Simulator ---
const simulator = new VehicleSimulator();
simulator.setCongestionFunction(getCongestion);

// --- Routes ---
app.use("/api/traffic", createTrafficRoutes(simulator));
app.use("/api/route", createRouteOptimizerRoutes(simulator));
app.use("/api/dashboard", createDashboardRoutes(simulator));
app.use("/api/demo", demoRoutes);
app.use("/api/ibb", createIBBRoutes());
app.use("/api/parking", createParkingRoutes());
app.use("/api/nanopayments", createNanopaymentRoutes());
app.use("/api/circle", createCircleRoutes());
app.use("/api/gateway", createGatewayRoutes());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: Date.now(),
    vehicles: simulator.getVehicles().length,
    contract: config.contractAddress,
    network: "arc-testnet",
    chainId: config.chainId,
    eventStreamPayments: eventStream.getCount(),
    demoSimulator: demoSimulator.getStatus(),
  });
});

// Root info
app.get("/", (_req, res) => {
  res.json({
    name: "CityPulse Istanbul",
    description: "Real-time municipal vehicle tracking with x402-protected traffic data",
    version: "2.0.0",
    vehicles: 80,
    contract: config.contractAddress,
    network: "arc-testnet",
    chainId: config.chainId,
    endpoints: {
      public: {
        "GET /api/health": "Health check",
        "GET /api/dashboard/stats": "System statistics",
        "GET /api/dashboard/heatmap": "Congestion heatmap data",
        "GET /api/dashboard/payments": "Recent payment history (real + simulated)",
        "GET /api/dashboard/vehicles": "Public vehicle positions",
        "GET /api/dashboard/contract-stats": "Live on-chain contract statistics",
      },
      x402Protected: {
        "GET /api/traffic/vehicles": "Real-time vehicle positions (0.001 ETH)",
        "GET /api/traffic/zone/:zone": "Zone traffic data (0.0005 ETH)",
        "POST /api/route": "Optimized routing (0.005 ETH)",
      },
      parking: {
        "GET /api/parking/nearby?lat=&lng=&radius=": "Nearby parking lots (free, no availability)",
        "GET /api/parking/availability?lat=&lng=&radius=": "Live parking availability (x402, 0.0001 USDC)",
        "GET /api/parking/stats": "Parking query statistics",
      },
      ibb: {
        "GET /api/ibb/traffic-index": "Real-time IBB traffic congestion index",
        "GET /api/ibb/buses": "Real IETT bus positions (SOAP)",
        "GET /api/ibb/incidents": "Traffic incidents from IBB open data",
        "GET /api/ibb/parking": "ISPARK parking occupancy (708 facilities)",
        "GET /api/ibb/all": "All IBB data combined",
        "GET /api/ibb/status": "IBB data quality and cache status",
      },
      demo: {
        "POST /api/demo/start": "Start demo simulator (real on-chain payments)",
        "POST /api/demo/stop": "Stop demo simulator",
        "GET /api/demo/status": "Demo simulator status",
      },
      websocket: {
        vehicle_update: "Every 500ms — all vehicle positions",
        payment: "Real-time — real on-chain + simulated payment events",
      },
    },
    x402: {
      paymentHeader: "X-PAYMENT-TX",
      demoHeader: "X-DEMO-MODE: true",
      network: "arc-testnet",
      chainId: 5042002,
      rpc: "https://rpc.testnet.arc.network",
    },
  });
});

// --- WebSocket ---
setupWebSocket(httpServer, simulator);

// --- Vehicle simulation loop (500ms) ---
const TICK_INTERVAL = 500;
setInterval(() => {
  simulator.update();
}, TICK_INTERVAL);

// --- Start server ---
httpServer.listen(config.port, async () => {
  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║           CityPulse Istanbul Backend v2.0         ║
  ║═══════════════════════════════════════════════════║
  ║  HTTP:  http://localhost:${config.port}                   ║
  ║  WS:    ws://localhost:${config.port}                     ║
  ║  Vehicles: 80 municipal units                     ║
  ║  Zones: 10 Istanbul districts                     ║
  ║  Tick: ${TICK_INTERVAL}ms                                    ║
  ║  Contract: ${config.contractAddress.slice(0, 10)}...${config.contractAddress.slice(-6)}       ║
  ║  Network: Arc Testnet (${config.chainId})                ║
  ╚═══════════════════════════════════════════════════╝
  `);

  // Load historical on-chain payments
  try {
    const payments = await eventStream.loadHistory(50000);
    console.log(`  [EventStream] ${payments.length} historical payments loaded`);
  } catch (err) {
    console.error("  [EventStream] Failed to load history:", err instanceof Error ? err.message : err);
  }

  // Start polling for new on-chain events
  eventStream.startPolling(10000);
  console.log("  [EventStream] Polling started (every 10s)");

  // Auto-start demo simulator if configured
  if (config.demoSimulatorEnabled) {
    try {
      await demoSimulator.start();
      console.log("  [DemoSimulator] Auto-started (DEMO_SIMULATOR=true)");
    } catch (err) {
      console.error("  [DemoSimulator] Failed to auto-start:", err instanceof Error ? err.message : err);
    }
  }
});

export { app, httpServer, simulator };
