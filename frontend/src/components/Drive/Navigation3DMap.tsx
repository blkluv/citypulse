"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { RouteResult } from "@/types";

interface Navigation3DMapProps {
  route: RouteResult;
  onStepChange?: (stepIndex: number) => void;
}

// Dark map style using free OpenStreetMap tiles
const DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png"],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap &copy; CARTO",
    },
  },
  layers: [
    {
      id: "osm-tiles",
      type: "raster",
      source: "osm",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

/**
 * Calculate bearing between two points in degrees.
 */
function getBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function Navigation3DMap({ route, onStepChange }: Navigation3DMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const animRef = useRef<number>(0);
  const [arrived, setArrived] = useState(false);

  const points = route.optimizedRoute;

  useEffect(() => {
    if (!containerRef.current || points.length < 2) return;

    // Initialize MapLibre map with 3D perspective
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DARK_STYLE,
      center: [points[0][1], points[0][0]], // MapLibre uses [lng, lat]
      zoom: 17,
      pitch: 60, // 3D tilt!
      bearing: getBearing(points[0][0], points[0][1], points[1][0], points[1][1]),
    });

    mapRef.current = map;

    map.on("load", () => {
      // Add route line — cyan glow
      map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: points.map(([lat, lng]) => [lng, lat]),
          },
        },
      });

      // Route glow (wide, transparent)
      map.addLayer({
        id: "route-glow",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#22D3EE", "line-width": 14, "line-opacity": 0.2 },
      });

      // Route line (main)
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#22D3EE", "line-width": 6, "line-opacity": 0.9 },
      });

      // Traversed route (green)
      map.addSource("traversed", {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } },
      });

      map.addLayer({
        id: "traversed-line",
        type: "line",
        source: "traversed",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#22C55E", "line-width": 6, "line-opacity": 0.9 },
      });

      // End marker
      const endEl = document.createElement("div");
      endEl.innerHTML = `<div style="width:24px;height:24px;border-radius:50%;background:#EF4444;border:3px solid #fff;box-shadow:0 0 12px #EF444480;"></div>`;
      new maplibregl.Marker({ element: endEl })
        .setLngLat([points[points.length - 1][1], points[points.length - 1][0]])
        .addTo(map);

      // Car marker — positioned at bottom center of map
      const carEl = document.createElement("div");
      carEl.innerHTML = `<div style="
        width:44px;height:44px;border-radius:50%;
        background:#22D3EE;border:3px solid #fff;
        box-shadow:0 0 20px #22D3EE80, 0 0 40px #22D3EE30;
        display:flex;align-items:center;justify-content:center;
        font-size:22px;
      ">&#x1F697;</div>`;
      const marker = new maplibregl.Marker({ element: carEl, anchor: "center" })
        .setLngLat([points[0][1], points[0][0]])
        .addTo(map);
      markerRef.current = marker;

      // Animation
      let progress = 0;
      const speed = 0.08; // slower for immersive feel
      let lastStepIdx = 0;

      function animate() {
        progress += speed;

        if (progress >= points.length - 1) {
          progress = points.length - 1;
          setArrived(true);
          const last = points[points.length - 1];
          marker.setLngLat([last[1], last[0]]);
          return;
        }

        const idx = Math.floor(progress);
        const frac = progress - idx;
        const p1 = points[idx];
        const p2 = points[Math.min(idx + 1, points.length - 1)];
        const lat = p1[0] + (p2[0] - p1[0]) * frac;
        const lng = p1[1] + (p2[1] - p1[1]) * frac;

        // Update car position
        marker.setLngLat([lng, lat]);

        // Update traversed line
        const traversedCoords = points.slice(0, idx + 1).map(([la, ln]) => [ln, la]);
        traversedCoords.push([lng, lat]);
        const traversedSource = map.getSource("traversed") as maplibregl.GeoJSONSource;
        if (traversedSource) {
          traversedSource.setData({
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: traversedCoords },
          });
        }

        // Calculate bearing to next point
        const nextIdx = Math.min(idx + 3, points.length - 1);
        const bearing = getBearing(lat, lng, points[nextIdx][0], points[nextIdx][1]);

        // Smoothly rotate map to follow car direction
        map.easeTo({
          center: [lng, lat],
          bearing: bearing,
          pitch: 60,
          zoom: 17,
          duration: 100,
          easing: (t) => t,
        });

        // Notify parent of step changes (for turn-by-turn UI)
        if (route.steps && route.steps.length > 0) {
          let accumulated = 0;
          for (let i = 0; i < route.steps.length; i++) {
            accumulated += route.steps[i].duration / 5;
            if (progress * 0.5 < accumulated) {
              if (i !== lastStepIdx) {
                lastStepIdx = i;
                onStepChange?.(i);
              }
              break;
            }
          }
        }

        animRef.current = requestAnimationFrame(animate);
      }

      // Start animation after map loads
      setTimeout(() => {
        animRef.current = requestAnimationFrame(animate);
      }, 1000);
    });

    return () => {
      cancelAnimationFrame(animRef.current);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [points, route.steps, onStepChange]);

  return (
    <div ref={containerRef} className="absolute inset-0 z-0" style={{ background: "#0A0F1C" }}>
      {arrived && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] bg-[#0A0F1C]/90 backdrop-blur-xl rounded-[12px] px-8 py-6 text-center border border-[#22C55E]/30">
          <div className="text-3xl mb-2">&#x1F3C1;</div>
          <div className="text-white text-[18px] font-semibold">You have arrived!</div>
          <div className="text-[#94A3B8] text-[13px] mt-1">Powered by CityPulse &middot; Circle Nanopayments</div>
        </div>
      )}
    </div>
  );
}
