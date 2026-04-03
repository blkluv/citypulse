"use client";

import { useState, useCallback } from "react";
import { useContract } from "./useContract";
import { BACKEND_URL } from "@/lib/constants";
import type { RouteResult } from "@/types";

interface PaymentState {
  loading: boolean;
  error: string | null;
  result: RouteResult | null;
  txHash: string | null;
}

export function usePayment() {
  const contract = useContract();
  const [paymentState, setPaymentState] = useState<PaymentState>({
    loading: false,
    error: null,
    result: null,
    txHash: null,
  });

  const payForRoute = useCallback(
    async (
      fromZone: string,
      toZone: string,
      vehicleCount: number,
      fromCoords?: { lat: number; lng: number },
      toCoords?: { lat: number; lng: number }
    ): Promise<RouteResult | null> => {
      setPaymentState({
        loading: true,
        error: null,
        result: null,
        txHash: null,
      });

      try {
        // Step 1: Pay on-chain — NO fallback, real payment required
        if (!contract.address) {
          throw new Error("Connect your wallet first");
        }

        const { txHash } = await contract.payForRoute(
          fromZone,
          toZone,
          vehicleCount
        );

        setPaymentState((s) => ({ ...s, txHash }));

        // Step 2: Send REAL tx hash to backend — no demo mode
        const from = fromCoords || { lat: 41.04, lng: 28.99 };
        const to = toCoords || { lat: 41.01, lng: 28.97 };

        const response = await fetch(`${BACKEND_URL}/api/route`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-PAYMENT-TX": txHash,
          },
          body: JSON.stringify({ from, to }),
        });

        if (!response.ok) {
          throw new Error(
            `Payment sent (tx: ${txHash.slice(0, 10)}...) but route fetch failed. Your payment is on-chain — refresh and try again.`
          );
        }

        const result: RouteResult = await response.json();
        setPaymentState({
          loading: false,
          error: null,
          result,
          txHash,
        });

        return result;
      } catch (err: unknown) {
        const error = err as Error;
        setPaymentState({
          loading: false,
          error: error.message || "Payment failed",
          result: null,
          txHash: null,
        });
        return null;
      }
    },
    [contract]
  );

  const clearResult = useCallback(() => {
    setPaymentState({
      loading: false,
      error: null,
      result: null,
      txHash: null,
    });
  }, []);

  return {
    ...paymentState,
    payForRoute,
    clearResult,
    wallet: contract,
  };
}
