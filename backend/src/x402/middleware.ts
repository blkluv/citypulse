import { Request, Response, NextFunction } from "express";
import { x402Verifier } from "./verifier.js";
import { ethers } from "ethers";

// Extend Request to include payment info
declare global {
  namespace Express {
    interface Request {
      paymentInfo?: {
        txHash: string;
        from: string;
        amount: string;
        demoMode: boolean;
        fromZone?: string;
        toZone?: string;
        vehiclesQueried?: number;
      };
    }
  }
}

// Pricing for different endpoints
const ENDPOINT_PRICES: Record<string, { amount: string; description: string }> = {
  "/api/traffic/vehicles": {
    amount: "0.001",
    description: "Real-time vehicle positions for all 40 municipal vehicles",
  },
  "/api/traffic/zone": {
    amount: "0.0005",
    description: "Zone-specific traffic data with congestion levels",
  },
  "/api/route": {
    amount: "0.005",
    description: "AI-optimized route with live traffic data from 40 vehicles",
  },
};

function getPrice(path: string): { amount: string; description: string } {
  for (const [endpoint, price] of Object.entries(ENDPOINT_PRICES)) {
    if (path.startsWith(endpoint)) {
      return price;
    }
  }
  return { amount: "0.001", description: "Protected traffic data endpoint" };
}

/**
 * x402 payment middleware.
 *
 * - If X-DEMO-MODE: true -> bypass (keep for testing)
 * - If X-PAYMENT-TX -> verify on-chain using x402Verifier
 * - If neither -> return 402 with pricing info including contract stats
 */
export function x402Middleware(req: Request, res: Response, next: NextFunction): void {
  const demoMode = req.headers["x-demo-mode"] === "true";
  const txHash = req.headers["x-payment-tx"] as string | undefined;

  // Demo mode bypass
  if (demoMode) {
    req.paymentInfo = {
      txHash: "0x" + "0".repeat(64),
      from: "0x" + "d".repeat(40),
      amount: "0",
      demoMode: true,
    };
    next();
    return;
  }

  // No payment header -> return 402 with pricing
  if (!txHash) {
    const price = getPrice(req.path);

    // Fetch contract stats for richer 402 response
    x402Verifier
      .getContractStats()
      .then((contractStats) => {
        res.status(402).json({
          status: 402,
          message: "Payment Required",
          x402: {
            version: "1.0",
            scheme: "exact",
            network: "arc-testnet",
            chainId: 5042002,
            currency: "ETH",
            amount: price.amount,
            recipient: process.env.CONTRACT_ADDRESS || "0xe551CbbF162e7d3A1fDF4ba994aC01c02176b9a5",
            description: price.description,
            paymentHeader: "X-PAYMENT-TX",
            demoHeader: "X-DEMO-MODE",
            endpoints: ENDPOINT_PRICES,
            contractStats,
          },
        });
      })
      .catch(() => {
        // Fallback without contract stats
        res.status(402).json({
          status: 402,
          message: "Payment Required",
          x402: {
            version: "1.0",
            scheme: "exact",
            network: "arc-testnet",
            chainId: 5042002,
            currency: "ETH",
            amount: price.amount,
            recipient: process.env.CONTRACT_ADDRESS || "0xe551CbbF162e7d3A1fDF4ba994aC01c02176b9a5",
            description: price.description,
            paymentHeader: "X-PAYMENT-TX",
            demoHeader: "X-DEMO-MODE",
            endpoints: ENDPOINT_PRICES,
          },
        });
      });
    return;
  }

  // Validate tx hash format
  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    res.status(402).json({
      status: 402,
      message: "Invalid transaction hash format",
      error: "X-PAYMENT-TX must be a valid 0x-prefixed 64-character hex string",
    });
    return;
  }

  // Verify payment on-chain using the new verifier
  x402Verifier
    .verifyPayment(txHash)
    .then((result) => {
      if (result.valid && result.payment) {
        req.paymentInfo = {
          txHash,
          from: result.payment.driver,
          amount: result.payment.amount,
          demoMode: false,
          fromZone: result.payment.fromZone,
          toZone: result.payment.toZone,
          vehiclesQueried: result.payment.vehiclesQueried,
        };
        next();
      } else {
        const price = getPrice(req.path);
        res.status(402).json({
          status: 402,
          message: "Payment verification failed",
          error: result.error,
          x402: {
            version: "1.0",
            scheme: "exact",
            network: "arc-testnet",
            chainId: 5042002,
            currency: "ETH",
            amount: price.amount,
            recipient: process.env.CONTRACT_ADDRESS || "0xe551CbbF162e7d3A1fDF4ba994aC01c02176b9a5",
          },
        });
      }
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({
        status: 500,
        message: "Payment verification error",
        error: message,
      });
    });
}
