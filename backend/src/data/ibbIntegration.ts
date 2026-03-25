import { ibbClient, IBBBusPosition } from "./ibbClient.js";
import { VehicleSimulator } from "../simulator/vehicleSimulator.js";
import { detectZone } from "./istanbulDistricts.js";

interface UnifiedVehicle {
  id: string;
  type: "bus" | "garbage_truck" | "service" | "ambulance" | "police";
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  zone: string;
  status: "moving" | "stopped" | "idle";
  source: "ibb" | "simulated";
}

// Convert IBB bus positions to unified format
function ibbBusToUnified(bus: IBBBusPosition): UnifiedVehicle {
  return {
    id: `IBB-${bus.id}`,
    type: "bus",
    lat: bus.lat,
    lng: bus.lng,
    speed: bus.speed,
    heading: 0,
    zone: detectZone(bus.lat, bus.lng),
    status: bus.speed > 2 ? "moving" : "stopped",
    source: "ibb",
  };
}

// Zone detection imported from istanbulDistricts.ts (polygon-based)

// Merge IBB real buses + simulated vehicles
export async function getUnifiedVehicles(simulator: VehicleSimulator): Promise<{
  vehicles: UnifiedVehicle[];
  dataQuality: {
    realVehicles: number;
    simulatedVehicles: number;
    lastIBBUpdate: number | null;
  };
}> {
  // Get IBB bus positions (cached, won't spam API)
  let ibbBuses: UnifiedVehicle[] = [];
  try {
    const buses = await ibbClient.getBusPositions();
    ibbBuses = buses.map(ibbBusToUnified);
  } catch {
    // Fallback to simulation only — IBB API may be unreachable
  }

  // Get simulated vehicles
  const simVehicles: UnifiedVehicle[] = simulator.getPublicData().map((v) => ({
    ...v,
    type: v.type as UnifiedVehicle["type"],
    status: v.status as UnifiedVehicle["status"],
    source: "simulated" as const,
  }));

  return {
    vehicles: [...ibbBuses, ...simVehicles],
    dataQuality: {
      realVehicles: ibbBuses.length,
      simulatedVehicles: simVehicles.length,
      lastIBBUpdate: ibbClient.getDataQuality().lastUpdates.busPositions,
    },
  };
}

export type { UnifiedVehicle };
