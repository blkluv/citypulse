"use client";

interface ComparisonCardProps {
  normalTime: number;
  optimizedTime: number;
  savedMinutes: number;
}

export function ComparisonCard({
  normalTime,
  optimizedTime,
  savedMinutes,
}: ComparisonCardProps) {
  const maxTime = Math.max(normalTime, optimizedTime);

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-[#ff4060]">Normal Route</span>
          <span className="text-xs font-mono text-[#ff4060]">
            {normalTime} min
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
          </span>
        </div>
        <div className="h-3 bg-[#111827] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-[#00f0ff] transition-all duration-700"
            style={{ width: `${(optimizedTime / maxTime) * 100}%` }}
          />
        </div>
      </div>
      <div className="flex justify-center">
        <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/30">
          {savedMinutes} min saved
        </span>
      </div>
    </div>
  );
}
