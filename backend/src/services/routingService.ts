import { VehicleSimulator } from "../simulator/vehicleSimulator.js";
import { getCongestion } from "../simulator/trafficEngine.js";

// Istanbul bounding box for the grid
const BOUNDS = {
  minLat: 40.95,
  maxLat: 41.12,
  minLng: 28.84,
  maxLng: 29.10,
};

const GRID_SIZE = 50;
const LAT_STEP = (BOUNDS.maxLat - BOUNDS.minLat) / GRID_SIZE;
const LNG_STEP = (BOUNDS.maxLng - BOUNDS.minLng) / GRID_SIZE;

interface GridCell {
  row: number;
  col: number;
  lat: number;
  lng: number;
  speed: number; // effective travel speed through this cell in km/h
}

interface PathNode {
  row: number;
  col: number;
  g: number; // cost from start
  h: number; // heuristic to end
  f: number; // g + h
  parent: PathNode | null;
}

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
      const zone = detectZoneForGrid(lat, lng);
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

function detectZoneForGrid(lat: number, lng: number): string {
  if (lng > 29.00) {
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
  if (lat > 41.00) return "Fatih";
  if (lng < 28.90) return "Bakirkoy";
  return "Fatih";
}

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

export interface RouteResult {
  optimizedRoute: [number, number][];
  normalRoute: [number, number][];
  normalTime: number;
  optimizedTime: number;
  savedMinutes: number;
  vehiclesUsed: string[];
  cost: string;
}

/**
 * Calculate optimized route using live vehicle data.
 */
export function calculateRoute(
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
    vehiclesUsed: Array.from(usedVehicles).slice(0, 8), // Cap at 8 for display
    cost: "0.005",
  };
}
