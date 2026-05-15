"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { SafetyConfig, ExclusionZone } from "@/lib/types";
import { useToast } from "@/components/toast-provider";

const DEFAULT_CONFIG: SafetyConfig = {
  workspace_min_x: -350, workspace_max_x: 350,
  workspace_min_y: -350, workspace_max_y: 350,
  workspace_min_z: 0, workspace_max_z: 150,
  max_speed: 200, loaded_max_speed: 100,
  boundary_slowdown_distance: 10, boundary_slowdown_factor: 0.25,
};

export default function SafetyPage() {
  const [config, setConfig] = useState<SafetyConfig>(DEFAULT_CONFIG);
  const [exclusionZones, setExclusionZones] = useState<ExclusionZone[]>([]);
  const [newZone, setNewZone] = useState({ name: "", min_x: 0, max_x: 0, min_y: 0, max_y: 0, min_z: 0, max_z: 0 });
  const [beginnerMode, setBeginnerMode] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadSafetyConfig();
  }, []);

  async function loadSafetyConfig() {
    try {
      const data = await api.getSafetyConfig();
      setConfig(data.config);
      setExclusionZones(data.exclusion_zones);
    } catch {
      showToast("Could not load safety config — using defaults", "warning");
    }
  }

  async function handleSaveConfig() {
    try {
      const configToSave = beginnerMode
        ? { ...config, max_speed: 100, loaded_max_speed: 50 }
        : config;
      await api.updateSafetyConfig(configToSave);
      showToast("Safety config saved", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Save failed", "error");
    }
  }

  async function handleAddZone() {
    if (!newZone.name.trim()) {
      showToast("Zone name is required", "warning");
      return;
    }
    try {
      await api.addExclusionZone(newZone);
      showToast(`Exclusion zone "${newZone.name}" added`, "success");
      setNewZone({ name: "", min_x: 0, max_x: 0, min_y: 0, max_y: 0, min_z: 0, max_z: 0 });
      loadSafetyConfig();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to add zone", "error");
    }
  }

  async function handleDeleteZone(zoneId: number, zoneName: string) {
    try {
      await api.deleteExclusionZone(zoneId);
      showToast(`Removed "${zoneName}"`, "info");
      loadSafetyConfig();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to delete zone", "error");
    }
  }

  function updateConfig(field: keyof SafetyConfig, value: number) {
    setConfig((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Safety Configuration</h2>
        <p className="text-sm text-gray-500 mt-1">Workspace limits, speed caps, and exclusion zones</p>
      </div>

      <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-5 text-white shadow-lg">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold">Safety settings protect the robot and workspace</p>
            <p className="mt-1 text-sm text-red-100">
              The arm will refuse to move outside workspace bounds and slow down near boundaries. Exclusion zones define areas the arm must never enter.
            </p>
          </div>
        </div>
      </div>

      <div className="card-panel">
        <div className="card-panel-body flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Quick Mode</h3>
            <p className="text-xs text-gray-500 mt-0.5">Caps speed at 50% for safer operation</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={beginnerMode} onChange={(e) => setBeginnerMode(e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
            <span className="ml-3 text-sm font-medium text-gray-700">{beginnerMode ? "On" : "Off"}</span>
          </label>
        </div>
      </div>

      <div className="card-panel">
        <div className="card-panel-header">
          <h3 className="text-sm font-semibold text-gray-700">Workspace Bounds (mm)</h3>
        </div>
        <div className="card-panel-body">
          <p className="text-xs text-gray-500 mb-3">The arm will not move outside these limits.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {([
              ["workspace_min_x", "X Min", "border-l-red-400"], ["workspace_max_x", "X Max", "border-l-red-400"],
              ["workspace_min_y", "Y Min", "border-l-emerald-400"], ["workspace_max_y", "Y Max", "border-l-emerald-400"],
              ["workspace_min_z", "Z Min", "border-l-blue-400"], ["workspace_max_z", "Z Max", "border-l-blue-400"],
            ] as [keyof SafetyConfig, string, string][]).map(([field, label, borderColor]) => (
              <div key={field} className={`border-l-4 ${borderColor} pl-3`}>
                <label className="text-xs font-medium text-gray-500">{label}</label>
                <input type="number" value={config[field]} onChange={(e) => updateConfig(field, parseFloat(e.target.value) || 0)} className="input-field mt-1 font-mono" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card-panel">
        <div className="card-panel-header">
          <h3 className="text-sm font-semibold text-gray-700">Speed Limits</h3>
        </div>
        <div className="card-panel-body">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { field: "max_speed" as keyof SafetyConfig, label: "Max Speed (mm/s)" },
              { field: "loaded_max_speed" as keyof SafetyConfig, label: "Max Speed (loaded)" },
              { field: "boundary_slowdown_distance" as keyof SafetyConfig, label: "Slowdown Distance (mm)" },
              { field: "boundary_slowdown_factor" as keyof SafetyConfig, label: "Slowdown Factor" },
            ].map(({ field, label }) => (
              <div key={field}>
                <label className="text-xs font-medium text-gray-500">{label}</label>
                <input
                  type="number"
                  step={field === "boundary_slowdown_factor" ? 0.05 : 1}
                  value={config[field]}
                  onChange={(e) => updateConfig(field, parseFloat(e.target.value) || 0)}
                  className="input-field mt-1 font-mono"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <button className="btn-primary" onClick={handleSaveConfig}>Save Safety Config</button>

      <div className="card-panel">
        <div className="card-panel-header">
          <h3 className="text-sm font-semibold text-gray-700">Exclusion Zones</h3>
          <span className="text-xs text-gray-400">{exclusionZones.length} zones</span>
        </div>
        <div className="card-panel-body space-y-4">
          <p className="text-xs text-gray-500">Define areas the arm must never enter (e.g., around obstacles, electronics).</p>

          {exclusionZones.length > 0 && (
            <div className="space-y-2">
              {exclusionZones.map((zone) => (
                <div key={zone.id} className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg p-3">
                  <div>
                    <span className="text-sm font-semibold text-gray-800">{zone.name}</span>
                    <span className="text-xs text-gray-500 ml-2 font-mono">
                      X[{zone.min_x}, {zone.max_x}] Y[{zone.min_y}, {zone.max_y}] Z[{zone.min_z}, {zone.max_z}]
                    </span>
                  </div>
                  <button className="btn-ghost text-xs text-red-600 hover:bg-red-100" onClick={() => handleDeleteZone(zone.id, zone.name)}>Remove</button>
                </div>
              ))}
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-100">
            <p className="text-xs font-semibold text-gray-600">Add Exclusion Zone</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="col-span-2 md:col-span-4">
                <label className="text-xs font-medium text-gray-500">Zone Name</label>
                <input type="text" value={newZone.name} onChange={(e) => setNewZone({ ...newZone, name: e.target.value })} placeholder="e.g., Power supply area" className="input-field mt-1" />
              </div>
              {([
                ["min_x", "X Min"], ["max_x", "X Max"],
                ["min_y", "Y Min"], ["max_y", "Y Max"],
                ["min_z", "Z Min"], ["max_z", "Z Max"],
              ] as [keyof typeof newZone, string][]).filter(([k]) => k !== "name").map(([field, label]) => (
                <div key={field}>
                  <label className="text-xs font-medium text-gray-500">{label}</label>
                  <input type="number" value={newZone[field] as number} onChange={(e) => setNewZone({ ...newZone, [field]: parseFloat(e.target.value) || 0 })} className="input-field mt-1 font-mono" />
                </div>
              ))}
            </div>
            <button className="btn-danger" onClick={handleAddZone}>Add Exclusion Zone</button>
          </div>
        </div>
      </div>
    </div>
  );
}
