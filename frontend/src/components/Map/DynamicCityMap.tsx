"use client";

import dynamic from "next/dynamic";
import type { MunicipalVehicle, RouteResult, HeatmapPoint } from "@/types";

const CityMap = dynamic(
  () => import("./CityMap").then((mod) => mod.CityMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#0a0f1e]">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-[#00f0ff]/30 border-t-[#00f0ff] rounded-full animate-spin mb-3" />
          <p className="text-sm text-[#8892a4]">Loading map...</p>
        </div>
      </div>
    ),
  }
);

interface DynamicCityMapProps {
  vehicles: MunicipalVehicle[];
  routeResult: RouteResult | null;
  heatmapPoints: HeatmapPoint[];
  startPoint: [number, number] | null;
  endPoint: [number, number] | null;
  onMapClick: (lat: number, lng: number) => void;
}

export function DynamicCityMap(props: DynamicCityMapProps) {
  return <CityMap {...props} />;
}
