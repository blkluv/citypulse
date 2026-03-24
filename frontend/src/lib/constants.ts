export const ISTANBUL_CENTER: [number, number] = [41.0082, 28.9784];
export const DEFAULT_ZOOM = 12;

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001";
export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "0x0000000000000000000000000000000000000000";

export const TILE_URL =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

export const VEHICLE_COLORS: Record<string, string> = {
  bus: "#3b82f6",
  garbage_truck: "#a855f7",
  service: "#6b7280",
  ambulance: "#ef4444",
  police: "#f59e0b",
};

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
