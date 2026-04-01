"use client";

import { useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ISTANBUL_CENTER, TILE_URL, TILE_ATTRIBUTION, ARCSCAN_URL } from "@/lib/constants";
import type { ParkingLot, LockedParkingLot } from "@/hooks/useParkingPayment";

interface ParkMapProps {
  lockedLots: LockedParkingLot[];
  unlockedLots: ParkingLot[];
  unlocked: boolean;
  searchCenter: { lat: number; lng: number } | null;
  searchRadius: number;
  selectedLot: ParkingLot | null;
  onMapClick: (lat: number, lng: number) => void;
  onSelectLot: (lot: ParkingLot) => void;
}

// Locked marker (gray with lock)
function createLockedIcon(): L.DivIcon {
  return L.divIcon({
    className: "parking-locked-marker",
    html: `
      <div style="
        width:28px;height:28px;border-radius:50%;
        background:#374151;border:2px solid #6b7280;
        display:flex;align-items:center;justify-content:center;
        font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,0.4);
      ">&#x1F512;</div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

// Unlocked marker (color-coded by occupancy)
function createUnlockedIcon(color: "green" | "yellow" | "red", occupancyRate: number): L.DivIcon {
  const colorMap = {
    green: { bg: "#00ff88", border: "#00cc6a", shadow: "#00ff8860" },
    yellow: { bg: "#ffd700", border: "#ccac00", shadow: "#ffd70060" },
    red: { bg: "#ff4060", border: "#cc3350", shadow: "#ff406060" },
  };
  const c = colorMap[color];

  return L.divIcon({
    className: "parking-unlocked-marker",
    html: `
      <div style="
        position:relative;width:34px;height:34px;
      ">
        <div style="
          position:absolute;inset:0;
          border-radius:50%;
          background:${c.bg}20;border:2px solid ${c.bg};
          box-shadow:0 0 12px ${c.shadow};
        "></div>
        <div style="
          position:absolute;top:50%;left:50%;
          transform:translate(-50%,-50%);
          font-size:9px;font-weight:bold;
          color:${c.bg};
          text-shadow:0 0 4px rgba(0,0,0,0.8);
        ">${occupancyRate}%</div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

// Search center marker
const searchIcon = L.divIcon({
  className: "search-center-marker",
  html: `<div style="
    width:18px;height:18px;border-radius:50%;
    background:#00f0ff;border:3px solid #fff;
    box-shadow:0 0 16px #00f0ff80, 0 0 32px #00f0ff40;
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FitToSearch({
  searchCenter,
  radius,
}: {
  searchCenter: { lat: number; lng: number } | null;
  radius: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (searchCenter) {
      map.setView([searchCenter.lat, searchCenter.lng], 15, { animate: true });
    }
  }, [map, searchCenter, radius]);

  return null;
}

export function ParkMap({
  lockedLots,
  unlockedLots,
  unlocked,
  searchCenter,
  searchRadius,
  selectedLot,
  onMapClick,
  onSelectLot,
}: ParkMapProps) {
  const handleClick = useCallback(
    (lat: number, lng: number) => {
      onMapClick(lat, lng);
    },
    [onMapClick]
  );

  return (
    <MapContainer
      center={ISTANBUL_CENTER}
      zoom={12}
      className="w-full h-full"
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <MapClickHandler onMapClick={handleClick} />
      <FitToSearch searchCenter={searchCenter} radius={searchRadius} />

      {/* Search radius circle */}
      {searchCenter && (
        <Circle
          center={[searchCenter.lat, searchCenter.lng]}
          radius={searchRadius}
          pathOptions={{
            color: "#00f0ff",
            weight: 1.5,
            opacity: 0.4,
            fillColor: "#00f0ff",
            fillOpacity: 0.05,
            dashArray: "6, 4",
          }}
        />
      )}

      {/* Search center marker */}
      {searchCenter && (
        <Marker position={[searchCenter.lat, searchCenter.lng]} icon={searchIcon} />
      )}

      {/* LOCKED parking markers */}
      {!unlocked &&
        lockedLots.map((lot) => (
          <Marker
            key={`locked-${lot.id}`}
            position={[lot.lat, lot.lng]}
            icon={createLockedIcon()}
          >
            <Popup className="dark-popup">
              <div style={{ color: "#f0f4f8", fontSize: "12px", minWidth: "140px" }}>
                <div style={{ fontWeight: "bold", marginBottom: "4px" }}>{lot.name}</div>
                <div style={{ color: "#8892a4" }}>{lot.district}</div>
                <div style={{ color: "#8892a4", marginTop: "4px" }}>
                  {lot.distance}m away
                </div>
                <div style={{ color: "#ffd700", marginTop: "6px", fontSize: "10px" }}>
                  Pay to unlock availability
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

      {/* UNLOCKED parking markers */}
      {unlocked &&
        unlockedLots.map((lot) => (
          <Marker
            key={`unlocked-${lot.id}`}
            position={[lot.lat, lot.lng]}
            icon={createUnlockedIcon(lot.color, lot.occupancyRate)}
            eventHandlers={{
              click: () => onSelectLot(lot),
            }}
          >
            <Popup className="dark-popup">
              <div style={{ color: "#f0f4f8", fontSize: "12px", minWidth: "180px" }}>
                <div style={{ fontWeight: "bold", marginBottom: "4px" }}>{lot.name}</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ color: "#8892a4" }}>{lot.district}</span>
                  <span style={{
                    color: lot.color === "green" ? "#00ff88" : lot.color === "yellow" ? "#ffd700" : "#ff4060",
                    fontWeight: "bold",
                  }}>
                    {lot.occupancyRate}% full
                  </span>
                </div>
                <div style={{ color: "#f0f4f8" }}>
                  {lot.available}/{lot.capacity} spaces available
                </div>
                <div style={{
                  color: lot.status === "open" ? "#00ff88" : lot.status === "full" ? "#ff4060" : "#8892a4",
                  fontSize: "10px",
                  marginTop: "4px",
                  textTransform: "uppercase",
                  fontWeight: "bold",
                }}>
                  {lot.status}
                </div>
                <div style={{ color: "#8892a4", fontSize: "10px", marginTop: "4px" }}>
                  {lot.distance}m away
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}
