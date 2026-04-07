import { detectZone } from "../data/istanbulDistricts.js";

export interface MunicipalVehicle {
  id: string;
  type: "bus" | "garbage_truck" | "service" | "ambulance" | "police";
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  route: [number, number][];
  routeIndex: number;
  zone: string;
  lastUpdate: number;
  status: "moving" | "stopped" | "idle";
}

// --- Real Istanbul route waypoints ---

// 1. Bus Route E5: Bakirkoy -> Zeytinburnu -> Merter -> Gungoren (E5 highway corridor)
const ROUTE_E5: [number, number][] = [
  [40.9810, 28.8560], // Bakirkoy coast
  [40.9825, 28.8610],
  [40.9840, 28.8670],
  [40.9855, 28.8730],
  [40.9870, 28.8780], // Zeytinburnu approach
  [40.9880, 28.8830],
  [40.9890, 28.8880],
  [40.9905, 28.8920], // Zeytinburnu center
  [40.9920, 28.8960],
  [40.9935, 28.9000],
  [40.9945, 28.9040], // Merter approach
  [40.9950, 28.9080],
  [40.9955, 28.9120],
  [40.9960, 28.9150], // Merter
  [40.9965, 28.9180],
  [40.9970, 28.9210],
  [40.9975, 28.9240], // Gungoren approach
  [40.9980, 28.9270],
  [40.9985, 28.9300],
  [40.9990, 28.9330], // Gungoren
];

// 2. Bus Route Fatih: Eminonu -> Aksaray -> Topkapi loop
const ROUTE_FATIH: [number, number][] = [
  [41.0170, 28.9700], // Eminonu ferry terminal
  [41.0155, 28.9680],
  [41.0140, 28.9660],
  [41.0120, 28.9640], // Laleli approach
  [41.0100, 28.9620],
  [41.0080, 28.9590],
  [41.0060, 28.9560], // Aksaray
  [41.0050, 28.9530],
  [41.0045, 28.9500],
  [41.0040, 28.9470],
  [41.0035, 28.9440], // Topkapi approach
  [41.0030, 28.9410],
  [41.0028, 28.9380],
  [41.0030, 28.9350], // Topkapi
  [41.0040, 28.9370],
  [41.0055, 28.9400],
  [41.0070, 28.9440],
  [41.0090, 28.9480],
  [41.0110, 28.9520],
  [41.0130, 28.9560],
  [41.0145, 28.9600],
  [41.0160, 28.9650],
];

// 3. Bus Route Besiktas: Besiktas -> Levent -> Maslak (Buyukdere Caddesi)
const ROUTE_BESIKTAS: [number, number][] = [
  [41.0430, 29.0050], // Besiktas center
  [41.0460, 29.0040],
  [41.0490, 29.0030],
  [41.0520, 29.0020], // Gayrettepe area
  [41.0550, 29.0015],
  [41.0580, 29.0010],
  [41.0610, 29.0005], // Mecidiyekoy
  [41.0650, 29.0000],
  [41.0680, 28.9995],
  [41.0710, 28.9990], // Levent
  [41.0750, 28.9985],
  [41.0790, 28.9980],
  [41.0830, 28.9975], // 4.Levent
  [41.0870, 28.9970],
  [41.0900, 28.9965],
  [41.0940, 28.9960], // Maslak approach
  [41.0980, 28.9955],
  [41.1010, 28.9950],
  [41.1050, 28.9945], // Maslak center
  [41.1080, 28.9940],
];

// 4. Garbage Route Beyoglu: Istiklal, Cihangir, Galata winding streets
const ROUTE_BEYOGLU: [number, number][] = [
  [41.0340, 28.9770], // Istiklal start (Tunel)
  [41.0335, 28.9780],
  [41.0328, 28.9790],
  [41.0320, 28.9800], // Galatasaray
  [41.0310, 28.9810],
  [41.0300, 28.9815],
  [41.0290, 28.9810], // Cihangir direction
  [41.0280, 28.9800],
  [41.0270, 28.9790],
  [41.0260, 28.9780], // Cihangir
  [41.0265, 28.9770],
  [41.0275, 28.9760],
  [41.0285, 28.9750], // Galata direction
  [41.0295, 28.9740],
  [41.0300, 28.9730],
  [41.0305, 28.9720], // Galata Tower area
  [41.0310, 28.9735],
  [41.0320, 28.9750],
  [41.0330, 28.9760],
];

