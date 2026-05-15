"use client";

import { useEffect, useState } from "react";
import { robotSocket } from "@/lib/websocket";
import { ArmPosition } from "@/lib/types";

const AXIS_CONFIG = [
  { key: "x" as const, label: "X", color: "text-red-500", bg: "bg-red-500/10" },
  { key: "y" as const, label: "Y", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { key: "z" as const, label: "Z", color: "text-blue-500", bg: "bg-blue-500/10" },
  { key: "rotation" as const, label: "R", color: "text-amber-500", bg: "bg-amber-500/10" },
];

export function PositionDisplay() {
  const [position, setPosition] = useState<ArmPosition>({ x: 0, y: 0, z: 0, rotation: 0, vacuum_on: false, connected: false });

  useEffect(() => {
    return robotSocket.onPosition(setPosition);
  }, []);

  return (
    <div className="card-panel">
      <div className="card-panel-header">
        <h3 className="text-sm font-semibold text-gray-700">Live Position</h3>
        <div className={`w-2 h-2 rounded-full ${position.connected ? "bg-emerald-500 animate-status-pulse" : "bg-gray-300"}`} />
      </div>
      <div className="card-panel-body">
        <div className="grid grid-cols-4 gap-2">
          {AXIS_CONFIG.map(({ key, label, color, bg }) => (
            <div key={key} className={`${bg} rounded-lg p-2.5 text-center`}>
              <div className={`text-[10px] font-bold uppercase tracking-widest ${color}`}>{label}</div>
              <div className="digital-readout text-gray-900 mt-0.5">{(Number(position[key]) || 0).toFixed(1)}</div>
              <div className="text-[9px] text-gray-400 mt-0.5">mm</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
