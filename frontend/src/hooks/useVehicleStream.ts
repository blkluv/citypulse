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
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
    });

    socket.on("disconnect", () => {
      setConnected(false);
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
        fromZone: (data.fromZone as string) || (data.zone as string) || "Unknown",
        toZone: (data.toZone as string) || "Unknown",
        vehiclesQueried: (data.vehiclesQueried as number) || Math.floor(Math.random() * 5) + 1,
        savedMinutes: (data.savedMinutes as number) || Math.floor(Math.random() * 20) + 3,
        timestamp: (data.timestamp as number) || Date.now(),
      };
      addPayment(payment);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [addPayment]);

  return { vehicles, payments, connected };
}
