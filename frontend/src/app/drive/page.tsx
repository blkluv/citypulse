"use client";

import { useState, useCallback, useMemo } from "react";
import { DynamicDriveMap } from "@/components/Drive/DynamicDriveMap";
import { SearchOverlay } from "@/components/Drive/SearchOverlay";
import { NavigationCard } from "@/components/Drive/NavigationCard";
import { useVehicleStream } from "@/hooks/useVehicleStream";
import { useNanopayment } from "@/hooks/useNanopayment";
import { MobileTabBar } from "@/components/common/MobileTabBar";
import type { RouteResult } from "@/types";
import { BACKEND_URL } from "@/lib/constants";
import { detectZone } from "@/lib/zones";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface BaselineRoute { route: [number, number][]; distance: number; duration: number; }
type DrivePhase = "search" | "baseline" | "comparison" | "navigating";

export default function DrivePage() {
  const { vehicles } = useVehicleStream();
  const nanopay = useNanopayment();
  const wallet = { address: nanopay.address, balance: nanopay.walletBalance, isConnecting: nanopay.isConnecting, connect: nanopay.connect };

  const [phase, setPhase] = useState<DrivePhase>("search");
  const [startPoint, setStartPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [endPoint, setEndPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [startName, setStartName] = useState("");
  const [endName, setEndName] = useState("");
  const [mapClickMode, setMapClickMode] = useState(false);
  const [baseline, setBaseline] = useState<BaselineRoute | null>(null);
  const [baselineLoading, setBaselineLoading] = useState(false);
  const [paidRoute, setPaidRoute] = useState<RouteResult | null>(null);
  const [paidCost, setPaidCost] = useState("0.0005");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [payInProgress, setPayInProgress] = useState(false);

  const estimate = useMemo(() => {
    if (!startPoint || !endPoint) return null;
    const midLat = (startPoint.lat + endPoint.lat) / 2;
    const midLng = (startPoint.lng + endPoint.lng) / 2;
    const nearbyVehicles = vehicles.filter((v) => haversineKm(v.lat, v.lng, midLat, midLng) < 3);
    const vehicleCount = Math.max(nearbyVehicles.length, 1);
    return { vehicleCount, cost: (vehicleCount * 0.0001).toFixed(4) };
  }, [startPoint, endPoint, vehicles]);

  const fetchBaseline = useCallback(async (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
    setBaselineLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/route/baseline`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from, to }) });
      if (res.ok) { const data = await res.json(); setBaseline({ route: data.route, distance: data.distance, duration: data.duration }); setPhase("baseline"); }
    } catch {} finally { setBaselineLoading(false); }
  }, []);

  const handleSetStart = useCallback((coords: { lat: number; lng: number }, name: string) => { setStartPoint(coords); setStartName(name); if (endPoint) fetchBaseline(coords, endPoint); }, [endPoint, fetchBaseline]);
  const handleSetEnd = useCallback((coords: { lat: number; lng: number }, name: string) => { setEndPoint(coords); setEndName(name); if (startPoint) fetchBaseline(startPoint, coords); }, [startPoint, fetchBaseline]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (!mapClickMode) return;
    setValidationError(null);
    if (lat < 40.80 || lat > 41.30 || lng < 28.50 || lng > 29.40) { setValidationError("Please select a point within Istanbul"); return; }
    const name = detectZone(lat, lng);
    if (!startPoint) handleSetStart({ lat, lng }, name);
    else if (!endPoint) {
      const dist = Math.sqrt(Math.pow((lat - startPoint.lat) * 111000, 2) + Math.pow((lng - startPoint.lng) * 85000, 2));
      if (dist < 100) { setValidationError("Start and end must be different"); return; }
      handleSetEnd({ lat, lng }, name);
    }
  }, [mapClickMode, startPoint, endPoint, handleSetStart, handleSetEnd]);

  const handleClear = useCallback(() => { setStartPoint(null); setEndPoint(null); setStartName(""); setEndName(""); setBaseline(null); setPaidRoute(null); setPhase("search"); }, []);

  const handlePay = useCallback(async () => {
    if (!startPoint || !endPoint || payInProgress) return;
    setPayInProgress(true);
    try {
      const result = await nanopay.fetchPaidRoute(startPoint, endPoint);
      if (result) { setPaidRoute(result); setPaidCost(result.cost || "0.0005"); setPhase("comparison"); }
    } catch (err) { console.error("Payment failed:", err); } finally { setPayInProgress(false); }
  }, [startPoint, endPoint, nanopay, payInProgress]);

  const displayRoute: RouteResult | null = useMemo(() => {
    if ((phase === "navigating" || phase === "comparison") && paidRoute) return paidRoute;
    if (phase === "baseline" && baseline) return { normalRoute: baseline.route, optimizedRoute: [], normalTime: baseline.duration, optimizedTime: 0, savedMinutes: 0, vehiclesUsed: [], cost: "0" };
    return null;
  }, [phase, paidRoute, baseline]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0A0F1C] relative">
      <DynamicDriveMap vehicles={vehicles} routeResult={displayRoute} startPoint={startPoint} endPoint={endPoint} onMapClick={handleMapClick} mapClickEnabled={mapClickMode} isNavigating={phase === "navigating"} />

      {/* ─── TOP BAR (Pencil: 62px status + 48px header) ─── */}
      <div className="absolute top-0 left-0 right-0 z-[1000]">
        <div className="h-[44px] md:h-0" />
        <div className="flex items-center justify-between px-5 py-3">
          <a href="/" className="flex items-center gap-1">
            <span className="font-mono text-[20px] font-bold text-[#22D3EE]">City</span>
            <span className="font-mono text-[20px] font-bold text-white">Pulse</span>
          </a>
          <div className="bg-[#1E293B] rounded-[8px] px-3 py-1.5">
            {wallet.address ? (
              <span className="font-mono text-[11px] font-semibold text-[#22D3EE]">{parseFloat(wallet.balance).toFixed(2)} USDC</span>
            ) : (
              <button onClick={wallet.connect} className="font-mono text-[11px] font-semibold text-[#22D3EE] cursor-pointer">{wallet.isConnecting ? "..." : "Connect"}</button>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      {phase !== "navigating" && phase !== "comparison" && (
        <SearchOverlay startPoint={startPoint} endPoint={endPoint} onSetStart={handleSetStart} onSetEnd={handleSetEnd} onClear={handleClear} mapClickMode={mapClickMode} onToggleMapClick={() => setMapClickMode((m) => !m)} startName={startName} endName={endName} />
      )}

      {baselineLoading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[900]">
          <div className="bg-[#0A0F1C]/90 backdrop-blur-xl rounded-[12px] px-6 py-4 flex items-center gap-3 border border-[#0F172A]">
            <div className="w-5 h-5 border-2 border-[#22D3EE]/30 border-t-[#22D3EE] rounded-full animate-spin" />
            <span className="text-[13px] text-[#94A3B8]">Calculating route...</span>
          </div>
        </div>
      )}

      {/* ─── BASELINE: Pencil Route Card ─── */}
      {phase === "baseline" && baseline && estimate && (
        <div className="absolute bottom-[95px] left-0 right-0 z-[900] slide-up">
          <div className="max-w-[402px] mx-auto bg-[#1E293B] rounded-t-[12px] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-white text-[15px] font-semibold">{startName} &rarr; {endName}</span>
              <button onClick={handleClear} className="text-[#475569] hover:text-white text-lg cursor-pointer">&times;</button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-[8px] bg-[#0F172A]">
              <div className="flex items-center gap-2.5">
                <div className="w-[10px] h-[10px] rounded-full bg-[#EF4444]" />
                <span className="text-[#94A3B8] text-[13px]">Standard route</span>
                <span className="font-mono text-[9px] font-semibold text-[#475569] tracking-wider">FREE</span>
              </div>
              <span className="font-mono text-[15px] font-bold text-[#EF4444]">{baseline.duration} min</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-[8px] bg-[#22D3EE]/[0.06] border border-[#22D3EE]/20">
              <div className="flex items-center gap-2.5">
                <div className="w-[10px] h-[10px] rounded-full bg-[#22D3EE]" />
                <span className="text-white text-[13px] font-medium">CityPulse route</span>
                <span className="font-mono text-[9px] font-semibold text-[#22D3EE]">${estimate.cost}</span>
              </div>
              <span className="font-mono text-[13px] text-[#475569]">? min</span>
            </div>

            {!wallet.address ? (
              <button onClick={wallet.connect} disabled={wallet.isConnecting} className="w-full h-[48px] rounded-[8px] bg-[#22D3EE] text-[#0A0F1C] text-[14px] font-semibold cursor-pointer disabled:opacity-50 active:scale-[0.98] transition-transform">
                {wallet.isConnecting ? "Connecting..." : "Connect Wallet to Pay"}
              </button>
            ) : (
              <button onClick={handlePay} disabled={payInProgress} className="w-full h-[48px] rounded-[8px] bg-[#22D3EE] text-[#0A0F1C] text-[14px] font-semibold cursor-pointer disabled:opacity-50 active:scale-[0.98] transition-transform glow">
                {payInProgress ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-[#0A0F1C]/30 border-t-[#0A0F1C] rounded-full animate-spin" />Verifying on Arc...
                  </span>
                ) : `Pay $${estimate.cost} — Unlock Faster Route`}
              </button>
            )}
            {nanopay.error && <p className="text-[#EF4444] text-[12px] text-center">{nanopay.error}</p>}
            <p className="text-[10px] text-[#475569] text-center">Circle Nanopayments &middot; Gas-free on Arc</p>
          </div>
        </div>
      )}

      {/* ─── COMPARISON: Pencil exact ─── */}
      {phase === "comparison" && paidRoute && (
        <div className="absolute bottom-[95px] left-0 right-0 z-[900] slide-up">
          <div className="max-w-[402px] mx-auto bg-[#1E293B] rounded-t-[12px] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white text-[15px] font-semibold">{startName} &rarr; {endName}</span>
              <span className="font-mono text-[10px] font-bold text-[#22D3EE] bg-[#22D3EE]/10 px-2 py-1 rounded-[6px] tracking-[2px]">PAID</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-[8px] bg-[#0F172A]">
              <div className="flex items-center gap-2.5"><div className="w-[10px] h-[10px] rounded-full bg-[#EF4444]" /><span className="text-[#94A3B8] text-[13px]">Standard route</span></div>
              <span className="font-mono text-[15px] font-bold text-[#EF4444]">{paidRoute.normalTime} min</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-[8px] bg-[#22D3EE]/[0.06] border border-[#22D3EE]/20">
              <div className="flex items-center gap-2.5"><div className="w-[10px] h-[10px] rounded-full bg-[#22D3EE]" /><span className="text-white text-[13px] font-medium">CityPulse route</span></div>
              <span className="font-mono text-[15px] font-bold text-[#22D3EE]">{paidRoute.optimizedTime} min</span>
            </div>
            <div className="flex items-center justify-center gap-3 py-2.5 rounded-[8px] bg-[#22D3EE]/[0.04] border border-[#22D3EE]/10">
              <span className="font-mono text-[14px] font-bold text-[#22D3EE]">{paidRoute.savedMinutes} min faster</span>
              <span className="text-[#475569]">&middot;</span>
              <span className="text-[11px] text-[#94A3B8]">{paidRoute.vehiclesUsed?.length || 0} vehicles used</span>
              <span className="text-[#475569]">&middot;</span>
              <span className="font-mono text-[11px] text-[#22D3EE]">${paidCost} paid</span>
            </div>
            <button onClick={() => setPhase("navigating")} className="w-full h-[48px] rounded-[8px] bg-[#22D3EE] text-[#0A0F1C] text-[14px] font-semibold cursor-pointer active:scale-[0.98] transition-transform">Start Navigation</button>
            <button onClick={handleClear} className="w-full py-2 text-[12px] text-[#475569] hover:text-white cursor-pointer">Cancel</button>
          </div>
        </div>
      )}

      {phase === "navigating" && paidRoute && <NavigationCard route={paidRoute} cost={paidCost} onEndNavigation={handleClear} />}

      {validationError && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[1000] slide-up">
          <div className="bg-[#EF4444]/20 backdrop-blur-xl rounded-[8px] px-4 py-2 border border-[#EF4444]/40"><span className="text-[12px] text-[#EF4444]">{validationError}</span></div>
        </div>
      )}

      {mapClickMode && phase === "search" && (!startPoint || !endPoint) && (
        <div className="absolute bottom-[110px] left-1/2 -translate-x-1/2 z-[900] pointer-events-none">
          <div className="bg-[#0A0F1C]/80 backdrop-blur rounded-full px-4 py-2 border border-[#0F172A]">
            <span className="text-[12px] text-[#94A3B8]">{!startPoint ? "Tap to set start point" : "Tap to set destination"}</span>
          </div>
        </div>
      )}

      <MobileTabBar active="drive" />
    </div>
  );
}
