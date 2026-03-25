"use client";

import type { RouteResult } from "@/types";

interface RouteComparisonCardProps {
  route: RouteResult;
  startName: string;
  endName: string;
  loading: boolean;
  error: string | null;
  onPay: () => void;
  onClose: () => void;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return (meters / 1000).toFixed(1) + " km";
  }
  return Math.round(meters) + " m";
}

export function RouteComparisonCard({
  route,
  startName,
  endName,
  loading,
  error,
  onPay,
  onClose,
}: RouteComparisonCardProps) {
  const normalDist = route.routeDetails?.normalDistance || 0;
  const optimizedDist = route.routeDetails?.optimizedDistance || 0;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[1000] drive-card-slide-up">
      <div className="max-w-lg mx-auto px-3 sm:px-4 pb-4">
        <div className="bg-[#0a0f1e]/95 backdrop-blur-xl border border-[#2a3040] rounded-2xl overflow-hidden shadow-2xl shadow-black/60">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2a3040]/60">
            <div>
              <h3 className="text-[#f0f4f8] font-semibold text-base">
                {startName} &rarr; {endName}
              </h3>
              <p className="text-[10px] text-[#8892a4] mt-0.5">
                Route comparison
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-[#8892a4] hover:text-[#f0f4f8] transition-colors text-lg"
            >
              &#x2715;
            </button>
          </div>

          {/* Routes comparison */}
          <div className="p-5 space-y-3">
            {/* Normal route */}
            <div className="flex items-center gap-4 bg-[#141924] rounded-xl px-4 py-3">
              <div className="w-3 h-3 rounded-full bg-[#ff4060] shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-[#8892a4] mb-0.5">
                  Normal route
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#f0f4f8] font-semibold text-lg font-mono">
                    {route.normalTime} min
                  </span>
                  {normalDist > 0 && (
                    <span className="text-xs text-[#8892a4]">
                      {formatDistance(normalDist)}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-xs text-[#ff4060]/60 font-mono">
                &#x2500;&#x2500;&#x2500;
              </div>
            </div>

            {/* CityPulse route */}
            <div className="flex items-center gap-4 bg-[#0d1520] border border-[#00f0ff]/20 rounded-xl px-4 py-3">
              <div className="w-3 h-3 rounded-full bg-[#00f0ff] shrink-0 shadow-[0_0_8px_#00f0ff60]" />
              <div className="flex-1">
                <div className="text-xs text-[#00f0ff] mb-0.5">
                  CityPulse route
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#f0f4f8] font-semibold text-lg font-mono">
                    {route.optimizedTime} min
                  </span>
                  {optimizedDist > 0 && (
                    <span className="text-xs text-[#8892a4]">
                      {formatDistance(optimizedDist)}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-xs text-[#00f0ff]/60 font-mono">
                &#x2550;&#x2550;&#x2550;
              </div>
            </div>

            {/* Savings badge */}
            <div className="flex items-center gap-3 px-1">
              <span className="inline-flex items-center gap-1.5 bg-[#00ff88]/10 text-[#00ff88] text-xs font-semibold px-3 py-1.5 rounded-full">
                <span className="font-mono">{route.savedMinutes} min</span>
                faster
              </span>
              {route.vehiclesUsed.length > 0 && (
                <span className="text-xs text-[#8892a4]">
                  {route.vehiclesUsed.length} vehicles on route
                </span>
              )}
            </div>

            {/* Error display */}
            {error && (
              <div className="text-xs text-[#ff4060] bg-[#ff4060]/10 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {/* Pay button */}
            <button
              onClick={onPay}
              disabled={loading}
              className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
                loading
                  ? "bg-[#2a3040] text-[#8892a4] cursor-wait"
                  : "bg-[#00f0ff] text-[#0a0f1e] hover:bg-[#00d4e0] active:scale-[0.98] payment-glow"
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-[#8892a4]/30 border-t-[#8892a4] rounded-full animate-spin" />
                  Processing payment...
                </span>
              ) : (
                <span>
                  Pay {route.cost || "0.0005"} USDC &amp; Navigate
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
