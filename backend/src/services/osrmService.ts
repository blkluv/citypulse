/**
 * OSRM (Open Source Routing Machine) client for real road-network routing.
 * Uses the public OSRM demo server by default.
 *
 * IMPORTANT: OSRM expects coordinates in lng,lat order (NOT lat,lng).
 * We convert to lat,lng for Leaflet on the way out.
 */

export interface OSRMStep {
  distance: number;
  duration: number;
  name: string;
  maneuver: { type: string; modifier?: string };
}

export interface OSRMRoute {
  distance: number; // meters
  duration: number; // seconds
  geometry: [number, number][]; // [lat, lng] pairs (converted from OSRM's [lng,lat])
  legs: {
    steps: OSRMStep[];
  }[];
}

interface OSRMResponse {
  code: string;
  routes?: {
    distance: number;
    duration: number;
    geometry: {
      type: string;
      coordinates: [number, number][]; // [lng, lat] — OSRM native format
    };
    legs: {
      steps: {
        distance: number;
        duration: number;
        name: string;
        maneuver: { type: string; modifier?: string; location: [number, number] };
      }[];
    }[];
  }[];
  waypoints?: { location: [number, number]; name: string }[];
  message?: string;
}

class OSRMService {
  private baseUrl: string;
  private timeoutMs: number;

  constructor() {
    this.baseUrl = process.env.OSRM_URL || "https://router.project-osrm.org";
    this.timeoutMs = 5000; // 5 second timeout
  }

  /**
   * Fetch driving route(s) from OSRM between two points.
   * Returns up to 3 alternative routes with full geometry and turn-by-turn steps.
   */
  async getRoute(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
  ): Promise<{ routes: OSRMRoute[]; error?: string }> {
    // OSRM uses lng,lat order
    const url =
      `${this.baseUrl}/route/v1/driving/` +
      `${from.lng},${from.lat};${to.lng},${to.lat}` +
      `?overview=full&geometries=geojson&steps=true&alternatives=true`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "CityPulse-Istanbul/1.0",
        },
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          routes: [],
          error: `OSRM HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = (await response.json()) as OSRMResponse;

      if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
        return {
          routes: [],
          error: `OSRM error: ${data.message || data.code || "no routes found"}`,
        };
      }

      // Convert OSRM routes to our format (swap lng,lat -> lat,lng for Leaflet)
      const routes: OSRMRoute[] = data.routes.slice(0, 3).map((r) => ({
        distance: r.distance,
        duration: r.duration,
        geometry: r.geometry.coordinates.map(
          ([lng, lat]) => [lat, lng] as [number, number],
        ),
        legs: r.legs.map((leg) => ({
          steps: leg.steps.map((step) => ({
            distance: step.distance,
            duration: step.duration,
            name: step.name || "unnamed road",
            maneuver: {
              type: step.maneuver.type,
              modifier: step.maneuver.modifier,
            },
          })),
        })),
      }));

      return { routes };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return { routes: [], error: "OSRM request timed out (5s)" };
      }
      const message = err instanceof Error ? err.message : String(err);
      return { routes: [], error: `OSRM fetch failed: ${message}` };
    }
  }
}

export const osrmService = new OSRMService();
