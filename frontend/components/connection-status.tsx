"use client";

import { useEffect, useState } from "react";
import { robotSocket } from "@/lib/websocket";
import { api } from "@/lib/api";
import { SerialPort } from "@/lib/types";

export function ConnectionStatus() {
  const [wsConnected, setWsConnected] = useState(false);
  const [robotConnected, setRobotConnected] = useState(false);
  const [serialPorts, setSerialPorts] = useState<SerialPort[]>([]);
  const [selectedPort, setSelectedPort] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    robotSocket.connect();
    const unsubWs = robotSocket.onConnection(setWsConnected);
    const unsubPos = robotSocket.onPosition((pos) => setRobotConnected(pos.connected));
    refreshStatus();
    return () => { unsubWs(); unsubPos(); };
  }, []);

  async function refreshStatus() {
    try {
      const status = await api.getStatus();
      setRobotConnected(status.connected);
    } catch {}
  }

  async function refreshPorts() {
    try {
      const ports = await api.listSerialPorts();
      setSerialPorts(ports);
      if (ports.length > 0 && !selectedPort) {
        const uarmPort = ports.find((p) => p.description.includes("IOUSBHostDevice") || p.hwid.includes("2341:0042"));
        setSelectedPort(uarmPort?.device || ports[0].device);
      }
    } catch {}
  }

  async function handleConnect() {
    if (!selectedPort) return;
    setLoading(true);
    try {
      await api.connectSerial(selectedPort);
      setRobotConnected(true);
      setOpen(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Connection failed");
    }
    setLoading(false);
  }

  async function handleDisconnect() {
    setLoading(true);
    try {
      await api.disconnectSerial();
      setRobotConnected(false);
    } catch {}
    setLoading(false);
  }

  function handleToggle() {
    if (!open) refreshPorts();
    setOpen(!open);
  }

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          robotConnected
            ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 ring-1 ring-emerald-500/30"
            : "bg-white/10 text-gray-300 hover:bg-white/15 ring-1 ring-white/10"
        }`}
      >
        <span className={`w-2 h-2 rounded-full ${robotConnected ? "bg-emerald-400 animate-status-pulse" : "bg-gray-500"}`} />
        {robotConnected ? "Connected" : "Disconnected"}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl z-50 border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-800">Robot Connection</h4>
              <button className="text-xs font-medium text-blue-600 hover:text-blue-700" onClick={refreshPorts}>Refresh</button>
            </div>

            <div className="p-4">
              {robotConnected ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                      <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">Connected</p>
                      <p className="text-xs text-emerald-600 font-mono">{selectedPort || "Serial port"}</p>
                    </div>
                  </div>
                  <button className="btn-danger w-full" onClick={handleDisconnect} disabled={loading}>
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Serial Port</label>
                    <select
                      value={selectedPort}
                      onChange={(e) => setSelectedPort(e.target.value)}
                      className="input-field"
                    >
                      <option value="">Select port...</option>
                      {serialPorts.map((p) => (
                        <option key={p.device} value={p.device}>
                          {p.device.replace("/dev/cu.", "")} — {p.description}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button className="btn-primary w-full" onClick={handleConnect} disabled={!selectedPort || loading}>
                    {loading ? "Connecting..." : "Connect"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
