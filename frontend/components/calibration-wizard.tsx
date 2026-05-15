"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { robotSocket } from "@/lib/websocket";
import { ArmPosition, SerialPort, CalibrationProfileCreate } from "@/lib/types";

const STEPS = ["Connection", "Home", "Boundaries", "Vacuum", "Offsets", "Save"];

export function CalibrationWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [serialPorts, setSerialPorts] = useState<SerialPort[]>([]);
  const [selectedPort, setSelectedPort] = useState("");
  const [connected, setConnected] = useState(false);
  const [profileName, setProfileName] = useState("Default Setup");
  const [boundaryCorners, setBoundaryCorners] = useState<ArmPosition[]>([]);
  const [vacuumVerified, setVacuumVerified] = useState(false);
  const [offsets, setOffsets] = useState({ x: 0, y: 0, z: 0 });
  const positionRef = useRef<ArmPosition>({ x: 0, y: 0, z: 0, rotation: 0, vacuum_on: false, connected: false });

  useEffect(() => {
    api.listSerialPorts().then(setSerialPorts).catch(() => {});
    return robotSocket.onPosition((pos) => { positionRef.current = pos; });
  }, []);

  async function handleConnect() {
    try { await api.connectSerial(selectedPort); setConnected(true); }
    catch (error) { alert(error instanceof Error ? error.message : "Connection failed"); }
  }

  async function handleSaveProfile() {
    const xs = boundaryCorners.map((c) => c.x);
    const ys = boundaryCorners.map((c) => c.y);
    const zs = boundaryCorners.map((c) => c.z);
    const profile: CalibrationProfileCreate = {
      profile_name: profileName, serial_port_path: selectedPort,
      home_offset_x: offsets.x, home_offset_y: offsets.y, home_offset_z: offsets.z,
      workspace_min_x: xs.length ? Math.min(...xs) : -300, workspace_max_x: xs.length ? Math.max(...xs) : 300,
      workspace_min_y: ys.length ? Math.min(...ys) : -300, workspace_max_y: ys.length ? Math.max(...ys) : 300,
      workspace_min_z: zs.length ? Math.min(...zs) : 0, workspace_max_z: zs.length ? Math.max(...zs) : 150,
      vacuum_verified: vacuumVerified,
    };
    await api.createProfile(profile);
    alert("Calibration profile saved!");
  }

  const stepContent = [
    <div key={0} className="space-y-4">
      <p className="text-sm text-gray-500">Select and connect to your uARM Swift Pro.</p>
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-sm">Serial Port</label>
          <select value={selectedPort} onChange={(e) => setSelectedPort(e.target.value)} className="w-full border rounded px-3 py-2 text-sm mt-1">
            <option value="">Select port</option>
            {serialPorts.map((p) => <option key={p.device} value={p.device}>{p.device} — {p.description}</option>)}
          </select>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50" onClick={handleConnect} disabled={!selectedPort}>Connect</button>
      </div>
      {connected && <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Connected</span>}
    </div>,
    <div key={1} className="space-y-4">
      <p className="text-sm text-gray-500">Send the arm to home. Verify it reached home visually.</p>
      <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm" onClick={() => robotSocket.home()}>Send Home</button>
    </div>,
    <div key={2} className="space-y-4">
      <p className="text-sm text-gray-500">Jog to each corner of your workspace and record. At least 4 corners.</p>
      <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm" onClick={() => setBoundaryCorners((prev) => [...prev, { ...positionRef.current }])}>Record Corner ({boundaryCorners.length}/4)</button>
      {boundaryCorners.map((c, i) => <p key={i} className="text-xs font-mono">Corner {i + 1}: ({c.x.toFixed(1)}, {c.y.toFixed(1)}, {c.z.toFixed(1)})</p>)}
    </div>,
    <div key={3} className="space-y-4">
      <p className="text-sm text-gray-500">Test vacuum. Pick up a test object, then release.</p>
      <div className="flex gap-2">
        <button className="bg-green-600 text-white px-4 py-2 rounded text-sm" onClick={() => robotSocket.setVacuum(true)}>Vacuum ON</button>
        <button className="border px-4 py-2 rounded text-sm" onClick={() => robotSocket.setVacuum(false)}>Vacuum OFF</button>
      </div>
      <button className={`px-4 py-2 rounded text-sm ${vacuumVerified ? "bg-green-600 text-white" : "border"}`} onClick={() => setVacuumVerified(true)}>{vacuumVerified ? "Verified ✓" : "Confirm Working"}</button>
    </div>,
    <div key={4} className="space-y-4">
      <p className="text-sm text-gray-500">If position is off, enter correction offsets (mm).</p>
      <div className="grid grid-cols-3 gap-2">
        {(["x", "y", "z"] as const).map((axis) => (
          <div key={axis}>
            <label className="text-xs text-gray-500">{axis.toUpperCase()} Offset</label>
            <input type="number" value={offsets[axis]} onChange={(e) => setOffsets({ ...offsets, [axis]: parseFloat(e.target.value) || 0 })} className="w-full border rounded px-2 py-1 text-sm" />
          </div>
        ))}
      </div>
    </div>,
    <div key={5} className="space-y-4">
      <p className="text-sm text-gray-500">Name and save your calibration profile.</p>
      <div>
        <label className="text-sm">Profile Name</label>
        <input value={profileName} onChange={(e) => setProfileName(e.target.value)} className="w-full border rounded px-3 py-2 text-sm mt-1" />
      </div>
      <button className="bg-blue-600 text-white px-6 py-2 rounded text-sm" onClick={handleSaveProfile}>Save Profile</button>
    </div>,
  ];

  return (
    <div className="border rounded-lg p-6 space-y-6">
      <div>
        <h3 className="font-medium text-lg">Calibration Wizard</h3>
        <div className="flex gap-2 mt-3">
          {STEPS.map((step, i) => (
            <button key={step} className={`text-xs px-3 py-1 rounded-full ${i === currentStep ? "bg-blue-600 text-white" : i < currentStep ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-500"}`} onClick={() => setCurrentStep(i)}>{i + 1}. {step}</button>
          ))}
        </div>
      </div>
      {stepContent[currentStep]}
      <div className="flex justify-between pt-4 border-t">
        <button className="border px-4 py-2 rounded text-sm disabled:opacity-30" onClick={() => setCurrentStep((s) => s - 1)} disabled={currentStep === 0}>Previous</button>
        <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-30" onClick={() => setCurrentStep((s) => s + 1)} disabled={currentStep === STEPS.length - 1}>Next</button>
      </div>
    </div>
  );
}
