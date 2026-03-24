import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import { VehicleSimulator } from "../simulator/vehicleSimulator.js";
import { recordPayment } from "../routes/dashboardRoutes.js";

const ZONES = [
  "Eminonu", "Taksim", "Kadikoy", "Levent", "Bakirkoy",
  "Besiktas", "Fatih", "Sisli", "Beyoglu", "Uskudar",
];

const ENDPOINTS = [
  "/api/traffic/vehicles",
  "/api/traffic/zone/Taksim",
  "/api/traffic/zone/Kadikoy",
  "/api/route",
  "/api/traffic/zone/Eminonu",
];

const AMOUNTS = ["0.0001", "0.00005", "0.00005", "0.0005", "0.00005"];

function randomAddress(): string {
  const chars = "0123456789abcdef";
  let addr = "0x";
  for (let i = 0; i < 40; i++) {
    addr += chars[Math.floor(Math.random() * chars.length)];
  }
  return addr;
}

function randomTxHash(): string {
  const chars = "0123456789abcdef";
  let hash = "0x";
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

export function setupWebSocket(
  httpServer: HttpServer,
  simulator: VehicleSimulator,
): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    // Send initial vehicle data
    socket.emit("vehicle_update", {
      timestamp: Date.now(),
      vehicles: simulator.getPublicData(),
    });

    socket.on("disconnect", () => {
      console.log(`[WS] Client disconnected: ${socket.id}`);
    });
  });

  // Broadcast vehicle updates every 500ms
  setInterval(() => {
    io.emit("vehicle_update", {
      timestamp: Date.now(),
      vehicles: simulator.getPublicData(),
    });
  }, 500);

  // Simulate payments every 5-15 seconds
  function schedulePayment(): void {
    const delay = 5000 + Math.random() * 10000; // 5-15 seconds
    setTimeout(() => {
      const endpointIdx = Math.floor(Math.random() * ENDPOINTS.length);
      const zone = ZONES[Math.floor(Math.random() * ZONES.length)];

      const payment = {
        id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        txHash: randomTxHash(),
        from: randomAddress(),
        endpoint: ENDPOINTS[endpointIdx],
        amount: AMOUNTS[endpointIdx],
        timestamp: Date.now(),
        zone,
      };

      // Record it
      recordPayment(payment);

      // Broadcast to all connected clients
      io.emit("payment", payment);

      // Schedule next
      schedulePayment();
    }, delay);
  }

  schedulePayment();

  return io;
}
