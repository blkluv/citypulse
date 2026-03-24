"use client";

import { Polyline } from "react-leaflet";
import type { RouteResult } from "@/types";

interface RouteOverlayProps {
  route: RouteResult;
}

export function RouteOverlay({ route }: RouteOverlayProps) {
  return (
    <>
      {/* Normal route - dashed coral/red line */}
      <Polyline
        positions={route.normalRoute.map(([lat, lng]) => [lat, lng])}
        pathOptions={{
          color: "#ff4060",
          weight: 4,
          opacity: 0.6,
          dashArray: "10, 8",
        }}
      />
      {/* Optimized route - solid cyan line */}
      <Polyline
        positions={route.optimizedRoute.map(([lat, lng]) => [lat, lng])}
        pathOptions={{
          color: "#00f0ff",
          weight: 4,
          opacity: 0.9,
        }}
      />
      {/* Glow effect underneath optimized route */}
      <Polyline
        positions={route.optimizedRoute.map(([lat, lng]) => [lat, lng])}
        pathOptions={{
          color: "#00f0ff",
          weight: 10,
          opacity: 0.2,
        }}
      />
    </>
  );
}
