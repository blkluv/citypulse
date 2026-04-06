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
  ready: boolean; // has gateway balance, can make payments
}

/**
 * Hook for Circle Nanopayments via x402 protocol.
 *
 * Flow:
 * 1. Connect MetaMask (get wallet)
 * 2. Deposit USDC to Gateway (one-time)
 * 3. Use paidFetch() for all API calls — automatically handles 402 → sign → pay
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

  // Store the payment-enabled fetch function
  const paidFetchRef = useRef<typeof fetch | null>(null);

  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      setState((s) => ({ ...s, error: "MetaMask not installed" }));
      return;
    }

    setState((s) => ({ ...s, isConnecting: true, error: null }));

    try {
      // 1. Request MetaMask accounts
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      }) as string[];

      const address = accounts[0];
      if (!address) throw new Error("No account found");

      // 2. Import x402 + Circle batching modules dynamically (client-only)
      const { createWalletClient, createPublicClient, custom, http } = await import("viem");
      const { arcTestnet } = await import("@/lib/viemChains");
      const { wrapFetchWithPayment, x402Client } = await import("@x402/fetch");
      const { registerBatchScheme } = await import("@circle-fin/x402-batching/client");

      // 3. Create viem clients from MetaMask
      const walletClient = createWalletClient({
        account: address as `0x${string}`,
        chain: arcTestnet,
        transport: custom(window.ethereum!),
      });

      // 4. Create x402 client with Circle Nanopayments scheme
      // BatchEvmSigner needs { address, signTypedData }
      const signer = {
        address: address as `0x${string}`,
        signTypedData: async (params: Parameters<typeof walletClient.signTypedData>[0]) => {
          return walletClient.signTypedData(params);
        },
      };

      const client = new x402Client();
      registerBatchScheme(client, {
        signer: signer as any,
      });

      // 5. Wrap fetch with x402 payment handling
      const payFetch = wrapFetchWithPayment(fetch, client);
      paidFetchRef.current = payFetch;

      // 6. Check wallet USDC balance (native on Arc)
      const publicClient = createPublicClient({
        chain: arcTestnet,
        transport: http("https://rpc.testnet.arc.network"),
      });

      const balance = await publicClient.getBalance({ address: address as `0x${string}` });
      const formattedBalance = (Number(balance) / 1e18).toFixed(4);

      setState({
        address,
        isConnecting: false,
        isDepositing: false,
        gatewayBalance: "0", // Will be updated after deposit
        walletBalance: formattedBalance,
        error: null,
        ready: true, // Can make payments via x402
      });
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
   * Make a paid API call using Circle Nanopayments.
   * Automatically handles 402 → EIP-3009 sign → retry.
   */
  const paidFetch = useCallback(
    async (url: string, init?: RequestInit): Promise<Response> => {
      const fetchFn = paidFetchRef.current;

      if (!fetchFn) {
        // Fallback: try regular fetch (will get 402 but shows the error)
        return fetch(url, init);
      }

      return fetchFn(url, init);
    },
    []
  );

  /**
   * Fetch optimized route via Nanopayments.
   */
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

  /**
   * Fetch parking availability via Nanopayments.
   */
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
