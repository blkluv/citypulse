"use client";

import { useState, useCallback, useMemo } from "react";
import { Header } from "@/components/common/Header";
import { LiveTicker } from "@/components/common/LiveTicker";
import { DynamicCityMap } from "@/components/Map/DynamicCityMap";
import { PaymentPopup } from "@/components/Map/PaymentPopup";
import { StatsBar } from "@/components/Dashboard/StatsBar";
import { PaymentFeed } from "@/components/Dashboard/PaymentFeed";
import { ZoneRanking } from "@/components/Dashboard/ZoneRanking";
import { TimeChart } from "@/components/Dashboard/TimeChart";
import { DataSources } from "@/components/Dashboard/DataSources";
import { RouteRequest } from "@/components/RoutePanel/RouteRequest";
import { RouteResult } from "@/components/RoutePanel/RouteResult";
import { useVehicleStream } from "@/hooks/useVehicleStream";
import { usePayment } from "@/hooks/usePayment";
import { ISTANBUL_ZONES } from "@/lib/constants";
import type { HeatmapPoint } from "@/types";

/** Assign a rough zone name based on lat/lng proximity to Istanbul center. */
function getZoneFromCoords(lat: number, lng: number): string {
  const zones = ISTANBUL_ZONES;
  const idx =
    Math.abs(Math.floor((lat * 1000 + lng * 1000) % zones.length));
  return zones[idx];
}

/** Generate sample heatmap from vehicle positions. */
function vehiclesToHeatmap(
  vehicles: { lat: number; lng: number; speed: number }[]
): HeatmapPoint[] {
  const grid = new Map<string, { lat: number; lng: number; speeds: number[] }>();
  for (const v of vehicles) {
    const key = `${Math.round(v.lat * 50)}:${Math.round(v.lng * 50)}`;
    const cell = grid.get(key);
    if (cell) {
      cell.speeds.push(v.speed);
    } else {
      grid.set(key, { lat: v.lat, lng: v.lng, speeds: [v.speed] });
    }
  }
  const points: HeatmapPoint[] = [];
  grid.forEach((cell) => {
    const avg = cell.speeds.reduce((a, b) => a + b, 0) / cell.speeds.length;
    points.push({
      lat: cell.lat,
      lng: cell.lng,
      intensity: Math.max(0, Math.min(1, 1 - avg / 60)),
    });
  });
  return points;
}

/** Deterministic placeholder hourly data (avoids hydration mismatch from Math.random). */
const HOURLY_DATA = [
  8, 5, 3, 4, 6, 9, 14, 18, 21, 19, 16, 13,
  15, 17, 14, 12, 16, 20, 18, 14, 11, 9, 7, 5,
];

