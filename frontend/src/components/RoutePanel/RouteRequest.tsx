"use client";

interface RouteRequestProps {
  startPoint: [number, number] | null;
  endPoint: [number, number] | null;
  onClear: () => void;
}

export function RouteRequest({
  startPoint,
  endPoint,
  onClear,
}: RouteRequestProps) {
  return (
    <div className="bg-[#1a1f2e]/95 backdrop-blur border border-[#2a3040] rounded-lg p-3">
      {!startPoint && !endPoint ? (
        <p className="text-xs text-[#8892a4] text-center">
          Click on the map to set route{" "}
          <span className="text-[#00ff88]">start</span> and{" "}
          <span className="text-[#ff4060]">end</span> points
        </p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#00ff88]" />
            <span className="text-xs text-[#f0f4f8] font-mono">
              {startPoint
                ? `${startPoint[0].toFixed(4)}, ${startPoint[1].toFixed(4)}`
                : "Click to set start"}
            </span>
          </div>
          {startPoint && (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ff4060]" />
              <span className="text-xs text-[#f0f4f8] font-mono">
                {endPoint
                  ? `${endPoint[0].toFixed(4)}, ${endPoint[1].toFixed(4)}`
                  : "Click to set end"}
              </span>
            </div>
          )}
          {(startPoint || endPoint) && (
            <button
              onClick={onClear}
              className="w-full mt-1 py-1.5 text-xs rounded bg-[#2a3040] text-[#8892a4] hover:bg-[#353a4a] transition-colors cursor-pointer"
            >
              Clear Route
            </button>
          )}
        </div>
      )}
    </div>
  );
}
