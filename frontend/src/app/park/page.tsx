"use client";

import { useState, useCallback, useEffect } from "react";
import { DynamicParkMap } from "@/components/Park/DynamicParkMap";
import { useParkingPayment } from "@/hooks/useParkingPayment";
import type { ParkingLot } from "@/hooks/useParkingPayment";
import { ARCSCAN_URL } from "@/lib/constants";

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

export default function ParkPage() {
  const {
    nearbyLots,
    unlockedLots,
    loading,
    unlocking,
    error,
    txHash,
    unlocked,
    validUntil,
    searchCenter,
    searchNearby,
    unlockAvailability,
    reset,
    wallet,
  } = useParkingPayment();

  const [selectedLot, setSelectedLot] = useState<ParkingLot | null>(null);
  const [searchRadius] = useState(1000);
  const [timeLeft, setTimeLeft] = useState<string>("");

  // Countdown timer for data validity
  useEffect(() => {
    if (!validUntil) {
      setTimeLeft("");
      return;
    }
    const timer = setInterval(() => {
      const remaining = validUntil - Date.now();
      if (remaining <= 0) {
        setTimeLeft("Expired");
        clearInterval(timer);
        return;
      }
      const min = Math.floor(remaining / 60000);
      const sec = Math.floor((remaining % 60000) / 1000);
      setTimeLeft(`${min}:${sec.toString().padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [validUntil]);

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      // Istanbul bounds check
      if (lat < 40.8 || lat > 41.3 || lng < 28.5 || lng > 29.4) return;
      searchNearby(lat, lng, searchRadius);
    },
    [searchNearby, searchRadius]
  );

  const handleUnlock = useCallback(async () => {
    if (!searchCenter) return;
    await unlockAvailability(searchCenter.lat, searchCenter.lng, searchRadius);
  }, [searchCenter, searchRadius, unlockAvailability]);

  const handleSelectLot = useCallback((lot: ParkingLot) => {
    setSelectedLot(lot);
  }, []);

  const lotList = unlocked ? unlockedLots : [];
  const zoneName = searchCenter
    ? getZoneFromCoords(searchCenter.lat, searchCenter.lng)
    : "";

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0a0f1e] relative">
      {/* Full-screen map */}
      <DynamicParkMap
        lockedLots={nearbyLots}
        unlockedLots={unlockedLots}
        unlocked={unlocked}
        searchCenter={searchCenter}
        searchRadius={searchRadius}
        selectedLot={selectedLot}
        onMapClick={handleMapClick}
        onSelectLot={handleSelectLot}
      />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-[1000] flex items-center justify-between px-4 py-3 bg-[#0a0f1e]/90 backdrop-blur-xl border-b border-[#2a3040]">
        <div className="flex items-center gap-3">
          <a href="/" className="text-xl font-bold tracking-tight">
            <span className="text-[#00f0ff]">City</span>
            <span className="text-[#f0f4f8]">Pulse</span>
          </a>
          <div className="flex items-center gap-2 ml-3">
            <a
              href="/"
              className="px-3 py-1 rounded-lg text-xs text-[#8892a4] hover:text-[#f0f4f8] hover:bg-[#2a3040] transition-colors"
            >
              Dashboard
            </a>
            <a
              href="/drive"
              className="px-3 py-1 rounded-lg text-xs text-[#8892a4] hover:text-[#f0f4f8] hover:bg-[#2a3040] transition-colors"
            >
              Drive
            </a>
            <span className="px-3 py-1 rounded-lg text-xs font-medium bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/20">
              Park
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {unlocked && timeLeft && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/20">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
              <span className="text-[10px] text-[#00ff88] font-mono">{timeLeft}</span>
            </div>
          )}
          <div className="bg-[#0a0f1e]/90 backdrop-blur-xl rounded-xl px-3 py-1.5 border border-[#2a3040]">
            {wallet.address ? (
              <span className="text-xs text-[#00ff88] font-mono">
                {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
              </span>
            ) : (
              <button
                onClick={wallet.connect}
                disabled={wallet.isConnecting}
                className="text-xs text-[#00f0ff] hover:text-[#00d4e0] cursor-pointer disabled:opacity-50"
              >
                {wallet.isConnecting ? "Connecting..." : "Connect Wallet"}
              </button>
            )}
          </div>
          {wallet.error && (
            <div className="absolute top-full right-0 mt-2 bg-[#ff4060]/20 backdrop-blur-xl rounded-lg px-3 py-2 border border-[#ff4060]/40 max-w-xs">
              <span className="text-[10px] text-[#ff4060]">{wallet.error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Instruction overlay (no search yet) */}
      {!searchCenter && !loading && (
        <div className="absolute inset-0 z-[700] flex items-center justify-center pointer-events-none">
          <div className="bg-[#0a0f1e]/80 backdrop-blur-sm rounded-2xl px-8 py-6 text-center border border-[#2a3040] max-w-sm">
            <div className="text-4xl mb-3">&#x1F17F;&#xFE0F;</div>
            <h3 className="text-[#f0f4f8] text-lg font-semibold mb-2">Find Parking</h3>
            <p className="text-[#8892a4] text-sm">
              Click anywhere on the map to search for nearby ISPARK parking lots. Pay 0.0001 USDC to unlock real-time availability.
            </p>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[900]">
          <div className="bg-[#0a0f1e]/90 backdrop-blur-xl rounded-2xl px-6 py-4 flex items-center gap-3 border border-[#2a3040]">
            <div className="w-5 h-5 border-2 border-[#00f0ff]/30 border-t-[#00f0ff] rounded-full animate-spin" />
            <span className="text-sm text-[#8892a4]">Searching nearby parking...</span>
          </div>
        </div>
      )}

      {/* Bottom panel — LOCKED state (parking found, not paid) */}
      {searchCenter && nearbyLots.length > 0 && !unlocked && !loading && (
        <div className="absolute bottom-0 left-0 right-0 z-[900] p-4 animate-[drive-card-slide-up_0.4s_ease-out]">
          <div className="max-w-lg mx-auto bg-[#0a0f1e]/95 backdrop-blur-xl rounded-2xl border border-[#2a3040] p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[#f0f4f8] font-semibold">
                Parking near {zoneName}
              </h3>
              <button
                onClick={reset}
                className="text-[#8892a4] hover:text-[#f0f4f8] text-lg leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-3 rounded-lg bg-[#374151]/30 border border-[#374151] mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#f0f4f8] text-sm">
                  {nearbyLots.length} parking lots found
                </span>
                <span className="text-[10px] text-[#8892a4] bg-[#2a3040] px-1.5 py-0.5 rounded">
                  within {searchRadius}m
                </span>
              </div>
              <div className="flex items-center gap-2 text-[#ffd700] text-xs">
                <span>&#x1F512;</span>
                <span>Live availability locked</span>
              </div>
            </div>

            {/* Preview first 3 lots (locked) */}
            <div className="space-y-1.5 mb-4 max-h-28 overflow-y-auto">
              {nearbyLots.slice(0, 3).map((lot) => (
                <div
                  key={lot.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#374151]/20"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[#6b7280]">&#x1F512;</span>
                    <span className="text-[#f0f4f8] text-xs truncate max-w-[200px]">
                      {lot.name}
                    </span>
                  </div>
                  <span className="text-[#8892a4] text-[10px]">{lot.distance}m</span>
                </div>
              ))}
              {nearbyLots.length > 3 && (
                <div className="text-[#8892a4] text-[10px] text-center">
                  +{nearbyLots.length - 3} more
                </div>
              )}
            </div>

            {/* Unlock button */}
            {!wallet.address ? (
              <button
                onClick={wallet.connect}
                disabled={wallet.isConnecting}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer
                  bg-[#ffd700] text-[#0a0f1e] hover:bg-[#e6c200] active:scale-[0.98]
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {wallet.isConnecting ? "Connecting..." : "Connect Wallet to Unlock"}
              </button>
            ) : (
              <button
                onClick={handleUnlock}
                disabled={unlocking}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer
                  bg-[#00f0ff] text-[#0a0f1e] hover:bg-[#00d4e0] active:scale-[0.98]
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {unlocking ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-[#0a0f1e]/30 border-t-[#0a0f1e] rounded-full animate-spin" />
                    Unlocking on Arc...
                  </span>
                ) : (
                  "Unlock for 0.0001 USDC"
                )}
              </button>
            )}

            {wallet.address && (
              <p className="text-[10px] text-[#00ff88] text-center mt-2 font-mono">
                {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)} &middot; {wallet.balance} USDC
              </p>
            )}

            {error && (
              <p className="text-[#ff4060] text-xs mt-2 text-center">{error}</p>
            )}

            <p className="text-[10px] text-[#8892a4] text-center mt-1">
              On-chain payment on Arc Testnet &middot; Data valid for 15 minutes
            </p>
          </div>
        </div>
      )}

      {/* No parking found */}
      {searchCenter && nearbyLots.length === 0 && !loading && !unlocked && (
        <div className="absolute bottom-0 left-0 right-0 z-[900] p-4">
          <div className="max-w-lg mx-auto bg-[#0a0f1e]/95 backdrop-blur-xl rounded-2xl border border-[#2a3040] p-5 shadow-2xl text-center">
            <p className="text-[#8892a4] text-sm mb-2">No parking lots found within {searchRadius}m</p>
            <p className="text-[#8892a4] text-xs">Try clicking on a different area of the map</p>
            <button
              onClick={reset}
              className="mt-3 px-4 py-1.5 rounded-lg text-xs text-[#00f0ff] hover:bg-[#00f0ff]/10 transition-colors cursor-pointer"
            >
              Clear search
            </button>
          </div>
        </div>
      )}

      {/* Bottom panel — UNLOCKED state (paid, showing availability) */}
      {unlocked && unlockedLots.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 z-[900] p-4 animate-[drive-card-slide-up_0.4s_ease-out]">
          <div className="max-w-lg mx-auto bg-[#0a0f1e]/95 backdrop-blur-xl rounded-2xl border border-[#2a3040] p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[#f0f4f8] font-semibold">
                Parking near {zoneName}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#00ff88] bg-[#00ff88]/10 px-2 py-0.5 rounded-full">
                  Unlocked
                </span>
                <button
                  onClick={reset}
                  className="text-[#8892a4] hover:text-[#f0f4f8] text-lg leading-none cursor-pointer"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Parking lot list */}
            <div className="space-y-1.5 mb-3 max-h-48 overflow-y-auto custom-scrollbar">
              {unlockedLots.map((lot) => (
                <button
                  key={lot.id}
                  onClick={() => handleSelectLot(lot)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-colors cursor-pointer text-left ${
                    selectedLot?.id === lot.id
                      ? "bg-[#00f0ff]/10 border border-[#00f0ff]/30"
                      : "bg-[#374151]/20 hover:bg-[#374151]/30 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div
                      className={`w-3 h-3 rounded-full shrink-0 ${
                        lot.color === "green"
                          ? "bg-[#00ff88]"
                          : lot.color === "yellow"
                          ? "bg-[#ffd700]"
                          : "bg-[#ff4060]"
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="text-[#f0f4f8] text-xs truncate">{lot.name}</div>
                      <div className="text-[#8892a4] text-[10px]">{lot.district} &middot; {lot.distance}m</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <div
                      className={`text-xs font-mono font-bold ${
                        lot.color === "green"
                          ? "text-[#00ff88]"
                          : lot.color === "yellow"
                          ? "text-[#ffd700]"
                          : "text-[#ff4060]"
                      }`}
                    >
                      {lot.available}/{lot.capacity}
                    </div>
                    <div className="text-[#8892a4] text-[10px]">{lot.occupancyRate}% full</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Payment info */}
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#374151]/20 text-[10px]">
              <div className="flex items-center gap-3">
                <span className="text-[#ffd700]">0.0001 USDC paid</span>
                {txHash && (
                  <a
                    href={`${ARCSCAN_URL}/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#00f0ff] hover:underline"
                  >
                    Tx: {txHash.slice(0, 8)}...{txHash.slice(-4)}
                  </a>
                )}
              </div>
              <span className="text-[#8892a4]">
                Valid for {timeLeft || "15:00"}
              </span>
            </div>

            {/* Selected lot detail */}
            {selectedLot && (
              <div className="mt-3 p-3 rounded-lg bg-[#00f0ff]/5 border border-[#00f0ff]/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#f0f4f8] text-sm font-semibold">{selectedLot.name}</span>
                  <span
                    className={`text-xs font-bold ${
                      selectedLot.color === "green"
                        ? "text-[#00ff88]"
                        : selectedLot.color === "yellow"
                        ? "text-[#ffd700]"
                        : "text-[#ff4060]"
                    }`}
                  >
                    {selectedLot.available} spaces free
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-[#8892a4]">
                  <span>{selectedLot.distance}m away</span>
                  <span>{selectedLot.occupancyRate}% full</span>
                  <span>{selectedLot.capacity} total spots</span>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedLot.lat},${selectedLot.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 block w-full py-2 rounded-lg text-center text-xs font-semibold
                    bg-[#00ff88] text-[#0a0f1e] hover:bg-[#00e077] transition-colors cursor-pointer"
                >
                  Navigate Here
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Map click hint */}
      {!searchCenter && !loading && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[800] pointer-events-none">
          <div className="bg-[#0a0f1e]/80 backdrop-blur rounded-full px-4 py-2 border border-[#2a3040]">
            <span className="text-xs text-[#8892a4]">
              Click on the map to search for parking
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
