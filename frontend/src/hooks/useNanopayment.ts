"use client";

import { useState, useCallback, useRef } from "react";
import { BACKEND_URL } from "@/lib/constants";

interface NanopayState {
  address: string | null;
  isConnecting: boolean;
  isDepositing: boolean;
  gatewayBalance: string;
  walletBalance: string;
  error: string | null;
  ready: boolean;
}

/**
 * Hook for Circle Nanopayments via x402 protocol.
 *
 * Flow:
 * 1. Connect MetaMask → get wallet
 * 2. Try x402 nanopayment (sign EIP-3009 → Gateway verify → data)
 * 3. If x402 fails → fallback to demo mode for hackathon demo
 */
export function useNanopayment() {
  const [state, setState] = useState<NanopayState>({
    address: null,
    isConnecting: false,
    isDepositing: false,
    gatewayBalance: "0",
    walletBalance: "0",
    error: null,
    ready: false,
  });

  const paidFetchRef = useRef<typeof fetch | null>(null);
  const nanopayReadyRef = useRef(false);

  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      setState((s) => ({ ...s, error: "MetaMask not installed" }));
      return;
    }

    setState((s) => ({ ...s, isConnecting: true, error: null }));

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      }) as string[];

      const address = accounts[0];
      if (!address) throw new Error("No account found");

      // Try to set up x402 nanopayment client
      try {
        const { createWalletClient, createPublicClient, custom, http } = await import("viem");
        const { arcTestnet } = await import("@/lib/viemChains");
        const { wrapFetchWithPayment, x402Client } = await import("@x402/fetch");
        const { registerBatchScheme } = await import("@circle-fin/x402-batching/client");

        const walletClient = createWalletClient({
          account: address as `0x${string}`,
          chain: arcTestnet,
          transport: custom(window.ethereum!),
        });

        const signer = {
          address: address as `0x${string}`,
          signTypedData: async (params: Parameters<typeof walletClient.signTypedData>[0]) => {
            return walletClient.signTypedData(params);
          },
        };

        const client = new x402Client();
        registerBatchScheme(client, { signer: signer as any });

        const payFetch = wrapFetchWithPayment(fetch, client);
        paidFetchRef.current = payFetch;
        nanopayReadyRef.current = true;
        console.log("[Nanopay] x402 client ready");
      } catch (err) {
        console.warn("[Nanopay] x402 setup failed, will use demo mode:", err);
        nanopayReadyRef.current = false;
      }

      // Get wallet balance
      try {
        const { createPublicClient, http } = await import("viem");
        const { arcTestnet } = await import("@/lib/viemChains");
        const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });
        const balance = await publicClient.getBalance({ address: address as `0x${string}` });
        const formattedBalance = (Number(balance) / 1e18).toFixed(4);
        setState({
          address,
          isConnecting: false,
          isDepositing: false,
          gatewayBalance: "0",
          walletBalance: formattedBalance,
          error: null,
          ready: true,
        });
      } catch {
        setState({
          address,
          isConnecting: false,
          isDepositing: false,
          gatewayBalance: "0",
          walletBalance: "0",
          error: null,
          ready: true,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      setState((s) => ({
        ...s,
        isConnecting: false,
        error: message.includes("NETWORK_ERROR")
          ? "Please switch MetaMask to Arc Testnet"
          : message,
      }));
    }
  }, []);

  /**
   * Smart fetch: tries x402 nanopayment first, falls back to demo mode.
   */
  const paidFetch = useCallback(
    async (url: string, init?: RequestInit): Promise<Response> => {
      // Try x402 nanopayment first
      if (nanopayReadyRef.current && paidFetchRef.current) {
        try {
          const response = await paidFetchRef.current(url, init);
          if (response.ok) return response;
        } catch (err) {
          console.warn("[Nanopay] x402 payment failed, falling back to demo mode:", err);
        }
      }

      // Fallback: demo mode (for hackathon demo)
      const headers: Record<string, string> = {
        ...(init?.headers as Record<string, string> || {}),
        "X-DEMO-MODE": "true",
      };

      return fetch(url, { ...init, headers });
    },
    []
  );

  const fetchPaidRoute = useCallback(
    async (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
      const response = await paidFetch(`${BACKEND_URL}/api/route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Request failed: ${response.status}`);
      }

      return response.json();
    },
    [paidFetch]
  );

  const fetchPaidParking = useCallback(
    async (lat: number, lng: number, radius = 1000) => {
      const response = await paidFetch(
        `${BACKEND_URL}/api/parking/availability?lat=${lat}&lng=${lng}&radius=${radius}`
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Request failed: ${response.status}`);
      }

      return response.json();
    },
    [paidFetch]
  );

  const disconnect = useCallback(() => {
    paidFetchRef.current = null;
    nanopayReadyRef.current = false;
    setState({
      address: null,
      isConnecting: false,
      isDepositing: false,
      gatewayBalance: "0",
      walletBalance: "0",
      error: null,
      ready: false,
    });
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    paidFetch,
    fetchPaidRoute,
    fetchPaidParking,
  };
}
