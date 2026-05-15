"use client";

import { useEffect, useState } from "react";
import { robotSocket } from "@/lib/websocket";

export function VacuumControl() {
  const [vacuumOn, setVacuumOn] = useState(false);

  useEffect(() => {
    return robotSocket.onPosition((pos) => setVacuumOn(pos.vacuum_on));
  }, []);

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-medium">Vacuum Gripper</h3>
      <button
        className={`w-full flex items-center justify-center gap-2 rounded py-2 text-sm font-medium transition-colors ${vacuumOn ? "bg-green-600 text-white" : "border hover:bg-gray-100"}`}
        onClick={() => robotSocket.setVacuum(!vacuumOn)}
      >
        <span className={`w-3 h-3 rounded-full ${vacuumOn ? "bg-green-300" : "bg-gray-400"}`} />
        Vacuum {vacuumOn ? "ON" : "OFF"}
      </button>
      <div className="grid grid-cols-2 gap-2">
        <button className="border rounded py-1.5 text-sm hover:bg-gray-100" onClick={() => { robotSocket.jog("z", -70, 30); setTimeout(() => robotSocket.setVacuum(true), 1500); setTimeout(() => robotSocket.jog("z", 70, 30), 2000); }}>Pick</button>
        <button className="border rounded py-1.5 text-sm hover:bg-gray-100" onClick={() => { robotSocket.jog("z", -70, 30); setTimeout(() => robotSocket.setVacuum(false), 1500); setTimeout(() => robotSocket.jog("z", 70, 30), 2000); }}>Place</button>
      </div>
    </div>
  );
}
