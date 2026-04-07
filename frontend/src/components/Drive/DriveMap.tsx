"use client";

import { useEffect, useCallback, useState, useRef } from "react";
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
  isNavigating?: boolean;
}

const startIcon = L.divIcon({
  className: "route-point-marker",
  html: `<div style="width:22px;height:22px;border-radius:50%;background:#22C55E;border:3px solid #fff;box-shadow:0 0 16px #22C55E80;"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const endIcon = L.divIcon({
  className: "route-point-marker",
  html: `<div style="width:22px;height:22px;border-radius:50%;background:#EF4444;border:3px solid #fff;box-shadow:0 0 16px #EF444480;"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const navCarIcon = L.divIcon({
  className: "route-point-marker",
  html: `<div style="
    width:40px;height:40px;border-radius:50%;
    background:#22D3EE;border:3px solid #fff;
    box-shadow:0 0 20px #22D3EE80, 0 0 40px #22D3EE40;
    display:flex;align-items:center;justify-content:center;
    font-size:18px;
  ">&#x1F697;</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

function createSmallVehicleIcon(vehicle: MunicipalVehicle): L.DivIcon {
  const speedColor = vehicle.speed > 30 ? "#22C55E" : vehicle.speed > 15 ? "#EAB308" : "#EF4444";
  return L.divIcon({
    className: "vehicle-marker-container",
    html: `<div style="position:relative;width:14px;height:14px;">
      <div style="position:absolute;inset:0;border-radius:50%;background:${speedColor}33;border:1.5px solid ${speedColor};"></div>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:8px;height:8px;border-radius:50%;background:${speedColor};opacity:0.8;"></div>
    </div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function MapClickHandler({ onMapClick, enabled }: { onMapClick: (lat: number, lng: number) => void; enabled: boolean }) {
  useMapEvents({ click(e) { if (enabled) onMapClick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

function FitBounds({ routeResult, startPoint, endPoint }: { routeResult: RouteResult | null; startPoint: { lat: number; lng: number } | null; endPoint: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (routeResult) {
      const allPoints = [...routeResult.optimizedRoute, ...routeResult.normalRoute];
      if (allPoints.length > 0) {
        const bounds = L.latLngBounds(allPoints.map(([lat, lng]) => [lat, lng]));
        map.fitBounds(bounds, { padding: [80, 80], maxZoom: 15 });
      }
    } else if (startPoint && endPoint) {
      map.fitBounds(L.latLngBounds([[startPoint.lat, startPoint.lng], [endPoint.lat, endPoint.lng]]), { padding: [100, 100], maxZoom: 15 });
    } else if (startPoint) {
      map.setView([startPoint.lat, startPoint.lng], 14);
    }
  }, [map, routeResult, startPoint, endPoint]);
  return null;
}

/**
 * Navigation animator — moves a car marker along the optimized route.
 * Camera follows the car. Traversed portion shown in different color.
 */
function NavigationAnimator({ route, isNavigating }: { route: RouteResult; isNavigating: boolean }) {
  const map = useMap();
  const [progress, setProgress] = useState(0); // 0 to route.length-1 (float)
  const markerRef = useRef<L.Marker | null>(null);
  const traversedRef = useRef<L.Polyline | null>(null);
  const animFrameRef = useRef<number>(0);

  const points = route.optimizedRoute;

  useEffect(() => {
    if (!isNavigating || points.length < 2) return;

    // Create car marker
    const marker = L.marker([points[0][0], points[0][1]], { icon: navCarIcon, zIndexOffset: 1000 }).addTo(map);
    markerRef.current = marker;

    // Create traversed polyline
    const traversed = L.polyline([], { color: "#22C55E", weight: 6, opacity: 0.8 }).addTo(map);
    traversedRef.current = traversed;

    // Initial zoom
    map.setView([points[0][0], points[0][1]], 16, { animate: true });

    let currentProgress = 0;
    const speed = 0.15; // points per frame (~60fps → moves through route smoothly)

    function animate() {
      currentProgress += speed;

      if (currentProgress >= points.length - 1) {
        currentProgress = points.length - 1;
        // Arrived
        const lastPt = points[points.length - 1];
        marker.setLatLng([lastPt[0], lastPt[1]]);
        traversed.setLatLngs(points.map(([lat, lng]) => [lat, lng]));
        return;
      }

      // Interpolate between two points
      const idx = Math.floor(currentProgress);
      const frac = currentProgress - idx;
      const p1 = points[idx];
      const p2 = points[Math.min(idx + 1, points.length - 1)];
      const lat = p1[0] + (p2[0] - p1[0]) * frac;
      const lng = p1[1] + (p2[1] - p1[1]) * frac;

      // Update marker position
      marker.setLatLng([lat, lng]);

      // Update traversed path
      const traversedPoints = points.slice(0, idx + 1).map(([la, ln]) => [la, ln] as [number, number]);
      traversedPoints.push([lat, lng]);
      traversed.setLatLngs(traversedPoints);

      // Camera follows car smoothly
      map.panTo([lat, lng], { animate: false });

      setProgress(currentProgress);
      animFrameRef.current = requestAnimationFrame(animate);
    }

    // Start after a short delay
    const timeout = setTimeout(() => {
      animFrameRef.current = requestAnimationFrame(animate);
    }, 500);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(animFrameRef.current);
      marker.remove();
      traversed.remove();
      markerRef.current = null;
      traversedRef.current = null;
    };
  }, [isNavigating, points, map]);

  return null;
}

export function DriveMap({
  vehicles,
  routeResult,
  startPoint,
  endPoint,
  onMapClick,
  mapClickEnabled,
  isNavigating = false,
}: DriveMapProps) {
  const handleClick = useCallback((lat: number, lng: number) => { onMapClick(lat, lng); }, [onMapClick]);

  return (
    <MapContainer center={ISTANBUL_CENTER} zoom={13} className="w-full h-full" zoomControl={false} attributionControl={false}>
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <MapClickHandler onMapClick={handleClick} enabled={mapClickEnabled} />

      {/* Don't fit bounds during navigation — camera follows car */}
      {!isNavigating && <FitBounds routeResult={routeResult} startPoint={startPoint} endPoint={endPoint} />}

      {/* Vehicle markers — hide during navigation for cleaner view */}
      {!isNavigating && vehicles.map((v) => (
        <Marker key={v.id} position={[v.lat, v.lng]} icon={createSmallVehicleIcon(v)} />
      ))}

      {/* Start marker */}
      {startPoint && <Marker position={[startPoint.lat, startPoint.lng]} icon={startIcon} />}
      {/* End marker */}
      {endPoint && <Marker position={[endPoint.lat, endPoint.lng]} icon={endIcon} />}

      {/* Route overlays */}
      {routeResult && (
        <>
          {/* Normal route - dashed red */}
          {!isNavigating && (
            <Polyline
              positions={routeResult.normalRoute.map(([lat, lng]) => [lat, lng])}
              pathOptions={{ color: "#EF4444", weight: 4, opacity: 0.5, dashArray: "10, 8" }}
            />
          )}
          {/* Optimized route glow */}
          <Polyline
            positions={routeResult.optimizedRoute.map(([lat, lng]) => [lat, lng])}
            pathOptions={{ color: "#22D3EE", weight: isNavigating ? 8 : 12, opacity: isNavigating ? 0.3 : 0.15 }}
          />
          {/* Optimized route */}
          <Polyline
            positions={routeResult.optimizedRoute.map(([lat, lng]) => [lat, lng])}
            pathOptions={{ color: "#22D3EE", weight: isNavigating ? 4 : 5, opacity: isNavigating ? 0.6 : 0.9 }}
          />
        </>
      )}

      {/* Navigation animator — car moving along route */}
      {isNavigating && routeResult && routeResult.optimizedRoute.length > 1 && (
        <NavigationAnimator route={routeResult} isNavigating={isNavigating} />
      )}
    </MapContainer>
  );
}
