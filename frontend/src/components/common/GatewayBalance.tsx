"use client";

import { useState, useEffect, useCallback } from "react";

interface ChainBalance {
  chain: string;
  chainId: number;
  balance: string;
  rpcUrl: string;
  color: string;
}

const CHAINS: ChainBalance[] = [
  { chain: "Arc Testnet", chainId: 5042002, balance: "0", rpcUrl: "https://rpc.testnet.arc.network", color: "#00f0ff" },
  { chain: "Base Sepolia", chainId: 84532, balance: "0", rpcUrl: "https://sepolia.base.org", color: "#3b82f6" },
  { chain: "Ethereum Sepolia", chainId: 11155111, balance: "0", rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com", color: "#8b5cf6" },
];

async function fetchBalance(rpcUrl: string, address: string): Promise<string> {
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getBalance",
        params: [address, "latest"],
        id: 1,
      }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    if (data.result) {
      const wei = BigInt(data.result);
      // Arc uses USDC (6 decimals native), others use ETH (18 decimals)
      // For display we just show the raw balance formatted
      const formatted = Number(wei) / 1e18;
      return formatted.toFixed(4);
    }
    return "0";
  } catch {
    return "0";
  }
}

interface GatewayBalanceProps {
  address: string | null;
  walletType: "metamask" | "circle" | "none";
}

export function GatewayBalance({ address, walletType }: GatewayBalanceProps) {
  const [balances, setBalances] = useState<ChainBalance[]>(CHAINS);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const loadBalances = useCallback(async () => {
    if (!address) return;
    setLoading(true);

    const updated = await Promise.all(
      CHAINS.map(async (chain) => {
        const balance = await fetchBalance(chain.rpcUrl, address);
        return { ...chain, balance };
      })
    );

    setBalances(updated);
    setLoading(false);
  }, [address]);

  useEffect(() => {
    if (address) loadBalances();
  }, [address, loadBalances]);

  if (!address || walletType === "none") return null;

  const total = balances.reduce((sum, b) => sum + parseFloat(b.balance), 0);

  return (
    <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-lg p-3 mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-xs uppercase tracking-wider text-[#8892a4]">
            Gateway Balance
          </h3>
          <span className="text-[8px] bg-[#00f0ff]/20 text-[#00f0ff] px-1.5 py-0.5 rounded-full font-bold">
            MULTI-CHAIN
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-bold text-[#ffd700]">
            {total.toFixed(4)}
          </span>
          <span className="text-[10px] text-[#8892a4]">
            {expanded ? "▲" : "▼"}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 space-y-1.5">
          {balances.map((chain) => (
            <div
              key={chain.chainId}
              className="flex items-center justify-between py-1.5 px-2 rounded bg-[#111827]"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: chain.color }}
                />
                <span className="text-xs text-[#f0f4f8]">{chain.chain}</span>
              </div>
              <span className="text-xs font-mono" style={{ color: chain.color }}>
                {loading ? "..." : chain.balance}
              </span>
            </div>
          ))}

          <div className="flex items-center justify-between pt-2 mt-1 border-t border-[#2a3040]">
            <span className="text-[10px] text-[#8892a4]">
              Powered by Circle Gateway
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); loadBalances(); }}
              className="text-[10px] text-[#00f0ff] hover:underline cursor-pointer"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
