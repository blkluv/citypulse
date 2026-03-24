/**
 * Route scorer: adjusts OSRM estimated durations using live municipal vehicle speed data.
 *
 * For each segment of an OSRM route, we check if any municipal vehicle is nearby.
 * If so, we use the vehicle's actual speed to adjust the estimated travel time.
 * Zone congestion data is also factored in as a penalty.
 */

export interface RouteScore {
  osrmDuration: number; // seconds — OSRM's original estimate
  cityPulseDuration: number; // seconds — adjusted with real vehicle data
  timeSaved: number; // seconds — difference (positive = CityPulse is faster)
  segmentsWithRealData: number;
  vehiclesUsed: string[];
}

interface VehicleData {
  id: string;
  lat: number;
  lng: number;
  speed: number; // km/h
}

interface CongestionData {
  zone: string;
  congestion: number; // 0..1
}

/**
 * Haversine distance between two lat/lng points, in meters.
 */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Detect Istanbul zone from coordinates (matches trafficEngine zone names).
 */
function detectZone(lat: number, lng: number): string {
  if (lng > 29.0) {
    if (lat > 41.02) return "Uskudar";
    return "Kadikoy";
  }
  if (lat > 41.06) return "Sisli";
  if (lat > 41.04) return "Besiktas";
  if (lat > 41.03) {
    if (lng < 28.99) return "Beyoglu";
    return "Taksim";
  }
  if (lat > 41.01) return "Eminonu";
  if (lat > 41.0) return "Fatih";
  if (lng < 28.9) return "Bakirkoy";
  return "Fatih";
}

/**
 * Score a route using live vehicle speed data and zone congestion.
 *
 * For each pair of consecutive geometry points:
 * 1. Calculate the segment midpoint
 * 2. Find the nearest vehicle within the search radius
 * 3. If found, use its speed to estimate segment travel time
 * 4. Apply zone congestion penalty
 * 5. Sum adjusted durations and compare with OSRM's estimate
 */
export function scoreRoute(
  routeGeometry: [number, number][],
  osrmDuration: number,
  vehicles: VehicleData[],
  congestionData: CongestionData[],
  vehicleRadiusMeters: number = 300,
): RouteScore {
  if (routeGeometry.length < 2) {
    return {
      osrmDuration,
      cityPulseDuration: osrmDuration,
      timeSaved: 0,
      segmentsWithRealData: 0,
      vehiclesUsed: [],
    };
  }

  // Build a congestion lookup
  const congestionMap = new Map<string, number>();
  for (const c of congestionData) {
    congestionMap.set(c.zone, c.congestion);
  }

  let totalAdjustedDuration = 0;
  let segmentsWithRealData = 0;
  const usedVehicleIds = new Set<string>();
  const totalSegments = routeGeometry.length - 1;

  // Duration per segment from OSRM (evenly distributed as approximation)
  const durationPerSegment = osrmDuration / totalSegments;

  for (let i = 0; i < totalSegments; i++) {
    const [lat1, lng1] = routeGeometry[i];
    const [lat2, lng2] = routeGeometry[i + 1];

    // Segment midpoint
    const midLat = (lat1 + lat2) / 2;
    const midLng = (lng1 + lng2) / 2;

    // Segment distance in meters
    const segmentDistMeters = haversineMeters(lat1, lng1, lat2, lng2);

    // Find nearest vehicle to the midpoint
    let nearestVehicle: VehicleData | null = null;
    let nearestDist = Infinity;

    for (const v of vehicles) {
      if (v.speed <= 0) continue; // skip stopped vehicles for speed estimation
      const d = haversineMeters(midLat, midLng, v.lat, v.lng);
      if (d < nearestDist && d <= vehicleRadiusMeters) {
        nearestDist = d;
        nearestVehicle = v;
      }
    }

    // Get zone congestion for this segment
    const zone = detectZone(midLat, midLng);
    const congestion = congestionMap.get(zone) ?? 0.3; // default mild

    let segmentDuration: number;

    if (nearestVehicle) {
      // Use vehicle's actual speed to estimate this segment's duration
      const vehicleSpeedMs = (nearestVehicle.speed * 1000) / 3600; // km/h -> m/s
      const rawDuration = segmentDistMeters / Math.max(vehicleSpeedMs, 1.4); // min ~5 km/h

      // Weight by proximity: closer vehicle = more influence
      const proximityWeight = 1 - nearestDist / vehicleRadiusMeters; // 1 at center, 0 at edge
      const blendFactor = 0.3 + proximityWeight * 0.5; // 0.3..0.8

      // Blend OSRM estimate with vehicle-based estimate
      segmentDuration =
        durationPerSegment * (1 - blendFactor) + rawDuration * blendFactor;

      usedVehicleIds.add(nearestVehicle.id);
      segmentsWithRealData++;
    } else {
      // No nearby vehicle — use OSRM estimate with congestion penalty
      const congestionPenalty = 1 + congestion * 0.3; // up to 30% slower
      segmentDuration = durationPerSegment * congestionPenalty;
    }

    totalAdjustedDuration += segmentDuration;
  }

  const timeSaved = totalAdjustedDuration - osrmDuration;

  return {
    osrmDuration,
    cityPulseDuration: Math.round(totalAdjustedDuration),
    timeSaved: Math.round(timeSaved),
    segmentsWithRealData,
    vehiclesUsed: Array.from(usedVehicleIds).slice(0, 8),
  };
}
