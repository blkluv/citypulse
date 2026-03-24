"use client";

interface WalletConnectProps {
  address: string | null;
  balance: string;
  isConnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

function truncateAddress(addr: string): string {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

export function WalletConnect({
  address,
  balance,
  isConnecting,
  onConnect,
  onDisconnect,
}: WalletConnectProps) {
  if (address) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1a1f2e] border border-[#2a3040]">
          <span className="text-xs text-[#ffd700] font-mono">
            {parseFloat(balance).toFixed(4)} USDC
          </span>
          <span className="text-xs text-[#8892a4]">|</span>
          <span className="text-xs text-[#00f0ff] font-mono">
            {truncateAddress(address)}
          </span>
        </div>
        <button
          onClick={onDisconnect}
          className="px-3 py-1.5 text-xs rounded-lg bg-[#ff4060]/10 text-[#ff4060] border border-[#ff4060]/30 hover:bg-[#ff4060]/20 transition-colors cursor-pointer"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onConnect}
      disabled={isConnecting}
      className="px-4 py-2 text-sm font-medium rounded-lg bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30 hover:bg-[#00f0ff]/20 transition-colors disabled:opacity-50 cursor-pointer"
    >
      {isConnecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
