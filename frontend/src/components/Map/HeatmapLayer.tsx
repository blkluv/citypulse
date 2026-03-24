"use client";

import { Circle } from "react-leaflet";
import type { HeatmapPoint } from "@/types";

interface HeatmapLayerProps {
  points: HeatmapPoint[];
}

function intensityToColor(intensity: number): string {
  if (intensity > 0.7) return "#ff4060";
  if (intensity > 0.4) return "#ffa040";
  return "#00ff88";
}

export function HeatmapLayer({ points }: HeatmapLayerProps) {
  return (
    <>
      {points.map((point, i) => (
        <Circle
          key={`heatmap-${i}`}
          center={[point.lat, point.lng]}
          radius={300 + point.intensity * 500}
          pathOptions={{
            color: "transparent",
            fillColor: intensityToColor(point.intensity),
            fillOpacity: 0.08 + point.intensity * 0.15,
          }}
        />
      ))}
    </>
  );
}
