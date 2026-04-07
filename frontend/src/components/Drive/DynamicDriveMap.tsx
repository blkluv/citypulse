"use client";

import dynamic from "next/dynamic";
import type { MunicipalVehicle, RouteResult } from "@/types";

const DriveMap = dynamic(
  () => import("./DriveMap").then((mod) => mod.DriveMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#0A0F1C]">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-[#22D3EE]/30 border-t-[#22D3EE] rounded-full animate-spin mb-3" />
          <p className="text-sm text-[#94A3B8]">Loading navigation...</p>
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
  isNavigating?: boolean;
}

export function DynamicDriveMap(props: DynamicDriveMapProps) {
  return <DriveMap {...props} />;
}
