"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { robotSocket } from "@/lib/websocket";
import { ArmPosition, CalibrationProfileCreate } from "@/lib/types";

const STEPS = ["Home", "Point A", "Point B", "Point C", "Results", "Save"];

const CALIBRATION_POINTS: Record<string, { label: string; description: string }> = {
  A: { label: "Point A", description: "Move the nozzle tip to the center of the A marker on the calibration paper." },
  B: { label: "Point B", description: "Move the nozzle tip to the center of the B marker on the calibration paper." },
  C: { label: "Point C", description: "Move the nozzle tip to the center of the C marker on the calibration paper." },
};

interface RecordedPoint {
  x: number;
  y: number;
  z: number;
  recorded: boolean;
}

export function CalibrationWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [profileName, setProfileName] = useState("Default Setup");
  const [pointA, setPointA] = useState<RecordedPoint>({ x: 0, y: 0, z: 0, recorded: false });
  const [pointB, setPointB] = useState<RecordedPoint>({ x: 0, y: 0, z: 0, recorded: false });
  const [pointC, setPointC] = useState<RecordedPoint>({ x: 0, y: 0, z: 0, recorded: false });
  const [livePosition, setLivePosition] = useState<ArmPosition>({ x: 0, y: 0, z: 0, rotation: 0, vacuum_on: false, connected: false });
  const positionRef = useRef<ArmPosition>({ x: 0, y: 0, z: 0, rotation: 0, vacuum_on: false, connected: false });

  useEffect(() => {
    return robotSocket.onPosition((pos) => {
      positionRef.current = pos;
      setLivePosition(pos);
    });
  }, []);

  function recordPoint(setter: (p: RecordedPoint) => void) {
    const pos = positionRef.current;
    setter({ x: pos.x, y: pos.y, z: pos.z, recorded: true });
  }

  function computeOffsets() {
    if (!pointA.recorded || !pointB.recorded || !pointC.recorded) return null;
    const avgX = (pointA.x + pointB.x + pointC.x) / 3;
    const avgY = (pointA.y + pointB.y + pointC.y) / 3;
    const avgZ = (pointA.z + pointB.z + pointC.z) / 3;

    const distAB = Math.sqrt((pointB.x - pointA.x) ** 2 + (pointB.y - pointA.y) ** 2);
    const distBC = Math.sqrt((pointC.x - pointB.x) ** 2 + (pointC.y - pointB.y) ** 2);
    const distAC = Math.sqrt((pointC.x - pointA.x) ** 2 + (pointC.y - pointA.y) ** 2);

    const allX = [pointA.x, pointB.x, pointC.x];
    const allY = [pointA.y, pointB.y, pointC.y];
    const allZ = [pointA.z, pointB.z, pointC.z];

    return {
      center: { x: avgX, y: avgY, z: avgZ },
      distances: { AB: distAB, BC: distBC, AC: distAC },
      workspace: {
        minX: Math.min(...allX) - 50, maxX: Math.max(...allX) + 50,
        minY: Math.min(...allY) - 50, maxY: Math.max(...allY) + 50,
        minZ: Math.min(...allZ), maxZ: Math.max(...allZ) + 100,
      },
    };
  }

  async function handleSaveProfile() {
    const offsets = computeOffsets();
    if (!offsets) return;
    const profile: CalibrationProfileCreate = {
      profile_name: profileName,
      serial_port_path: "",
      home_offset_x: 0,
      home_offset_y: 0,
      home_offset_z: 0,
      workspace_min_x: offsets.workspace.minX,
      workspace_max_x: offsets.workspace.maxX,
      workspace_min_y: offsets.workspace.minY,
      workspace_max_y: offsets.workspace.maxY,
      workspace_min_z: offsets.workspace.minZ,
      workspace_max_z: offsets.workspace.maxZ,
      vacuum_verified: false,
    };
    await api.createProfile(profile);
    alert("Calibration profile saved!");
  }

  function PointRecordStep({ label, description, point, setPoint }: {
    label: string; description: string; point: RecordedPoint; setPoint: (p: RecordedPoint) => void;
  }) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">{description}</p>
        <p className="text-xs text-gray-400">Use the jog panel on the right to move the arm precisely. Lower the nozzle until it touches the marker center.</p>

        <div className="bg-slate-900 rounded-lg p-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Live Position</p>
          <div className="grid grid-cols-3 gap-4 font-mono">
            {[
              { axis: "X", value: livePosition.x, color: "text-red-400" },
              { axis: "Y", value: livePosition.y, color: "text-emerald-400" },
              { axis: "Z", value: livePosition.z, color: "text-blue-400" },
            ].map(({ axis, value, color }) => (
              <div key={axis} className="text-center">
                <span className={`text-xs ${color}`}>{axis}</span>
                <div className={`text-xl font-bold ${color}`}>{value.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>

        <button
          className={`w-full py-3 rounded-lg text-sm font-semibold transition-all ${
            point.recorded
              ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md"
              : "btn-primary"
          }`}
          onClick={() => recordPoint(setPoint)}
        >
          {point.recorded ? `${label} Recorded — Click to Re-record` : `Record ${label}`}
        </button>

        {point.recorded && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-emerald-700">Recorded {label}:</p>
            <p className="font-mono text-sm text-emerald-800 mt-1">
              X: {point.x.toFixed(2)}  Y: {point.y.toFixed(2)}  Z: {point.z.toFixed(2)}
            </p>
          </div>
        )}
      </div>
    );
  }

  const offsets = computeOffsets();

  const stepContent = [
    <div key={0} className="space-y-4">
      <p className="text-sm text-gray-600">Send the arm to home position, then place the calibration paper on the workspace.</p>
      <button className="btn-primary py-3 px-8" onClick={() => robotSocket.home()}>
        Send Home
      </button>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        <p className="font-semibold">Before continuing:</p>
        <ol className="list-decimal ml-4 mt-2 space-y-1.5 text-amber-700">
          <li>Place the calibration paper flat on the workspace</li>
          <li>Align it centered under the arm</li>
          <li>Make sure the A, B, C markers are clearly visible</li>
        </ol>
      </div>
    </div>,

    <PointRecordStep key={1} label="Point A" description={CALIBRATION_POINTS.A.description} point={pointA} setPoint={setPointA} />,
    <PointRecordStep key={2} label="Point B" description={CALIBRATION_POINTS.B.description} point={pointB} setPoint={setPointB} />,
    <PointRecordStep key={3} label="Point C" description={CALIBRATION_POINTS.C.description} point={pointC} setPoint={setPointC} />,

    <div key={4} className="space-y-4">
      <p className="text-sm text-gray-600">Calibration results from the 3-point measurement.</p>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "A", point: pointA },
          { label: "B", point: pointB },
          { label: "C", point: pointC },
        ].map(({ label, point }) => (
          <div key={label} className={`rounded-lg p-3 text-center ${
            point.recorded
              ? "bg-emerald-50 border border-emerald-200"
              : "bg-red-50 border border-red-200"
          }`}>
            <p className="text-xs font-bold text-gray-500">{label}</p>
            {point.recorded ? (
              <p className="font-mono text-xs mt-1 text-gray-700">({point.x.toFixed(1)}, {point.y.toFixed(1)}, {point.z.toFixed(1)})</p>
            ) : (
              <p className="text-xs text-red-500 mt-1 font-medium">Not recorded</p>
            )}
          </div>
        ))}
      </div>

      {offsets && (
        <>
          <div className="card-panel">
            <div className="card-panel-body space-y-2">
              <p className="text-sm font-semibold text-gray-700">Distances Between Points</p>
              <div className="grid grid-cols-3 gap-3 font-mono text-sm">
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <span className="text-xs text-gray-500">A→B</span>
                  <div className="font-bold">{offsets.distances.AB.toFixed(1)} mm</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <span className="text-xs text-gray-500">B→C</span>
                  <div className="font-bold">{offsets.distances.BC.toFixed(1)} mm</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <span className="text-xs text-gray-500">A→C</span>
                  <div className="font-bold">{offsets.distances.AC.toFixed(1)} mm</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card-panel">
            <div className="card-panel-body space-y-2">
              <p className="text-sm font-semibold text-gray-700">Computed Workspace Bounds</p>
              <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                <div className="bg-red-50/50 rounded-lg p-2">X: [{offsets.workspace.minX.toFixed(0)}, {offsets.workspace.maxX.toFixed(0)}]</div>
                <div className="bg-emerald-50/50 rounded-lg p-2">Y: [{offsets.workspace.minY.toFixed(0)}, {offsets.workspace.maxY.toFixed(0)}]</div>
                <div className="bg-blue-50/50 rounded-lg p-2">Z: [{offsets.workspace.minZ.toFixed(0)}, {offsets.workspace.maxZ.toFixed(0)}]</div>
                <div className="bg-gray-50 rounded-lg p-2">Center: ({offsets.center.x.toFixed(1)}, {offsets.center.y.toFixed(1)})</div>
              </div>
            </div>
          </div>
        </>
      )}

      {!offsets && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 font-medium">
          All three points must be recorded. Go back and complete missing points.
        </div>
      )}
    </div>,

    <div key={5} className="space-y-4">
      <p className="text-sm text-gray-600">Name and save your calibration profile.</p>
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1.5 block">Profile Name</label>
        <input value={profileName} onChange={(e) => setProfileName(e.target.value)} className="input-field" />
      </div>
      <button className="btn-primary w-full py-3" onClick={handleSaveProfile} disabled={!offsets}>Save Profile</button>
    </div>,
  ];

  return (
    <div className="card-panel">
      <div className="px-6 py-4 border-b">
        <h3 className="font-semibold text-lg text-gray-900">Calibration Wizard</h3>
        <p className="text-xs text-gray-500 mt-0.5">3-Point (A, B, C) Calibration</p>

        <div className="flex items-center gap-1 mt-4">
          {STEPS.map((step, i) => (
            <button
              key={step}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                i === currentStep
                  ? "bg-blue-600 text-white shadow-sm"
                  : i < currentStep
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-100 text-gray-400"
              }`}
              onClick={() => setCurrentStep(i)}
            >
              <span className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                i < currentStep ? "bg-emerald-500 text-white" : i === currentStep ? "bg-white/25" : "bg-gray-300 text-white"
              }`}>
                {i < currentStep ? "✓" : i + 1}
              </span>
              {step}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {stepContent[currentStep]}
      </div>

      <div className="flex justify-between px-6 py-4 border-t bg-gray-50/50">
        <button className="btn-secondary" onClick={() => setCurrentStep((s) => s - 1)} disabled={currentStep === 0}>Previous</button>
        <button className="btn-primary" onClick={() => setCurrentStep((s) => s + 1)} disabled={currentStep === STEPS.length - 1}>Next</button>
      </div>
    </div>
  );
}
