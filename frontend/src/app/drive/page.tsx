"use client";

import { useState, useCallback, useMemo } from "react";
import { DynamicDriveMap } from "@/components/Drive/DynamicDriveMap";
import { SearchOverlay } from "@/components/Drive/SearchOverlay";
import { RouteComparisonCard } from "@/components/Drive/RouteComparisonCard";
import { NavigationCard } from "@/components/Drive/NavigationCard";
import { useVehicleStream } from "@/hooks/useVehicleStream";
import { usePayment } from "@/hooks/usePayment";
import type { RouteResult } from "@/types";

/** Simple zone detection from coordinates. */
function getZoneFromCoords(lat: number, lng: number): string {
  if (lng > 29.0) {
    if (lat > 41.02) return "Uskudar";
    return "Kadikoy";
  }
  if (lat > 41.07) return "Levent";
  if (lat > 41.05) return "Sisli";
  if (lat > 41.04) return "Besiktas";
  if (lat > 41.03) {
    if (lng < 28.98) return "Beyoglu";
    return "Taksim";
  }
  if (lat > 41.01) return "Eminonu";
  if (lat > 41.0) return "Fatih";
  if (lng < 28.92) return "Bakirkoy";
  return "Fatih";
}

/** Haversine distance in km */
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
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

type DrivePhase = "search" | "estimate" | "navigating";

