"use client";

import dynamic from "next/dynamic";
import type { ParkingLot, LockedParkingLot } from "@/hooks/useParkingPayment";

const ParkMap = dynamic(
  () => import("./ParkMap").then((mod) => mod.ParkMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#0a0f1e]">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-[#00f0ff]/30 border-t-[#00f0ff] rounded-full animate-spin mb-3" />
          <p className="text-sm text-[#8892a4]">Loading parking map...</p>
        </div>
      </div>
    ),
  }
);

interface DynamicParkMapProps {
  lockedLots: LockedParkingLot[];
  unlockedLots: ParkingLot[];
  unlocked: boolean;
  searchCenter: { lat: number; lng: number } | null;
  searchRadius: number;
  selectedLot: ParkingLot | null;
  onMapClick: (lat: number, lng: number) => void;
  onSelectLot: (lot: ParkingLot) => void;
}

export function DynamicParkMap(props: DynamicParkMapProps) {
  return <ParkMap {...props} />;
}
