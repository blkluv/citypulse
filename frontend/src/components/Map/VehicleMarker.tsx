"use client";

import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import type { MunicipalVehicle } from "@/types";
import { VEHICLE_COLORS } from "@/lib/constants";

interface VehicleMarkerProps {
  vehicle: MunicipalVehicle;
}

function getSpeedColor(speed: number): string {
  if (speed > 30) return "#00ff88";
  if (speed > 15) return "#ffd700";
  return "#ff4060";
}

function getAnimationClass(speed: number): string {
  if (speed > 30) return "vehicle-pulse-fast";
  if (speed > 15) return "vehicle-pulse-medium";
  return "vehicle-pulse-slow";
}

function getVehicleEmoji(type: MunicipalVehicle["type"]): string {
  switch (type) {
    case "bus":
      return "B";
    case "garbage_truck":
      return "G";
    case "service":
      return "S";
    case "ambulance":
      return "A";
    case "police":
      return "P";
    default:
      return "V";
  }
}

function createVehicleIcon(vehicle: MunicipalVehicle): L.DivIcon {
  const speedColor = getSpeedColor(vehicle.speed);
  const typeColor = VEHICLE_COLORS[vehicle.type] || "#6b7280";
  const animClass = getAnimationClass(vehicle.speed);
  const letter = getVehicleEmoji(vehicle.type);

  const isLive = vehicle.source === "ibb";
  const badgeLabel = isLive ? "LIVE" : "SIM";
  const badgeBg = isLive ? "#00ff88" : "#3b82f6";
  const badgeOpacity = isLive ? "1" : "0.6";

  return L.divIcon({
    className: "vehicle-marker-container",
    html: `
      <div class="vehicle-marker ${animClass}" style="position:relative;width:24px;height:24px;">
        <div style="
          position:absolute;inset:0;
          border-radius:50%;
          background:${speedColor}33;
          border:2px solid ${speedColor};
        "></div>
        <div style="
          position:absolute;
          top:50%;left:50%;
          transform:translate(-50%,-50%);
          width:16px;height:16px;
          border-radius:50%;
          background:${typeColor};
          display:flex;align-items:center;justify-content:center;
          font-size:8px;font-weight:bold;color:#fff;
          font-family:monospace;
        ">${letter}</div>
        <div style="
          position:absolute;
          top:-6px;right:-8px;
          padding:0 3px;
          font-size:6px;font-weight:bold;
          font-family:monospace;
          color:#fff;
          background:${badgeBg};
          opacity:${badgeOpacity};
          border-radius:3px;
          line-height:10px;
          white-space:nowrap;
        ">${badgeLabel}</div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export function VehicleMarker({ vehicle }: VehicleMarkerProps) {
  const icon = createVehicleIcon(vehicle);

  return (
    <Marker position={[vehicle.lat, vehicle.lng]} icon={icon}>
      <Tooltip direction="top" offset={[0, -14]} opacity={0.95}>
        <div
          style={{
            background: "#1a1f2e",
            color: "#f0f4f8",
            padding: "6px 10px",
            borderRadius: "6px",
            fontSize: "11px",
            fontFamily: "monospace",
            border: "1px solid #2a3040",
            whiteSpace: "nowrap",
          }}
        >
          <strong style={{ color: "#00f0ff" }}>{vehicle.id}</strong>
          <span style={{ color: "#8892a4" }}> | </span>
          <span style={{ color: getSpeedColor(vehicle.speed) }}>
            {vehicle.speed} km/h
          </span>
          <span style={{ color: "#8892a4" }}> | </span>
          <span>{vehicle.zone}</span>
          {vehicle.source && (
            <>
              <span style={{ color: "#8892a4" }}> | </span>
              <span
                style={{
                  color: vehicle.source === "ibb" ? "#00ff88" : "#3b82f6",
                  fontWeight: "bold",
                }}
              >
                {vehicle.source === "ibb" ? "LIVE" : "SIM"}
              </span>
            </>
          )}
        </div>
      </Tooltip>
    </Marker>
  );
}
