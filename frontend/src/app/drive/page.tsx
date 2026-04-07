"use client";

import { useState, useCallback, useMemo } from "react";
import { DynamicDriveMap } from "@/components/Drive/DynamicDriveMap";
import { SearchOverlay } from "@/components/Drive/SearchOverlay";
import { NavigationCard } from "@/components/Drive/NavigationCard";
import { useVehicleStream } from "@/hooks/useVehicleStream";
import { useNanopayment } from "@/hooks/useNanopayment";
import type { RouteResult } from "@/types";
import { BACKEND_URL } from "@/lib/constants";
import { detectZone } from "@/lib/zones";
import { MobileTabBar } from "@/components/common/MobileTabBar";

/** Haversine distance in km */
function haversineKm(
  lat1: number, lng1: number, lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface BaselineRoute {
  route: [number, number][];
  distance: number; // meters
  duration: number; // minutes
}

type DrivePhase = "search" | "baseline" | "comparison" | "navigating";

export default function DrivePage() {
  const { vehicles } = useVehicleStream();
  const nanopay = useNanopayment();

  // Compat aliases
  const paymentLoading = false;
  const paymentError = nanopay.error;
  const wallet = {
    address: nanopay.address,
    balance: nanopay.walletBalance,
    isConnecting: nanopay.isConnecting,
    connect: nanopay.connect,
  };

  const [phase, setPhase] = useState<DrivePhase>("search");
  const [startPoint, setStartPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [endPoint, setEndPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [startName, setStartName] = useState("");
  const [endName, setEndName] = useState("");
  const [mapClickMode, setMapClickMode] = useState(false);

  // Phase 1: Free baseline route (OSRM, no vehicle data)
  const [baseline, setBaseline] = useState<BaselineRoute | null>(null);
  const [baselineLoading, setBaselineLoading] = useState(false);

  // Phase 2: Paid CityPulse route (after x402 payment)
  const [paidRoute, setPaidRoute] = useState<RouteResult | null>(null);
  const [paidCost, setPaidCost] = useState("0.0005");

  // Estimate cost before payment (no backend call)
  const estimate = useMemo(() => {
    if (!startPoint || !endPoint) return null;
    const midLat = (startPoint.lat + endPoint.lat) / 2;
    const midLng = (startPoint.lng + endPoint.lng) / 2;
    const nearbyVehicles = vehicles.filter(
      (v) => haversineKm(v.lat, v.lng, midLat, midLng) < 3
    );
    const vehicleCount = Math.max(nearbyVehicles.length, 1);
    const cost = (vehicleCount * 0.0001).toFixed(4);
    return { vehicleCount, cost };
  }, [startPoint, endPoint, vehicles]);

  // Fetch FREE baseline route from OSRM (public endpoint, no payment)
  const fetchBaseline = useCallback(
    async (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
      setBaselineLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/route/baseline`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from, to }),
        });
        if (res.ok) {
          const data = await res.json();
          setBaseline({
            route: data.route,
            distance: data.distance,
            duration: data.duration,
          });
          setPhase("baseline");
        }
      } catch {
        // Baseline fetch failed
      } finally {
        setBaselineLoading(false);
      }
    },
    []
  );

  const handleSetStart = useCallback(
    (coords: { lat: number; lng: number }, name: string) => {
      setStartPoint(coords);
      setStartName(name);
      if (endPoint) fetchBaseline(coords, endPoint);
    },
    [endPoint, fetchBaseline]
  );

  const handleSetEnd = useCallback(
    (coords: { lat: number; lng: number }, name: string) => {
      setEndPoint(coords);
      setEndName(name);
      if (startPoint) fetchBaseline(startPoint, coords);
    },
    [startPoint, fetchBaseline]
  );

  const [validationError, setValidationError] = useState<string | null>(null);

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (!mapClickMode) return;
      setValidationError(null);

      // Sea/outside Istanbul check
      if (lat < 40.80 || lat > 41.30 || lng < 28.50 || lng > 29.40) {
        setValidationError("Please select a point on land within Istanbul");
        return;
      }

      const name = detectZone(lat, lng);
      if (!startPoint) {
        handleSetStart({ lat, lng }, name);
      } else if (!endPoint) {
        // Same point check
        const dist = Math.sqrt(
          Math.pow((lat - startPoint.lat) * 111000, 2) +
          Math.pow((lng - startPoint.lng) * 85000, 2)
        );
        if (dist < 100) {
          setValidationError("Start and end points must be different");
          return;
        }
        handleSetEnd({ lat, lng }, name);
      }
    },
    [mapClickMode, startPoint, endPoint, handleSetStart, handleSetEnd]
  );

  const handleClear = useCallback(() => {
    setStartPoint(null);
    setEndPoint(null);
    setStartName("");
    setEndName("");
    setBaseline(null);
    setPaidRoute(null);
    setPhase("search");
  }, []);

  // PAY → Circle Nanopayments x402 flow (gas-free EIP-3009)
  const [payInProgress, setPayInProgress] = useState(false);

  const handlePay = useCallback(async () => {
    if (!startPoint || !endPoint || payInProgress) return;

    setPayInProgress(true);
    try {
      // Circle Nanopayments: fetch with automatic 402 → sign → retry
      const result = await nanopay.fetchPaidRoute(startPoint, endPoint);

      if (result) {
        setPaidRoute(result);
        setPaidCost(result.cost || "0.0005");
        setPhase("comparison");
      }
    } catch (err) {
      console.error("Payment failed:", err);
    } finally {
      setPayInProgress(false);
    }
  }, [startPoint, endPoint, nanopay, payInProgress]);

  const handleEndNavigation = useCallback(() => {
    handleClear();
  }, [handleClear]);

  // Build a display route for the map
  // Baseline phase: show only the free OSRM route (red)
  // Navigating phase: show both normal + optimized from paid result
  const displayRoute: RouteResult | null = useMemo(() => {
    if ((phase === "navigating" || phase === "comparison") && paidRoute) return paidRoute;
    if (phase === "baseline" && baseline) {
      // Show baseline as "normalRoute" only (red dashed on map)
      return {
        normalRoute: baseline.route,
        optimizedRoute: [], // no optimized yet — need to pay
        normalTime: baseline.duration,
        optimizedTime: 0,
        savedMinutes: 0,
        vehiclesUsed: [],
        cost: "0",
      };
    }
    return null;
  }, [phase, paidRoute, baseline]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0a0f1e] relative">
      {/* Full-screen map */}
      <DynamicDriveMap
        vehicles={vehicles}
        routeResult={displayRoute}
        startPoint={startPoint}
        endPoint={endPoint}
        onMapClick={handleMapClick}
        mapClickEnabled={mapClickMode}
      />

      {/* Search overlay (top) */}
      {phase !== "navigating" && phase !== "comparison" && (
        <SearchOverlay
          startPoint={startPoint}
          endPoint={endPoint}
          onSetStart={handleSetStart}
          onSetEnd={handleSetEnd}
          onClear={handleClear}
          mapClickMode={mapClickMode}
          onToggleMapClick={() => setMapClickMode((m) => !m)}
          startName={startName}
          endName={endName}
        />
      )}

      {/* Loading spinner for baseline fetch */}
      {baselineLoading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[900]">
          <div className="bg-[#0a0f1e]/90 backdrop-blur-xl rounded-2xl px-6 py-4 flex items-center gap-3 border border-[#2a3040]">
            <div className="w-5 h-5 border-2 border-[#00f0ff]/30 border-t-[#00f0ff] rounded-full animate-spin" />
            <span className="text-sm text-[#8892a4]">Calculating route...</span>
          </div>
        </div>
      )}

      {/* BASELINE PHASE: Free route shown, offer CityPulse upgrade */}
      {phase === "baseline" && baseline && estimate && (
        <div className="absolute bottom-0 left-0 right-0 z-[900] p-4 animate-[drive-card-slide-up_0.4s_ease-out]">
          <div className="max-w-lg mx-auto bg-[#0a0f1e]/95 backdrop-blur-xl rounded-2xl border border-[#2a3040] p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#f0f4f8] font-semibold">
                {startName} → {endName}
              </h3>
              <button
                onClick={handleClear}
                className="text-[#8892a4] hover:text-[#f0f4f8] text-lg leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Baseline route (free, already shown on map) */}
            <div className="p-3 rounded-lg bg-[#ff4060]/10 border border-[#ff4060]/20 mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#ff4060]" />
                  <span className="text-[#f0f4f8] text-sm">Standard route</span>
                  <span className="text-[10px] text-[#8892a4] bg-[#2a3040] px-1.5 py-0.5 rounded">FREE</span>
                </div>
                <div className="text-right">
                  <span className="text-[#ff4060] font-mono font-bold">{baseline.duration} min</span>
                  <span className="text-[#8892a4] text-xs ml-2">{(baseline.distance / 1000).toFixed(1)} km</span>
                </div>
              </div>
              <p className="text-[10px] text-[#8892a4] mt-1">OSRM baseline — no real-time traffic data</p>
            </div>

            {/* CityPulse upgrade offer (locked, need to pay) */}
            <div className="p-3 rounded-lg bg-[#00f0ff]/5 border border-[#00f0ff]/20 border-dashed mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#00f0ff]" />
                  <span className="text-[#f0f4f8] text-sm">CityPulse route</span>
                  <span className="text-[10px] text-[#ffd700] bg-[#ffd700]/10 px-1.5 py-0.5 rounded">{estimate.cost} USDC</span>
                </div>
                <div className="text-right">
                  <span className="text-[#8892a4] font-mono text-sm">? min</span>
                  <span className="text-[10px] text-[#8892a4] ml-2">? km</span>
                </div>
              </div>
              <p className="text-[10px] text-[#8892a4] mt-1">
                Optimized with {estimate.vehicleCount} municipal vehicles on route — pay to unlock
              </p>
            </div>

            {/* Wallet + Pay button */}
            {!wallet.address ? (
              <button
                onClick={wallet.connect}
                disabled={wallet.isConnecting}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer
                  bg-[#ffd700] text-[#0a0f1e] hover:bg-[#e6c200] active:scale-[0.98]
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {wallet.isConnecting ? "Connecting..." : "Connect Wallet to Pay"}
              </button>
            ) : (
              <button
                onClick={handlePay}
                disabled={paymentLoading}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer
                  bg-[#00f0ff] text-[#0a0f1e] hover:bg-[#00d4e0] active:scale-[0.98]
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {paymentLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-[#0a0f1e]/30 border-t-[#0a0f1e] rounded-full animate-spin" />
                    Verifying payment on Arc...
                  </span>
                ) : (
                  `Pay ${estimate.cost} USDC — Unlock Faster Route`
                )}
              </button>
            )}

            {wallet.address && (
              <p className="text-[10px] text-[#00ff88] text-center mt-2 font-mono">
                {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)} · {wallet.balance} USDC
              </p>
            )}

            {paymentError && (
              <p className="text-[#ff4060] text-xs mt-2 text-center">{paymentError}</p>
            )}

            <p className="text-[10px] text-[#8892a4] text-center mt-1">
              On-chain payment on Arc Testnet · Route unlocks after verification
            </p>
          </div>
        </div>
      )}

      {/* COMPARISON PHASE: Both routes shown, user confirms to start navigation */}
      {phase === "comparison" && paidRoute && (
        <div className="absolute bottom-0 left-0 right-0 z-[900] p-4 animate-[drive-card-slide-up_0.4s_ease-out]">
          <div className="max-w-lg mx-auto bg-[#0a0f1e]/95 backdrop-blur-xl rounded-2xl border border-[#2a3040] p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[#f0f4f8] font-semibold">Route Unlocked</h3>
              <span className="text-[10px] text-[#00ff88] bg-[#00ff88]/10 px-2 py-0.5 rounded-full">PAID</span>
            </div>

            {/* Normal route */}
            <div className="p-3 rounded-lg bg-[#ff4060]/10 border border-[#ff4060]/20 mb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#ff4060]" />
                  <span className="text-[#f0f4f8] text-sm">Normal route</span>
                </div>
                <div>
                  <span className="text-[#ff4060] font-mono font-bold text-lg">{paidRoute.normalTime} min</span>
                  {paidRoute.routeDetails && (
                    <span className="text-[#8892a4] text-xs ml-2">{(paidRoute.routeDetails.normalDistance / 1000).toFixed(1)} km</span>
                  )}
                </div>
              </div>
            </div>

            {/* CityPulse route */}
            <div className="p-3 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/30 mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#00f0ff]" />
                  <span className="text-[#f0f4f8] text-sm font-medium">CityPulse route</span>
                </div>
                <div>
                  <span className="text-[#00f0ff] font-mono font-bold text-lg">{paidRoute.optimizedTime} min</span>
                  {paidRoute.routeDetails && (
                    <span className="text-[#8892a4] text-xs ml-2">{(paidRoute.routeDetails.optimizedDistance / 1000).toFixed(1)} km</span>
                  )}
                </div>
              </div>
            </div>

            {/* Savings highlight */}
            <div className="flex items-center justify-center gap-4 mb-4 py-2 rounded-lg bg-[#00ff88]/5 border border-[#00ff88]/20">
              <span className="text-[#00ff88] font-bold text-lg">{paidRoute.savedMinutes} min faster</span>
              <span className="text-[#8892a4] text-xs">|</span>
              <span className="text-[#8892a4] text-xs">{paidRoute.vehiclesUsed?.length || 0} vehicles used</span>
              <span className="text-[#8892a4] text-xs">|</span>
              <span className="text-[#ffd700] text-xs">{paidCost} USDC paid</span>
            </div>

            {/* Start navigation button */}
            <button
              onClick={() => setPhase("navigating")}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer
                bg-[#00ff88] text-[#0a0f1e] hover:bg-[#00e077] active:scale-[0.98]"
            >
              Start Navigation — CityPulse Route
            </button>

            <button
              onClick={handleClear}
              className="w-full py-2 mt-2 rounded-xl text-xs text-[#8892a4] hover:text-[#f0f4f8] transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* NAVIGATING PHASE: Turn-by-turn directions */}
      {phase === "navigating" && paidRoute && (
        <NavigationCard
          route={paidRoute}
          cost={paidCost}
          onEndNavigation={handleEndNavigation}
        />
      )}

      {/* Top bar — nav + wallet */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <a href="/" className="bg-[#0a0f1e]/90 backdrop-blur-xl rounded-xl px-3 py-2 border border-[#2a3040] text-sm font-bold">
            <span className="text-[#00f0ff]">City</span><span className="text-[#f0f4f8]">Pulse</span>
          </a>
          <a
            href="/"
            className="bg-[#0a0f1e]/90 backdrop-blur-xl rounded-xl px-3 py-2 border border-[#2a3040] text-xs text-[#8892a4] hover:text-[#f0f4f8] transition-colors"
          >
            Dashboard
          </a>
          <span className="bg-[#00f0ff]/10 backdrop-blur-xl rounded-xl px-3 py-2 border border-[#00f0ff]/20 text-xs text-[#00f0ff] font-medium">
            Drive
          </span>
          <a
            href="/park"
            className="bg-[#0a0f1e]/90 backdrop-blur-xl rounded-xl px-3 py-2 border border-[#2a3040] text-xs text-[#a855f7] hover:bg-[#a855f7]/10 transition-colors"
          >
            Park
          </a>
        </div>
        <div className="bg-[#0a0f1e]/90 backdrop-blur-xl rounded-xl px-3 py-2 border border-[#2a3040]">
          {wallet.address ? (
            <span className="text-xs text-[#00ff88] font-mono">
              {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
            </span>
          ) : (
            <button onClick={wallet.connect} className="text-xs text-[#00f0ff] hover:text-[#00d4e0] cursor-pointer">
              Connect Wallet
            </button>
          )}
        </div>
      </div>

      {/* Validation error */}
      {validationError && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000] animate-[drive-card-slide-up_0.3s_ease-out]">
          <div className="bg-[#ff4060]/20 backdrop-blur-xl rounded-lg px-4 py-2 border border-[#ff4060]/40">
            <span className="text-xs text-[#ff4060]">{validationError}</span>
          </div>
        </div>
      )}

      {/* Map click hint */}
      {mapClickMode && phase === "search" && (!startPoint || !endPoint) && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[900] pointer-events-none">
          <div className="bg-[#0a0f1e]/80 backdrop-blur rounded-full px-4 py-2 border border-[#2a3040]">
            <span className="text-xs text-[#8892a4]">
              {!startPoint
                ? "Click on the map to set your start point"
                : "Click on the map to set your destination"}
            </span>
          </div>
        </div>
      )}

      {/* Mobile tab bar */}
      <MobileTabBar active="drive" />
    </div>
  );
}
