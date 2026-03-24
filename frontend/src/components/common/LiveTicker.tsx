"use client";

import type { PaymentEvent } from "@/types";

interface LiveTickerProps {
  payments: PaymentEvent[];
}

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

export function LiveTicker({ payments }: LiveTickerProps) {
  const items = payments.slice(0, 20);

  if (items.length === 0) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[1000] h-8 bg-[#0a0f1e]/95 backdrop-blur border-t border-[#2a3040] flex items-center justify-center">
        <span className="text-[10px] text-[#8892a4]">
          Waiting for payment activity...
        </span>
      </div>
    );
  }

  const tickerText = items
    .map(
      (p) =>
        `${truncateAddress(p.driver)} paid ${p.amount} USDC -- ${p.fromZone} -> ${p.toZone} -- ${p.savedMinutes} min saved`
    )
    .join("     |     ");

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[1000] h-8 bg-[#0a0f1e]/95 backdrop-blur border-t border-[#2a3040] overflow-hidden">
      <div className="ticker-scroll flex items-center h-full whitespace-nowrap">
        <span className="text-[10px] font-mono text-[#8892a4] inline-block px-4">
          {tickerText}
        </span>
        <span className="text-[10px] font-mono text-[#8892a4] inline-block px-4">
          {tickerText}
        </span>
      </div>
    </div>
  );
}
