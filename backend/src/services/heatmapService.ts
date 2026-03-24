import { VehicleSimulator } from "../simulator/vehicleSimulator.js";

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
}

/**
 * Generate heatmap data from vehicle positions.
 * Low speed vehicles contribute high intensity (congestion indicators).
 * High speed vehicles contribute low intensity.
 */
export function generateHeatmap(simulator: VehicleSimulator): HeatmapPoint[] {
  const vehicles = simulator.getVehicles();
  const points: HeatmapPoint[] = [];

  const maxSpeed = 70; // max theoretical speed (ambulance)

  for (const v of vehicles) {
    // Intensity: slow = red (high), fast = green (low)
    const normalizedSpeed = Math.min(v.speed / maxSpeed, 1);
    const intensity = Math.round((1 - normalizedSpeed) * 100) / 100;

    // Add the vehicle position
    points.push({
      lat: Math.round(v.lat * 10000) / 10000,
      lng: Math.round(v.lng * 10000) / 10000,
      intensity,
    });

    // Add surrounding points for a smoother heatmap (radius effect)
    const spread = 0.002;
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * spread;
      points.push({
        lat: Math.round((v.lat + Math.cos(angle) * r) * 10000) / 10000,
        lng: Math.round((v.lng + Math.sin(angle) * r) * 10000) / 10000,
        intensity: Math.round(intensity * 0.6 * 100) / 100,
      });
    }
  }

  return points;
}
