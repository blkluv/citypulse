"use client";

import type { RouteResult as RouteResultType } from "@/types";
import { ComparisonCard } from "./ComparisonCard";

interface RouteResultProps {
  result: RouteResultType;
  txHash: string | null;
  onClose: () => void;
}

export function RouteResult({ result, txHash, onClose }: RouteResultProps) {
  return (
    <div className="bg-[#1a1f2e]/95 backdrop-blur border border-[#2a3040] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#f0f4f8]">
          Route Comparison
        </h3>
        <button
          onClick={onClose}
          className="text-[#8892a4] hover:text-[#f0f4f8] text-sm cursor-pointer"
        >
          x
        </button>
      </div>

      <ComparisonCard
        normalTime={result.normalTime}
        optimizedTime={result.optimizedTime}
        savedMinutes={result.savedMinutes}
      />

      <div className="mt-3 pt-3 border-t border-[#2a3040]">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-[#8892a4]">Cost Paid</span>
          <span className="text-[#ffd700] font-mono">{result.cost} USDC</span>
        </div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-[#8892a4]">Vehicles Used</span>
          <span className="text-[#00f0ff] font-mono">
            {result.vehiclesUsed.length}
          </span>
        </div>
        {txHash && (
          <div className="mt-2">
            <span className="text-[10px] text-[#8892a4]">TX: </span>
            <span className="text-[10px] text-[#00f0ff] font-mono break-all">
              {txHash}
            </span>
          </div>
        )}
      </div>

      <div className="mt-3">
        <h4 className="text-[10px] uppercase tracking-wider text-[#8892a4] mb-1.5">
          Vehicles Queried
        </h4>
        <div className="flex flex-wrap gap-1">
          {result.vehiclesUsed.map((v) => (
            <span
              key={v}
              className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/20"
            >
              {v}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