export default function Home() {
  const { vehicles, payments, connected: wsConnected } = useVehicleStream();
  const {
    loading: paymentLoading,
    error: paymentError,
    result: routeResult,
    txHash,
    payForRoute,
    clearResult,
    wallet,
  } = usePayment();

  const [startPoint, setStartPoint] = useState<[number, number] | null>(null);
  const [endPoint, setEndPoint] = useState<[number, number] | null>(null);
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);

  const hourlyData = HOURLY_DATA;

  const heatmapPoints = useMemo(
    () => vehiclesToHeatmap(vehicles),
    [vehicles]
  );

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (!startPoint) {
        setStartPoint([lat, lng]);
      } else if (!endPoint) {
        setEndPoint([lat, lng]);
        setShowPaymentPopup(true);
      }
    },
    [startPoint, endPoint]
  );

  const handleClearRoute = useCallback(() => {
    setStartPoint(null);
    setEndPoint(null);
    setShowPaymentPopup(false);
    clearResult();
  }, [clearResult]);

  const handlePay = useCallback(async () => {
    if (!startPoint || !endPoint) return;
    const fromZone = getZoneFromCoords(startPoint[0], startPoint[1]);
    const toZone = getZoneFromCoords(endPoint[0], endPoint[1]);
    const vehicleCount = Math.max(1, Math.min(vehicles.length, 10));
    await payForRoute(
      fromZone,
      toZone,
      vehicleCount,
      { lat: startPoint[0], lng: startPoint[1] },
      { lat: endPoint[0], lng: endPoint[1] }
    );
    setShowPaymentPopup(false);
  }, [startPoint, endPoint, vehicles.length, payForRoute]);

  const handleCancelPayment = useCallback(() => {
    setShowPaymentPopup(false);
    setEndPoint(null);
  }, []);

  // Compute dashboard stats from live data
  const avgSpeed =
    vehicles.length > 0
      ? Math.round(
          vehicles.reduce((sum, v) => sum + v.speed, 0) / vehicles.length
        )
      : 0;

  const totalSavedMinutes = payments.reduce(
    (sum, p) => sum + p.savedMinutes,
    0
  );

  const totalRevenue = payments
    .reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0)
    .toFixed(4);

  const simulatedCount = vehicles.filter(
    (v) => !v.source || v.source === "simulated"
  ).length;
  const realCount = vehicles.filter((v) => v.source === "ibb").length;
  const lastVehicleUpdate =
    vehicles.length > 0 ? Date.now() : 0;

  const fromZone = startPoint
    ? getZoneFromCoords(startPoint[0], startPoint[1])
    : "";
  const toZone = endPoint
    ? getZoneFromCoords(endPoint[0], endPoint[1])
    : "";

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <Header
        address={wallet.address}
        balance={wallet.balance}
        isConnecting={wallet.isConnecting}
        onConnect={wallet.connect}
        onDisconnect={wallet.disconnect}
        wsConnected={wsConnected}
      />

      {/* Main content */}
      <div className="flex flex-1 pt-[52px] pb-8">
        {/* Map area */}
        <div className="flex-1 relative">
          <DynamicCityMap
            vehicles={vehicles}
            routeResult={routeResult}
            heatmapPoints={heatmapPoints}
            startPoint={startPoint}
            endPoint={endPoint}
            onMapClick={handleMapClick}
          />

          {/* Route request overlay at bottom of map */}
          <div className="absolute bottom-4 left-4 right-4 z-[800] max-w-sm">
            {routeResult ? (
              <RouteResult
                result={routeResult}
                txHash={txHash}
                onClose={handleClearRoute}
              />
            ) : (
              <RouteRequest
                startPoint={startPoint}
                endPoint={endPoint}
                onClear={handleClearRoute}
              />
            )}
          </div>

          {/* Payment popup */}
          {showPaymentPopup && startPoint && endPoint && (
            <PaymentPopup
              fromZone={fromZone}
              toZone={toZone}
              vehicleCount={Math.max(1, Math.min(vehicles.length, 10))}
              cost="0.0005"
              loading={paymentLoading}
              error={paymentError}
              onPay={handlePay}
              onCancel={handleCancelPayment}
            />
          )}
        </div>

        {/* Dashboard Panel */}
        <div className="w-80 xl:w-96 bg-[#0a0f1e] border-l border-[#2a3040] p-4 overflow-y-auto custom-scrollbar shrink-0">
          <StatsBar
            totalRevenue={totalRevenue}
            totalQueries={payments.length}
            avgCitySpeed={avgSpeed}
            savedMinutes={totalSavedMinutes}
            activeVehicles={vehicles.length}
          />
          <DataSources
            osrmActive={wsConnected}
            contractListening={wsConnected}
            simulatedCount={simulatedCount}
            realCount={realCount}
            lastUpdate={lastVehicleUpdate}
          />
          <PaymentFeed payments={payments} />
          <ZoneRanking vehicles={vehicles} />
          <TimeChart data={hourlyData} />
        </div>
      </div>

      {/* Live Ticker */}
      <LiveTicker payments={payments} />
    </div>
  );
}
