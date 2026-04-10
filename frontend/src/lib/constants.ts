export const ISTANBUL_CENTER: [number, number] = [41.0082, 28.9784];
export const DEFAULT_ZOOM = 12;

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001";
export const CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0xe551CbbF162e7d3A1fDF4ba994aC01c02176b9a5").trim();

export const TILE_URL =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

export const VEHICLE_COLORS: Record<string, string> = {
  bus: "#3b82f6",        // blue
  garbage_truck: "#22c55e", // green
  service: "#f97316",    // orange
  ambulance: "#ef4444",  // red
  police: "#a855f7",     // purple
};

export const ARCSCAN_URL =
  process.env.NEXT_PUBLIC_ARCSCAN_URL || "https://testnet.arcscan.app";

export const PARKING_CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_PARKING_CONTRACT_ADDRESS || "0x0e702E09164A70F61DFd3f5535D44A105771De9d").trim();

export const ISTANBUL_ZONES = [
  "Fatih",
  "Beyoglu",
  "Sisli",
  "Besiktas",
  "Kadikoy",
  "Uskudar",
  "Levent",
  "Taksim",
  "Sultanahmet",
  "Eminonu",
  "Bayrampasa",
  "Eyup",
] as const;
