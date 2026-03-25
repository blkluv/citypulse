"use client";

import { useState, useCallback, useRef, useEffect } from "react";

const LOCATIONS: Record<string, { lat: number; lng: number }> = {
  taksim: { lat: 41.037, lng: 28.985 },
  kadikoy: { lat: 40.991, lng: 29.029 },
  besiktas: { lat: 41.043, lng: 29.005 },
  eminonu: { lat: 41.017, lng: 28.968 },
  levent: { lat: 41.082, lng: 29.011 },
  bakirkoy: { lat: 40.982, lng: 28.872 },
  sisli: { lat: 41.06, lng: 28.99 },
  fatih: { lat: 41.008, lng: 28.94 },
  uskudar: { lat: 41.025, lng: 29.015 },
  sultanahmet: { lat: 41.006, lng: 28.976 },
  galata: { lat: 41.026, lng: 28.974 },
  mecidiyekoy: { lat: 41.067, lng: 28.994 },
  maslak: { lat: 41.107, lng: 29.017 },
  beyoglu: { lat: 41.033, lng: 28.977 },
  karakoy: { lat: 41.022, lng: 28.975 },
};

const LOCATION_NAMES = Object.keys(LOCATIONS).map(
  (k) => k.charAt(0).toUpperCase() + k.slice(1)
);

interface SearchOverlayProps {
  startPoint: { lat: number; lng: number } | null;
  endPoint: { lat: number; lng: number } | null;
  onSetStart: (coords: { lat: number; lng: number }, name: string) => void;
  onSetEnd: (coords: { lat: number; lng: number }, name: string) => void;
  onClear: () => void;
  mapClickMode: boolean;
  onToggleMapClick: () => void;
  startName: string;
  endName: string;
}

function Suggestions({
  query,
  onSelect,
}: {
  query: string;
  onSelect: (name: string) => void;
}) {
  const q = query.toLowerCase().trim();
  if (!q) return null;
  const matches = LOCATION_NAMES.filter((n) =>
    n.toLowerCase().startsWith(q)
  ).slice(0, 5);
  if (matches.length === 0) return null;
  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1f2e]/95 backdrop-blur-md border border-[#2a3040] rounded-lg overflow-hidden z-50">
      {matches.map((name) => (
        <button
          key={name}
          className="w-full text-left px-4 py-2.5 text-sm text-[#f0f4f8] hover:bg-[#2a3040]/60 transition-colors"
          onClick={() => onSelect(name)}
        >
          <span className="text-[#8892a4] mr-2">&#x1F4CD;</span>
          {name}
        </button>
      ))}
    </div>
  );
}

