import express from "express";
import cors from "cors";
import { createServer } from "http";
import { config } from "./config.js";
import { VehicleSimulator } from "./simulator/vehicleSimulator.js";
import { getCongestion } from "./simulator/trafficEngine.js";
import { createTrafficRoutes } from "./routes/trafficRoutes.js";
import { createRouteOptimizerRoutes } from "./routes/routeOptimizer.js";
import { createDashboardRoutes } from "./routes/dashboardRoutes.js";
import { setupWebSocket } from "./websocket/vehicleStream.js";

// --- Initialize ---
const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// --- Vehicle Simulator ---
const simulator = new VehicleSimulator();
simulator.setCongestionFunction(getCongestion);

// --- Routes ---
app.use("/api/traffic", createTrafficRoutes(simulator));
app.use("/api/route", createRouteOptimizerRoutes(simulator));
app.use("/api/dashboard", createDashboardRoutes(simulator));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: Date.now(),
    vehicles: simulator.getVehicles().length,
  });
});

// Root info
app.get("/", (_req, res) => {
  res.json({
    name: "CityPulse Istanbul",
    description: "Real-time municipal vehicle tracking with x402-protected traffic data",
    version: "1.0.0",
    vehicles: 40,
    endpoints: {
      public: {
        "GET /api/health": "Health check",
        "GET /api/dashboard/stats": "System statistics",
        "GET /api/dashboard/heatmap": "Congestion heatmap data",
        "GET /api/dashboard/payments": "Recent payment history",
        "GET /api/dashboard/vehicles": "Public vehicle positions",
      },
      x402Protected: {
        "GET /api/traffic/vehicles": "Real-time vehicle positions (0.0001 ETH)",
        "GET /api/traffic/zone/:zone": "Zone traffic data (0.00005 ETH)",
        "POST /api/route": "Optimized routing (0.0005 ETH)",
      },
      websocket: {
        "vehicle_update": "Every 500ms — all vehicle positions",
        "payment": "Every 5-15s — simulated payment events",
      },
    },
    x402: {
      paymentHeader: "X-PAYMENT-TX",
      demoHeader: "X-DEMO-MODE: true",
      network: "arc-testnet",
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
httpServer.listen(config.port, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║           CityPulse Istanbul Backend              ║
  ║═══════════════════════════════════════════════════║
  ║  HTTP:  http://localhost:${config.port}                   ║
  ║  WS:    ws://localhost:${config.port}                     ║
  ║  Vehicles: 40 municipal units                     ║
  ║  Zones: 10 Istanbul districts                     ║
  ║  Tick: ${TICK_INTERVAL}ms                                    ║
  ╚═══════════════════════════════════════════════════╝
  `);
});

export { app, httpServer, simulator };
