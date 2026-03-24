"use client";

import { useState, useEffect, useCallback } from "react";
import { BACKEND_URL } from "@/lib/constants";

export function DemoModeButton() {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/demo/status`);
      if (res.ok) {
        const data = await res.json();
        setActive(!!data.active);
      }
    } catch {
      // Backend not reachable, ignore
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const toggle = async () => {
    setLoading(true);
    try {
      const endpoint = active ? "stop" : "start";
      const res = await fetch(`${BACKEND_URL}/api/demo/${endpoint}`, {
        method: "POST",
      });
      if (res.ok) {
        setActive(!active);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  if (active) {
    return (
      <button
        onClick={toggle}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#00ff88]/10 border border-[#00ff88]/30 text-xs text-[#00ff88] hover:bg-[#00ff88]/20 transition-colors cursor-pointer disabled:opacity-50"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff88] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ff88]" />
        </span>
        {loading ? "Stopping..." : "Demo Active"}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#2a3040] border border-[#2a3040] text-xs text-[#8892a4] hover:text-[#f0f4f8] hover:border-[#3a4050] transition-colors cursor-pointer disabled:opacity-50"
    >
      {loading ? "Starting..." : "Start Demo"}
    </button>
  );
}
