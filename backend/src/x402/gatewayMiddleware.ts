/**
 * Circle Nanopayments Gateway Middleware
 *
 * Uses @circle-fin/x402-batching/server for official Circle Nanopayments integration.
 * This replaces custom x402 middleware with Circle's batched settlement system:
 * - Gas-free USDC payments (Circle covers batch settlement costs)
 * - Sub-cent transactions ($0.000001 minimum)
 * - EIP-3009 off-chain authorizations
 * - Batched on-chain settlement via Circle Gateway
 */

import { createGatewayMiddleware } from "@circle-fin/x402-batching/server";
import type { GatewayMiddleware, PaymentRequest } from "@circle-fin/x402-batching/server";
import { config } from "../config.js";

// Seller address = municipality wallet (same as contract deployer)
const SELLER_ADDRESS = "0xF505e2E71df58D7244189072008f25f6b6aaE5ae";

// Create Gateway middleware instance — accepts payments on all supported networks
let gateway: GatewayMiddleware;

try {
  gateway = createGatewayMiddleware({
    sellerAddress: SELLER_ADDRESS,
    // Accept payments on Arc Testnet (primary) + all other supported networks
    description: "CityPulse Istanbul — Municipal traffic data via Circle Nanopayments",
  });
  console.log("[Gateway] Circle Nanopayments middleware initialized");
} catch (err) {
  console.error("[Gateway] Failed to initialize:", err instanceof Error ? err.message : err);
  // Fallback: create a basic middleware that always returns 402
  gateway = {
    require: () => (_req, res, _next) => {
      (res as any).status(503).json({ error: "Circle Nanopayments not available" });
    },
    verify: async () => ({ valid: false, error: "Not initialized" }),
    settle: async () => ({ success: false, error: "Not initialized" }),
  };
}

// Export pre-configured price middlewares for each endpoint
export const nanopayRouteMiddleware = gateway.require("$0.0005");
export const nanopayParkingMiddleware = gateway.require("$0.0001");
export const nanopayVehicleMiddleware = gateway.require("$0.001");
export const nanopayZoneMiddleware = gateway.require("$0.0005");

export { gateway };
export type { PaymentRequest };
