"use client";

import { useState, useEffect, useRef } from "react";
import { robotSocket } from "@/lib/websocket";

interface GcodeLogEntry {
  direction: "sent" | "received";
  text: string;
  timestamp: Date;
}

export function GcodeConsole() {
  const [command, setCommand] = useState("");
  const [log, setLog] = useState<GcodeLogEntry[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return robotSocket.onGcodeResponse((data) => {
      setLog((prev) => [...prev.slice(-200), {
        direction: "received",
        text: `${data.command} → ${data.response}`,
        timestamp: new Date(),
      }]);
    });
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  function sendCommand() {
    const trimmed = command.trim();
    if (!trimmed) return;
    setLog((prev) => [...prev, { direction: "sent", text: trimmed, timestamp: new Date() }]);
    setCommandHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);
    robotSocket.sendGcode(trimmed);
    setCommand("");
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter") {
      sendCommand();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (commandHistory.length === 0) return;
      const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(newIndex);
      setCommand(commandHistory[newIndex]);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (historyIndex === -1) return;
      const newIndex = historyIndex + 1;
      if (newIndex >= commandHistory.length) {
        setHistoryIndex(-1);
        setCommand("");
      } else {
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      }
    }
  }

  return (
    <div className="card-panel overflow-hidden">
      <div className="card-panel-header">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-700">G-code Console</h3>
          <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{log.length} entries</span>
        </div>
        <button className="btn-ghost text-xs py-1" onClick={() => setLog([])}>Clear</button>
      </div>
      <div className="h-48 overflow-y-auto bg-slate-900 p-3 font-mono text-xs">
        {log.length === 0 && <p className="text-gray-500">Type G-code commands below (e.g., G0 X100 Y100 Z50 F1000)</p>}
        {log.map((entry, i) => (
          <div key={i} className={entry.direction === "sent" ? "text-emerald-400" : "text-gray-300"}>
            <span className="text-gray-600">{entry.timestamp.toLocaleTimeString()} </span>
            <span className={entry.direction === "sent" ? "text-emerald-500" : "text-blue-400"}>
              {entry.direction === "sent" ? ">" : "<"}
            </span>{" "}
            {entry.text}
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
      <div className="flex border-t">
        <div className="flex items-center pl-3 text-gray-400 font-mono text-sm">$</div>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          placeholder="Enter G-code command..."
          className="flex-1 px-2 py-2.5 text-sm font-mono focus:outline-none bg-transparent"
        />
        <button className="bg-blue-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors" onClick={sendCommand}>Send</button>
      </div>
    </div>
  );
}
