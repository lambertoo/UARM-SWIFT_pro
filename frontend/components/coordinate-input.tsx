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
    <div className="border rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-medium">Go To Position</h3>
      <div className="grid grid-cols-4 gap-2">
        {[{ label: "X", value: x, set: setX }, { label: "Y", value: y, set: setY }, { label: "Z", value: z, set: setZ }, { label: "Speed", value: speed, set: setSpeed }].map(({ label, value, set }) => (
          <div key={label}>
            <label className="text-xs text-gray-500">{label}</label>
            <input type="number" value={value} onChange={(e) => set(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" />
          </div>
        ))}
      </div>
      <button className="w-full bg-blue-600 text-white rounded py-2 text-sm font-medium hover:bg-blue-700" onClick={handleGo}>Go</button>
    </div>
  );
}
