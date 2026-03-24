"use client";

interface TimeChartProps {
  data: number[];
}

export function TimeChart({ data }: TimeChartProps) {
  const max = Math.max(...data, 1);

  return (
    <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-lg p-3">
      <h3 className="text-xs uppercase tracking-wider text-[#8892a4] mb-3">
        Queries / Hour (24h)
      </h3>
      <div className="flex items-end gap-[2px] h-24">
        {data.map((val, i) => {
          const height = Math.max((val / max) * 100, 2);
          const isRecent = i >= data.length - 3;
          return (
            <div
              key={i}
              className="flex-1 rounded-t transition-all duration-300"
              style={{
                height: `${height}%`,
                background: isRecent
                  ? "linear-gradient(to top, #00f0ff40, #00f0ff)"
                  : "linear-gradient(to top, #2a304040, #2a3040)",
                minWidth: "4px",
              }}
              title={`${i}:00 - ${val} queries`}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-[#8892a4]">24h ago</span>
        <span className="text-[9px] text-[#8892a4]">now</span>
      </div>
    </div>
  );
}
