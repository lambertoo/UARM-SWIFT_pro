"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { SerialPort } from "@/lib/types";
import Link from "next/link";

export default function DashboardPage() {
  const [serialPorts, setSerialPorts] = useState<SerialPort[]>([]);
  const [selectedPort, setSelectedPort] = useState("");
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    refreshStatus();
    refreshPorts();
  }, []);

  async function refreshStatus() {
    try {
      const status = await api.getStatus();
      setConnected(status.connected);
    } catch { setConnected(false); }
  }

  async function refreshPorts() {
    try {
      const ports = await api.listSerialPorts();
      setSerialPorts(ports);
      if (ports.length > 0 && !selectedPort) setSelectedPort(ports[0].device);
    } catch { setSerialPorts([]); }
  }

  async function handleConnect() {
    if (!selectedPort) return;
    try {
      await api.connectSerial(selectedPort);
      setConnected(true);
    } catch (error) { alert(error instanceof Error ? error.message : "Connection failed"); }
  }

  async function handleDisconnect() {
    await api.disconnectSerial();
    setConnected(false);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>

      <div className="border rounded-lg p-6 space-y-4">
        <h3 className="font-medium">Serial Connection</h3>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-sm text-gray-500 mb-1 block">Serial Port</label>
            <select value={selectedPort} onChange={(e) => setSelectedPort(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
              <option value="">Select a port</option>
              {serialPorts.map((port) => (
                <option key={port.device} value={port.device}>{port.device} — {port.description}</option>
              ))}
            </select>
          </div>
          <button className="border rounded px-4 py-2 text-sm hover:bg-gray-100" onClick={refreshPorts}>Refresh</button>
          {connected ? (
            <button className="bg-red-600 text-white rounded px-4 py-2 text-sm" onClick={handleDisconnect}>Disconnect</button>
          ) : (
            <button className="bg-blue-600 text-white rounded px-4 py-2 text-sm" onClick={handleConnect}>Connect</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { href: "/calibrate", title: "Calibrate", desc: "Set up and calibrate the robot arm" },
          { href: "/control", title: "Control", desc: "Manual jog and 3D visualization" },
          { href: "/teach", title: "Teach & Replay", desc: "Record and replay waypoint sequences" },
          { href: "/scripts", title: "Scripts", desc: "Visual block-based programming" },
        ].map(({ href, title, desc }) => (
          <Link key={href} href={href} className="border rounded-lg p-5 hover:border-blue-400 transition-colors block">
            <h3 className="font-medium text-lg">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
