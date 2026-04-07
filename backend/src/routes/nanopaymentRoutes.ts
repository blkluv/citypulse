import { Router, Request, Response } from "express";
import { x402Verifier } from "../x402/verifier.js";
import { config } from "../config.js";

export function createNanopaymentRoutes(): Router {
  const router = Router();

  /**
   * GET /api/nanopayments/info
   * Public — Circle Nanopayments capability information.
   * Demonstrates x402 protocol compliance and sub-cent pricing.
   */
  router.get("/info", async (_req: Request, res: Response) => {
    try {
      const contractStats = await x402Verifier.getContractStats();

      res.json({
        success: true,
        protocol: "x402",
        version: "1.0",
        provider: "Circle Nanopayments",
        settlement: {
          network: "arc-testnet",
          chainId: config.chainId,
          rpc: config.arcTestnetRpcUrl,
          explorer: "https://testnet.arcscan.app",
          gasToken: "USDC (native)",
          gasNote: "Arc uses USDC as native gas — no ETH volatility, no gas fee spikes",
        },
        nanopayments: {
          description: "Sub-cent USDC payments for municipal data access on Arc",
          minPayment: "$0.0001 USDC",
          maxPayment: "$0.01 USDC",
          paymentFrequency: "Per API call / per query",
          marginExplanation: {
            arcCost: "~$0.000001 per tx (negligible gas on Arc)",
            ethereumCost: "$0.50-$2.00 per tx (gas fees)",
            savingsMultiplier: "1000x-4000x cheaper on Arc",
            whyTraditionalFails: "A $0.0001 parking query would cost $0.50+ in Ethereum gas fees — the fee is 5000x the payment amount. On Arc with Circle Nanopayments, the gas cost is negligible, making sub-cent payments economically viable.",
          },
        },
        pricingModel: {
          "route-optimization": {
            price: "$0.0005 USDC",
            endpoints: {
              legacy: "POST /api/route (X-PAYMENT-TX header)",
              nanopayments: "POST /api/route/nanopay (Circle Gateway x402)",
            },
            description: "AI-optimized route using 80 municipal vehicles",
          },
          "parking-availability": {
            price: "$0.0001 USDC",
            endpoints: {
              legacy: "GET /api/parking/availability (X-PAYMENT-TX header)",
              nanopayments: "GET /api/parking/nanopay/availability (Circle Gateway x402)",
            },
            description: "Real-time ISPARK parking occupancy (262+ facilities)",
          },
          "vehicle-positions": {
            price: "$0.001 USDC",
            endpoints: {
              legacy: "GET /api/traffic/vehicles (X-PAYMENT-TX header)",
              nanopayments: "GET /api/traffic/nanopay/vehicles (Circle Gateway x402)",
            },
            description: "Real-time positions of 80 municipal vehicles",
          },
          "zone-traffic": {
            price: "$0.0005 USDC",
            endpoints: {
              legacy: "GET /api/traffic/zone/:zone (X-PAYMENT-TX header)",
              nanopayments: "GET /api/traffic/nanopay/zone/:zone (Circle Gateway x402)",
            },
            description: "Zone-specific congestion data",
          },
        },
        contract: {
          address: config.contractAddress,
          network: "arc-testnet",
          chainId: config.chainId,
          stats: contractStats,
        },
        circleInfrastructure: {
          arc: "Settlement layer — EVM-compatible L1 by Circle",
          usdc: "Native gas token & stablecoin — no volatility",
          nanopayments: "Sub-cent, high-frequency payment processing",
          x402: "HTTP-native payment standard (402 Payment Required)",
          wallets: "Circle Programmable Wallets for seamless onboarding",
          bridgeKit: "Cross-chain USDC bridging via CCTP V2",
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: message });
    }
  });

  /**
   * GET /api/nanopayments/margin
   * Public — Economic viability proof for hackathon judges.
   */
  router.get("/margin", async (_req: Request, res: Response) => {
    const contractStats = await x402Verifier.getContractStats();
    const totalTx = contractStats.totalQueries;
    const totalRevenue = parseFloat(contractStats.totalRevenue);

    // Calculate what this would cost on Ethereum
    const ethGasCostPerTx = 0.50; // conservative estimate
    const totalEthGasCost = totalTx * ethGasCostPerTx;
    const arcGasCostPerTx = 0.000001; // negligible on Arc
    const totalArcGasCost = totalTx * arcGasCostPerTx;

    res.json({
      success: true,
      title: "Economic Viability: Why This Model Fails Without Arc + Nanopayments",
      data: {
        totalTransactions: totalTx,
        totalRevenue: `$${totalRevenue.toFixed(4)} USDC`,
        averagePaymentSize: totalTx > 0 ? `$${(totalRevenue / totalTx).toFixed(6)} USDC` : "$0",
        costComparison: {
          arc: {
            gasCostPerTx: `$${arcGasCostPerTx}`,
            totalGasCost: `$${totalArcGasCost.toFixed(4)}`,
            netRevenue: `$${(totalRevenue - totalArcGasCost).toFixed(4)}`,
            viable: true,
          },
          ethereum: {
            gasCostPerTx: `$${ethGasCostPerTx}`,
            totalGasCost: `$${totalEthGasCost.toFixed(2)}`,
            netRevenue: `$${(totalRevenue - totalEthGasCost).toFixed(2)}`,
            viable: totalRevenue > totalEthGasCost,
          },
        },
        conclusion: totalRevenue < totalEthGasCost
          ? `This model loses $${(totalEthGasCost - totalRevenue).toFixed(2)} on Ethereum but profits $${(totalRevenue - totalArcGasCost).toFixed(4)} on Arc. Circle Nanopayments + Arc make sub-cent municipal data monetization economically viable.`
          : `Arc gas costs are ${Math.round(totalEthGasCost / Math.max(totalArcGasCost, 0.01))}x cheaper than Ethereum, making per-query pricing viable.`,
      },
    });
  });

  return router;
}
