"use client";

import { useState, useCallback } from "react";
import { DynamicDriveMap } from "@/components/Drive/DynamicDriveMap";
import { SearchOverlay } from "@/components/Drive/SearchOverlay";
import { RouteComparisonCard } from "@/components/Drive/RouteComparisonCard";
import { NavigationCard } from "@/components/Drive/NavigationCard";
import { useVehicleStream } from "@/hooks/useVehicleStream";
import { usePayment } from "@/hooks/usePayment";
import type { RouteResult } from "@/types";
import { BACKEND_URL } from "@/lib/constants";

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

type DrivePhase = "search" | "preview" | "navigating";

export default function DrivePage() {
  const { vehicles } = useVehicleStream();
  const {
    loading: paymentLoading,
    error: paymentError,
    result: paymentResult,
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
  const [previewRoute, setPreviewRoute] = useState<RouteResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [navigatingRoute, setNavigatingRoute] = useState<RouteResult | null>(
    null
  );
  const [paidCost, setPaidCost] = useState("0.0005");

  // Fetch a preview route (without payment) for route comparison
  const fetchPreview = useCallback(
    async (
      from: { lat: number; lng: number },
      to: { lat: number; lng: number }
    ) => {
      setPreviewLoading(true);
      try {
        const response = await fetch(`${BACKEND_URL}/api/route`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-DEMO-MODE": "true",
          },
          body: JSON.stringify({ from, to }),
        });
        if (response.ok) {
          const data: RouteResult = await response.json();
          setPreviewRoute(data);
          setPhase("preview");
        }
      } catch {
        // Preview fetch failed silently
      } finally {
        setPreviewLoading(false);
      }
    },
    []
  );

  const handleSetStart = useCallback(
    (coords: { lat: number; lng: number }, name: string) => {
      setStartPoint(coords);
      setStartName(name);
      // If end already set, fetch route preview
      if (endPoint) {
        fetchPreview(coords, endPoint);
      }
    },
    [endPoint, fetchPreview]
  );

  const handleSetEnd = useCallback(
    (coords: { lat: number; lng: number }, name: string) => {
      setEndPoint(coords);
      setEndName(name);
      // If start already set, fetch route preview
      if (startPoint) {
        fetchPreview(startPoint, coords);
      }
    },
    [startPoint, fetchPreview]
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
    setPreviewRoute(null);
    setNavigatingRoute(null);
    setPhase("search");
    clearResult();
  }, [clearResult]);

  const handlePay = useCallback(async () => {
    if (!startPoint || !endPoint) return;
    const fromZone = getZoneFromCoords(startPoint.lat, startPoint.lng);
    const toZone = getZoneFromCoords(endPoint.lat, endPoint.lng);
    const vehicleCount = Math.max(1, Math.min(vehicles.length, 10));

    const result = await payForRoute(
      fromZone,
      toZone,
      vehicleCount,
      startPoint,
      endPoint
    );

    if (result) {
      setNavigatingRoute(result);
      setPaidCost(result.cost || "0.0005");
      setPhase("navigating");
    }
  }, [startPoint, endPoint, vehicles.length, payForRoute]);

  const handleEndNavigation = useCallback(() => {
    handleClear();
  }, [handleClear]);

  // Determine which route to show on the map
  const displayRoute =
    phase === "navigating"
      ? navigatingRoute
      : phase === "preview"
        ? previewRoute
        : null;

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

      {/* Loading indicator for preview fetch */}
      {previewLoading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[900]">
          <div className="bg-[#0a0f1e]/90 backdrop-blur-xl rounded-2xl px-6 py-4 flex items-center gap-3 border border-[#2a3040]">
            <div className="w-5 h-5 border-2 border-[#00f0ff]/30 border-t-[#00f0ff] rounded-full animate-spin" />
            <span className="text-sm text-[#8892a4]">
              Calculating routes...
            </span>
          </div>
        </div>
      )}

      {/* Route comparison card (bottom) */}
      {phase === "preview" && previewRoute && (
        <RouteComparisonCard
          route={previewRoute}
          startName={startName}
          endName={endName}
          loading={paymentLoading}
          error={paymentError}
          onPay={handlePay}
          onClose={handleClear}
        />
      )}

      {/* Navigation card (bottom, replaces comparison) */}
      {phase === "navigating" && navigatingRoute && (
        <NavigationCard
          route={navigatingRoute}
          cost={paidCost}
          onEndNavigation={handleEndNavigation}
        />
      )}

      {/* Wallet connect button (floating, bottom-right during navigation) */}
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

      {/* Map click hint when map click mode is active and no route yet */}
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
