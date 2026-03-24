"use client";

import type { PaymentEvent } from "@/types";

interface PaymentFeedProps {
  payments: PaymentEvent[];
}

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function timeAgo(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export function PaymentFeed({ payments }: PaymentFeedProps) {
  return (
    <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-lg p-3 mb-4">
      <h3 className="text-xs uppercase tracking-wider text-[#8892a4] mb-3">
        Recent Payments
      </h3>
      <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
        {payments.length === 0 ? (
          <div className="text-xs text-[#8892a4] text-center py-4">
            No payments yet
          </div>
        ) : (
          payments.map((p, i) => (
            <div
              key={`${p.driver}-${p.timestamp}-${i}`}
              className="flex flex-col gap-1 p-2 rounded bg-[#111827] border border-[#2a3040]/50 payment-slide-in"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#00f0ff]">
                  {truncateAddress(p.driver)}
                </span>
                <span className="text-xs font-mono text-[#ffd700]">
                  {p.amount} USDC
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#8892a4]">
                  {p.fromZone} → {p.toZone}
                </span>
                <span className="text-[10px] text-[#8892a4]">
                  {p.vehiclesQueried} vehicles
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#00ff88]">
                  {p.savedMinutes} min saved
                </span>
                <span className="text-[10px] text-[#8892a4]">
                  {timeAgo(p.timestamp)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
