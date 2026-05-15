"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { Sequence, Waypoint } from "@/lib/types";

interface SequenceManagerProps {
  onLoad: (waypoints: Waypoint[]) => void;
  currentWaypoints: Waypoint[];
}

export function SequenceManager({ onLoad, currentWaypoints }: SequenceManagerProps) {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [saveName, setSaveName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { refreshSequences(); }, []);

  async function refreshSequences() {
    try { setSequences(await api.listSequences()); } catch { setSequences([]); }
  }

  async function handleSave() {
    if (!saveName.trim()) return;
    try {
      const created = await api.createSequence({ name: saveName });
      await api.updateSequence(created.id, { waypoints: currentWaypoints });
      setSaveName("");
      await refreshSequences();
    } catch (error) { alert(error instanceof Error ? error.message : "Save failed"); }
  }

  async function handleLoad(sequenceId: number) {
    try {
      const sequence = await api.getSequence(sequenceId);
      if (sequence.waypoints) onLoad(sequence.waypoints);
    } catch (error) { alert(error instanceof Error ? error.message : "Load failed"); }
  }

  async function handleDelete(sequenceId: number) {
    await api.deleteSequence(sequenceId);
    await refreshSequences();
  }

  async function handleExport(sequenceId: number) {
    const data = await api.exportSequence(sequenceId);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${data.name}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const data = JSON.parse(await file.text());
    await api.importSequence(data);
    await refreshSequences();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="card-panel">
      <div className="card-panel-header">
        <h3 className="text-sm font-semibold text-gray-700">Sequences</h3>
        <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{sequences.length}</span>
      </div>
      <div className="card-panel-body space-y-3">
        <div className="flex gap-2">
          <input placeholder="Sequence name" value={saveName} onChange={(e) => setSaveName(e.target.value)} className="input-field flex-1 text-sm" />
          <button className="btn-primary text-xs" onClick={handleSave} disabled={!saveName.trim() || currentWaypoints.length === 0}>Save</button>
        </div>

        <div className="space-y-1 max-h-48 overflow-y-auto">
          {sequences.length === 0 && <p className="text-xs text-gray-400 text-center py-3">No saved sequences</p>}
          {sequences.map((seq) => (
            <div key={seq.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm hover:bg-gray-100 transition-colors">
              <span className="flex-1 truncate font-medium text-gray-700">{seq.name}</span>
              <button className="text-blue-600 text-xs font-medium hover:text-blue-800 transition-colors" onClick={() => handleLoad(seq.id)}>Load</button>
              <button className="text-gray-400 text-xs font-medium hover:text-gray-700 transition-colors" onClick={() => handleExport(seq.id)}>Export</button>
              <button className="text-gray-400 text-xs font-medium hover:text-red-600 transition-colors" onClick={() => handleDelete(seq.id)}>Del</button>
            </div>
          ))}
        </div>

        <div>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          <button className="btn-secondary w-full text-xs" onClick={() => fileInputRef.current?.click()}>Import JSON</button>
        </div>
      </div>
    </div>
  );
}
