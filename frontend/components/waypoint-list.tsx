"use client";

import { Waypoint } from "@/lib/types";

interface WaypointListProps {
  waypoints: Waypoint[];
  onUpdate: (waypoints: Waypoint[]) => void;
  currentIndex?: number;
}

export function WaypointList({ waypoints, onUpdate, currentIndex = -1 }: WaypointListProps) {
  function handleDelete(index: number) {
    onUpdate(waypoints.filter((_, i) => i !== index));
  }

  function handleMoveUp(index: number) {
    if (index === 0) return;
    const updated = [...waypoints];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onUpdate(updated);
  }

  function handleMoveDown(index: number) {
    if (index === waypoints.length - 1) return;
    const updated = [...waypoints];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onUpdate(updated);
  }

  function handleUpdateDelay(index: number, delay_ms: number) {
    const updated = [...waypoints];
    updated[index] = { ...updated[index], delay_ms };
    onUpdate(updated);
  }

  return (
    <div className="card-panel">
      <div className="card-panel-header">
        <h3 className="text-sm font-semibold text-gray-700">Waypoints</h3>
        <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{waypoints.length}</span>
      </div>
      <div className="card-panel-body">
        {waypoints.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No waypoints recorded</p>
        ) : (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {waypoints.map((wp, index) => (
              <div key={index} className={`flex items-center gap-2 p-2 rounded-lg text-sm transition-colors ${
                index === currentIndex ? "bg-blue-50 ring-1 ring-blue-300" : "bg-gray-50 hover:bg-gray-100"
              }`}>
                <span className="font-mono w-6 text-xs text-gray-400 text-center">{index + 1}</span>
                <span className="font-mono flex-1 text-xs text-gray-700">({wp.x.toFixed(1)}, {wp.y.toFixed(1)}, {wp.z.toFixed(1)})</span>
                <span className={`w-2 h-2 rounded-full ${wp.vacuum_on ? "bg-emerald-400" : "bg-gray-300"}`} />
                <input type="number" value={wp.delay_ms} onChange={(e) => handleUpdateDelay(index, parseInt(e.target.value) || 0)} className="w-14 border border-gray-200 rounded-md px-1.5 py-0.5 text-xs font-mono text-center" placeholder="ms" />
                <button className="text-gray-300 hover:text-gray-600 transition-colors" onClick={() => handleMoveUp(index)}>&#8593;</button>
                <button className="text-gray-300 hover:text-gray-600 transition-colors" onClick={() => handleMoveDown(index)}>&#8595;</button>
                <button className="text-gray-300 hover:text-red-500 transition-colors" onClick={() => handleDelete(index)}>&#10005;</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
