import { VehicleSimulator } from "./vehicleSimulator.js";

// Congestion zones with base congestion levels and peak hours
const CONGESTION_ZONES: Record<string, { baseCongestion: number; peakHours: number[] }> = {
  "Eminonu": { baseCongestion: 0.8, peakHours: [8, 9, 17, 18, 19] },
  "Taksim": { baseCongestion: 0.7, peakHours: [10, 11, 17, 18, 19, 20] },
  "Kadikoy": { baseCongestion: 0.65, peakHours: [8, 9, 17, 18] },
  "Levent": { baseCongestion: 0.6, peakHours: [8, 9, 10, 17, 18, 19] },
  "Bakirkoy": { baseCongestion: 0.5, peakHours: [8, 9, 18, 19] },
  "Besiktas": { baseCongestion: 0.55, peakHours: [9, 10, 18, 19, 20] },
  "Fatih": { baseCongestion: 0.7, peakHours: [9, 10, 11, 16, 17, 18] },
  "Sisli": { baseCongestion: 0.6, peakHours: [8, 9, 17, 18, 19] },
  "Beyoglu": { baseCongestion: 0.65, peakHours: [11, 12, 18, 19, 20, 21] },
  "Uskudar": { baseCongestion: 0.55, peakHours: [8, 9, 17, 18] },
  "Zeytinburnu": { baseCongestion: 0.45, peakHours: [8, 9, 17, 18] },
};

/**
 * Get congestion level for a zone at a given hour.
 * Returns a value between 0 (no congestion) and 1 (full congestion).
 */
export function getCongestion(zone: string, hour: number): number {
  const zoneData = CONGESTION_ZONES[zone];
  if (!zoneData) {
    return 0.3; // Default mild congestion for unknown zones
  }

  const isPeakHour = zoneData.peakHours.includes(hour);
  if (isPeakHour) {
    return Math.min(zoneData.baseCongestion * 1.3, 1.0);
  } else {
    return zoneData.baseCongestion * 0.6;
  }
}

/**
 * Get actual speed considering congestion.
 */
export function getActualSpeed(baseSpeed: number, zone: string): number {
  const hour = new Date().getHours();
  const congestion = getCongestion(zone, hour);
  return baseSpeed * (1 - congestion * 0.7);
}

/**
 * Get all zone congestion data for dashboard display.
 */
export function getAllZoneCongestion(): Array<{
  zone: string;
  congestion: number;
  isPeak: boolean;
}> {
  const hour = new Date().getHours();
  return Object.keys(CONGESTION_ZONES).map((zone) => {
    const zoneData = CONGESTION_ZONES[zone];
    const isPeak = zoneData.peakHours.includes(hour);
    return {
      zone,
      congestion: getCongestion(zone, hour),
      isPeak,
    };
  });
}

/**
 * Get zone-specific traffic data.
 */
export function getZoneTrafficData(
  zoneName: string,
  simulator: VehicleSimulator,
): {
  zone: string;
  vehicleCount: number;
  avgSpeed: number;
  congestionLevel: number;
  isPeakHour: boolean;
  vehicles: Array<{ id: string; type: string; speed: number; status: string }>;
} {
  const hour = new Date().getHours();
  const zoneVehicles = simulator.getVehiclesByZone(zoneName);
  const congestion = getCongestion(zoneName, hour);
  const zoneData = CONGESTION_ZONES[zoneName];
  const isPeak = zoneData ? zoneData.peakHours.includes(hour) : false;

  const avgSpeed =
    zoneVehicles.length > 0
      ? zoneVehicles.reduce((sum, v) => sum + v.speed, 0) / zoneVehicles.length
      : 0;

  return {
    zone: zoneName,
    vehicleCount: zoneVehicles.length,
    avgSpeed: Math.round(avgSpeed * 10) / 10,
    congestionLevel: Math.round(congestion * 100) / 100,
    isPeakHour: isPeak,
    vehicles: zoneVehicles.map((v) => ({
      id: v.id,
      type: v.type,
      speed: Math.round(v.speed * 10) / 10,
      status: v.status,
    })),
  };
}

/**
 * Generate heatmap data from vehicle positions and speeds.
 * Low speed => high intensity (congested), high speed => low intensity.
 */
export function getHeatmapData(
  simulator: VehicleSimulator,
): Array<{ lat: number; lng: number; intensity: number }> {
  const vehicles = simulator.getVehicles();
  const points: Array<{ lat: number; lng: number; intensity: number }> = [];

  for (const v of vehicles) {
    // Intensity inversely proportional to speed
    // Max theoretical speed ~70 km/h (ambulance), so normalize
    const maxSpeed = 70;
    const normalizedSpeed = Math.min(v.speed / maxSpeed, 1);
    const intensity = Math.round((1 - normalizedSpeed) * 100) / 100;

    points.push({
      lat: Math.round(v.lat * 10000) / 10000,
      lng: Math.round(v.lng * 10000) / 10000,
      intensity,
    });
  }

  // Also add congestion zone center points for denser heatmap
  const zoneCenters: Record<string, [number, number]> = {
    "Eminonu": [41.017, 28.970],
    "Taksim": [41.037, 28.985],
    "Kadikoy": [40.991, 29.023],
    "Levent": [41.071, 28.999],
    "Bakirkoy": [41.981, 28.856],
    "Besiktas": [41.043, 29.005],
    "Fatih": [41.008, 28.950],
    "Sisli": [41.060, 28.987],
    "Beyoglu": [41.034, 28.977],
    "Uskudar": [41.026, 29.015],
  };

  const hour = new Date().getHours();
  for (const [zone, [lat, lng]] of Object.entries(zoneCenters)) {
    const congestion = getCongestion(zone, hour);
    points.push({
      lat,
      lng,
      intensity: Math.round(congestion * 100) / 100,
    });
  }

  return points;
}

export const ZONES = Object.keys(CONGESTION_ZONES);
