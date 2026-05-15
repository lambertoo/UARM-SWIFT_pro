"use client";

import { useState } from "react";
import { robotSocket } from "@/lib/websocket";

export function CoordinateInput() {
  const [x, setX] = useState("0");
  const [y, setY] = useState("0");
  const [z, setZ] = useState("80");
  const [speed, setSpeed] = useState("100");

  function handleGo() {
    robotSocket.moveTo(parseFloat(x) || 0, parseFloat(y) || 0, parseFloat(z) || 0, parseFloat(speed) || 100);
  }

  return (
    <div className="card-panel">
      <div className="card-panel-header">
        <h3 className="text-sm font-semibold text-gray-700">Go To Position</h3>
      </div>
      <div className="card-panel-body space-y-3">
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "X", value: x, set: setX, color: "text-red-500" },
            { label: "Y", value: y, set: setY, color: "text-emerald-500" },
            { label: "Z", value: z, set: setZ, color: "text-blue-500" },
            { label: "F", value: speed, set: setSpeed, color: "text-gray-500" },
          ].map(({ label, value, set, color }) => (
            <div key={label}>
              <label className={`text-xs font-bold ${color}`}>{label}</label>
              <input type="number" value={value} onChange={(e) => set(e.target.value)} className="input-field mt-1 font-mono text-center" />
            </div>
          ))}
        </div>
        <button className="btn-primary w-full" onClick={handleGo}>Move To</button>
      </div>
    </div>
  );
}
