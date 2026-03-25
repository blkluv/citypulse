"use client";

import dynamic from "next/dynamic";
import type { MunicipalVehicle, RouteResult } from "@/types";

const DriveMap = dynamic(
  () => import("./DriveMap").then((mod) => mod.DriveMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#0a0f1e]">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-[#00f0ff]/30 border-t-[#00f0ff] rounded-full animate-spin mb-3" />
          <p className="text-sm text-[#8892a4]">Loading navigation...</p>
        </div>
      </div>
    ),
  }
);

interface DynamicDriveMapProps {
  vehicles: MunicipalVehicle[];
  routeResult: RouteResult | null;
  startPoint: { lat: number; lng: number } | null;
  endPoint: { lat: number; lng: number } | null;
  onMapClick: (lat: number, lng: number) => void;
  mapClickEnabled: boolean;
}

export function DynamicDriveMap(props: DynamicDriveMapProps) {
  return <DriveMap {...props} />;
}
