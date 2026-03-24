"use client";

import { WalletConnect } from "./WalletConnect";

interface HeaderProps {
  address: string | null;
  balance: string;
  isConnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  wsConnected: boolean;
}

export function Header({
  address,
  balance,
  isConnecting,
  onConnect,
  onDisconnect,
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
      <WalletConnect
        address={address}
        balance={balance}
        isConnecting={isConnecting}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      />
    </header>
  );
}
