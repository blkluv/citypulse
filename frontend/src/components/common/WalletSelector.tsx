"use client";

import { useState } from "react";

interface WalletSelectorProps {
  // MetaMask state
  metamaskAddress: string | null;
  metamaskBalance: string;
  metamaskConnecting: boolean;
  onMetamaskConnect: () => void;
  onMetamaskDisconnect: () => void;
  // Circle state
  circleAddress: string | null;
  circleBalance: string;
  circleCreating: boolean;
  onCircleCreate: () => void;
  onCircleDisconnect: () => void;
  // Current active wallet
  activeWallet: "none" | "metamask" | "circle";
  circleError: string | null;
  metamaskError: string | null;
}

export function WalletSelector({
  metamaskAddress,
  metamaskBalance,
  metamaskConnecting,
  onMetamaskConnect,
  onMetamaskDisconnect,
  circleAddress,
  circleBalance,
  circleCreating,
  onCircleCreate,
  onCircleDisconnect,
  activeWallet,
  circleError,
  metamaskError,
}: WalletSelectorProps) {
  const [showSelector, setShowSelector] = useState(false);
  const [copied, setCopied] = useState(false);

  // Connected state — show active wallet
  if (activeWallet !== "none") {
    const address = activeWallet === "metamask" ? metamaskAddress : circleAddress;
    const balance = activeWallet === "metamask" ? metamaskBalance : circleBalance;
    const disconnect = activeWallet === "metamask" ? onMetamaskDisconnect : onCircleDisconnect;
    const label = activeWallet === "metamask" ? "MetaMask" : "Circle";
    const color = activeWallet === "metamask" ? "#f97316" : "#00f0ff";

    const copyAddress = () => {
      if (address) {
        navigator.clipboard.writeText(address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    };

    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1a1f2e] border border-[#2a3040]">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: color }}
          />
          <span className="text-[10px] text-[#8892a4]">{label}</span>
          <span className="text-xs text-[#ffd700] font-mono">
            {parseFloat(balance).toFixed(4)}
          </span>
          <span className="text-[#8892a4] text-[10px]">|</span>
          <button
            onClick={copyAddress}
            title={address || ""}
            className="text-xs text-[#00f0ff] font-mono hover:underline cursor-pointer"
          >
            {copied ? "Copied!" : `${address?.slice(0, 6)}...${address?.slice(-4)}`}
          </button>
        </div>
        <button
          onClick={disconnect}
          className="px-2 py-1.5 text-[10px] rounded-lg bg-[#ff4060]/10 text-[#ff4060] border border-[#ff4060]/30 hover:bg-[#ff4060]/20 transition-colors cursor-pointer"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // Not connected — show wallet selection
  return (
    <div className="relative">
      <button
        onClick={() => setShowSelector(!showSelector)}
        className="px-4 py-2 text-sm font-medium rounded-lg bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30 hover:bg-[#00f0ff]/20 transition-colors cursor-pointer"
      >
        Connect Wallet
      </button>

      {showSelector && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-[#1a1f2e] border border-[#2a3040] rounded-xl shadow-2xl z-[1100] p-3">
          <div className="text-[10px] uppercase tracking-wider text-[#8892a4] mb-2">
            Choose wallet
          </div>

          {/* Circle Wallet — recommended */}
          <button
            onClick={() => {
              onCircleCreate();
              setShowSelector(false);
            }}
            disabled={circleCreating}
            className="w-full flex items-center gap-3 p-3 rounded-lg bg-[#00f0ff]/5 border border-[#00f0ff]/20 hover:bg-[#00f0ff]/10 transition-colors cursor-pointer mb-2 disabled:opacity-50 text-left"
          >
            <div className="w-8 h-8 rounded-full bg-[#00f0ff]/20 flex items-center justify-center shrink-0">
              <span className="text-[#00f0ff] text-sm font-bold">C</span>
            </div>
            <div>
              <div className="text-[#f0f4f8] text-sm font-medium flex items-center gap-2">
                Circle Wallet
                <span className="text-[8px] bg-[#00ff88]/20 text-[#00ff88] px-1.5 py-0.5 rounded-full font-bold">
                  RECOMMENDED
                </span>
              </div>
              <div className="text-[#8892a4] text-[10px]">
                {circleCreating ? "Creating wallet..." : "One-click, no extension needed"}
              </div>
            </div>
          </button>

          {/* MetaMask */}
          <button
            onClick={() => {
              onMetamaskConnect();
              setShowSelector(false);
            }}
            disabled={metamaskConnecting}
            className="w-full flex items-center gap-3 p-3 rounded-lg bg-[#374151]/30 border border-[#374151] hover:bg-[#374151]/50 transition-colors cursor-pointer text-left"
          >
            <div className="w-8 h-8 rounded-full bg-[#f97316]/20 flex items-center justify-center shrink-0">
              <span className="text-[#f97316] text-sm font-bold">M</span>
            </div>
            <div>
              <div className="text-[#f0f4f8] text-sm font-medium">MetaMask</div>
              <div className="text-[#8892a4] text-[10px]">
                {metamaskConnecting ? "Connecting..." : "Browser extension wallet"}
              </div>
            </div>
          </button>

          {/* Errors */}
          {circleError && (
            <div className="mt-2 text-[10px] text-[#ff4060] px-2">{circleError}</div>
          )}
          {metamaskError && (
            <div className="mt-2 text-[10px] text-[#ff4060] px-2">{metamaskError}</div>
          )}

          {/* Close */}
          <button
            onClick={() => setShowSelector(false)}
            className="w-full mt-2 py-1.5 text-[10px] text-[#8892a4] hover:text-[#f0f4f8] transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