export default function DrivePage() {
  const { vehicles } = useVehicleStream();
  const {
    loading: paymentLoading,
    error: paymentError,
    payForRoute,
    clearResult,
    wallet,
  } = usePayment();

  const [phase, setPhase] = useState<DrivePhase>("search");
  const [startPoint, setStartPoint] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [endPoint, setEndPoint] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [startName, setStartName] = useState("");
  const [endName, setEndName] = useState("");
  const [mapClickMode, setMapClickMode] = useState(false);
  const [paidRoute, setPaidRoute] = useState<RouteResult | null>(null);
  const [paidCost, setPaidCost] = useState("0.0005");

  // Pre-payment estimate (no backend call — just math)
  const estimate = useMemo(() => {
    if (!startPoint || !endPoint) return null;
    const distKm = haversineKm(
      startPoint.lat,
      startPoint.lng,
      endPoint.lat,
      endPoint.lng
    );
    // Estimate: road distance ≈ 1.4x straight line
    const roadDistKm = distKm * 1.4;
    // Count vehicles near the route corridor (within ~1km of midpoint)
    const midLat = (startPoint.lat + endPoint.lat) / 2;
    const midLng = (startPoint.lng + endPoint.lng) / 2;
    const nearbyVehicles = vehicles.filter(
      (v) => haversineKm(v.lat, v.lng, midLat, midLng) < 3
    );
    const vehicleCount = Math.max(nearbyVehicles.length, 1);
    const cost = (vehicleCount * 0.0001).toFixed(4);
    // Time estimates
    const normalTime = Math.round((roadDistKm / 20) * 60); // 20 km/h avg with traffic
    const optimizedTime = Math.round((roadDistKm / 30) * 60); // 30 km/h with CityPulse
    return {
      distKm: roadDistKm,
      vehicleCount,
      cost,
      normalTime,
      optimizedTime,
      savedMinutes: normalTime - optimizedTime,
    };
  }, [startPoint, endPoint, vehicles]);

  const handleSetStart = useCallback(
    (coords: { lat: number; lng: number }, name: string) => {
      setStartPoint(coords);
      setStartName(name);
      if (endPoint) setPhase("estimate");
    },
    [endPoint]
  );

  const handleSetEnd = useCallback(
    (coords: { lat: number; lng: number }, name: string) => {
      setEndPoint(coords);
      setEndName(name);
      if (startPoint) setPhase("estimate");
    },
    [startPoint]
  );

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (!mapClickMode) return;
      const name = getZoneFromCoords(lat, lng);
      if (!startPoint) {
        handleSetStart({ lat, lng }, name);
      } else if (!endPoint) {
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
    setPaidRoute(null);
    setPhase("search");
    clearResult();
  }, [clearResult]);

  // PAY first, THEN get route data — this is the x402 flow
  const handlePay = useCallback(async () => {
    if (!startPoint || !endPoint || !estimate) return;
    const fromZone = getZoneFromCoords(startPoint.lat, startPoint.lng);
    const toZone = getZoneFromCoords(endPoint.lat, endPoint.lng);

    const result = await payForRoute(
      fromZone,
      toZone,
      estimate.vehicleCount,
      startPoint,
      endPoint
    );

    if (result) {
      setPaidRoute(result);
      setPaidCost(result.cost || estimate.cost);
      setPhase("navigating");
    }
  }, [startPoint, endPoint, estimate, payForRoute]);

  const handleEndNavigation = useCallback(() => {
    handleClear();
  }, [handleClear]);

  // Only show real route AFTER payment
  const displayRoute = phase === "navigating" ? paidRoute : null;

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

      {/* Search overlay (top) — hidden during navigation */}
      {phase !== "navigating" && (
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

      {/* Estimate card (bottom) — BEFORE payment, no real route data */}
      {phase === "estimate" && estimate && startPoint && endPoint && (
        <div className="absolute bottom-0 left-0 right-0 z-[900] p-4 animate-[drive-card-slide-up_0.4s_ease-out]">
          <div className="max-w-lg mx-auto bg-[#0a0f1e]/95 backdrop-blur-xl rounded-2xl border border-[#2a3040] p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#f0f4f8] font-semibold">
                {startName} → {endName}
              </h3>
              <button
                onClick={handleClear}
                className="text-[#8892a4] hover:text-[#f0f4f8] text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {/* Estimate comparison */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#ff4060]/10 border border-[#ff4060]/20">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#ff4060]" />
                  <span className="text-[#f0f4f8] text-sm">Normal route</span>
                </div>
                <div className="text-right">
                  <span className="text-[#ff4060] font-mono font-bold">
                    ~{estimate.normalTime} min
                  </span>
                  <span className="text-[#8892a4] text-xs ml-2">
                    ~{estimate.distKm.toFixed(1)} km
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/20">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#00f0ff]" />
                  <span className="text-[#f0f4f8] text-sm">CityPulse route</span>
                </div>
                <div className="text-right">
                  <span className="text-[#00f0ff] font-mono font-bold">
                    ~{estimate.optimizedTime} min
                  </span>
                  <span className="text-[#ffd700] text-xs ml-2">
                    {estimate.cost} USDC
                  </span>
                </div>
              </div>
            </div>

            {/* Savings + info */}
            <div className="flex items-center justify-between mb-4 text-xs text-[#8892a4]">
              <span className="text-[#00ff88]">
                ~{estimate.savedMinutes} min faster
              </span>
              <span>
                {estimate.vehicleCount} vehicles on route
              </span>
            </div>

            {/* Pay button */}
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
                  Confirming on Arc...
                </span>
              ) : (
                `Pay ${estimate.cost} USDC & Navigate`
              )}
            </button>

            {paymentError && (
              <p className="text-[#ff4060] text-xs mt-2 text-center">
                {paymentError}
              </p>
            )}

            <p className="text-[10px] text-[#8892a4] text-center mt-2">
              Routes unlock after on-chain payment verification
            </p>
          </div>
        </div>
      )}

      {/* Navigation card (bottom, after payment — now with real route data) */}
      {phase === "navigating" && paidRoute && (
        <NavigationCard
          route={paidRoute}
          cost={paidCost}
          onEndNavigation={handleEndNavigation}
        />
      )}

      {/* Wallet indicator during navigation */}
      {phase === "navigating" && (
        <div className="absolute top-3 right-3 z-[1000]">
          <div className="bg-[#0a0f1e]/90 backdrop-blur-xl rounded-xl px-3 py-2 border border-[#2a3040] flex items-center gap-2">
            {wallet.address ? (
              <span className="text-xs text-[#00ff88] font-mono">
                {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
              </span>
            ) : (
              <button
                onClick={wallet.connect}
                className="text-xs text-[#00f0ff] hover:text-[#00d4e0]"
              >
                Connect Wallet
              </button>
            )}
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
    </div>
  );
}
