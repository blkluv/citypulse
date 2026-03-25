/**
 * Istanbul district boundary polygons for point-in-polygon zone detection.
 *
 * Each district is defined as a simplified polygon of ~8-15 lat/lng vertices
 * that approximate the real boundary. A ray-casting algorithm determines which
 * polygon (if any) contains a given coordinate. When no polygon matches, the
 * nearest district center is returned as a fallback so that no coordinate in
 * the Istanbul metropolitan area ever produces "Unknown".
 */

export interface DistrictPolygon {
  name: string;
  polygon: [number, number][]; // [lat, lng] vertices forming the boundary
  center: [number, number]; // centroid for fallback nearest-center lookup
}

export const ISTANBUL_DISTRICTS: DistrictPolygon[] = [
  {
    // Historical peninsula — bounded by Golden Horn (north), Marmara Sea (south/east),
    // and roughly Ataturk Blvd / old city walls to the west.
    name: "Eminonu",
    polygon: [
      [41.026, 28.954],
      [41.026, 28.970],
      [41.022, 28.980],
      [41.015, 28.982],
      [41.008, 28.978],
      [41.005, 28.972],
      [41.004, 28.960],
      [41.006, 28.954],
      [41.012, 28.950],
      [41.020, 28.950],
    ],
    center: [41.015, 28.968],
  },
  {
    // West of Eminonu — large inland district including Aksaray, Laleli, Topkapi.
    name: "Fatih",
    polygon: [
      [41.028, 28.916],
      [41.028, 28.954],
      [41.020, 28.954],
      [41.012, 28.950],
      [41.006, 28.954],
      [41.003, 28.960],
      [41.000, 28.958],
      [40.998, 28.945],
      [40.998, 28.930],
      [41.000, 28.918],
      [41.008, 28.912],
      [41.018, 28.912],
    ],
    center: [41.012, 28.935],
  },
  {
    // North of Golden Horn — Galata, Karakoy, Istiklal Caddesi lower section.
    name: "Beyoglu",
    polygon: [
      [41.046, 28.960],
      [41.046, 28.980],
      [41.040, 28.984],
      [41.034, 28.985],
      [41.028, 28.980],
      [41.024, 28.976],
      [41.024, 28.966],
      [41.026, 28.960],
      [41.030, 28.956],
      [41.038, 28.955],
    ],
    center: [41.035, 28.974],
  },
  {
    // Around Taksim Square — overlaps conceptually with upper Beyoglu but treated
    // as a separate zone for CityPulse (higher congestion, nightlife area).
    name: "Taksim",
    polygon: [
      [41.048, 28.978],
      [41.048, 29.002],
      [41.044, 29.004],
      [41.038, 29.002],
      [41.032, 28.998],
      [41.030, 28.990],
      [41.030, 28.982],
      [41.034, 28.978],
      [41.040, 28.976],
    ],
    center: [41.038, 28.990],
  },
  {
    // Bosphorus shore — Ortakoy, Besiktas ferry terminal, Yildiz Park.
    name: "Besiktas",
    polygon: [
      [41.062, 28.990],
      [41.062, 29.020],
      [41.056, 29.024],
      [41.048, 29.020],
      [41.042, 29.012],
      [41.036, 29.006],
      [41.036, 28.996],
      [41.040, 28.990],
      [41.048, 28.986],
      [41.055, 28.988],
    ],
    center: [41.048, 29.005],
  },
  {
    // Inland from Besiktas — Osmanbey, Mecidiyekoy, Gayrettepe.
    name: "Sisli",
    polygon: [
      [41.076, 28.970],
      [41.076, 29.008],
      [41.072, 29.010],
      [41.066, 29.008],
      [41.060, 29.002],
      [41.054, 28.996],
      [41.050, 28.986],
      [41.050, 28.972],
      [41.054, 28.966],
      [41.062, 28.964],
      [41.070, 28.966],
    ],
    center: [41.062, 28.988],
  },
  {
    // Business district — 1st through 4th Levent, Maslak.
    name: "Levent",
    polygon: [
      [41.112, 28.990],
      [41.112, 29.022],
      [41.104, 29.024],
      [41.094, 29.022],
      [41.084, 29.018],
      [41.076, 29.012],
      [41.070, 29.006],
      [41.070, 28.994],
      [41.074, 28.988],
      [41.082, 28.986],
      [41.092, 28.986],
      [41.102, 28.988],
    ],
    center: [41.090, 29.004],
  },
  {
    // Southern European coast — Bakirkoy seafront, Atakoy, Yesilkoy.
    name: "Bakirkoy",
    polygon: [
      [41.000, 28.830],
      [41.000, 28.892],
      [40.996, 28.896],
      [40.990, 28.896],
      [40.982, 28.892],
      [40.976, 28.885],
      [40.972, 28.870],
      [40.972, 28.848],
      [40.976, 28.835],
      [40.982, 28.830],
      [40.990, 28.828],
    ],
    center: [40.985, 28.860],
  },
  {
    // Asian side south — Kadikoy ferry, Moda, Fenerbahce, Bostanci.
    name: "Kadikoy",
    polygon: [
      [41.012, 29.010],
      [41.012, 29.065],
      [41.006, 29.068],
      [40.998, 29.066],
      [40.988, 29.060],
      [40.978, 29.052],
      [40.972, 29.040],
      [40.968, 29.025],
      [40.970, 29.012],
      [40.976, 29.006],
      [40.986, 29.004],
      [41.000, 29.006],
    ],
    center: [40.990, 29.034],
  },
  {
    // Asian side north — Uskudar ferry, Kuzguncuk, Altunizade.
    name: "Uskudar",
    polygon: [
      [41.042, 29.000],
      [41.042, 29.055],
      [41.036, 29.058],
      [41.028, 29.056],
      [41.020, 29.050],
      [41.014, 29.042],
      [41.010, 29.030],
      [41.008, 29.015],
      [41.010, 29.004],
      [41.018, 28.998],
      [41.028, 28.996],
      [41.036, 28.998],
    ],
    center: [41.026, 29.028],
  },
  {
    // Between Bakirkoy and Fatih — along E-5 highway corridor.
    name: "Zeytinburnu",
    polygon: [
      [41.012, 28.888],
      [41.012, 28.928],
      [41.008, 28.932],
      [41.002, 28.930],
      [40.996, 28.926],
      [40.990, 28.918],
      [40.988, 28.905],
      [40.988, 28.892],
      [40.992, 28.884],
      [40.998, 28.882],
      [41.006, 28.884],
    ],
    center: [41.000, 28.906],
  },
];