// 5. Garbage Route Kadikoy: Kadikoy -> Moda -> Fenerbahce (Asian side)
const ROUTE_KADIKOY: [number, number][] = [
  [40.9910, 29.0230], // Kadikoy center
  [40.9900, 29.0250],
  [40.9890, 29.0270],
  [40.9880, 29.0290], // Moda approach
  [40.9870, 29.0310],
  [40.9860, 29.0330],
  [40.9855, 29.0350], // Moda
  [40.9860, 29.0370],
  [40.9870, 29.0380],
  [40.9880, 29.0390],
  [40.9890, 29.0400], // Fenerbahce approach
  [40.9895, 29.0380],
  [40.9900, 29.0360],
  [40.9910, 29.0340],
  [40.9920, 29.0320],
  [40.9930, 29.0300],
  [40.9940, 29.0280],
  [40.9930, 29.0260],
  [40.9920, 29.0240],
];

// 6. Service Vehicle Sisli: Sisli -> Mecidiyekoy -> Gayrettepe
const ROUTE_SISLI: [number, number][] = [
  [41.0600, 28.9870], // Sisli center
  [41.0610, 28.9880],
  [41.0620, 28.9890],
  [41.0630, 28.9900],
  [41.0640, 28.9910], // Osmanbey area
  [41.0650, 28.9920],
  [41.0655, 28.9935],
  [41.0660, 28.9950], // Mecidiyekoy approach
  [41.0665, 28.9965],
  [41.0670, 28.9980],
  [41.0668, 28.9995],
  [41.0660, 29.0005], // Mecidiyekoy
  [41.0650, 29.0010],
  [41.0640, 29.0000],
  [41.0630, 28.9990],
  [41.0620, 28.9975], // Gayrettepe approach
  [41.0615, 28.9960],
  [41.0610, 28.9940],
  [41.0605, 28.9920],
  [41.0600, 28.9900],
];

// 7. Ambulance Taksim: Central hospitals area patrol
const ROUTE_TAKSIM: [number, number][] = [
  [41.0370, 28.9850], // Taksim Square
  [41.0380, 28.9860],
  [41.0390, 28.9875],
  [41.0400, 28.9890],
  [41.0410, 28.9905], // Harbiye
  [41.0420, 28.9920],
  [41.0430, 28.9930],
  [41.0440, 28.9940], // Nisantasi
  [41.0435, 28.9920],
  [41.0425, 28.9900],
  [41.0415, 28.9880],
  [41.0405, 28.9860],
  [41.0395, 28.9845],
  [41.0385, 28.9830],
  [41.0375, 28.9820], // Gumussuyu
  [41.0365, 28.9810],
  [41.0360, 28.9825],
  [41.0365, 28.9840],
];

// 8. Police Patrol Eminonu: Sultanahmet -> Sirkeci -> Karakoy
const ROUTE_EMINONU: [number, number][] = [
  [41.0055, 28.9770], // Sultanahmet (Blue Mosque area)
  [41.0065, 28.9760],
  [41.0075, 28.9750],
  [41.0085, 28.9740], // Topkapi Palace approach
  [41.0095, 28.9730],
  [41.0110, 28.9725],
  [41.0125, 28.9720], // Gulhane Park
  [41.0140, 28.9715],
  [41.0155, 28.9710],
  [41.0170, 28.9705], // Sirkeci
  [41.0180, 28.9700],
  [41.0190, 28.9695],
  [41.0200, 28.9690],
  [41.0210, 28.9685], // Eminonu Square
  [41.0220, 28.9680],
  [41.0230, 28.9690],
  [41.0240, 28.9700], // Karakoy approach
  [41.0250, 28.9710],
  [41.0240, 28.9720],
  [41.0230, 28.9730],
  [41.0220, 28.9740],
];

// 9. Bus Route Uskudar: Uskudar -> Altunizade -> Bostanci (Asian side coastal)
const ROUTE_USKUDAR: [number, number][] = [
  [41.0260, 29.0150], // Uskudar center
  [41.0240, 29.0170],
  [41.0220, 29.0190],
  [41.0200, 29.0210], // Kuzguncuk direction
  [41.0180, 29.0230],
  [41.0160, 29.0250],
  [41.0140, 29.0280], // Altunizade approach
  [41.0120, 29.0310],
  [41.0100, 29.0340],
  [41.0080, 29.0370], // Altunizade
  [41.0060, 29.0400],
  [41.0040, 29.0430],
  [41.0020, 29.0460],
  [41.0000, 29.0490], // Icerenkoy direction
  [40.9980, 29.0520],
  [40.9960, 29.0560],
  [40.9940, 29.0600], // Bostanci approach
  [40.9920, 29.0640],
  [40.9900, 29.0680],
  [40.9880, 29.0720],
  [40.9860, 29.0760], // Bostanci
];

