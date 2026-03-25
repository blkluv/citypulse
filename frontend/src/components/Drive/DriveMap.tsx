"use client";

import { useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ISTANBUL_CENTER, TILE_URL, TILE_ATTRIBUTION } from "@/lib/constants";
import type { MunicipalVehicle, RouteResult } from "@/types";

interface DriveMapProps {
  vehicles: MunicipalVehicle[];
  routeResult: RouteResult | null;
  startPoint: { lat: number; lng: number } | null;
  endPoint: { lat: number; lng: number } | null;
  onMapClick: (lat: number, lng: number) => void;
  mapClickEnabled: boolean;
}

const startIcon = L.divIcon({
  className: "route-point-marker",
  html: `<div style="
    width:22px;height:22px;border-radius:50%;
    background:#00ff88;border:3px solid #fff;
    box-shadow:0 0 16px #00ff8880, 0 0 32px #00ff8840;
  "></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const endIcon = L.divIcon({
  className: "route-point-marker",
  html: `<div style="
    width:22px;height:22px;border-radius:50%;
    background:#ff4060;border:3px solid #fff;
    box-shadow:0 0 16px #ff406080, 0 0 32px #ff406040;
  "></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function createSmallVehicleIcon(vehicle: MunicipalVehicle): L.DivIcon {
  const speedColor = vehicle.speed > 30 ? "#00ff88" : vehicle.speed > 15 ? "#ffd700" : "#ff4060";

  return L.divIcon({
    className: "vehicle-marker-container",
    html: `
      <div style="position:relative;width:14px;height:14px;">
        <div style="
          position:absolute;inset:0;
          border-radius:50%;
          background:${speedColor}33;
          border:1.5px solid ${speedColor};
        "></div>
        <div style="
          position:absolute;
          top:50%;left:50%;
          transform:translate(-50%,-50%);
          width:8px;height:8px;
          border-radius:50%;
          background:${speedColor};
          opacity:0.8;
        "></div>
      </div>
    `,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function MapClickHandler({
  onMapClick,
  enabled,
}: {
  onMapClick: (lat: number, lng: number) => void;
  enabled: boolean;
}) {
  useMapEvents({
    click(e) {
      if (enabled) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

function FitBounds({
  routeResult,
  startPoint,
  endPoint,
}: {
  routeResult: RouteResult | null;
  startPoint: { lat: number; lng: number } | null;
  endPoint: { lat: number; lng: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (routeResult) {
      // Fit to show both routes
      const allPoints = [
        ...routeResult.optimizedRoute,
        ...routeResult.normalRoute,
      ];
      if (allPoints.length > 0) {
        const bounds = L.latLngBounds(
          allPoints.map(([lat, lng]) => [lat, lng])
        );
        map.fitBounds(bounds, { padding: [80, 80], maxZoom: 15 });
      }
    } else if (startPoint && endPoint) {
      const bounds = L.latLngBounds(
        [
          [startPoint.lat, startPoint.lng],
          [endPoint.lat, endPoint.lng],
        ]
      );
      map.fitBounds(bounds, { padding: [100, 100], maxZoom: 15 });
    } else if (startPoint) {
      map.setView([startPoint.lat, startPoint.lng], 14);
    }
  }, [map, routeResult, startPoint, endPoint]);

  return null;
}

export function DriveMap({
  vehicles,
  routeResult,
  startPoint,
  endPoint,
  onMapClick,
  mapClickEnabled,
}: DriveMapProps) {
  const handleClick = useCallback(
    (lat: number, lng: number) => {
      onMapClick(lat, lng);
    },
    [onMapClick]
  );

  return (
    <MapContainer
      center={ISTANBUL_CENTER}
      zoom={13}
      className="w-full h-full"
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <MapClickHandler onMapClick={handleClick} enabled={mapClickEnabled} />
      <FitBounds
        routeResult={routeResult}
        startPoint={startPoint}
        endPoint={endPoint}
      />

      {/* Small vehicle markers */}
      {vehicles.map((v) => (
        <Marker
          key={v.id}
          position={[v.lat, v.lng]}
          icon={createSmallVehicleIcon(v)}
        />
      ))}

      {/* Start marker */}
      {startPoint && (
        <Marker position={[startPoint.lat, startPoint.lng]} icon={startIcon} />
      )}

      {/* End marker */}
      {endPoint && (
        <Marker position={[endPoint.lat, endPoint.lng]} icon={endIcon} />
      )}

      {/* Route overlays */}
      {routeResult && (
        <>
          {/* Normal route - dashed coral */}
          <Polyline
            positions={routeResult.normalRoute.map(([lat, lng]) => [lat, lng])}
            pathOptions={{
              color: "#ff4060",
              weight: 4,
              opacity: 0.5,
              dashArray: "10, 8",
            }}
          />
          {/* Optimized route glow */}
          <Polyline
            positions={routeResult.optimizedRoute.map(([lat, lng]) => [lat, lng])}
            pathOptions={{
              color: "#00f0ff",
              weight: 12,
              opacity: 0.15,
            }}
          />
          {/* Optimized route */}
          <Polyline
            positions={routeResult.optimizedRoute.map(([lat, lng]) => [lat, lng])}
            pathOptions={{
              color: "#00f0ff",
              weight: 5,
              opacity: 0.9,
            }}
          />
        </>
      )}
    </MapContainer>
  );
}
