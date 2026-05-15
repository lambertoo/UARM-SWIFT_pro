"use client";

import { useEffect, useState } from "react";
import { robotSocket } from "@/lib/websocket";

const STEP_SIZES = [0.5, 1, 5, 10];

export function JogPanel() {
  const [stepSize, setStepSize] = useState(5);
  const [speed, setSpeed] = useState(50);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement) return;
      switch (event.key) {
        case "ArrowRight": robotSocket.jog("x", stepSize, speed); break;
        case "ArrowLeft": robotSocket.jog("x", -stepSize, speed); break;
        case "ArrowUp": robotSocket.jog("y", stepSize, speed); break;
        case "ArrowDown": robotSocket.jog("y", -stepSize, speed); break;
        case "PageUp": robotSocket.jog("z", stepSize, speed); break;
        case "PageDown": robotSocket.jog("z", -stepSize, speed); break;
        case " ":
          event.preventDefault();
          robotSocket.setVacuum(true);
          break;
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [stepSize, speed]);

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-medium">Jog Control</h3>
      <div className="grid grid-cols-3 gap-2">
        <div />
        <button className="border rounded px-3 py-2 hover:bg-gray-100 text-sm" onClick={() => robotSocket.jog("y", stepSize, speed)}>Y+</button>
        <div />
        <button className="border rounded px-3 py-2 hover:bg-gray-100 text-sm" onClick={() => robotSocket.jog("x", -stepSize, speed)}>X-</button>
        <button className="border rounded px-3 py-2 hover:bg-blue-50 text-sm font-medium" onClick={() => robotSocket.home()}>Home</button>
        <button className="border rounded px-3 py-2 hover:bg-gray-100 text-sm" onClick={() => robotSocket.jog("x", stepSize, speed)}>X+</button>
        <div />
        <button className="border rounded px-3 py-2 hover:bg-gray-100 text-sm" onClick={() => robotSocket.jog("y", -stepSize, speed)}>Y-</button>
        <div />
      </div>
      <div className="flex gap-2 justify-center">
        <button className="border rounded px-3 py-2 hover:bg-gray-100 text-sm" onClick={() => robotSocket.jog("z", stepSize, speed)}>Z+</button>
        <button className="border rounded px-3 py-2 hover:bg-gray-100 text-sm" onClick={() => robotSocket.jog("z", -stepSize, speed)}>Z-</button>
      </div>
      <div>
        <label className="text-xs text-gray-500">Step Size (mm)</label>
        <div className="flex gap-1 mt-1">
          {STEP_SIZES.map((size) => (
            <button key={size} className={`px-3 py-1 text-sm rounded ${stepSize === size ? "bg-blue-600 text-white" : "border hover:bg-gray-100"}`} onClick={() => setStepSize(size)}>{size}</button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500">Speed: {speed}</label>
        <input type="range" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} min={10} max={250} step={10} className="w-full mt-1" />
      </div>
    </div>
  );
}
