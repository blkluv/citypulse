/**
 * Circle Nanopayments Gateway Middleware
 *
 * Uses @circle-fin/x402-batching/server for official Circle Nanopayments.
 * Also supports demo mode bypass (X-DEMO-MODE header) for hackathon demos.
 */

import { createGatewayMiddleware } from "@circle-fin/x402-batching/server";
import type { GatewayMiddleware, PaymentRequest } from "@circle-fin/x402-batching/server";
import type { Request, Response, NextFunction } from "express";

const SELLER_ADDRESS = "0xF505e2E71df58D7244189072008f25f6b6aaE5ae";

let gateway: GatewayMiddleware;

try {
  gateway = createGatewayMiddleware({
    sellerAddress: SELLER_ADDRESS,
    description: "CityPulse Istanbul — Municipal traffic data via Circle Nanopayments",
  });
  console.log("[Gateway] Circle Nanopayments middleware initialized");
} catch (err) {
  console.error("[Gateway] Failed to initialize:", err instanceof Error ? err.message : err);
  gateway = {
    require: () => (_req: any, res: any, _next: any) => {
      res.status(503).json({ error: "Circle Nanopayments not available" });
    },
    verify: async () => ({ valid: false, error: "Not initialized" }),
    settle: async () => ({ success: false, error: "Not initialized" }),
  };
}

/**
 * Wrap Gateway middleware with demo mode bypass.
 * If X-DEMO-MODE: true header is present, skip payment and proceed.
 * Otherwise, use Circle Nanopayments Gateway middleware.
 */
function withDemoBypass(gatewayMiddleware: ReturnType<GatewayMiddleware["require"]>) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Demo mode bypass — for hackathon demonstrations
    if (req.headers["x-demo-mode"] === "true") {
      (req as any).payment = {
        verified: true,
        payer: "0x" + "d".repeat(40),
        amount: "0",
        network: "demo",
      };
      next();
      return;
    }

    // Use Circle Nanopayments Gateway middleware
    (gatewayMiddleware as any)(req, res, next);
  };
}

// Export pre-configured price middlewares with demo bypass
export const nanopayRouteMiddleware = withDemoBypass(gateway.require("$0.0005"));
export const nanopayParkingMiddleware = withDemoBypass(gateway.require("$0.0001"));
export const nanopayVehicleMiddleware = withDemoBypass(gateway.require("$0.001"));
export const nanopayZoneMiddleware = withDemoBypass(gateway.require("$0.0005"));

export { gateway };
export type { PaymentRequest };
