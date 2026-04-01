import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import { VehicleSimulator } from "../simulator/vehicleSimulator.js";
import { recordPayment } from "../routes/dashboardRoutes.js";
import { eventStream, ContractPayment } from "../services/eventStream.js";
import { demoSimulator } from "../services/demoSimulator.js";

const ZONES = [
  "Eminonu",
  "Taksim",
  "Kadikoy",
  "Levent",
  "Bakirkoy",
  "Besiktas",
  "Fatih",
  "Sisli",
  "Beyoglu",
  "Uskudar",
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
  // Track which clients have focus for potential debouncing
  setInterval(() => {
    const publicData = simulator.getPublicData();
    io.emit("vehicle_update", {
      timestamp: Date.now(),
      vehicles: publicData,
    });
  }, 500);

  // --- Real contract payment events ---
  // When eventStream detects a new on-chain payment, broadcast it
  eventStream.onNewPayment((contractPayment: ContractPayment) => {
    const payment = {
      id: `real_${contractPayment.txHash.slice(0, 16)}_${Date.now()}`,
      txHash: contractPayment.txHash,
      from: contractPayment.driver,
      endpoint: `/api/traffic/route/${contractPayment.fromZone}-${contractPayment.toZone}`,
      amount: contractPayment.amount,
      timestamp: contractPayment.timestamp * 1000 || Date.now(),
      zone: contractPayment.fromZone,
      fromZone: contractPayment.fromZone,
      toZone: contractPayment.toZone,
      vehiclesQueried: contractPayment.vehiclesQueried,
      blockNumber: contractPayment.blockNumber,
      isReal: true,
    };

    // Record in dashboard store
    recordPayment({
      id: payment.id,
      txHash: payment.txHash,
      from: payment.from,
      endpoint: payment.endpoint,
      amount: payment.amount,
      timestamp: payment.timestamp,
      zone: payment.zone,
    });

    // Broadcast to all connected clients
    io.emit("payment", payment);
    console.log(
      `[WS] Real payment broadcast: ${contractPayment.fromZone} -> ${contractPayment.toZone}, ${contractPayment.amount} ETH`,
    );
  });

  // --- Demo simulator payment events ---
  // When demo simulator sends a payment, it shows up via eventStream (on-chain),
  // but we also log the intent here
  demoSimulator.onPayment((info) => {
    console.log(
      `[WS] Demo payment sent: ${info.fromZone} -> ${info.toZone}, tx: ${info.txHash.slice(0, 16)}...`,
    );
  });

  // --- Simulated (fake) payments for visual activity ---
  // These are purely cosmetic and clearly marked as simulated
  function scheduleSimulatedPayment(): void {
    const delay = 5000 + Math.random() * 10000; // 5-15 seconds
    setTimeout(() => {
      const endpointIdx = Math.floor(Math.random() * ENDPOINTS.length);
      const zone = ZONES[Math.floor(Math.random() * ZONES.length)];

      const payment = {
        id: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        txHash: randomTxHash(),
        from: randomAddress(),
        endpoint: ENDPOINTS[endpointIdx],
        amount: AMOUNTS[endpointIdx],
        timestamp: Date.now(),
        zone,
        isReal: false,
      };

      // Record it
      recordPayment({
        id: payment.id,
        txHash: payment.txHash,
        from: payment.from,
        endpoint: payment.endpoint,
        amount: payment.amount,
        timestamp: payment.timestamp,
        zone: payment.zone,
      });

      // Broadcast to all connected clients
      io.emit("payment", payment);

      // Schedule next
      scheduleSimulatedPayment();
    }, delay);
  }

  scheduleSimulatedPayment();

  return io;
}
