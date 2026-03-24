export interface MunicipalVehicle {
  id: string;
  type: "bus" | "garbage_truck" | "service" | "ambulance" | "police";
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  zone: string;
  status: "moving" | "stopped" | "idle";
}

export interface PaymentEvent {
  driver: string;
  amount: string;
  fromZone: string;
  toZone: string;
  vehiclesQueried: number;
  savedMinutes: number;
  timestamp: number;
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

export interface DashboardStats {
  totalQueries: number;
  totalRevenue: string;
  activeVehicles: number;
  avgCitySpeed: number;
  busiestZone: string;
  quietestZone: string;
  savedMinutesTotal: number;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
}