// Zone detection imported from istanbulDistricts.ts (polygon-based)

// Speed ranges per vehicle type in km/h
const SPEED_RANGES: Record<string, [number, number]> = {
  bus: [25, 40],
  garbage_truck: [15, 25],
  service: [30, 50],
  ambulance: [40, 70],
  police: [35, 60],
};

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function addRouteJitter(route: [number, number][], index: number): [number, number][] {
  // Slight offset per vehicle so they don't overlap exactly
  const jitter = (index * 0.0003) % 0.001;
  return route.map(([lat, lng]) => [lat + jitter, lng + jitter]);
}

function createVehicle(
  id: string,
  type: MunicipalVehicle["type"],
  route: [number, number][],
  vehicleIndex: number,
): MunicipalVehicle {
  const adjustedRoute = addRouteJitter(route, vehicleIndex);
  const startIndex = Math.floor(Math.random() * adjustedRoute.length);
  const [lat, lng] = adjustedRoute[startIndex];
  const [minSpeed, maxSpeed] = SPEED_RANGES[type];

  return {
    id,
    type,
    lat,
    lng,
    speed: randomInRange(minSpeed, maxSpeed),
    heading: Math.random() * 360,
    route: adjustedRoute,
    routeIndex: startIndex,
    zone: detectZone(lat, lng),
    lastUpdate: Date.now(),
    status: "moving",
  };
}

// --- Additional routes for expanded fleet ---

// 10. Bus Route Bayrampasa → Esenler (inland west)
const ROUTE_BAYRAMPASA: [number, number][] = [
  [41.0480, 28.9200], [41.0460, 28.9240], [41.0440, 28.9280], [41.0420, 28.9320],
  [41.0400, 28.9360], [41.0380, 28.9400], [41.0360, 28.9350], [41.0340, 28.9300],
  [41.0320, 28.9260], [41.0340, 28.9220], [41.0360, 28.9200], [41.0380, 28.9180],
  [41.0400, 28.9160], [41.0420, 28.9180], [41.0440, 28.9190], [41.0460, 28.9200],
];

// 11. Garbage Route Atasehir (Asian side inland)
const ROUTE_ATASEHIR: [number, number][] = [
  [40.9850, 29.1000], [40.9870, 29.1040], [40.9890, 29.1080], [40.9910, 29.1120],
  [40.9930, 29.1100], [40.9920, 29.1060], [40.9900, 29.1020], [40.9880, 29.0980],
  [40.9860, 29.0950], [40.9840, 29.0920], [40.9830, 29.0950], [40.9840, 29.0980],
];

// 12. Service Route Sariyer (north Bosphorus)
const ROUTE_SARIYER: [number, number][] = [
  [41.1050, 29.0400], [41.1080, 29.0380], [41.1110, 29.0360], [41.1140, 29.0340],
  [41.1170, 29.0310], [41.1200, 29.0280], [41.1180, 29.0250], [41.1150, 29.0270],
  [41.1120, 29.0300], [41.1090, 29.0330], [41.1060, 29.0360], [41.1050, 29.0390],
];

// 13. Ambulance Route Kadikoy-Uskudar corridor
const ROUTE_KADIKOY_AMB: [number, number][] = [
  [40.9900, 29.0300], [40.9950, 29.0280], [41.0000, 29.0260], [41.0050, 29.0240],
  [41.0100, 29.0220], [41.0150, 29.0200], [41.0200, 29.0180], [41.0250, 29.0200],
  [41.0200, 29.0230], [41.0150, 29.0250], [41.0100, 29.0270], [41.0050, 29.0290],
];

// 14. Police Route Levent-Maslak (business district)
const ROUTE_LEVENT_POL: [number, number][] = [
  [41.0750, 29.0020], [41.0780, 29.0010], [41.0810, 29.0000], [41.0840, 28.9990],
  [41.0870, 28.9980], [41.0900, 28.9970], [41.0930, 28.9960], [41.0960, 28.9950],
  [41.0930, 28.9970], [41.0900, 28.9990], [41.0870, 29.0010], [41.0840, 29.0020],
];

