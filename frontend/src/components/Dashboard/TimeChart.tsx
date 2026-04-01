"use client";

import { useState, useEffect } from "react";

interface TimeChartProps {
  data: number[];
}

export function TimeChart({ data }: TimeChartProps) {
  const max = Math.max(...data, 1);
  // Avoid hydration mismatch: start with -1 (no highlight), set real hour on client
  const [currentHour, setCurrentHour] = useState(-1);
  useEffect(() => {
    setCurrentHour(new Date().getHours());
  }, []);

  // Y-axis labels (4 evenly spaced)
  const yLabels = [max, Math.round(max * 0.66), Math.round(max * 0.33), 0];

  return (
    <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-lg p-4 min-h-[220px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs uppercase tracking-wider text-[#8892a4]">
          Queries / Hour (24h)
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[#ffd700] font-mono">
            Peak: {data.indexOf(max)}:00
          </span>
          <span className="text-xs text-[#00f0ff] font-mono">
            Now: {currentHour}:00
          </span>
        </div>
      </div>
      <div className="flex">
        {/* Y-axis labels */}
        <div className="flex flex-col justify-between pr-2 h-40 text-right shrink-0">
          {yLabels.map((label, i) => (
            <span key={i} className="text-[9px] text-[#8892a4] font-mono leading-none">
              {label}
            </span>
          ))}
        </div>
        {/* Bars */}
        <div className="flex items-end gap-[3px] h-40 flex-1">
          {data.map((val, i) => {
            const height = Math.max((val / max) * 100, 3);
            const isCurrent = i === currentHour;
            const isRecent = i >= data.length - 3;
            return (
              <div
                key={i}
                className={`flex-1 rounded-t transition-all duration-300 ${
                  isCurrent ? "ring-1 ring-[#00f0ff]/60" : ""
                }`}
                style={{
                  height: `${height}%`,
                  background: isCurrent
                    ? "linear-gradient(to top, #00f0ff60, #00f0ff)"
                    : isRecent
                      ? "linear-gradient(to top, #00f0ff40, #00f0ff)"
                      : "linear-gradient(to top, #2a304060, #2a3040)",
                  minWidth: "6px",
                }}
                title={`${i}:00 — ${val} queries${isCurrent ? " (current)" : ""}`}
              />
            );
          })}
        </div>
      </div>
      <div className="flex ml-7 mt-1.5">
        <div className="flex-1 flex justify-between">
          <span className="text-[9px] text-[#8892a4]">0:00</span>
          <span className="text-[9px] text-[#8892a4]">6:00</span>
          <span className="text-[9px] text-[#8892a4]">12:00</span>
          <span className="text-[9px] text-[#8892a4]">18:00</span>
          <span className="text-[9px] text-[#8892a4]">23:00</span>
        </div>
      </div>
    </div>
  );
}
