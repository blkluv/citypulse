"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { WS_URL } from "@/lib/constants";
import type { MunicipalVehicle, PaymentEvent } from "@/types";

const MAX_PAYMENTS = 50;

export function useVehicleStream() {
  const [vehicles, setVehicles] = useState<MunicipalVehicle[]>([]);
  const [payments, setPayments] = useState<PaymentEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const addPayment = useCallback((payment: PaymentEvent) => {
    setPayments((prev) => {
      const next = [payment, ...prev];
      return next.length > MAX_PAYMENTS ? next.slice(0, MAX_PAYMENTS) : next;
    });
  }, []);

  useEffect(() => {
    const socket = io(WS_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      reconnectionAttempts: Infinity,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setReconnecting(false);
    });

    socket.on("disconnect", () => {
      setConnected(false);
      setReconnecting(true);
    });

    socket.io.on("reconnect_attempt", () => {
      setReconnecting(true);
    });

    socket.io.on("reconnect", () => {
      setReconnecting(false);
    });

    socket.on("vehicle_update", (data: { timestamp: number; vehicles: MunicipalVehicle[] } | MunicipalVehicle[]) => {
      if (Array.isArray(data)) {
        setVehicles(data);
      } else if (data && data.vehicles) {
        setVehicles(data.vehicles);
      }
    });

    socket.on("payment", (data: Record<string, unknown>) => {
      // Normalize backend payment shape to frontend PaymentEvent
      const payment: PaymentEvent = {
        driver: (data.from as string) || (data.driver as string) || "0x???",
        amount: String(data.amount || "0.0001"),
        fromZone: (data.fromZone as string) || (data.zone as string) || "Istanbul",
        toZone: (data.toZone as string) || "Istanbul",
        vehiclesQueried: (data.vehiclesQueried as number) || 1,
        savedMinutes: (data.savedMinutes as number) || 0,
        timestamp: (data.timestamp as number) || Date.now(),
        txHash: (data.txHash as string) || undefined,
        isReal: !!(data.isReal),
      };
      addPayment(payment);
    });

    socket.on("contract_payment", (data: Record<string, unknown>) => {
      // Real on-chain payment from contract events
      const payment: PaymentEvent = {
        driver: (data.from as string) || (data.driver as string) || "0x???",
        amount: String(data.amount || "0.0001"),
        fromZone: (data.fromZone as string) || (data.zone as string) || "Istanbul",
        toZone: (data.toZone as string) || "Istanbul",
        vehiclesQueried: (data.vehiclesQueried as number) || 0,
        savedMinutes: (data.savedMinutes as number) || 0,
        timestamp: (data.timestamp as number) || Date.now(),
        txHash: (data.txHash as string) || undefined,
        isReal: true,
      };
      addPayment(payment);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [addPayment]);

  return { vehicles, payments, connected, reconnecting };
}