// 15. Bus Route Maltepe (Asian side south coast)
const ROUTE_MALTEPE: [number, number][] = [
  [40.9350, 29.1300], [40.9380, 29.1260], [40.9410, 29.1220], [40.9440, 29.1180],
  [40.9470, 29.1140], [40.9500, 29.1100], [40.9530, 29.1060], [40.9560, 29.1020],
  [40.9530, 29.1040], [40.9500, 29.1080], [40.9470, 29.1120], [40.9440, 29.1160],
  [40.9410, 29.1200], [40.9380, 29.1240], [40.9350, 29.1280],
];

// --- Create all 80 vehicles ---
function createAllVehicles(): MunicipalVehicle[] {
  const vehicles: MunicipalVehicle[] = [];

  // 1. Bus Route E5 — 8 buses
  for (let i = 0; i < 8; i++) {
    vehicles.push(createVehicle(`IBB-BUS-E5-${String(i + 1).padStart(2, "0")}`, "bus", ROUTE_E5, i));
  }

  // 2. Bus Route Fatih — 7 buses
  for (let i = 0; i < 7; i++) {
    vehicles.push(createVehicle(`IBB-BUS-FT-${String(i + 1).padStart(2, "0")}`, "bus", ROUTE_FATIH, i));
  }

  // 3. Bus Route Besiktas — 7 buses
  for (let i = 0; i < 7; i++) {
    vehicles.push(createVehicle(`IBB-BUS-BS-${String(i + 1).padStart(2, "0")}`, "bus", ROUTE_BESIKTAS, i));
  }

  // 4. Garbage Route Beyoglu — 5 trucks
  for (let i = 0; i < 5; i++) {
    vehicles.push(createVehicle(`IBB-GRB-BY-${String(i + 1).padStart(2, "0")}`, "garbage_truck", ROUTE_BEYOGLU, i));
  }

  // 5. Garbage Route Kadikoy — 5 trucks
  for (let i = 0; i < 5; i++) {
    vehicles.push(createVehicle(`IBB-GRB-KD-${String(i + 1).padStart(2, "0")}`, "garbage_truck", ROUTE_KADIKOY, i));
  }

  // 6. Service Vehicle Sisli — 5 vans
  for (let i = 0; i < 5; i++) {
    vehicles.push(createVehicle(`IBB-SRV-SS-${String(i + 1).padStart(2, "0")}`, "service", ROUTE_SISLI, i));
  }

  // 7. Ambulance Taksim — 5 ambulances
  for (let i = 0; i < 5; i++) {
    vehicles.push(createVehicle(`IBB-AMB-TK-${String(i + 1).padStart(2, "0")}`, "ambulance", ROUTE_TAKSIM, i));
  }

  // 8. Police Patrol Eminonu — 5 police
  for (let i = 0; i < 5; i++) {
    vehicles.push(createVehicle(`IBB-POL-EM-${String(i + 1).padStart(2, "0")}`, "police", ROUTE_EMINONU, i));
  }

  // 9. Bus Route Uskudar — 6 buses
  for (let i = 0; i < 6; i++) {
    vehicles.push(createVehicle(`IBB-BUS-US-${String(i + 1).padStart(2, "0")}`, "bus", ROUTE_USKUDAR, i));
  }

  // 10. Bus Route Bayrampasa — 5 buses
  for (let i = 0; i < 5; i++) {
    vehicles.push(createVehicle(`IBB-BUS-BP-${String(i + 1).padStart(2, "0")}`, "bus", ROUTE_BAYRAMPASA, i));
  }

  // 11. Garbage Route Atasehir — 4 trucks
  for (let i = 0; i < 4; i++) {
    vehicles.push(createVehicle(`IBB-GRB-AT-${String(i + 1).padStart(2, "0")}`, "garbage_truck", ROUTE_ATASEHIR, i));
  }

  // 12. Service Route Sariyer — 4 vans
  for (let i = 0; i < 4; i++) {
    vehicles.push(createVehicle(`IBB-SRV-SR-${String(i + 1).padStart(2, "0")}`, "service", ROUTE_SARIYER, i));
  }

  // 13. Ambulance Kadikoy-Uskudar — 3 ambulances
  for (let i = 0; i < 3; i++) {
    vehicles.push(createVehicle(`IBB-AMB-KU-${String(i + 1).padStart(2, "0")}`, "ambulance", ROUTE_KADIKOY_AMB, i));
  }

  // 14. Police Patrol Levent — 3 police
  for (let i = 0; i < 3; i++) {
    vehicles.push(createVehicle(`IBB-POL-LV-${String(i + 1).padStart(2, "0")}`, "police", ROUTE_LEVENT_POL, i));
  }

  // 15. Bus Route Maltepe — 3 buses
  for (let i = 0; i < 3; i++) {
    vehicles.push(createVehicle(`IBB-BUS-ML-${String(i + 1).padStart(2, "0")}`, "bus", ROUTE_MALTEPE, i));
  }

  return vehicles; // Total: 80 vehicles
}

