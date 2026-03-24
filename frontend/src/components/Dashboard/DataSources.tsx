"use client";

interface DataSourcesProps {
  osrmActive: boolean;
  contractListening: boolean;
  simulatedCount: number;
  realCount: number;
  lastUpdate: number;
}

function formatTime(timestamp: number): string {
  if (timestamp === 0) return "Never";
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function DataSources({
  osrmActive,
  contractListening,
  simulatedCount,
  realCount,
  lastUpdate,
}: DataSourcesProps) {
  return (
    <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-lg p-3 mb-4">
      <h3 className="text-[10px] uppercase tracking-wider text-[#8892a4] mb-2">
        Data Sources
      </h3>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs">
          <div
            className={`w-2 h-2 rounded-full ${
              osrmActive ? "bg-[#00ff88]" : "bg-[#ff4060]"
            }`}
          />
          <span className="text-[#f0f4f8]">OSRM Routing:</span>
          <span
            className={osrmActive ? "text-[#00ff88]" : "text-[#ff4060]"}
          >
            {osrmActive ? "Active" : "Inactive"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div
            className={`w-2 h-2 rounded-full ${
              contractListening ? "bg-[#00ff88]" : "bg-[#ff4060]"
            }`}
          />
          <span className="text-[#f0f4f8]">Arc Contract:</span>
          <span
            className={
              contractListening ? "text-[#00ff88]" : "text-[#ff4060]"
            }
          >
            {contractListening ? "Listening" : "Disconnected"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full bg-[#3b82f6]" />
          <span className="text-[#f0f4f8]">Simulated:</span>
          <span className="text-[#3b82f6]">{simulatedCount} vehicles</span>
        </div>
        {realCount > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full bg-[#00ff88]" />
            <span className="text-[#f0f4f8]">Live (IBB):</span>
            <span className="text-[#00ff88]">{realCount} vehicles</span>
          </div>
        )}
      </div>
      <div className="mt-2 pt-2 border-t border-[#2a3040]">
        <span className="text-[10px] text-[#8892a4]">
          Last update: {formatTime(lastUpdate)}
        </span>
      </div>
    </div>
  );
}
