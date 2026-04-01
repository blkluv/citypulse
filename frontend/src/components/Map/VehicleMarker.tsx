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
  const typeColor = VEHICLE_COLORS[vehicle.type] || "#6b7280";
  const letter = getVehicleEmoji(vehicle.type);
  const isAmbulance = vehicle.type === "ambulance";

  const isLive = vehicle.source === "ibb";
  const badgeLabel = isLive ? "LIVE" : "SIM";
  const badgeBg = isLive ? "#00ff88" : "#3b82f6";
  const badgeOpacity = isLive ? "1" : "0.6";

  // Ambulance gets special pulsing red glow
  const pulseStyle = isAmbulance
    ? `animation:ambulance-pulse 1s ease-in-out infinite;`
    : "";
  const glowShadow = isAmbulance
    ? `box-shadow:0 0 12px ${typeColor}80, 0 0 24px ${typeColor}40;`
    : `box-shadow:0 0 6px ${typeColor}40;`;

  return L.divIcon({
    className: "vehicle-marker-container",
    html: `
      <style>
        @keyframes ambulance-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.7; }
        }
      </style>
      <div style="position:relative;width:26px;height:26px;">
        <div style="
          position:absolute;inset:0;
          border-radius:50%;
          background:${typeColor}25;
          border:2px solid ${typeColor};
          ${glowShadow}
          ${pulseStyle}
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
    iconSize: [26, 26],
    iconAnchor: [13, 13],
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
