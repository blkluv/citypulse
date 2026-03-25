import { VehicleSimulator } from "../simulator/vehicleSimulator.js";
import { getCongestion, getAllZoneCongestion } from "../simulator/trafficEngine.js";
import { osrmService } from "./osrmService.js";
import { scoreRoute } from "./routeScorer.js";
import { detectZone } from "../data/istanbulDistricts.js";

// Istanbul bounding box for the grid (used by fallback A* only)
const BOUNDS = {
  minLat: 40.95,
  maxLat: 41.12,
  minLng: 28.84,
  maxLng: 29.10,
};

const GRID_SIZE = 50;
const LAT_STEP = (BOUNDS.maxLat - BOUNDS.minLat) / GRID_SIZE;
const LNG_STEP = (BOUNDS.maxLng - BOUNDS.minLng) / GRID_SIZE;

interface PathNode {
  row: number;
  col: number;
  g: number; // cost from start
  h: number; // heuristic to end
  f: number; // g + h
  parent: PathNode | null;
}

// ─── Grid-based A* fallback ───────────────────────────────────────────────────

/**
 * Build a speed grid from vehicle positions.
 * Cells near slow vehicles get lower speeds (more congestion).
 */
function buildSpeedGrid(simulator: VehicleSimulator): number[][] {
  const grid: number[][] = [];
  const hour = new Date().getHours();

  // Initialize grid with base speeds from zone congestion
  for (let r = 0; r < GRID_SIZE; r++) {
    grid[r] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      const lat = BOUNDS.minLat + (r + 0.5) * LAT_STEP;
      const lng = BOUNDS.minLng + (c + 0.5) * LNG_STEP;
      const zone = detectZone(lat, lng);
      const congestion = getCongestion(zone, hour);
      // Base speed 50 km/h adjusted by congestion
      grid[r][c] = 50 * (1 - congestion * 0.6);
    }
  }

  // Adjust speeds based on nearby vehicle data
  const vehicles = simulator.getVehicles();
  for (const v of vehicles) {
    const row = Math.floor((v.lat - BOUNDS.minLat) / LAT_STEP);
    const col = Math.floor((v.lng - BOUNDS.minLng) / LNG_STEP);

    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) continue;

    // Influence radius: 2 cells
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue;

        const dist = Math.sqrt(dr * dr + dc * dc);
        if (dist > 2.5) continue;

        const influence = 1 / (1 + dist);
        // Vehicle speed influences grid: slow vehicle = slow cell
        grid[nr][nc] = grid[nr][nc] * (1 - influence * 0.3) + v.speed * influence * 0.3;
      }
    }
  }

  // Clamp
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      grid[r][c] = Math.max(grid[r][c], 5); // minimum 5 km/h
    }
  }

  return grid;
}

// Zone detection imported from istanbulDistricts.ts (polygon-based)

function latLngToGrid(lat: number, lng: number): [number, number] {
  const row = Math.floor((lat - BOUNDS.minLat) / LAT_STEP);
  const col = Math.floor((lng - BOUNDS.minLng) / LNG_STEP);
  return [
    Math.max(0, Math.min(GRID_SIZE - 1, row)),
    Math.max(0, Math.min(GRID_SIZE - 1, col)),
  ];
}

function gridToLatLng(row: number, col: number): [number, number] {
  return [
    BOUNDS.minLat + (row + 0.5) * LAT_STEP,
    BOUNDS.minLng + (col + 0.5) * LNG_STEP,
  ];
}

/**
 * A* pathfinding on the speed grid. Cost = time to traverse = distance / speed.
 */
