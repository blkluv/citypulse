"use client";

import { useState, useEffect, useCallback } from "react";
import type { RouteResult, NavigationStep } from "@/types";

interface NavigationCardProps {
  route: RouteResult;
  cost: string;
  onEndNavigation: () => void;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return (meters / 1000).toFixed(1) + " km";
  return Math.round(meters) + " m";
}

function getManeuverIcon(instruction: string): { arrow: string; bg: string } {
  const lower = instruction.toLowerCase();
  if (lower.includes("right")) return { arrow: "↗", bg: "#22D3EE" };
  if (lower.includes("left")) return { arrow: "↖", bg: "#22D3EE" };
  if (lower.includes("arrive")) return { arrow: "⚑", bg: "#22C55E" };
  if (lower.includes("roundabout")) return { arrow: "↻", bg: "#EAB308" };
  if (lower.includes("merge")) return { arrow: "⇅", bg: "#22D3EE" };
  if (lower.includes("u-turn") || lower.includes("uturn")) return { arrow: "↩", bg: "#EF4444" };
  if (lower.includes("ramp") || lower.includes("exit")) return { arrow: "↘", bg: "#22D3EE" };
  return { arrow: "↑", bg: "#22D3EE" };
}

export function NavigationCard({ route, cost, onEndNavigation }: NavigationCardProps) {
  const steps = route.steps || [];
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showSteps, setShowSteps] = useState(false);

  // Simulate navigation progress
  useEffect(() => {
    if (steps.length === 0) return;
    const interval = setInterval(() => setElapsedSeconds((p) => p + 1), 1000);
    return () => clearInterval(interval);
  }, [steps.length]);

  // Advance steps based on elapsed time
  useEffect(() => {
    if (steps.length === 0) return;
    let accumulated = 0;
    for (let i = 0; i < steps.length; i++) {
      accumulated += steps[i].duration / 5; // 5x speed for demo
      if (elapsedSeconds < accumulated) { setCurrentStepIdx(i); return; }
    }
    setCurrentStepIdx(steps.length - 1);
  }, [elapsedSeconds, steps]);

  const currentStep: NavigationStep | null = steps[currentStepIdx] || null;
  const nextStep: NavigationStep | null = steps[currentStepIdx + 1] || null;

  const remainingSteps = steps.slice(currentStepIdx);
  const remainingDistance = remainingSteps.reduce((sum, s) => sum + s.distance, 0);
  const remainingTime = Math.max(1, Math.round(remainingSteps.reduce((sum, s) => sum + s.duration, 0) / 60));

  const currentIcon = currentStep ? getManeuverIcon(currentStep.instruction) : { arrow: "↑", bg: "#22D3EE" };

  // Progress percentage
  const totalSteps = steps.length;
  const progress = totalSteps > 0 ? ((currentStepIdx + 1) / totalSteps) * 100 : 0;

  if (steps.length === 0) {
    return (
      <div className="absolute bottom-[95px] left-0 right-0 z-[1000] slide-up">
        <div className="max-w-[402px] mx-auto bg-[#1E293B] rounded-t-[12px] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-[8px] bg-[#22C55E] flex items-center justify-center text-2xl text-[#0A0F1C]">✓</div>
            <div>
              <div className="text-white font-semibold">Route Active</div>
              <div className="text-[12px] text-[#94A3B8] font-mono">{route.optimizedTime} min &middot; ${cost} USDC</div>
            </div>
          </div>
          <button onClick={onEndNavigation} className="w-full h-[44px] rounded-[8px] bg-[#EF4444]/10 text-[#EF4444] text-[13px] font-semibold border border-[#EF4444]/20 cursor-pointer">
            End Navigation
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ─── TOP: Current maneuver banner (Google Maps style) ─── */}
      <div className="absolute top-0 left-0 right-0 z-[1100] slide-up">
        <div className="max-w-[402px] mx-auto">
          {/* Safe area */}
          <div className="h-[44px] md:h-0 bg-[#1E293B]" />

          {/* Main maneuver */}
          <div className="bg-[#1E293B] px-5 pb-4 pt-3">
            <div className="flex items-start gap-4">
              {/* Big arrow */}
              <div className="w-[56px] h-[56px] rounded-[12px] flex items-center justify-center text-[28px] text-[#0A0F1C] shrink-0" style={{ background: currentIcon.bg }}>
                {currentIcon.arrow}
              </div>
              <div className="flex-1 min-w-0">
                {/* Distance to next maneuver */}
                <div className="font-mono text-[28px] font-bold text-white leading-tight">
                  {currentStep ? formatDistance(currentStep.distance) : "---"}
                </div>
                {/* Instruction */}
                <div className="text-[15px] text-[#94A3B8] mt-1 leading-snug">
                  {currentStep ? currentStep.instruction : "Follow the route"}
                </div>
                {/* Street name */}
                {currentStep && currentStep.name !== "unnamed road" && (
                  <div className="text-[13px] text-[#475569] mt-0.5 font-medium">{currentStep.name}</div>
                )}
              </div>
            </div>

            {/* Next step preview */}
            {nextStep && (
              <div className="mt-3 flex items-center gap-3 px-3 py-2.5 bg-[#0F172A] rounded-[8px]">
                <span className="text-[16px] w-6 text-center" style={{ color: getManeuverIcon(nextStep.instruction).bg }}>
                  {getManeuverIcon(nextStep.instruction).arrow}
                </span>
                <span className="text-[12px] text-[#64748B] flex-1 truncate">Then: {nextStep.instruction}</span>
                <span className="text-[12px] font-mono text-[#475569] shrink-0">{formatDistance(nextStep.distance)}</span>
              </div>
            )}

            {/* Progress bar */}
            <div className="mt-3 h-[3px] bg-[#0F172A] rounded-full overflow-hidden">
              <div className="h-full bg-[#22D3EE] rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ─── BOTTOM: ETA + distance + controls ─── */}
      <div className="absolute bottom-[95px] left-0 right-0 z-[1100]">
        <div className="max-w-[402px] mx-auto bg-[#1E293B] rounded-t-[12px] overflow-hidden">
          {/* Stats row */}
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-5">
              {/* ETA */}
              <div>
                <div className="font-mono text-[24px] font-bold text-[#22D3EE]">{remainingTime}</div>
                <div className="text-[10px] text-[#475569] tracking-wider">MIN LEFT</div>
              </div>
              <div className="w-px h-8 bg-[#0F172A]" />
              {/* Distance */}
              <div>
                <div className="font-mono text-[16px] font-bold text-white">{formatDistance(remainingDistance)}</div>
                <div className="text-[10px] text-[#475569] tracking-wider">REMAINING</div>
              </div>
              <div className="w-px h-8 bg-[#0F172A]" />
              {/* Cost */}
              <div>
                <div className="font-mono text-[16px] font-bold text-[#22C55E]">${cost}</div>
                <div className="text-[10px] text-[#475569] tracking-wider">PAID</div>
              </div>
            </div>
          </div>

          {/* Steps toggle + end */}
          <div className="flex items-center border-t border-[#0F172A]">
            <button onClick={() => setShowSteps(!showSteps)}
              className="flex-1 py-3 text-[12px] text-[#94A3B8] hover:text-white text-center cursor-pointer border-r border-[#0F172A]">
              {showSteps ? "Hide Steps" : `Steps (${currentStepIdx + 1}/${totalSteps})`}
            </button>
            <button onClick={onEndNavigation}
              className="flex-1 py-3 text-[12px] text-[#EF4444] hover:text-[#FF6B6B] font-semibold text-center cursor-pointer">
              End Navigation
            </button>
          </div>

          {/* Expandable steps list */}
          {showSteps && (
            <div className="max-h-[200px] overflow-y-auto custom-scrollbar border-t border-[#0F172A]">
              {steps.map((step, i) => {
                const icon = getManeuverIcon(step.instruction);
                const isCurrent = i === currentStepIdx;
                const isPast = i < currentStepIdx;
                return (
                  <div key={i} className={`flex items-center gap-3 px-5 py-2.5 ${isCurrent ? "bg-[#22D3EE]/[0.06]" : ""} ${isPast ? "opacity-40" : ""}`}>
                    <span className="text-[14px] w-5 text-center" style={{ color: isCurrent ? icon.bg : "#475569" }}>{icon.arrow}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[12px] truncate ${isCurrent ? "text-white font-medium" : "text-[#94A3B8]"}`}>{step.instruction}</div>
                      {step.name !== "unnamed road" && <div className="text-[10px] text-[#475569] truncate">{step.name}</div>}
                    </div>
                    <span className="text-[10px] font-mono text-[#475569] shrink-0">{formatDistance(step.distance)}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Powered by */}
          <div className="py-2 text-center border-t border-[#0F172A]">
            <span className="text-[9px] text-[#475569] font-mono tracking-wider">
              CITYPULSE &middot; {route.vehiclesUsed.length} VEHICLES &middot; CIRCLE NANOPAYMENTS
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
