"use client";

interface ComparisonCardProps {
  normalTime: number;
  optimizedTime: number;
  savedMinutes: number;
  normalDistance?: number;
  optimizedDistance?: number;
}

export function ComparisonCard({
  normalTime,
  optimizedTime,
  savedMinutes,
  normalDistance,
  optimizedDistance,
}: ComparisonCardProps) {
  const maxTime = Math.max(normalTime, optimizedTime);
  const hasDistance =
    normalDistance !== undefined && optimizedDistance !== undefined;
  const maxDistance = hasDistance
    ? Math.max(normalDistance, optimizedDistance)
    : 1;

  return (
    <div className="space-y-3">
      {/* Time comparison */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-[#ff4060]">Normal Route</span>
          <span className="text-xs font-mono text-[#ff4060]">
            {normalTime} min
            {hasDistance && (
              <span className="text-[#8892a4] ml-1">
                ({(normalDistance / 1000).toFixed(1)} km)
              </span>
            )}
          </span>
        </div>
        <div className="h-3 bg-[#111827] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-[#ff4060] transition-all duration-700"
            style={{ width: `${(normalTime / maxTime) * 100}%` }}
          />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-[#00f0ff]">CityPulse Route</span>
          <span className="text-xs font-mono text-[#00f0ff]">
            {optimizedTime} min
            {hasDistance && (
              <span className="text-[#8892a4] ml-1">
                ({(optimizedDistance / 1000).toFixed(1)} km)
              </span>
            )}
          </span>
        </div>
        <div className="h-3 bg-[#111827] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-[#00f0ff] transition-all duration-700"
            style={{ width: `${(optimizedTime / maxTime) * 100}%` }}
          />
        </div>
      </div>

      {/* Distance bars (shown only when distance data available) */}
      {hasDistance && (
        <>
          <div className="pt-1 border-t border-[#2a3040]">
            <div className="text-[10px] uppercase tracking-wider text-[#8892a4] mb-2">
              Distance
            </div>
            <div className="flex gap-2 items-end h-6">
              <div className="flex-1">
                <div className="h-2 bg-[#111827] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#ff4060]/60 transition-all duration-700"
                    style={{
                      width: `${(normalDistance / maxDistance) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="h-2 bg-[#111827] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#00f0ff]/60 transition-all duration-700"
                    style={{
                      width: `${(optimizedDistance / maxDistance) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="flex justify-center">
        <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/30">
          {savedMinutes} min saved
        </span>
      </div>
    </div>
  );
}
