"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { robotSocket } from "@/lib/websocket";

type JogMode = "step" | "continuous";
const STEP_SIZES = [0.1, 0.5, 1, 5, 10, 50];
const CONTINUOUS_SPEEDS = [
  { label: "Slow", value: 30 },
  { label: "Medium", value: 80 },
  { label: "Fast", value: 150 },
  { label: "Rapid", value: 250 },
];

export function JogPanel() {
  const [jogMode, setJogMode] = useState<JogMode>("step");
  const [stepSize, setStepSize] = useState(5);
  const [speed, setSpeed] = useState(80);
  const [continuousSpeed, setContinuousSpeed] = useState(80);
  const continuousTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeAxisRef = useRef<string | null>(null);

  const stopContinuousJog = useCallback(() => {
    if (continuousTimerRef.current) {
      clearInterval(continuousTimerRef.current);
      continuousTimerRef.current = null;
    }
    activeAxisRef.current = null;
  }, []);

  const startContinuousJog = useCallback((axis: "x" | "y" | "z", direction: number) => {
    stopContinuousJog();
    activeAxisRef.current = `${axis}:${direction}`;
    const moveDistance = 2 * direction;
    robotSocket.jog(axis, moveDistance, continuousSpeed);
    continuousTimerRef.current = setInterval(() => {
      robotSocket.jog(axis, moveDistance, continuousSpeed);
    }, 100);
  }, [continuousSpeed, stopContinuousJog]);

  function handleStepJog(axis: "x" | "y" | "z", direction: number) {
    robotSocket.jog(axis, stepSize * direction, speed);
  }

  function jogButtonEvents(axis: "x" | "y" | "z", direction: number) {
    if (jogMode === "continuous") {
      return {
        onMouseDown: (e: React.MouseEvent) => { e.preventDefault(); startContinuousJog(axis, direction); },
        onMouseUp: stopContinuousJog,
        onMouseLeave: stopContinuousJog,
        onTouchStart: (e: React.TouchEvent) => { e.preventDefault(); startContinuousJog(axis, direction); },
        onTouchEnd: stopContinuousJog,
        onTouchCancel: stopContinuousJog,
      };
    }
    return {
      onClick: () => handleStepJog(axis, direction),
    };
  }

  useEffect(() => {
    const keysHeld = new Set<string>();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

      if (jogMode === "step") {
        if (event.repeat) return;
        switch (event.key) {
          case "ArrowRight": handleStepJog("x", 1); break;
          case "ArrowLeft": handleStepJog("x", -1); break;
          case "ArrowUp": handleStepJog("y", 1); break;
          case "ArrowDown": handleStepJog("y", -1); break;
          case "PageUp": handleStepJog("z", 1); break;
          case "PageDown": handleStepJog("z", -1); break;
          case " ": event.preventDefault(); robotSocket.setVacuum(true); break;
        }
      } else {
        if (keysHeld.has(event.key)) return;
        keysHeld.add(event.key);
        switch (event.key) {
          case "ArrowRight": startContinuousJog("x", 1); break;
          case "ArrowLeft": startContinuousJog("x", -1); break;
          case "ArrowUp": startContinuousJog("y", 1); break;
          case "ArrowDown": startContinuousJog("y", -1); break;
          case "PageUp": startContinuousJog("z", 1); break;
          case "PageDown": startContinuousJog("z", -1); break;
          case " ": event.preventDefault(); robotSocket.setVacuum(true); break;
        }
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      keysHeld.delete(event.key);
      if (jogMode === "continuous") {
        const axisKeys = ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "PageUp", "PageDown"];
        if (axisKeys.includes(event.key)) {
          stopContinuousJog();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [jogMode, stepSize, speed, continuousSpeed, startContinuousJog, stopContinuousJog]);

  useEffect(() => {
    return () => stopContinuousJog();
  }, [stopContinuousJog]);

  return (
    <div className="card-panel">
      <div className="card-panel-header">
        <h3 className="text-sm font-semibold text-gray-700">Jog Control</h3>
        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
          jogMode === "continuous" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
        }`}>
          {jogMode}
        </span>
      </div>
      <div className="card-panel-body space-y-4">
        <div className="flex rounded-lg bg-gray-100 p-0.5">
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              jogMode === "step" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => { stopContinuousJog(); setJogMode("step"); }}
          >
            Step
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              jogMode === "continuous" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setJogMode("continuous")}
          >
            Continuous
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <div />
          <button className="jog-btn" {...jogButtonEvents("y", 1)}>
            <span className="text-emerald-600">Y+</span>
          </button>
          <div />
          <button className="jog-btn" {...jogButtonEvents("x", -1)}>
            <span className="text-red-600">X-</span>
          </button>
          <button
            className="bg-slate-800 text-white rounded-xl px-3 py-4 text-xs font-bold select-none transition-all hover:bg-slate-700 active:bg-slate-900 shadow-sm"
            onClick={() => robotSocket.home()}
          >
            HOME
          </button>
          <button className="jog-btn" {...jogButtonEvents("x", 1)}>
            <span className="text-red-600">X+</span>
          </button>
          <div />
          <button className="jog-btn" {...jogButtonEvents("y", -1)}>
            <span className="text-emerald-600">Y-</span>
          </button>
          <div />
        </div>

        <div className="flex gap-1.5">
          <button className="jog-btn flex-1" {...jogButtonEvents("z", 1)}>
            <span className="text-blue-600">Z+</span>
          </button>
          <button className="jog-btn flex-1" {...jogButtonEvents("z", -1)}>
            <span className="text-blue-600">Z-</span>
          </button>
        </div>

        {jogMode === "step" ? (
          <>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Step Size (mm)</label>
              <div className="grid grid-cols-3 gap-1">
                {STEP_SIZES.map((size) => (
                  <button
                    key={size}
                    className={`px-2 py-2 text-sm rounded-lg font-medium transition-all ${
                      stepSize === size
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    onClick={() => setStepSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-500">Speed</label>
                <span className="text-xs font-mono text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">{speed} mm/s</span>
              </div>
              <input type="range" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} min={10} max={250} step={10} className="w-full accent-blue-600" />
            </div>
          </>
        ) : (
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Continuous Speed</label>
            <div className="grid grid-cols-2 gap-1">
              {CONTINUOUS_SPEEDS.map(({ label, value }) => (
                <button
                  key={value}
                  className={`px-2 py-2 text-sm rounded-lg font-medium transition-all ${
                    continuousSpeed === value
                      ? "bg-amber-500 text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  onClick={() => setContinuousSpeed(value)}
                >
                  {label}
                  <span className="text-xs opacity-75 ml-1">({value})</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Hold</kbd>
              buttons or arrow keys to move
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
