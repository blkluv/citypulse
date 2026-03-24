"use client";

import { useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  ISTANBUL_CENTER,
  DEFAULT_ZOOM,
  TILE_URL,
  TILE_ATTRIBUTION,
} from "@/lib/constants";
import type { MunicipalVehicle, RouteResult, HeatmapPoint } from "@/types";
import { VehicleMarker } from "./VehicleMarker";
import { RouteOverlay } from "./RouteOverlay";
import { HeatmapLayer } from "./HeatmapLayer";

interface CityMapProps {
  vehicles: MunicipalVehicle[];
  routeResult: RouteResult | null;
  heatmapPoints: HeatmapPoint[];
  startPoint: [number, number] | null;
  endPoint: [number, number] | null;
  onMapClick: (lat: number, lng: number) => void;
}

const startIcon = L.divIcon({
  className: "route-point-marker",
  html: `<div style="
    width:20px;height:20px;border-radius:50%;
    background:#00ff88;border:3px solid #fff;
    box-shadow:0 0 10px #00ff8880;
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const endIcon = L.divIcon({
  className: "route-point-marker",
  html: `<div style="
    width:20px;height:20px;border-radius:50%;
    background:#ff4060;border:3px solid #fff;
    box-shadow:0 0 10px #ff406080;
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function CityMap({
  vehicles,
  routeResult,
  heatmapPoints,
  startPoint,
  endPoint,
  onMapClick,
}: CityMapProps) {
  const handleClick = useCallback(
    (lat: number, lng: number) => {
      onMapClick(lat, lng);
    },
    [onMapClick]
  );

  return (
    <MapContainer
      center={ISTANBUL_CENTER}
      zoom={DEFAULT_ZOOM}
      className="w-full h-full"
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <MapClickHandler onMapClick={handleClick} />

      {/* Heatmap layer */}
      <HeatmapLayer points={heatmapPoints} />

      {/* Vehicle markers */}
      {vehicles.map((v) => (
        <VehicleMarker key={v.id} vehicle={v} />
      ))}

      {/* Route start/end markers */}
      {startPoint && <Marker position={startPoint} icon={startIcon} />}
      {endPoint && <Marker position={endPoint} icon={endIcon} />}

      {/* Route overlay */}
      {routeResult && <RouteOverlay route={routeResult} />}
    </MapContainer>
  );
}