// --- Haversine distance in meters ---
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
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

// --- Calculate bearing between two points ---
function calculateHeading(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLng);
  const heading = (Math.atan2(y, x) * 180) / Math.PI;
  return (heading + 360) % 360;
}

// --- Vehicle Simulator Class ---
export class VehicleSimulator {
  vehicles: MunicipalVehicle[];
  private stopTimers: Map<string, number> = new Map();
  private getCongestionFn: ((zone: string, hour: number) => number) | null = null;

  constructor() {
    this.vehicles = createAllVehicles();
  }

  setCongestionFunction(fn: (zone: string, hour: number) => number): void {
    this.getCongestionFn = fn;
  }

  update(): void {
    const now = Date.now();
    const currentHour = new Date().getHours();

    for (const vehicle of this.vehicles) {
      // Check if vehicle is in a stop timer
      const stopUntil = this.stopTimers.get(vehicle.id);
      if (stopUntil && now < stopUntil) {
        vehicle.status = "stopped";
        vehicle.speed = 0;
        vehicle.lastUpdate = now;
        continue;
      }
      if (stopUntil) {
        this.stopTimers.delete(vehicle.id);
      }

      // 10% chance of brief stop (traffic light / bus stop)
      if (Math.random() < 0.10) {
        const stopDuration = 2000 + Math.random() * 3000; // 2-5 seconds
        this.stopTimers.set(vehicle.id, now + stopDuration);
        vehicle.status = "stopped";
        vehicle.speed = 0;
        vehicle.lastUpdate = now;
        continue;
      }

      vehicle.status = "moving";

      // Get target waypoint
      const nextIndex = (vehicle.routeIndex + 1) % vehicle.route.length;
      const [targetLat, targetLng] = vehicle.route[nextIndex];

      // Calculate distance to next waypoint
      const dist = haversineDistance(vehicle.lat, vehicle.lng, targetLat, targetLng);

      // Calculate base speed with some randomness
      const [minSpeed, maxSpeed] = SPEED_RANGES[vehicle.type];
      let baseSpeed = randomInRange(minSpeed, maxSpeed);

      // Apply congestion
      if (this.getCongestionFn) {
        const congestion = this.getCongestionFn(vehicle.zone, currentHour);
        baseSpeed = baseSpeed * (1 - congestion * 0.7);
      }

      vehicle.speed = baseSpeed;

      // Convert speed from km/h to m/s, then calculate distance traveled in 500ms
      const speedMs = (baseSpeed * 1000) / 3600;
      const distanceTraveled = speedMs * 0.5; // 500ms update interval

      if (dist <= 30) {
        // Reached waypoint — advance
        vehicle.routeIndex = nextIndex;
        vehicle.lat = targetLat;
        vehicle.lng = targetLng;
      } else {
        // Move toward waypoint
        const ratio = Math.min(distanceTraveled / dist, 1);
        vehicle.lat += (targetLat - vehicle.lat) * ratio;
        vehicle.lng += (targetLng - vehicle.lng) * ratio;
      }

      // Update heading
      vehicle.heading = calculateHeading(vehicle.lat, vehicle.lng, targetLat, targetLng);

      // Update zone
      vehicle.zone = detectZone(vehicle.lat, vehicle.lng);

      vehicle.lastUpdate = now;
    }
  }

  getVehicles(): MunicipalVehicle[] {
    return this.vehicles;
  }

  getVehiclesByZone(zone: string): MunicipalVehicle[] {
    const normalizedZone = zone.toLowerCase();
    return this.vehicles.filter((v) => v.zone.toLowerCase() === normalizedZone);
  }

  getVehiclesByType(type: string): MunicipalVehicle[] {
    return this.vehicles.filter((v) => v.type === type);
  }

  getPublicData(): Array<{
    id: string;
    type: string;
    lat: number;
    lng: number;
    speed: number;
    heading: number;
    zone: string;
    status: string;
  }> {
    return this.vehicles.map((v) => ({
      id: v.id,
      type: v.type,
      lat: v.lat,
      lng: v.lng,
      speed: Math.round(v.speed * 10) / 10,
      heading: Math.round(v.heading * 10) / 10,
      zone: v.zone,
      status: v.status,
    }));
  }
}
