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
  const [learningMode, setLearningMode] = useState(false);
  const [learningRecording, setLearningRecording] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speedOverride, setSpeedOverride] = useState(1.0);
  const [loopCount, setLoopCount] = useState(1);
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState(-1);
  const positionRef = useRef<ArmPosition>({ x: 0, y: 0, z: 0, rotation: 0, vacuum_on: false, connected: false, learning_mode: false });
  const continuousRecordRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const learningRecordRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return robotSocket.onPosition((pos) => {
      positionRef.current = pos;
      setLearningMode(pos.learning_mode);
    });
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

  function toggleLearningMode() {
    const newState = !learningMode;
    robotSocket.setLearningMode(newState);
    if (!newState && learningRecording) {
      stopLearningRecording();
    }
  }

  function startLearningRecording() {
    if (!learningMode) return;
    setLearningRecording(true);
    learningRecordRef.current = setInterval(() => {
      const pos = positionRef.current;
      setWaypoints((prev) => {
        if (prev.length > 0) {
          const last = prev[prev.length - 1];
          const dist = Math.sqrt((pos.x - last.x) ** 2 + (pos.y - last.y) ** 2 + (pos.z - last.z) ** 2);
          if (dist < 2) return prev;
        }
        return [...prev, { x: pos.x, y: pos.y, z: pos.z, speed: 50, vacuum_on: pos.vacuum_on, delay_ms: 0 }];
      });
    }, 100);
  }

  function stopLearningRecording() {
    setLearningRecording(false);
    if (learningRecordRef.current) { clearInterval(learningRecordRef.current); learningRecordRef.current = null; }
  }

  async function handlePlay() {
    if (waypoints.length === 0) return;
    if (learningMode) {
      robotSocket.setLearningMode(false);
    }
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

          <div className={`card-panel overflow-hidden ${learningMode ? "ring-2 ring-amber-400" : ""}`}>
            <div className="card-panel-header">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-700">Learning Mode</h3>
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                </svg>
              </div>
              {learningMode && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Servos Free
                </span>
              )}
            </div>
            <div className="card-panel-body space-y-3">
              <p className="text-xs text-gray-500">
                Unlock the servos so you can move the arm by hand. Record the path as you guide it through positions.
              </p>
              <div className="flex items-center gap-3">
                <button
                  className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                    learningMode
                      ? "bg-amber-500 text-white shadow-md hover:bg-amber-600"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                  }`}
                  onClick={toggleLearningMode}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    {learningMode ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    )}
                  </svg>
                  {learningMode ? "Lock Servos" : "Unlock Servos (Free Move)"}
                </button>
              </div>

              {learningMode && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-3">
                  <p className="text-xs text-amber-800 font-medium">
                    Servos are unlocked. Physically guide the arm to record waypoints.
                  </p>
                  <div className="flex gap-2">
                    <button className="btn-primary flex-1" onClick={recordWaypoint}>
                      Record Current Position
                    </button>
                    {learningRecording ? (
                      <button className="btn-danger flex-1" onClick={stopLearningRecording}>
                        Stop Path Recording
                      </button>
                    ) : (
                      <button className="btn-secondary flex-1" onClick={startLearningRecording}>
                        Record Path (auto)
                      </button>
                    )}
                  </div>
                  {learningRecording && (
                    <div className="flex items-center gap-2 text-xs text-amber-700">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      Recording path — move the arm slowly...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

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