export function SearchOverlay({
  startPoint,
  endPoint,
  onSetStart,
  onSetEnd,
  onClear,
  mapClickMode,
  onToggleMapClick,
  startName,
  endName,
}: SearchOverlayProps) {
  const [startQuery, setStartQuery] = useState("");
  const [endQuery, setEndQuery] = useState("");
  const [focusedField, setFocusedField] = useState<"start" | "end" | null>(
    null
  );
  const endInputRef = useRef<HTMLInputElement>(null);

  // Sync display values from props
  useEffect(() => {
    if (startName) setStartQuery(startName);
  }, [startName]);

  useEffect(() => {
    if (endName) setEndQuery(endName);
  }, [endName]);

  const resolveLocation = useCallback(
    (name: string): { lat: number; lng: number } | null => {
      const key = name.toLowerCase().trim();
      return LOCATIONS[key] || null;
    },
    []
  );

  const handleStartSelect = useCallback(
    (name: string) => {
      const coords = resolveLocation(name);
      if (coords) {
        onSetStart(coords, name);
        setStartQuery(name);
        setFocusedField(null);
        // Focus end input
        setTimeout(() => endInputRef.current?.focus(), 100);
      }
    },
    [resolveLocation, onSetStart]
  );

  const handleEndSelect = useCallback(
    (name: string) => {
      const coords = resolveLocation(name);
      if (coords) {
        onSetEnd(coords, name);
        setEndQuery(name);
        setFocusedField(null);
      }
    },
    [resolveLocation, onSetEnd]
  );

  const handleStartKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleStartSelect(startQuery);
      }
    },
    [startQuery, handleStartSelect]
  );

  const handleEndKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleEndSelect(endQuery);
      }
    },
    [endQuery, handleEndSelect]
  );

  const hasRoute = startPoint && endPoint;

  return (
    <div className="absolute top-0 left-0 right-0 z-[1000] p-3 sm:p-4">
      <div className="max-w-2xl mx-auto">
        {/* Search bar */}
        <div className="bg-[#0a0f1e]/90 backdrop-blur-xl border border-[#2a3040] rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
          {/* Top row: branding + nav */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2a3040]/60">
            <div className="flex items-center gap-2">
              <span className="text-[#00f0ff] font-bold text-lg">City</span>
              <span className="text-[#f0f4f8] font-bold text-lg">Pulse</span>
              <span className="text-[10px] text-[#8892a4] bg-[#2a3040] px-1.5 py-0.5 rounded ml-1">
                DRIVE
              </span>
            </div>
            <a
              href="/"
              className="text-xs text-[#8892a4] hover:text-[#00f0ff] transition-colors"
            >
              Dashboard
            </a>
          </div>

          {/* Input fields */}
          <div className="p-3 space-y-2">
            {/* Start input */}
            <div className="relative">
              <div className="flex items-center gap-3 bg-[#141924] rounded-xl px-4 py-2.5">
                <div className="w-3 h-3 rounded-full bg-[#00ff88] shrink-0 shadow-[0_0_8px_#00ff8860]" />
                <input
                  type="text"
                  placeholder="Start location"
                  value={startQuery}
                  onChange={(e) => setStartQuery(e.target.value)}
                  onFocus={() => setFocusedField("start")}
                  onBlur={() => setTimeout(() => setFocusedField(null), 200)}
                  onKeyDown={handleStartKey}
                  className="flex-1 bg-transparent text-[#f0f4f8] text-sm placeholder:text-[#5a6478] outline-none"
                />
                {startPoint && (
                  <span className="text-[10px] text-[#00ff88]">&#10003;</span>
                )}
              </div>
              {focusedField === "start" && (
                <Suggestions query={startQuery} onSelect={handleStartSelect} />
              )}
            </div>

            {/* End input */}
            <div className="relative">
              <div className="flex items-center gap-3 bg-[#141924] rounded-xl px-4 py-2.5">
                <div className="w-3 h-3 rounded-full bg-[#ff4060] shrink-0 shadow-[0_0_8px_#ff406060]" />
                <input
                  ref={endInputRef}
                  type="text"
                  placeholder="Where to?"
                  value={endQuery}
                  onChange={(e) => setEndQuery(e.target.value)}
                  onFocus={() => setFocusedField("end")}
                  onBlur={() => setTimeout(() => setFocusedField(null), 200)}
                  onKeyDown={handleEndKey}
                  className="flex-1 bg-transparent text-[#f0f4f8] text-sm placeholder:text-[#5a6478] outline-none"
                />
                {endPoint && (
                  <span className="text-[10px] text-[#ff4060]">&#10003;</span>
                )}
              </div>
              {focusedField === "end" && (
                <Suggestions query={endQuery} onSelect={handleEndSelect} />
              )}
            </div>
          </div>

          {/* Bottom row: click-on-map toggle + clear */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-[#2a3040]/60">
            <button
              onClick={onToggleMapClick}
              className={`text-xs flex items-center gap-1.5 transition-colors ${
                mapClickMode
                  ? "text-[#00f0ff]"
                  : "text-[#8892a4] hover:text-[#f0f4f8]"
              }`}
            >
              <span className="text-sm">&#x1F5FA;</span>
              {mapClickMode ? "Click on map to set points" : "Or click on the map"}
            </button>
            {hasRoute && (
              <button
                onClick={() => {
                  onClear();
                  setStartQuery("");
                  setEndQuery("");
                }}
                className="text-xs text-[#ff4060] hover:text-[#ff6080] transition-colors"
              >
                Clear route
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
