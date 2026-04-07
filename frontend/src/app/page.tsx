"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
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
import { GatewayBalance } from "@/components/common/GatewayBalance";
import { MobileTabBar } from "@/components/common/MobileTabBar";
import { useVehicleStream } from "@/hooks/useVehicleStream";
import { usePayment } from "@/hooks/usePayment";
import { useCircleWallet } from "@/hooks/useCircleWallet";
import { ISTANBUL_ZONES, BACKEND_URL } from "@/lib/constants";
import { detectZone } from "@/lib/zones";
import type { HeatmapPoint, RouteResult as RouteResultType } from "@/types";

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
  const { vehicles, payments, connected: wsConnected, reconnecting } = useVehicleStream();
  const {
    loading: paymentLoading,
    error: paymentError,
    result: routeResult,
    txHash,
    payForRoute,
    clearResult,
    wallet,
  } = usePayment();

  const circleWallet = useCircleWallet();

  // Determine active wallet type
  const activeWallet: "none" | "metamask" | "circle" =
    circleWallet.address ? "circle" : wallet.address ? "metamask" : "none";

  const [startPoint, setStartPoint] = useState<[number, number] | null>(null);
  const [endPoint, setEndPoint] = useState<[number, number] | null>(null);
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [demoRoute, setDemoRoute] = useState<RouteResultType | null>(null);

  // Fetch a sample route on mount so the map looks alive before user interaction
  useEffect(() => {
    if (startPoint || endPoint || routeResult) {
      setDemoRoute(null);
      return;
    }

    const fetchDemoRoute = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/route`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-DEMO-MODE": "true",
          },
          body: JSON.stringify({
            from: { lat: 41.037, lng: 28.985 },
            to: { lat: 40.991, lng: 29.029 },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setDemoRoute(data);
        }
      } catch {
        /* ignore - demo route is optional */
      }
    };

    fetchDemoRoute();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startPoint, endPoint, routeResult]);

  const hourlyData = HOURLY_DATA;

  const heatmapPoints = useMemo(
    () => vehiclesToHeatmap(vehicles),
    [vehicles]
  );

  const [mapError, setMapError] = useState<string | null>(null);

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      setMapError(null);

      // Sea/outside Istanbul check
      if (lat < 40.80 || lat > 41.30 || lng < 28.50 || lng > 29.40) {
        setMapError("Please select a point on land within Istanbul");
        return;
      }

      if (!startPoint) {
        setStartPoint([lat, lng]);
      } else if (!endPoint) {
        // Same point validation
        const dist = Math.sqrt(
          Math.pow((lat - startPoint[0]) * 111000, 2) +
          Math.pow((lng - startPoint[1]) * 85000, 2)
        );
        if (dist < 100) { // less than 100m apart
          setMapError("Start and end points must be different");
          return;
        }
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

  const [payingInProgress, setPayingInProgress] = useState(false);

  const handlePay = useCallback(async () => {
    if (!startPoint || !endPoint || payingInProgress) return;
    if (!wallet.address) return; // require wallet connection

    setPayingInProgress(true);
    try {
      const fromZone = detectZone(startPoint[0], startPoint[1]);
      const toZone = detectZone(endPoint[0], endPoint[1]);
      const vehicleCount = Math.max(1, Math.min(vehicles.length, 10));
      await payForRoute(
        fromZone,
        toZone,
        vehicleCount,
        { lat: startPoint[0], lng: startPoint[1] },
        { lat: endPoint[0], lng: endPoint[1] }
      );
      setShowPaymentPopup(false);
    } finally {
      setPayingInProgress(false);
    }
  }, [startPoint, endPoint, vehicles.length, payForRoute, payingInProgress, wallet.address]);

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
    ? detectZone(startPoint[0], startPoint[1])
    : "";
  const toZone = endPoint
    ? detectZone(endPoint[0], endPoint[1])
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
        circleAddress={circleWallet.address}
        circleBalance={circleWallet.balance}
        circleCreating={circleWallet.isCreating}
        onCircleCreate={circleWallet.createWallet}
        onCircleDisconnect={circleWallet.disconnect}
        circleError={circleWallet.error}
        metamaskError={wallet.error}
        activeWallet={activeWallet}
        wsConnected={wsConnected}
      />

      {/* Reconnecting banner */}
      {reconnecting && (
        <div className="fixed top-[52px] left-0 right-0 z-[999] bg-[#ffd700]/20 backdrop-blur-sm px-4 py-1.5 text-center border-b border-[#ffd700]/30">
          <span className="text-xs text-[#ffd700]">Reconnecting to live data...</span>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col md:flex-row flex-1 pt-[52px] pb-20 md:pb-8">
        {/* Map area */}
        <div className="flex-1 relative min-h-[50vh] md:min-h-0">
          <DynamicCityMap
            vehicles={vehicles}
            routeResult={routeResult || demoRoute}
            heatmapPoints={heatmapPoints}
            startPoint={startPoint}
            endPoint={endPoint}
            onMapClick={handleMapClick}
          />

          {/* Instruction overlay when no route is active */}
          {!startPoint && !endPoint && !routeResult && !demoRoute && (
            <div className="absolute inset-0 z-[700] flex items-center justify-center pointer-events-none">
              <div className="bg-[#0a0f1e]/80 backdrop-blur-sm rounded-2xl px-8 py-6 text-center border border-[#2a3040] max-w-sm">
                <div className="text-[#00f0ff] text-4xl mb-3">&#x1F5FA;</div>
                <h3 className="text-[#f0f4f8] text-lg font-semibold mb-2">Get an Optimized Route</h3>
                <p className="text-[#8892a4] text-sm">Click two points on the map to set your start and end. CityPulse will find the fastest route using real-time municipal vehicle data.</p>
                <div className="mt-4 flex items-center justify-center gap-3 text-xs text-[#8892a4]">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#00ff88] inline-block"></span> Start</span>
                  <span>&rarr;</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#ff4060] inline-block"></span> End</span>
                </div>
              </div>
            </div>
          )}

          {/* Demo route info overlay */}
          {!routeResult && demoRoute && !startPoint && (
            <div className="absolute bottom-20 left-4 z-[800] max-w-sm">
              <div className="bg-[#1a1f2e]/95 backdrop-blur rounded-lg p-3 border border-[#2a3040]">
                <div className="text-xs text-[#8892a4] mb-1">Sample Route: Taksim &rarr; Kadikoy</div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-[#ff4060]">{demoRoute.normalTime}min</span>
                  <span className="text-[#8892a4]">&rarr;</span>
                  <span className="text-[#00f0ff]">{demoRoute.optimizedTime}min</span>
                  <span className="text-[#00ff88] text-xs">({demoRoute.savedMinutes}min saved)</span>
                </div>
                {demoRoute.routeDetails?.dataSource === "osrm" && (
                  <div className="text-[10px] text-[#8892a4] mt-1">OSRM road network | {demoRoute.routeDetails.segmentsWithRealData} segments with live data</div>
                )}
              </div>
            </div>
          )}

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

          {/* Map validation error */}
          {mapError && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[900] animate-[drive-card-slide-up_0.3s_ease-out]">
              <div className="bg-[#ff4060]/20 backdrop-blur-xl rounded-lg px-4 py-2 border border-[#ff4060]/40">
                <span className="text-xs text-[#ff4060]">{mapError}</span>
              </div>
            </div>
          )}

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
        <div className="w-full md:w-80 xl:w-96 bg-[#0a0f1e] md:border-l border-t md:border-t-0 border-[#2a3040] p-4 overflow-y-auto custom-scrollbar md:shrink-0">
          <StatsBar
            totalRevenue={totalRevenue}
            totalQueries={payments.length}
            avgCitySpeed={avgSpeed}
            savedMinutes={totalSavedMinutes}
            activeVehicles={vehicles.length}
          />
          <GatewayBalance
            address={activeWallet === "circle" ? circleWallet.address : wallet.address}
            walletType={activeWallet}
          />
          <DataSources
            osrmActive={wsConnected}
            contractListening={wsConnected}
            simulatedCount={simulatedCount}
            realCount={realCount}
            lastUpdate={lastVehicleUpdate}
          />
          <TimeChart data={hourlyData} />
          <PaymentFeed payments={payments} />
          <ZoneRanking vehicles={vehicles} />
        </div>
      </div>

      {/* Live Ticker — hide on mobile */}
      <div className="hidden md:block">
        <LiveTicker payments={payments} />
      </div>

      {/* Mobile tab bar */}
      <MobileTabBar active="dashboard" />
    </div>
  );
}
