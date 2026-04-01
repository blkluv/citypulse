"use client";

import type { PaymentEvent } from "@/types";
import { ARCSCAN_URL } from "@/lib/constants";

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
  // Limit to 50 most recent payments to prevent DOM bloat
  const displayPayments = payments.slice(0, 50);

  return (
    <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-lg p-3 mb-4">
      <h3 className="text-xs uppercase tracking-wider text-[#8892a4] mb-3">
        Recent Payments
        {payments.length > 0 && (
          <span className="ml-2 text-[#00f0ff]">({payments.length})</span>
        )}
      </h3>
      <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
        {displayPayments.length === 0 ? (
          <div className="text-xs text-[#8892a4] text-center py-4">
            No payments yet
          </div>
        ) : (
          displayPayments.map((p, i) => (
            <div
              key={`${p.driver}-${p.timestamp}-${i}`}
              className="flex flex-col gap-1 p-2 rounded bg-[#111827] border border-[#2a3040]/50 payment-slide-in"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono text-[#00f0ff]">
                    {truncateAddress(p.driver)}
                  </span>
                  {p.isReal ? (
                    <span className="px-1 py-px text-[8px] font-bold rounded bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30">
                      REAL
                    </span>
                  ) : (
                    <span className="px-1 py-px text-[8px] font-bold rounded bg-[#8892a4]/20 text-[#8892a4] border border-[#8892a4]/30">
                      SIM
                    </span>
                  )}
                </div>
                <span className="text-xs font-mono text-[#ffd700]">
                  {p.amount} USDC
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#8892a4]">
                  {p.fromZone || "Istanbul"} &rarr; {p.toZone || "Istanbul"}
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
              {p.txHash && (
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-[#8892a4]">TX:</span>
                  <a
                    href={`${ARCSCAN_URL}/tx/${p.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[9px] font-mono text-[#00f0ff] hover:underline truncate"
                  >
                    {p.txHash.slice(0, 10)}...{p.txHash.slice(-6)}
                  </a>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
