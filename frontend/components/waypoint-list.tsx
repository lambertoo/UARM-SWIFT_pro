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
    <div className="border rounded-lg p-4">
      <h3 className="text-sm font-medium mb-2">Waypoints ({waypoints.length})</h3>
      {waypoints.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No waypoints recorded</p>
      ) : (
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {waypoints.map((wp, index) => (
            <div key={index} className={`flex items-center gap-2 p-2 rounded text-sm ${index === currentIndex ? "bg-blue-50 border border-blue-300" : "bg-gray-50"}`}>
              <span className="font-mono w-6 text-gray-400">{index + 1}</span>
              <span className="font-mono flex-1 text-xs">({wp.x.toFixed(1)}, {wp.y.toFixed(1)}, {wp.z.toFixed(1)})</span>
              <span className={`w-2.5 h-2.5 rounded-full ${wp.vacuum_on ? "bg-green-400" : "bg-gray-300"}`} />
              <input type="number" value={wp.delay_ms} onChange={(e) => handleUpdateDelay(index, parseInt(e.target.value) || 0)} className="w-16 border rounded px-1 py-0.5 text-xs" placeholder="ms" />
              <button className="text-gray-400 hover:text-gray-600 text-xs" onClick={() => handleMoveUp(index)}>&#8593;</button>
              <button className="text-gray-400 hover:text-gray-600 text-xs" onClick={() => handleMoveDown(index)}>&#8595;</button>
              <button className="text-red-400 hover:text-red-600 text-xs" onClick={() => handleDelete(index)}>&#10005;</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
