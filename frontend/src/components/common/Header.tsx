"use client";

import { WalletSelector } from "./WalletSelector";
import { DemoModeButton } from "./DemoModeButton";

interface HeaderProps {
  // MetaMask
  address: string | null;
  balance: string;
  isConnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  // Circle
  circleAddress: string | null;
  circleBalance: string;
  circleCreating: boolean;
  onCircleCreate: () => void;
  onCircleDisconnect: () => void;
  circleError: string | null;
  metamaskError: string | null;
  // Active wallet type
  activeWallet: "none" | "metamask" | "circle";
  wsConnected: boolean;
}

export function Header({
  address,
  balance,
  isConnecting,
  onConnect,
  onDisconnect,
  circleAddress,
  circleBalance,
  circleCreating,
  onCircleCreate,
  onCircleDisconnect,
  circleError,
  metamaskError,
  activeWallet,
  wsConnected,
}: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-[1000] flex items-center justify-between px-6 py-3 bg-[#0a0f1e]/95 backdrop-blur border-b border-[#2a3040]">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="text-[#00f0ff]">City</span>
          <span className="text-[#f0f4f8]">Pulse</span>
        </h1>
        <span className="text-xs text-[#8892a4] hidden sm:block">
          Municipal Traffic x402
        </span>
        <div className="flex items-center gap-1.5 ml-4">
          <div
            className={`w-2 h-2 rounded-full ${
              wsConnected ? "bg-[#00ff88] animate-pulse" : "bg-[#ff4060]"
            }`}
          />
          <span className="text-xs text-[#8892a4]">
            {wsConnected ? "Live" : "Offline"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <a
          href="/drive"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#00f0ff]/10 text-[#00f0ff] hover:bg-[#00f0ff]/20 transition-colors border border-[#00f0ff]/20"
        >
          <span className="text-sm">&#x1F697;</span>
          Drive
        </a>
        <a
          href="/park"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#a855f7]/10 text-[#a855f7] hover:bg-[#a855f7]/20 transition-colors border border-[#a855f7]/20"
        >
          <span className="text-sm">&#x1F17F;&#xFE0F;</span>
          Park
        </a>
        <a
          href="/card"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#ffd700]/10 text-[#ffd700] hover:bg-[#ffd700]/20 transition-colors border border-[#ffd700]/20"
        >
          <span className="text-sm">&#x1F4B3;</span>
          Card
        </a>
        <DemoModeButton />
        <WalletSelector
          metamaskAddress={address}
          metamaskBalance={balance}
          metamaskConnecting={isConnecting}
          onMetamaskConnect={onConnect}
          onMetamaskDisconnect={onDisconnect}
          circleAddress={circleAddress}
          circleBalance={circleBalance}
          circleCreating={circleCreating}
          onCircleCreate={onCircleCreate}
          onCircleDisconnect={onCircleDisconnect}
          activeWallet={activeWallet}
          circleError={circleError}
          metamaskError={metamaskError}
        />
      </div>
    </header>
  );
}
