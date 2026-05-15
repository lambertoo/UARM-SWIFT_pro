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
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Teach & Replay</h2>
        <p className="text-sm text-gray-500 mt-1">Record waypoints and play them back in sequence</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Robot3DView waypoints={waypoints} />

          <div className="card-panel">
            <div className="card-panel-header">
              <h3 className="text-sm font-semibold text-gray-700">Teach Controls</h3>
              {recording && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  Recording
                </span>
              )}
            </div>
            <div className="card-panel-body space-y-4">
              <div className="flex gap-2 flex-wrap">
                <button className="btn-primary" onClick={recordWaypoint}>
                  Record Waypoint
                </button>
                {recording ? (
                  <button className="btn-danger" onClick={stopContinuousRecording}>Stop Recording</button>
                ) : (
                  <button className="btn-secondary" onClick={startContinuousRecording}>Record Continuous</button>
                )}
                <button className="btn-ghost" onClick={() => setWaypoints([])}>Clear All</button>
              </div>

              <div className="flex gap-6 items-end flex-wrap">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Speed Override</label>
                  <div className="flex gap-1">
                    {[0.25, 0.5, 1.0, 1.5].map((s) => (
                      <button key={s} className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
                        speedOverride === s ? "bg-blue-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`} onClick={() => setSpeedOverride(s)}>{s * 100}%</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Loops</label>
                  <div className="flex gap-1">
                    {[1, 3, 5, 0].map((c) => (
                      <button key={c} className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
                        loopCount === c ? "bg-blue-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`} onClick={() => setLoopCount(c)}>{c === 0 ? "∞" : c}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t">
                {playing ? (
                  <button className="btn-danger" onClick={handleStop}>Stop</button>
                ) : (
                  <button className="btn-success" onClick={handlePlay} disabled={waypoints.length === 0}>
                    Play Sequence ({waypoints.length} pts)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-5">
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
