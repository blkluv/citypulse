"use client";

import { useState, useEffect, useCallback } from "react";
import type { RouteResult, NavigationStep } from "@/types";

interface NavigationCardProps {
  route: RouteResult;
  cost: string;
  onEndNavigation: () => void;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return (meters / 1000).toFixed(1) + " km";
  }
  return Math.round(meters) + " m";
}

function getManeuverArrow(instruction: string): string {
  const lower = instruction.toLowerCase();
  if (lower.includes("right")) return "\u2197\uFE0F"; // arrow upper right
  if (lower.includes("left")) return "\u2196\uFE0F"; // arrow upper left
  if (lower.includes("arrive")) return "\uD83C\uDFC1"; // flag
  if (lower.includes("roundabout")) return "\u21BB"; // clockwise arrow
  if (lower.includes("merge")) return "\u21C5"; // merge arrows
  return "\u2B06\uFE0F"; // up arrow = continue
}

export function NavigationCard({
  route,
  cost,
  onEndNavigation,
}: NavigationCardProps) {
  const steps = route.steps || [];
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Simulate navigation progress
  useEffect(() => {
    if (steps.length === 0) return;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [steps.length]);

  // Advance steps based on elapsed time
  useEffect(() => {
    if (steps.length === 0) return;

    let accumulated = 0;
    for (let i = 0; i < steps.length; i++) {
      // Simulate each step taking a fraction of its real duration
      // (compressed for demo: 1 real second = ~5 seconds of nav time)
      accumulated += steps[i].duration / 5;
      if (elapsedSeconds < accumulated) {
        setCurrentStepIdx(i);
        return;
      }
    }
    setCurrentStepIdx(steps.length - 1);
  }, [elapsedSeconds, steps]);

  const handleNextStep = useCallback(() => {
    setCurrentStepIdx((prev) => Math.min(prev + 1, steps.length - 1));
  }, [steps.length]);

  const handlePrevStep = useCallback(() => {
    setCurrentStepIdx((prev) => Math.max(prev - 1, 0));
  }, []);

  const currentStep: NavigationStep | null = steps[currentStepIdx] || null;
  const nextStep: NavigationStep | null = steps[currentStepIdx + 1] || null;

  // Calculate remaining distance and time
  const remainingSteps = steps.slice(currentStepIdx);
  const remainingDistance = remainingSteps.reduce(
    (sum, s) => sum + s.distance,
    0
  );
  const remainingTime = Math.max(
    1,
    Math.round(remainingSteps.reduce((sum, s) => sum + s.duration, 0) / 60)
  );

  const totalDist = route.routeDetails?.optimizedDistance || 0;

  if (steps.length === 0) {
    // Fallback when no steps
    return (
      <div className="absolute bottom-0 left-0 right-0 z-[1000] drive-card-slide-up">
        <div className="max-w-lg mx-auto px-3 sm:px-4 pb-4">
          <div className="bg-[#0a0f1e]/95 backdrop-blur-xl border border-[#00f0ff]/20 rounded-2xl overflow-hidden shadow-2xl shadow-black/60">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#00f0ff]/10 flex items-center justify-center text-xl">
                  &#x2713;
                </div>
                <div>
                  <div className="text-[#f0f4f8] font-semibold">
                    Route active
                  </div>
                  <div className="text-xs text-[#8892a4]">
                    {route.optimizedTime} min &middot;{" "}
                    {totalDist > 0 ? formatDistance(totalDist) : "---"} &middot;{" "}
                    {cost} USDC paid
                  </div>
                </div>
              </div>
              <div className="text-xs text-[#8892a4] mb-3">
                Powered by {route.vehiclesUsed.length} municipal vehicles
              </div>
              <button
                onClick={onEndNavigation}
                className="w-full py-2.5 rounded-xl text-sm font-medium bg-[#1a1f2e] text-[#ff4060] hover:bg-[#ff4060]/10 border border-[#2a3040] transition-colors"
              >
                End Navigation
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[1000] drive-card-slide-up">
      <div className="max-w-lg mx-auto px-3 sm:px-4 pb-4">
        <div className="bg-[#0a0f1e]/95 backdrop-blur-xl border border-[#00f0ff]/20 rounded-2xl overflow-hidden shadow-2xl shadow-black/60">
          {/* Current instruction - large */}
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-start gap-4">
              <div className="text-3xl mt-0.5">
                {currentStep
                  ? getManeuverArrow(currentStep.instruction)
                  : "\u2B06\uFE0F"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[#f0f4f8] font-semibold text-lg leading-tight">
                  {currentStep
                    ? currentStep.instruction
                    : "Follow the route"}
                </div>
                {currentStep && currentStep.name !== "unnamed road" && (
                  <div className="text-sm text-[#8892a4] mt-1">
                    {currentStep.name}
                  </div>
                )}
                {currentStep && (
                  <div className="text-xs text-[#00f0ff] mt-1 font-mono">
                    {formatDistance(currentStep.distance)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Next step preview */}
          {nextStep && (
            <div className="mx-5 mb-3 bg-[#141924] rounded-lg px-4 py-2.5 flex items-center gap-3">
              <span className="text-sm text-[#8892a4]">
                {getManeuverArrow(nextStep.instruction)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-[#8892a4] truncate">
                  Then: {nextStep.instruction}
                </div>
              </div>
              <span className="text-xs text-[#8892a4] font-mono shrink-0">
                {formatDistance(nextStep.distance)}
              </span>
            </div>
          )}

          {/* Step navigation buttons */}
          <div className="flex items-center justify-center gap-2 px-5 mb-3">
            <button
              onClick={handlePrevStep}
              disabled={currentStepIdx === 0}
              className="text-xs text-[#8892a4] hover:text-[#f0f4f8] disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-2 py-1"
            >
              &#x25C0; Prev
            </button>
            <span className="text-xs text-[#5a6478] font-mono">
              {currentStepIdx + 1}/{steps.length}
            </span>
            <button
              onClick={handleNextStep}
              disabled={currentStepIdx === steps.length - 1}
              className="text-xs text-[#8892a4] hover:text-[#f0f4f8] disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-2 py-1"
            >
              Next &#x25B6;
            </button>
          </div>

          {/* Bottom info bar */}
          <div className="px-5 py-3 border-t border-[#2a3040]/60 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-[#f0f4f8] font-semibold font-mono text-sm">
                  {remainingTime} min
                </div>
                <div className="text-[10px] text-[#8892a4]">remaining</div>
              </div>
              <div className="w-px h-6 bg-[#2a3040]" />
              <div>
                <div className="text-[#f0f4f8] font-mono text-sm">
                  {formatDistance(remainingDistance)}
                </div>
                <div className="text-[10px] text-[#8892a4]">distance</div>
              </div>
              <div className="w-px h-6 bg-[#2a3040]" />
              <div>
                <div className="text-[#00ff88] font-mono text-sm">
                  {cost} USDC
                </div>
                <div className="text-[10px] text-[#8892a4]">paid</div>
              </div>
            </div>
            <button
              onClick={onEndNavigation}
              className="text-xs text-[#ff4060] hover:text-[#ff6080] font-medium transition-colors"
            >
              End
            </button>
          </div>

          {/* Powered by badge */}
          {route.vehiclesUsed.length > 0 && (
            <div className="px-5 py-2 border-t border-[#2a3040]/40 text-center">
              <span className="text-[10px] text-[#5a6478]">
                Powered by {route.vehiclesUsed.length} municipal vehicles
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
