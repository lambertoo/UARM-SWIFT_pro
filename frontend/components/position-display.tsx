"use client";

import { useEffect, useState } from "react";
import { robotSocket } from "@/lib/websocket";
import { ArmPosition } from "@/lib/types";

export function PositionDisplay() {
  const [position, setPosition] = useState<ArmPosition>({ x: 0, y: 0, z: 0, rotation: 0, vacuum_on: false, connected: false });

  useEffect(() => {
    return robotSocket.onPosition(setPosition);
  }, []);

  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-sm font-medium mb-2">Position</h3>
      <div className="grid grid-cols-4 gap-3 text-center">
        {(["x", "y", "z", "rotation"] as const).map((axis) => (
          <div key={axis}>
            <div className="text-xs text-gray-500 uppercase">{axis === "rotation" ? "R" : axis}</div>
            <div className="text-lg font-mono font-bold">{position[axis].toFixed(1)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
