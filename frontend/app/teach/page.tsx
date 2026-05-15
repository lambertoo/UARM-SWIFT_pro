"use client";

import { useEffect, useRef, useState } from "react";
import { PositionDisplay } from "@/components/position-display";
import { JogPanel } from "@/components/jog-panel";
import { VacuumControl } from "@/components/vacuum-control";
import { Robot3DView } from "@/components/robot-3d-view";
import { WaypointList } from "@/components/waypoint-list";
import { SequenceManager } from "@/components/sequence-manager";
import { robotSocket } from "@/lib/websocket";
import { api } from "@/lib/api";
import { ArmPosition, Waypoint } from "@/lib/types";

export default function TeachPage() {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [recording, setRecording] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speedOverride, setSpeedOverride] = useState(1.0);
  const [loopCount, setLoopCount] = useState(1);
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState(-1);
  const positionRef = useRef<ArmPosition>({ x: 0, y: 0, z: 0, rotation: 0, vacuum_on: false, connected: false });
  const continuousRecordRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return robotSocket.onPosition((pos) => { positionRef.current = pos; });
  }, []);

  function recordWaypoint() {
    const pos = positionRef.current;
    setWaypoints((prev) => [...prev, { x: pos.x, y: pos.y, z: pos.z, speed: 50, vacuum_on: pos.vacuum_on, delay_ms: 0 }]);
  }

  function startContinuousRecording() {
    setRecording(true);
    continuousRecordRef.current = setInterval(() => {
      const pos = positionRef.current;
      setWaypoints((prev) => [...prev, { x: pos.x, y: pos.y, z: pos.z, speed: 50, vacuum_on: pos.vacuum_on, delay_ms: 0 }]);
    }, 200);
  }

  function stopContinuousRecording() {
    setRecording(false);
    if (continuousRecordRef.current) { clearInterval(continuousRecordRef.current); continuousRecordRef.current = null; }
  }

  async function handlePlay() {
    if (waypoints.length === 0) return;
    setPlaying(true);
    try {
      const created = await api.createSequence({ name: `_temp_${Date.now()}` });
      await api.updateSequence(created.id, { waypoints });
      await api.runSequence(created.id, speedOverride, loopCount);
    } catch (error) { alert(error instanceof Error ? error.message : "Play failed"); }
  }

  async function handleStop() {
    await api.stopSequence();
    setPlaying(false);
    setCurrentWaypointIndex(-1);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Teach & Replay</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Robot3DView waypoints={waypoints} />
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-medium">Teach Controls</h3>
            <div className="flex gap-2 flex-wrap">
              <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm" onClick={recordWaypoint}>Record Waypoint</button>
              {recording ? (
                <button className="bg-red-600 text-white px-4 py-2 rounded text-sm" onClick={stopContinuousRecording}>Stop Recording</button>
              ) : (
                <button className="border px-4 py-2 rounded text-sm hover:bg-gray-100" onClick={startContinuousRecording}>Record Continuous</button>
              )}
              <button className="border px-4 py-2 rounded text-sm hover:bg-gray-100" onClick={() => setWaypoints([])}>Clear All</button>
            </div>
            <div className="flex gap-4 items-end flex-wrap">
              <div>
                <label className="text-xs text-gray-500">Speed Override</label>
                <div className="flex gap-1 mt-1">
                  {[0.25, 0.5, 1.0, 1.5].map((s) => (
                    <button key={s} className={`px-3 py-1 text-sm rounded ${speedOverride === s ? "bg-blue-600 text-white" : "border"}`} onClick={() => setSpeedOverride(s)}>{s * 100}%</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Loops</label>
                <div className="flex gap-1 mt-1">
                  {[1, 3, 5, 0].map((c) => (
                    <button key={c} className={`px-3 py-1 text-sm rounded ${loopCount === c ? "bg-blue-600 text-white" : "border"}`} onClick={() => setLoopCount(c)}>{c === 0 ? "∞" : c}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {playing ? (
                <button className="bg-red-600 text-white px-6 py-2 rounded text-sm" onClick={handleStop}>Stop</button>
              ) : (
                <button className="bg-green-600 text-white px-6 py-2 rounded text-sm disabled:opacity-50" onClick={handlePlay} disabled={waypoints.length === 0}>Play</button>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <PositionDisplay />
          <JogPanel />
          <VacuumControl />
          <WaypointList waypoints={waypoints} onUpdate={setWaypoints} currentIndex={currentWaypointIndex} />
          <SequenceManager onLoad={setWaypoints} currentWaypoints={waypoints} />
        </div>
      </div>
    </div>
  );
}
