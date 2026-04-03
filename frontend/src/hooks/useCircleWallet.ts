"use client";

import { useState, useCallback } from "react";
import { BACKEND_URL } from "@/lib/constants";

interface CircleWalletState {
  sessionId: string | null;
  walletId: string | null;
  address: string | null;
  balance: string;
  isCreating: boolean;
  error: string | null;
  type: "circle";
}

export function useCircleWallet() {
  const [state, setState] = useState<CircleWalletState>({
    sessionId: null,
    walletId: null,
    address: null,
    balance: "0",
    isCreating: false,
    error: null,
    type: "circle",
  });

  const createWallet = useCallback(async () => {
    setState((s) => ({ ...s, isCreating: true, error: null }));

    try {
      const res = await fetch(`${BACKEND_URL}/api/circle/wallet/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create wallet");
      }

      setState({
        sessionId: data.sessionId,
        walletId: data.wallet.id,
        address: data.wallet.address,
        balance: "0",
        isCreating: false,
        error: null,
        type: "circle",
      });

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create wallet";
      setState((s) => ({ ...s, isCreating: false, error: message }));
      return null;
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!state.sessionId) return;

    try {
      const res = await fetch(
        `${BACKEND_URL}/api/circle/wallet/${state.sessionId}/balance`
      );
      const data = await res.json();
      if (data.success) {
        setState((s) => ({ ...s, balance: data.balance || "0" }));
      }
    } catch {
      // ignore
    }
  }, [state.sessionId]);

  const payForRoute = useCallback(
    async (fromZone: string, toZone: string, vehicleCount: number) => {
      if (!state.sessionId) throw new Error("No Circle wallet");

      const res = await fetch(
        `${BACKEND_URL}/api/circle/wallet/${state.sessionId}/pay-route`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fromZone, toZone, vehicleCount }),
        }
      );

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Payment failed");

      return { txHash: data.txHash, cost: data.cost };
    },
    [state.sessionId]
  );

  const payForParking = useCallback(
    async (zone: string) => {
      if (!state.sessionId) throw new Error("No Circle wallet");

      const res = await fetch(
        `${BACKEND_URL}/api/circle/wallet/${state.sessionId}/pay-parking`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ zone }),
        }
      );

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Payment failed");

      return { txHash: data.txHash, cost: data.cost };
    },
    [state.sessionId]
  );

  const disconnect = useCallback(() => {
    setState({
      sessionId: null,
      walletId: null,
      address: null,
      balance: "0",
      isCreating: false,
      error: null,
      type: "circle",
    });
  }, []);

  return {
    ...state,
    createWallet,
    refreshBalance,
    payForRoute,
    payForParking,
    disconnect,
  };
}
