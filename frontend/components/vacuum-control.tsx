"use client";

import { useEffect, useState } from "react";
import { robotSocket } from "@/lib/websocket";

export function VacuumControl() {
  const [vacuumOn, setVacuumOn] = useState(false);

  useEffect(() => {
    return robotSocket.onPosition((pos) => setVacuumOn(pos.vacuum_on));
  }, []);

  return (
    <div className="card-panel">
      <div className="card-panel-header">
        <h3 className="text-sm font-semibold text-gray-700">Vacuum Gripper</h3>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
          vacuumOn ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
        }`}>
          {vacuumOn ? "Active" : "Off"}
        </span>
      </div>
      <div className="card-panel-body space-y-3">
        <button
          className={`w-full flex items-center justify-center gap-2.5 rounded-lg py-3 text-sm font-semibold transition-all ${
            vacuumOn
              ? "bg-emerald-600 text-white shadow-md hover:bg-emerald-700"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
          }`}
          onClick={() => robotSocket.setVacuum(!vacuumOn)}
        >
          <span className={`w-3 h-3 rounded-full border-2 transition-all ${
            vacuumOn ? "bg-emerald-300 border-emerald-400" : "bg-gray-300 border-gray-400"
          }`} />
          {vacuumOn ? "Vacuum ON" : "Vacuum OFF"}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            className="btn-secondary py-2.5 text-xs"
            onClick={() => { robotSocket.jog("z", -70, 30); setTimeout(() => robotSocket.setVacuum(true), 1500); setTimeout(() => robotSocket.jog("z", 70, 30), 2000); }}
          >
            Pick
          </button>
          <button
            className="btn-secondary py-2.5 text-xs"
            onClick={() => { robotSocket.jog("z", -70, 30); setTimeout(() => robotSocket.setVacuum(false), 1500); setTimeout(() => robotSocket.jog("z", 70, 30), 2000); }}
          >
            Place
          </button>
        </div>
      </div>
    </div>
  );
}
