"use client";

interface PaymentPopupProps {
  fromZone: string;
  toZone: string;
  vehicleCount: number;
  cost: string;
  loading: boolean;
  error: string | null;
  onPay: () => void;
  onCancel: () => void;
}

export function PaymentPopup({
  fromZone,
  toZone,
  vehicleCount,
  cost,
  loading,
  error,
  onPay,
  onCancel,
}: PaymentPopupProps) {
  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[900] w-80">
      <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-5 shadow-2xl">
        <h3 className="text-sm font-semibold text-[#f0f4f8] mb-4">
          Route Payment
        </h3>

        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-[#8892a4]">Route</span>
            <span className="text-[#f0f4f8] font-mono">
              {fromZone} → {toZone}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#8892a4]">Vehicles on route</span>
            <span className="text-[#00f0ff] font-mono">{vehicleCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#8892a4]">Cost</span>
            <span className="text-[#ffd700] font-mono">{cost} USDC</span>
          </div>
        </div>

        {error && (
          <div className="text-xs text-[#ff4060] mb-3 p-2 bg-[#ff4060]/10 rounded">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 text-sm rounded-lg bg-[#2a3040] text-[#8892a4] hover:bg-[#353a4a] transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onPay}
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-medium rounded-lg bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/30 hover:bg-[#00f0ff]/25 transition-colors disabled:opacity-50 payment-glow cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-3 h-3 border-2 border-[#00f0ff]/30 border-t-[#00f0ff] rounded-full animate-spin" />
                Confirming...
              </span>
            ) : (
              "Pay & Optimize"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
