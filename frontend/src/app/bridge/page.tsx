"use client";

import { useState } from "react";
import { ARCSCAN_URL } from "@/lib/constants";

const SUPPORTED_CHAINS = [
  { id: "base-sepolia", name: "Base Sepolia", chainId: 84532 },
  { id: "avalanche-fuji", name: "Avalanche Fuji", chainId: 43113 },
  { id: "ethereum-sepolia", name: "Ethereum Sepolia", chainId: 11155111 },
  { id: "polygon-amoy", name: "Polygon Amoy", chainId: 80002 },
  { id: "arbitrum-sepolia", name: "Arbitrum Sepolia", chainId: 421614 },
];

const ARC_TESTNET = {
  id: "arc-testnet",
  name: "Arc Testnet",
  chainId: 5042002,
};

type BridgeStatus = "idle" | "connecting" | "approving" | "bridging" | "success" | "error";

export default function BridgePage() {
  const [sourceChain, setSourceChain] = useState(SUPPORTED_CHAINS[0].id);
  const [amount, setAmount] = useState("1.00");
  const [status, setStatus] = useState<BridgeStatus>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const selectedChain = SUPPORTED_CHAINS.find((c) => c.id === sourceChain)!;

  const handleConnect = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      setError("MetaMask not installed");
      return;
    }

    setStatus("connecting");
    setError(null);

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setWalletAddress(accounts[0]);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
      setStatus("error");
    }
  };

  const handleBridge = async () => {
    if (!walletAddress) {
      setError("Connect wallet first");
      return;
    }

    setStatus("approving");
    setError(null);

    try {
      // Switch to source chain
      try {
        await window.ethereum?.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x" + selectedChain.chainId.toString(16) }],
        });
      } catch (switchErr: unknown) {
        const e = switchErr as { code?: number };
        if (e.code === 4902) {
          setError(`Please add ${selectedChain.name} to MetaMask`);
          setStatus("error");
          return;
        }
      }

      setStatus("bridging");

      // Use Circle Bridge Kit (CCTP V2) for cross-chain USDC transfer
      const { BridgeKit: BK } = await import("@circle-fin/bridge-kit");
      const { createAdapterFromProvider } = await import("@circle-fin/adapter-ethers-v6");
      const { BrowserProvider: BP } = await import("ethers");

      const bp = new BP(window.ethereum!);

      // Create adapter from ethers v6 provider (with signer)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adapter = await createAdapterFromProvider({ provider: bp as any });

      // Map source chain to Bridge Kit chain identifier
      const chainMap: Record<string, string> = {
        "base-sepolia": "BaseSepolia",
        "avalanche-fuji": "AvalancheFuji",
        "ethereum-sepolia": "EthereumSepolia",
        "polygon-amoy": "PolygonAmoy",
        "arbitrum-sepolia": "ArbitrumSepolia",
      };

      const sourceChainName = chainMap[sourceChain] || "BaseSepolia";

      // Create Bridge Kit instance and execute bridge
      const kit = new BK();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await kit.bridge({
        from: { adapter, chain: sourceChainName as any },
        to: { adapter, chain: "Arc_Testnet" as any },
        amount: amount,
      } as any);

      if (result && result.state === "success") {
        // Extract tx hash from result
        const resultAny = result as unknown as Record<string, unknown>;
        const steps = resultAny.steps;
        if (Array.isArray(steps) && steps.length > 0) {
          const lastStep = steps[steps.length - 1] as Record<string, unknown>;
          if (lastStep.txHash) setTxHash(String(lastStep.txHash));
        }
      }

      setStatus("success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bridge failed";
      setError(msg);
      setStatus("error");
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0a0f1e] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0a0f1e]/90 backdrop-blur-xl border-b border-[#2a3040]">
        <div className="flex items-center gap-3">
          <a href="/" className="text-xl font-bold tracking-tight">
            <span className="text-[#00f0ff]">City</span>
            <span className="text-[#f0f4f8]">Pulse</span>
          </a>
          <div className="flex items-center gap-2 ml-3">
            <a href="/" className="px-3 py-1 rounded-lg text-xs text-[#8892a4] hover:text-[#f0f4f8] hover:bg-[#2a3040] transition-colors">Dashboard</a>
            <a href="/drive" className="px-3 py-1 rounded-lg text-xs text-[#8892a4] hover:text-[#f0f4f8] hover:bg-[#2a3040] transition-colors">Drive</a>
            <a href="/park" className="px-3 py-1 rounded-lg text-xs text-[#8892a4] hover:text-[#f0f4f8] hover:bg-[#2a3040] transition-colors">Park</a>
            <span className="px-3 py-1 rounded-lg text-xs font-medium bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/20">Bridge</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Bridge card */}
          <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-[#00f0ff]/10 flex items-center justify-center">
                <span className="text-xl">&#x1F309;</span>
              </div>
              <div>
                <h1 className="text-[#f0f4f8] text-lg font-bold">Bridge USDC to Arc</h1>
                <p className="text-[#8892a4] text-xs">Powered by Circle Bridge Kit (CCTP V2)</p>
              </div>
            </div>

            {/* Source chain */}
            <div className="mb-4">
              <label className="text-[10px] uppercase tracking-wider text-[#8892a4] mb-1.5 block">From</label>
              <select
                value={sourceChain}
                onChange={(e) => setSourceChain(e.target.value)}
                className="w-full bg-[#111827] border border-[#2a3040] rounded-xl px-4 py-3 text-[#f0f4f8] text-sm focus:outline-none focus:border-[#00f0ff]/50 cursor-pointer"
              >
                {SUPPORTED_CHAINS.map((chain) => (
                  <option key={chain.id} value={chain.id}>
                    {chain.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Arrow */}
            <div className="flex justify-center my-2">
              <div className="w-8 h-8 rounded-full bg-[#2a3040] flex items-center justify-center">
                <span className="text-[#00f0ff]">&darr;</span>
              </div>
            </div>

            {/* Destination (Arc Testnet - fixed) */}
            <div className="mb-4">
              <label className="text-[10px] uppercase tracking-wider text-[#8892a4] mb-1.5 block">To</label>
              <div className="w-full bg-[#111827] border border-[#00f0ff]/20 rounded-xl px-4 py-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[#00f0ff] font-medium">Arc Testnet</span>
                  <span className="text-[10px] text-[#8892a4] bg-[#2a3040] px-2 py-0.5 rounded">Chain {ARC_TESTNET.chainId}</span>
                </div>
              </div>
            </div>

            {/* Amount */}
            <div className="mb-6">
              <label className="text-[10px] uppercase tracking-wider text-[#8892a4] mb-1.5 block">Amount (USDC)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#111827] border border-[#2a3040] rounded-xl px-4 py-3 text-[#f0f4f8] text-lg font-mono focus:outline-none focus:border-[#00f0ff]/50"
                  placeholder="1.00"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#ffd700] text-sm font-medium">USDC</span>
              </div>
            </div>

            {/* Info box */}
            <div className="bg-[#111827] rounded-xl p-3 mb-4 text-[10px] space-y-1.5">
              <div className="flex justify-between text-[#8892a4]">
                <span>Protocol</span>
                <span className="text-[#f0f4f8]">Circle CCTP V2</span>
              </div>
              <div className="flex justify-between text-[#8892a4]">
                <span>Bridge Fee</span>
                <span className="text-[#00ff88]">Free (Circle covers gas)</span>
              </div>
              <div className="flex justify-between text-[#8892a4]">
                <span>Estimated Time</span>
                <span className="text-[#f0f4f8]">&lt; 60 seconds</span>
              </div>
              <div className="flex justify-between text-[#8892a4]">
                <span>Mechanism</span>
                <span className="text-[#f0f4f8]">Burn &amp; Mint (native 1:1)</span>
              </div>
            </div>

            {/* Action button */}
            {!walletAddress ? (
              <button
                onClick={handleConnect}
                disabled={status === "connecting"}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer
                  bg-[#ffd700] text-[#0a0f1e] hover:bg-[#e6c200] active:scale-[0.98]
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "connecting" ? "Connecting..." : "Connect Wallet"}
              </button>
            ) : status === "success" ? (
              <div className="text-center">
                <div className="bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-xl p-4 mb-3">
                  <div className="text-[#00ff88] font-bold mb-1">Bridge Successful!</div>
                  <p className="text-[#8892a4] text-xs">{amount} USDC bridged to Arc Testnet</p>
                  {txHash && (
                    <a
                      href={`${ARCSCAN_URL}/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#00f0ff] text-xs hover:underline mt-2 block"
                    >
                      View on ArcScan &rarr;
                    </a>
                  )}
                </div>
                <button
                  onClick={() => { setStatus("idle"); setTxHash(null); }}
                  className="text-xs text-[#8892a4] hover:text-[#f0f4f8] cursor-pointer"
                >
                  Bridge more
                </button>
              </div>
            ) : (
              <button
                onClick={handleBridge}
                disabled={status === "approving" || status === "bridging"}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer
                  bg-[#00f0ff] text-[#0a0f1e] hover:bg-[#00d4e0] active:scale-[0.98]
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "approving" ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-[#0a0f1e]/30 border-t-[#0a0f1e] rounded-full animate-spin" />
                    Approving USDC...
                  </span>
                ) : status === "bridging" ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-[#0a0f1e]/30 border-t-[#0a0f1e] rounded-full animate-spin" />
                    Bridging to Arc...
                  </span>
                ) : (
                  `Bridge ${amount} USDC to Arc`
                )}
              </button>
            )}

            {/* Wallet info */}
            {walletAddress && status !== "success" && (
              <p className="text-[10px] text-[#00ff88] text-center mt-2 font-mono">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </p>
            )}

            {/* Error */}
            {error && (
              <p className="text-[#ff4060] text-xs mt-2 text-center">{error}</p>
            )}
          </div>

          {/* Why bridge info */}
          <div className="mt-4 bg-[#1a1f2e]/50 border border-[#2a3040] rounded-xl p-4">
            <h3 className="text-[#f0f4f8] text-xs font-semibold mb-2">Why bridge to Arc?</h3>
            <div className="space-y-1.5 text-[10px] text-[#8892a4]">
              <div className="flex items-center gap-2">
                <span className="text-[#00ff88]">&#10003;</span>
                <span>USDC is the native gas token — no ETH needed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#00ff88]">&#10003;</span>
                <span>Sub-cent transactions for parking &amp; route queries</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#00ff88]">&#10003;</span>
                <span>Circle Nanopayments for high-frequency micropayments</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#00ff88]">&#10003;</span>
                <span>Faucet available at faucet.circle.com for testnet USDC</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
