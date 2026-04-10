"use client";

import { useState, useCallback } from "react";
import { useContract } from "./useContract";
import { BACKEND_URL } from "@/lib/constants";

export interface ParkingLot {
  id: number;
  name: string;
  lat: number;
  lng: number;
  capacity: number;
  emptyCapacity: number;
  occupied: number;
  available: number;
  occupancyRate: number;
  status: "open" | "closed" | "full";
  color: "green" | "yellow" | "red";
  district: string;
  parkType: string;
  distance: number;
}

export interface LockedParkingLot {
  id: number;
  name: string;
  lat: number;
  lng: number;
  district: string;
  parkType: string;
  isOpen: boolean;
  distance: number;
}

interface ParkingState {
  nearbyLots: LockedParkingLot[];
  unlockedLots: ParkingLot[];
  loading: boolean;
  unlocking: boolean;
  error: string | null;
  txHash: string | null;
  unlocked: boolean;
  validUntil: number | null;
  searchCenter: { lat: number; lng: number } | null;
}

export function useParkingPayment() {
  const contract = useContract();
  const [state, setState] = useState<ParkingState>({
    nearbyLots: [],
    unlockedLots: [],
    loading: false,
    unlocking: false,
    error: null,
    txHash: null,
    unlocked: false,
    validUntil: null,
    searchCenter: null,
  });

  // Step 1: Fetch nearby parking lots (FREE, no payment)
  const searchNearby = useCallback(
    async (lat: number, lng: number, radius = 1000) => {
      setState((s) => ({
        ...s,
        loading: true,
        error: null,
        unlocked: false,
        unlockedLots: [],
        txHash: null,
        validUntil: null,
        searchCenter: { lat, lng },
      }));

      try {
        const res = await fetch(
          `${BACKEND_URL}/api/parking/nearby?lat=${lat}&lng=${lng}&radius=${radius}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        setState((s) => ({
          ...s,
          loading: false,
          nearbyLots: data.parkingLots || [],
        }));

        return data.parkingLots || [];
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to search";
        setState((s) => ({
          ...s,
          loading: false,
          error: message,
        }));
        return [];
      }
    },
    []
  );

  // Step 2: Pay on-chain + unlock live availability data
  const unlockAvailability = useCallback(
    async (lat: number, lng: number, radius = 1000) => {
      setState((s) => ({ ...s, unlocking: true, error: null }));

      try {
        if (!contract.address) {
          throw new Error("Connect your wallet first");
        }

        // Determine zone from search coordinates using polygon detection
        let zone = "Istanbul";
        if (state.searchCenter) {
          const { detectZone } = await import("@/lib/zones");
          zone = detectZone(state.searchCenter.lat, state.searchCenter.lng);
        } else if (state.nearbyLots.length > 0 && state.nearbyLots[0].district) {
          zone = state.nearbyLots[0].district;
        }

        // Pay on-chain
        const { txHash } = await contract.payForParking(zone);

        setState((s) => ({ ...s, txHash }));

        // Fetch availability with payment proof
        const res = await fetch(
          `${BACKEND_URL}/api/parking/availability?lat=${lat}&lng=${lng}&radius=${radius}`,
          {
            headers: {
              "X-PAYMENT-TX": txHash,
            },
          }
        );

        if (!res.ok) {
          throw new Error(`Availability fetch failed: ${res.status}`);
        }

        const data = await res.json();

        setState((s) => ({
          ...s,
          unlocking: false,
          unlocked: true,
          unlockedLots: data.parkingLots || [],
          validUntil: data.validUntil || Date.now() + 15 * 60 * 1000,
        }));

        return data.parkingLots || [];
      } catch (err) {
        const message = err instanceof Error ? err.message : "Payment failed";
        setState((s) => ({
          ...s,
          unlocking: false,
          error: message,
        }));
        return [];
      }
    },
    [contract, state.nearbyLots]
  );

  const reset = useCallback(() => {
    setState({
      nearbyLots: [],
      unlockedLots: [],
      loading: false,
      unlocking: false,
      error: null,
      txHash: null,
      unlocked: false,
      validUntil: null,
      searchCenter: null,
    });
  }, []);

  return {
    ...state,
    searchNearby,
    unlockAvailability,
    reset,
    wallet: contract,
  };
}