function astar(
  grid: number[][],
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
): PathNode[] {
  const open: PathNode[] = [];
  const closed = new Set<string>();

  const key = (r: number, c: number) => `${r},${c}`;

  const heuristic = (r: number, c: number): number => {
    // Manhattan distance in grid cells, converted to approximate time
    return (Math.abs(r - endRow) + Math.abs(c - endCol)) * 0.01;
  };

  const startNode: PathNode = {
    row: startRow,
    col: startCol,
    g: 0,
    h: heuristic(startRow, startCol),
    f: heuristic(startRow, startCol),
    parent: null,
  };
  open.push(startNode);

  // Directions: 8-connected
  const dirs = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
    [-1, -1], [-1, 1], [1, -1], [1, 1],
  ];

  let iterations = 0;
  const maxIterations = GRID_SIZE * GRID_SIZE * 2;

  while (open.length > 0 && iterations < maxIterations) {
    iterations++;

    // Find node with lowest f
    let bestIdx = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[bestIdx].f) bestIdx = i;
    }

    const current = open.splice(bestIdx, 1)[0];
    const currentKey = key(current.row, current.col);

    if (closed.has(currentKey)) continue;
    closed.add(currentKey);

    // Reached goal
    if (current.row === endRow && current.col === endCol) {
      const path: PathNode[] = [];
      let node: PathNode | null = current;
      while (node) {
        path.unshift(node);
        node = node.parent;
      }
      return path;
    }

    for (const [dr, dc] of dirs) {
      const nr = current.row + dr;
      const nc = current.col + dc;

      if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue;
      if (closed.has(key(nr, nc))) continue;

      // Cost = distance / speed (time in hours)
      const dist = Math.sqrt(dr * dr + dc * dc) * Math.max(LAT_STEP, LNG_STEP) * 111; // approx km
      const speed = grid[nr][nc];
      const timeCost = dist / speed; // hours

      const g = current.g + timeCost;
      const h = heuristic(nr, nc);

      open.push({
        row: nr,
        col: nc,
        g,
        h,
        f: g + h,
        parent: current,
      });
    }
  }

  // Fallback: straight line
  return [
    { row: startRow, col: startCol, g: 0, h: 0, f: 0, parent: null },
    { row: endRow, col: endCol, g: 1, h: 0, f: 1, parent: null },
  ];
}

/**
 * Generate a "normal" route — uses a uniform speed grid (no vehicle data).
 */
function normalRoute(
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
): { path: [number, number][]; timeMinutes: number } {
  // Uniform speed grid at 30 km/h (moderate city speed)
  const uniformGrid: number[][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    uniformGrid[r] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      uniformGrid[r][c] = 30;
    }
  }

  const pathNodes = astar(uniformGrid, startRow, startCol, endRow, endCol);
  const path: [number, number][] = pathNodes.map((n) => gridToLatLng(n.row, n.col));

  // Calculate total time
  const lastNode = pathNodes[pathNodes.length - 1];
  const timeMinutes = Math.round(lastNode.g * 60);

  return { path, timeMinutes: Math.max(timeMinutes, 5) };
}

/**
 * Grid-based A* fallback (the original routing approach).
 */
function calculateRouteGridFallback(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  simulator: VehicleSimulator,
): RouteResult {
  const [startRow, startCol] = latLngToGrid(from.lat, from.lng);
  const [endRow, endCol] = latLngToGrid(to.lat, to.lng);

  // Build speed grid from live vehicle data
  const speedGrid = buildSpeedGrid(simulator);

  // Optimized route using A* on live data grid
  const optimizedNodes = astar(speedGrid, startRow, startCol, endRow, endCol);
  const optimizedPath: [number, number][] = optimizedNodes.map((n) => gridToLatLng(n.row, n.col));
  const optimizedLastNode = optimizedNodes[optimizedNodes.length - 1];
  const optimizedTimeMinutes = Math.max(Math.round(optimizedLastNode.g * 60), 3);

  // Normal route without vehicle data
  const normal = normalRoute(startRow, startCol, endRow, endCol);

  // Find vehicles that contributed data along the optimized route
  const vehicles = simulator.getVehicles();
  const usedVehicles = new Set<string>();
  for (const node of optimizedNodes) {
    const [nodeLat, nodeLng] = gridToLatLng(node.row, node.col);
    for (const v of vehicles) {
      const dist = Math.sqrt(
        Math.pow((v.lat - nodeLat) * 111, 2) + Math.pow((v.lng - nodeLng) * 85, 2),
      );
      if (dist < 2) {
        // within ~2 km
        usedVehicles.add(v.id);
      }
    }
  }

  const savedMinutes = Math.max(normal.timeMinutes - optimizedTimeMinutes, 1);

  return {
    optimizedRoute: optimizedPath,
    normalRoute: normal.path,
    normalTime: normal.timeMinutes,
    optimizedTime: optimizedTimeMinutes,
    savedMinutes,
    vehiclesUsed: Array.from(usedVehicles).slice(0, 8),
    cost: "0.005",
    routeDetails: {
      normalDistance: 0,
      optimizedDistance: 0,
      segmentsWithRealData: 0,
      dataSource: "grid-fallback",
    },
  };
}

