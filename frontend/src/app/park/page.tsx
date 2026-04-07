"use client";

import { useState, useCallback, useEffect } from "react";
import { DynamicParkMap } from "@/components/Park/DynamicParkMap";
import { useParkingPayment } from "@/hooks/useParkingPayment";
import type { ParkingLot } from "@/hooks/useParkingPayment";
import { useNanopayment } from "@/hooks/useNanopayment";
import { MobileTabBar } from "@/components/common/MobileTabBar";
import { ARCSCAN_URL } from "@/lib/constants";
import { detectZone } from "@/lib/zones";

export default function ParkPage() {
  const { nearbyLots, unlockedLots, loading, unlocking, error, txHash, unlocked, validUntil, searchCenter, searchNearby, unlockAvailability, reset, wallet } = useParkingPayment();
  const nanopay = useNanopayment();
  const [selectedLot, setSelectedLot] = useState<ParkingLot | null>(null);
  const [searchRadius] = useState(1000);
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!validUntil) { setTimeLeft(""); return; }
    const timer = setInterval(() => {
      const remaining = validUntil - Date.now();
      if (remaining <= 0) { setTimeLeft("Expired"); clearInterval(timer); return; }
      const min = Math.floor(remaining / 60000);
      const sec = Math.floor((remaining % 60000) / 1000);
      setTimeLeft(`${min}:${sec.toString().padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [validUntil]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (lat < 40.8 || lat > 41.3 || lng < 28.5 || lng > 29.4) return;
    searchNearby(lat, lng, searchRadius);
  }, [searchNearby, searchRadius]);

  const handleUnlock = useCallback(async () => {
    if (!searchCenter) return;
    await unlockAvailability(searchCenter.lat, searchCenter.lng, searchRadius);
  }, [searchCenter, searchRadius, unlockAvailability]);

  const zoneName = searchCenter ? detectZone(searchCenter.lat, searchCenter.lng) : "";

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0A0F1C] relative">
      <DynamicParkMap lockedLots={[]} unlockedLots={unlockedLots} unlocked={unlocked} searchCenter={searchCenter} searchRadius={searchRadius} selectedLot={selectedLot} onMapClick={handleMapClick} onSelectLot={(lot) => setSelectedLot(lot)} />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-[1000] flex items-center justify-between px-4 py-3 pt-12 md:pt-3 bg-[#0A0F1C]/80 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <a href="/" className="font-mono text-sm font-bold"><span className="text-[#22D3EE]">City</span><span className="text-white">Pulse</span></a>
        </div>
        <div className="flex items-center gap-2">
          {unlocked && timeLeft && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#22D3EE]/10 border border-[#22D3EE]/20">
              <div className="w-1.5 h-1.5 rounded-full bg-[#22D3EE] animate-pulse" />
              <span className="text-[10px] font-mono font-semibold text-[#22D3EE]">{timeLeft}</span>
            </div>
          )}
          <div className="bg-[#1E293B]/90 backdrop-blur-xl rounded-lg px-3 py-1.5 border border-[#0F172A]">
            {nanopay.address ? (
              <span className="text-xs font-mono text-[#22D3EE]">{nanopay.address.slice(0, 6)}...{nanopay.address.slice(-4)}</span>
            ) : (
              <button onClick={nanopay.connect} className="text-xs text-[#22D3EE] cursor-pointer">{nanopay.isConnecting ? "..." : "Connect"}</button>
            )}
          </div>
        </div>
      </div>

      {/* Instruction overlay */}
      {!searchCenter && !loading && (
        <div className="absolute inset-0 z-[700] flex items-center justify-center pointer-events-none">
          <div className="bg-[#0A0F1C]/80 backdrop-blur rounded-xl px-8 py-6 text-center border border-[#0F172A] max-w-sm">
            <div className="text-4xl mb-3">&#x1F17F;&#xFE0F;</div>
            <h3 className="text-white text-lg font-semibold mb-2">Find Parking</h3>
            <p className="text-[#94A3B8] text-sm">Tap anywhere on the map to search for nearby ISPARK parking lots.</p>
            <p className="text-[10px] text-[#475569] mt-3">Pay $0.0001 USDC to unlock live availability</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[900]">
          <div className="bg-[#0A0F1C]/90 backdrop-blur-xl rounded-xl px-6 py-4 flex items-center gap-3 border border-[#0F172A]">
            <div className="w-5 h-5 border-2 border-[#22D3EE]/30 border-t-[#22D3EE] rounded-full animate-spin" />
            <span className="text-sm text-[#94A3B8]">Searching...</span>
          </div>
        </div>
      )}

      {/* LOCKED — parking found, not paid */}
      {searchCenter && nearbyLots.length > 0 && !unlocked && !loading && (
        <div className="absolute bottom-20 left-0 right-0 z-[900] px-4 slide-up">
          <div className="max-w-lg mx-auto bg-[#1E293B] rounded-xl border border-[#0F172A] p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold text-[15px]">Parking near {zoneName}</h3>
              <button onClick={reset} className="text-[#475569] hover:text-white text-lg cursor-pointer">&times;</button>
            </div>

            <div className="p-4 rounded-lg bg-[#0F172A] mb-4 text-center">
              <div className="text-3xl font-mono font-bold text-[#22D3EE] mb-1">{nearbyLots.length}</div>
              <div className="text-white text-sm">parking lots found</div>
              <div className="text-[10px] text-[#475569] mt-1">within {searchRadius}m</div>
              <div className="flex items-center justify-center gap-2 text-xs text-[#22D3EE] mt-3 pt-3 border-t border-[#1E293B]">
                <span>&#x1F512;</span>
                <span>Pay to see locations &amp; availability</span>
              </div>
            </div>

            {!nanopay.address ? (
              <button onClick={nanopay.connect} disabled={nanopay.isConnecting} className="w-full h-12 rounded-lg bg-[#22D3EE] text-[#0A0F1C] font-semibold text-sm cursor-pointer disabled:opacity-50">
                {nanopay.isConnecting ? "Connecting..." : "Connect Wallet to Unlock"}
              </button>
            ) : (
              <button onClick={handleUnlock} disabled={unlocking} className="w-full h-12 rounded-lg bg-[#22D3EE] text-[#0A0F1C] font-semibold text-sm cursor-pointer disabled:opacity-50 glow">
                {unlocking ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-[#0A0F1C]/30 border-t-[#0A0F1C] rounded-full animate-spin" />
                    Unlocking...
                  </span>
                ) : "Unlock for $0.0001 USDC"}
              </button>
            )}

            {error && <p className="text-[#EF4444] text-xs mt-2 text-center">{error}</p>}
            <p className="text-[10px] text-[#475569] text-center mt-2">Circle Nanopayments &middot; Gas-free &middot; Valid 15 min</p>
          </div>
        </div>
      )}

      {/* No lots found */}
      {searchCenter && nearbyLots.length === 0 && !loading && !unlocked && (
        <div className="absolute bottom-20 left-0 right-0 z-[900] px-4">
          <div className="max-w-lg mx-auto bg-[#1E293B] rounded-xl border border-[#0F172A] p-5 text-center">
            <p className="text-[#94A3B8] text-sm mb-2">No parking lots within {searchRadius}m</p>
            <button onClick={reset} className="text-xs text-[#22D3EE] cursor-pointer">Try another area</button>
          </div>
        </div>
      )}

      {/* UNLOCKED — showing availability */}
      {unlocked && unlockedLots.length > 0 && (
        <div className="absolute bottom-20 left-0 right-0 z-[900] px-4 slide-up">
          <div className="max-w-lg mx-auto bg-[#1E293B] rounded-xl border border-[#0F172A] p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold text-[15px]">Parking near {zoneName}</h3>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono font-bold text-[#22D3EE] bg-[#22D3EE]/10 px-2 py-1 rounded tracking-wider">UNLOCKED</span>
                <button onClick={reset} className="text-[#475569] hover:text-white text-lg cursor-pointer">&times;</button>
              </div>
            </div>

            {/* Parking list */}
            <div className="space-y-1.5 mb-3 max-h-48 overflow-y-auto custom-scrollbar">
              {unlockedLots.map((lot) => (
                <button key={lot.id} onClick={() => setSelectedLot(lot)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg cursor-pointer text-left transition-colors ${
                    selectedLot?.id === lot.id ? "bg-[#22D3EE]/10 border border-[#22D3EE]/20" : "bg-[#0F172A] hover:bg-[#0F172A]/80 border border-transparent"
                  }`}>
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${lot.color === "green" ? "bg-[#22C55E]" : lot.color === "yellow" ? "bg-[#EAB308]" : "bg-[#EF4444]"}`} />
                    <div className="min-w-0">
                      <div className="text-white text-xs truncate">{lot.name}</div>
                      <div className="text-[#64748B] text-[10px]">{lot.district} &middot; {lot.distance}m</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <div className={`text-xs font-mono font-bold ${lot.color === "green" ? "text-[#22C55E]" : lot.color === "yellow" ? "text-[#EAB308]" : "text-[#EF4444]"}`}>
                      {lot.available}/{lot.capacity}
                    </div>
                    <div className="text-[#64748B] text-[10px]">{lot.occupancyRate}% full</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Payment info */}
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#0F172A] text-[10px] font-mono">
              <span className="text-[#22D3EE]">$0.0001 paid</span>
              {txHash && (
                <a href={`${ARCSCAN_URL}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-[#22D3EE] hover:underline">
                  Tx: {txHash.slice(0, 8)}...
                </a>
              )}
              <span className="text-[#64748B]">{timeLeft || "15:00"}</span>
            </div>

            {/* Selected lot */}
            {selectedLot && (
              <div className="mt-3 p-3 rounded-lg bg-[#22D3EE]/5 border border-[#22D3EE]/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-sm font-semibold">{selectedLot.name}</span>
                  <span className={`text-xs font-mono font-bold ${selectedLot.color === "green" ? "text-[#22C55E]" : selectedLot.color === "yellow" ? "text-[#EAB308]" : "text-[#EF4444]"}`}>
                    {selectedLot.available} free
                  </span>
                </div>
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${selectedLot.lat},${selectedLot.lng}`} target="_blank" rel="noopener noreferrer"
                  className="block w-full py-2.5 rounded-lg text-center text-xs font-semibold bg-[#22C55E] text-[#0A0F1C] cursor-pointer active:scale-[0.98] transition-transform">
                  Navigate Here
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      <MobileTabBar active="park" />
    </div>
  );
}