// ─── Ray-casting point-in-polygon ────────────────────────────────────────────

/**
 * Determine whether the point (lat, lng) lies inside the given polygon
 * using the ray-casting (even-odd rule) algorithm.
 *
 * `polygon` is an array of [lat, lng] vertices. The polygon is implicitly
 * closed (an edge exists from the last vertex back to the first).
 */
function pointInPolygon(
  lat: number,
  lng: number,
  polygon: [number, number][],
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i]; // yi = lat_i, xi = lng_i
    const [yj, xj] = polygon[j];

    // Check if the ray from (lat, lng) going in the +lng direction
    // crosses the edge from vertex j to vertex i.
    if (
      (yi > lng) !== (yj > lng) &&
      lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Detect which Istanbul district a coordinate falls in.
 *
 * 1. Try exact point-in-polygon match against every district boundary.
 * 2. If no polygon contains the point, fall back to the district whose
 *    center is nearest (Euclidean on lat/lng — acceptable for short
 *    distances at Istanbul's latitude).
 *
 * This guarantees a district name is always returned — never "Unknown".
 */
export function detectZone(lat: number, lng: number): string {
  // Exact polygon match
  for (const district of ISTANBUL_DISTRICTS) {
    if (pointInPolygon(lat, lng, district.polygon)) {
      return district.name;
    }
  }

  // Fallback: nearest district center
  let nearest = "Fatih"; // safe default
  let minDist = Infinity;
  for (const district of ISTANBUL_DISTRICTS) {
    const dLat = lat - district.center[0];
    const dLng = lng - district.center[1];
    const d = dLat * dLat + dLng * dLng; // squared distance is fine for comparison
    if (d < minDist) {
      minDist = d;
      nearest = district.name;
    }
  }
  return nearest;
}