// ─── Public interface ─────────────────────────────────────────────────────────

export interface RouteResult {
  optimizedRoute: [number, number][];
  normalRoute: [number, number][];
  normalTime: number; // minutes
  optimizedTime: number; // minutes
  savedMinutes: number;
  vehiclesUsed: string[];
  cost: string;
  routeDetails: {
    normalDistance: number; // meters
    optimizedDistance: number; // meters
    segmentsWithRealData: number;
    dataSource: "osrm" | "grid-fallback";
  };
}

/**
 * Calculate optimized route using OSRM + live vehicle data scoring.
 * Falls back to grid-based A* if OSRM is unreachable.
 *
 * Strategy:
 * 1. Fetch up to 3 alternative routes from OSRM
 * 2. Score each route using live vehicle speed data (routeScorer)
 * 3. Pick the route with lowest cityPulseDuration as "optimized"
 * 4. Use OSRM's default (first) route as "normal"
 * 5. Return both with comparison metrics
 */
export async function calculateRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  simulator: VehicleSimulator,
): Promise<RouteResult> {
  // Try OSRM first
  const osrmResult = await osrmService.getRoute(from, to);

  if (osrmResult.error || osrmResult.routes.length === 0) {
    // OSRM unavailable — fall back to grid-based A*
    console.warn(
      `[CityPulse] OSRM unavailable (${osrmResult.error || "no routes"}), using grid fallback`,
    );
    return calculateRouteGridFallback(from, to, simulator);
  }

  // Gather live vehicle data for scoring
  const vehicles = simulator.getVehicles().map((v) => ({
    id: v.id,
    lat: v.lat,
    lng: v.lng,
    speed: v.speed,
  }));

  const congestionData = getAllZoneCongestion().map((z) => ({
    zone: z.zone,
    congestion: z.congestion,
  }));

  const vehicleRadius = parseInt(process.env.ROUTE_VEHICLE_RADIUS_METERS || "300");

  // Score all OSRM routes
  const scoredRoutes = osrmResult.routes.map((route) => ({
    route,
    score: scoreRoute(
      route.geometry,
      route.duration,
      vehicles,
      congestionData,
      vehicleRadius,
    ),
  }));

  // The "normal" route = OSRM's first (default) route
  const normalOsrm = scoredRoutes[0];

  // The "optimized" route = the one with the lowest cityPulseDuration
  const optimized = scoredRoutes.reduce((best, current) =>
    current.score.cityPulseDuration < best.score.cityPulseDuration ? current : best,
  );

  const normalTimeMinutes = Math.max(Math.round(normalOsrm.route.duration / 60), 1);
  const optimizedTimeMinutes = Math.max(Math.round(optimized.score.cityPulseDuration / 60), 1);
  const savedMinutes = Math.max(normalTimeMinutes - optimizedTimeMinutes, 0);

  return {
    optimizedRoute: optimized.route.geometry,
    normalRoute: normalOsrm.route.geometry,
    normalTime: normalTimeMinutes,
    optimizedTime: optimizedTimeMinutes,
    savedMinutes,
    vehiclesUsed: optimized.score.vehiclesUsed,
    cost: "0.005",
    routeDetails: {
      normalDistance: Math.round(normalOsrm.route.distance),
      optimizedDistance: Math.round(optimized.route.distance),
      segmentsWithRealData: optimized.score.segmentsWithRealData,
      dataSource: "osrm",
    },
  };
}
