"use client";

import { useState, useEffect, useCallback } from "react";
import { useNanopayment } from "@/hooks/useNanopayment";
import { MobileTabBar } from "@/components/common/MobileTabBar";
import { BACKEND_URL, ARCSCAN_URL } from "@/lib/constants";

interface GatewayBalances {
  wallet: string;
  gateway: string;
}

export default function CardPage() {
  const nanopay = useNanopayment();
  const [balances, setBalances] = useState<GatewayBalances>({ wallet: "0", gateway: "0" });
  const [depositing, setDepositing] = useState(false);
  const [depositAmount, setDepositAmount] = useState("1");
  const [depositTx, setDepositTx] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch gateway balances
  const fetchBalances = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/gateway/balances`);
      if (res.ok) {
        const data = await res.json();
        setBalances({ wallet: data.wallet || "0", gateway: data.gateway || "0" });
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchBalances();
    const interval = setInterval(fetchBalances, 15000);
    return () => clearInterval(interval);
  }, [fetchBalances]);

  const handleDeposit = useCallback(async () => {
    if (depositing) return;
    setDepositing(true);
    setError(null);
    setDepositTx(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/gateway/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: depositAmount }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Deposit failed");

      setDepositTx(data.depositTxHash);
      await fetchBalances();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deposit failed");
    } finally {
      setDepositing(false);
    }
  }, [depositing, depositAmount, fetchBalances]);

  const copyAddress = () => {
    const addr = nanopay.address || "0xF505e2E71df58D7244189072008f25f6b6aaE5ae";
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const gatewayNum = parseFloat(balances.gateway) || 0;
  const walletNum = parseFloat(balances.wallet) || 0;
  const totalBalance = (gatewayNum + walletNum).toFixed(4);
  const gatewayPercent = gatewayNum > 0 ? Math.min((gatewayNum / (gatewayNum + walletNum)) * 100, 100) : 0;

  return (
    <div className="min-h-screen bg-[#0A0F1C] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-14 pb-2 pt-6">
        <h1 className="text-[#f0f4f8] text-xl md:text-2xl font-semibold">Istanbul Card</h1>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pb-24 max-w-lg mx-auto w-full space-y-6">

        {/* Card visual */}
        <div className="relative w-full h-[180px] rounded-2xl border border-[#22D3EE30] overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0F172A 0%, #1E293B 50%, rgba(34,211,238,0.12) 100%)",
          }}
        >
          <div className="absolute inset-0 p-6 flex flex-col justify-between">
            {/* Top row */}
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] font-mono font-bold text-[#22D3EE] tracking-[2px]">CITYPULSE</div>
                <div className="text-[#f0f4f8] text-base font-semibold mt-1">Istanbul Card</div>
              </div>
              <div className="text-[10px] font-mono font-semibold text-[#22C55E] tracking-wider">&#10003; ACTIVE</div>
            </div>
            {/* Bottom row */}
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[9px] font-mono font-medium text-[#64748B] tracking-[2px]">BALANCE</div>
                <div className="text-[#f0f4f8] text-[28px] font-mono font-bold leading-tight">{balances.gateway || "0"} <span className="text-base">USDC</span></div>
              </div>
              <button onClick={copyAddress} className="text-[10px] font-mono text-[#475569] hover:text-[#22D3EE] cursor-pointer">
                {copied ? "Copied!" : `${(nanopay.address || "0xF505e2...5ae").slice(0, 8)}...${(nanopay.address || "0xF505e2...5ae").slice(-4)}`}
              </button>
            </div>
          </div>
        </div>

        {/* Gateway progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-[11px]">
            <span className="text-[#94A3B8] font-medium">Gateway Balance</span>
            <span className="text-[#22D3EE] font-mono font-semibold">{gatewayPercent.toFixed(1)}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#0F172A] rounded-full overflow-hidden">
            <div className="h-full bg-[#22D3EE] rounded-full transition-all" style={{ width: `${gatewayPercent}%` }} />
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-3">
          <button
            onClick={handleDeposit}
            disabled={depositing}
            className="flex-1 h-11 rounded-lg bg-[#22D3EE] flex items-center justify-center gap-2 text-[#0A0F1C] font-semibold text-[13px] cursor-pointer disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {depositing ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-[#0A0F1C]/30 border-t-[#0A0F1C] rounded-full animate-spin" />
                Depositing...
              </span>
            ) : (
              <>
                <span className="text-lg">+</span>
                Top Up
              </>
            )}
          </button>
          <button className="flex-1 h-11 rounded-lg bg-[#1E293B] border border-[#475569] flex items-center justify-center gap-2 text-[#94A3B8] font-medium text-[13px] cursor-pointer active:scale-[0.98] transition-transform">
            <span className="text-sm">&#8599;</span>
            Withdraw
          </button>
        </div>

        {/* Deposit success */}
        {depositTx && (
          <div className="p-3 rounded-lg bg-[#22C55E15] border border-[#22C55E30]">
            <div className="text-[#22C55E] text-xs font-medium mb-1">Deposit successful!</div>
            <a
              href={`${ARCSCAN_URL}/tx/${depositTx}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-mono text-[#22D3EE] hover:underline"
            >
              {depositTx.slice(0, 16)}...{depositTx.slice(-8)}
            </a>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg bg-[#EF444415] border border-[#EF444430]">
            <span className="text-[#EF4444] text-xs">{error}</span>
          </div>
        )}

        {/* Recent activity */}
        <div>
          <div className="text-[11px] font-mono font-semibold text-[#64748B] tracking-[2px] mb-4">RECENT ACTIVITY</div>
          <div className="space-y-1">
            {/* Sample transactions */}
            {[
              { icon: "&#x1F697;", title: "Route: Taksim → Kadıköy", time: "2 min ago", amount: "-$0.0005", color: "#EF4444", bg: "#22D3EE15" },
              { icon: "&#x1F17F;", title: "Parking: Beşiktaş", time: "15 min ago", amount: "-$0.0001", color: "#EF4444", bg: "#22D3EE15" },
              { icon: "&#x2B07;", title: "Gateway Deposit", time: "1 hour ago", amount: "+$1.0000", color: "#22C55E", bg: "#22C55E15" },
            ].map((tx, i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm" style={{ background: tx.bg }}>
                    <span dangerouslySetInnerHTML={{ __html: tx.icon }} />
                  </div>
                  <div>
                    <div className="text-[#f0f4f8] text-xs font-medium">{tx.title}</div>
                    <div className="text-[#64748B] text-[10px]">{tx.time}</div>
                  </div>
                </div>
                <div className="text-xs font-mono font-semibold" style={{ color: tx.color }}>{tx.amount}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Circle branding */}
        <div className="text-center text-[10px] text-[#475569] space-y-1 pt-4">
          <div>Powered by Circle Gateway + Nanopayments</div>
          <div>Gas-free · Instant · Sub-cent</div>
        </div>
      </div>

      {/* Mobile tab bar */}
      <MobileTabBar active="card" />
    </div>
  );
}
