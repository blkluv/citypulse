"use client";

import { useEffect, useState } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  color: string;
  prefix?: string;
  suffix?: string;
  verified?: boolean;
}

function StatCard({ label, value, color, prefix, suffix, verified }: StatCardProps) {
  const [displayValue, setDisplayValue] = useState<string | number>(
    typeof value === "number" ? 0 : value
  );

  useEffect(() => {
    if (typeof value !== "number") {
      setDisplayValue(value);
      return;
    }

    const target = value;
    const start =
      typeof displayValue === "number" ? displayValue : 0;
    const diff = target - start;
    if (diff === 0) return;

    const duration = 600;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#8892a4] mb-1.5">
        {label}
        {verified && (
          <span
            className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#00ff88]/20 text-[#00ff88] text-[8px] font-bold leading-none"
            title="Verified on-chain"
          >
            &#10003;
          </span>
        )}
      </div>
      <div className="font-mono text-xl font-bold" style={{ color }}>
        {prefix}
        {displayValue}
        {suffix}
      </div>
    </div>
  );
}

interface StatsBarProps {
  totalRevenue: string;
  totalQueries: number;
  avgCitySpeed: number;
  savedMinutes: number;
  activeVehicles: number;
}

export function StatsBar({
  totalRevenue,
  totalQueries,
  avgCitySpeed,
  savedMinutes,
  activeVehicles,
}: StatsBarProps) {
  const speedColor =
    avgCitySpeed > 30 ? "#00ff88" : avgCitySpeed > 15 ? "#ffd700" : "#ff4060";

  return (
    <div className="grid grid-cols-2 gap-2 mb-4">
      <StatCard
        label="Revenue"
        value={parseFloat(totalRevenue).toFixed(4)}
        color="#ffd700"
        suffix=" USDC"
        verified
      />
      <StatCard
        label="Queries"
        value={totalQueries}
        color="#00f0ff"
        verified
      />
      <StatCard
        label="Avg Speed"
        value={avgCitySpeed}
        color={speedColor}
        suffix=" km/h"
      />
      <StatCard
        label="Time Saved"
        value={savedMinutes}
        color="#00ff88"
        suffix=" min"
      />
      <div className="col-span-2">
        <StatCard
          label="Active Vehicles"
          value={activeVehicles}
          color="#a855f7"
        />
      </div>
    </div>
  );
}
