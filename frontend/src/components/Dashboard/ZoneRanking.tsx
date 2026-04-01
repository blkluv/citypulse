"use client";

import type { MunicipalVehicle } from "@/types";

interface ZoneRankingProps {
  vehicles: MunicipalVehicle[];
}

interface ZoneData {
  name: string;
  avgSpeed: number;
  vehicleCount: number;
}

function computeZoneData(vehicles: MunicipalVehicle[]): ZoneData[] {
  const zoneMap = new Map<string, { totalSpeed: number; count: number }>();

  for (const v of vehicles) {
    // Filter out empty or unknown zone names
    const zone = v.zone && v.zone !== "Unknown" ? v.zone : null;
    if (!zone) continue;

    const existing = zoneMap.get(zone);
    if (existing) {
      existing.totalSpeed += v.speed;
      existing.count += 1;
    } else {
      zoneMap.set(zone, { totalSpeed: v.speed, count: 1 });
    }
  }

  const zones: ZoneData[] = [];
  zoneMap.forEach((data, name) => {
    zones.push({
      name,
      avgSpeed: Math.round(data.totalSpeed / data.count),
      vehicleCount: data.count,
    });
  });

  // Sort by congestion — slowest (most congested) first
  zones.sort((a, b) => a.avgSpeed - b.avgSpeed);
  return zones;
}

export function ZoneRanking({ vehicles }: ZoneRankingProps) {
  const zones = computeZoneData(vehicles);

  return (
    <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-lg p-3 mb-4">
      <h3 className="text-xs uppercase tracking-wider text-[#8892a4] mb-3">
        Zone Congestion
      </h3>
      <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
        {zones.length === 0 ? (
          <div className="text-xs text-[#8892a4] text-center py-4">
            No vehicle data
          </div>
        ) : (
          zones.map((zone) => {
            const color =
              zone.avgSpeed > 30
                ? "#00ff88"
                : zone.avgSpeed > 15
                ? "#ffd700"
                : "#ff4060";
            return (
              <div
                key={zone.name}
                className="flex items-center justify-between py-1.5 px-2 rounded bg-[#111827]"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: color }}
                  />
                  <span className="text-xs text-[#f0f4f8]">{zone.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs font-mono"
                    style={{ color }}
                  >
                    {zone.avgSpeed} km/h
                  </span>
                  <span className="text-[10px] text-[#8892a4]">
                    {zone.vehicleCount}v
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
