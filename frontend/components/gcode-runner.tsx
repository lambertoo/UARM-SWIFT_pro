"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { GcodeToolpathPoint } from "@/lib/types";
import { useToast } from "@/components/toast-provider";

interface GcodeRunnerProps {
  onToolpathChange: (toolpath: GcodeToolpathPoint[]) => void;
  onCurrentLineChange: (line: number) => void;
}

export function GcodeRunner({ onToolpathChange, onCurrentLineChange }: GcodeRunnerProps) {
  const [gcodeText, setGcodeText] = useState("");
  const [filename, setFilename] = useState("");
  const [totalLines, setTotalLines] = useState(0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [currentLine, setCurrentLine] = useState(-1);
  const [showCode, setShowCode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { showToast } = useToast();

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollIntervalRef.current = setInterval(async () => {
      try {
        const progress = await api.gcodeProgress();
        setCurrentLine(progress.current_line);
        onCurrentLineChange(progress.current_line);
        setRunning(progress.running);
        setPaused(progress.paused);
        if (!progress.running) {
          stopPolling();
          onCurrentLineChange(-1);
        }
      } catch {
        stopPolling();
      }
    }, 300);
  }, [stopPolling, onCurrentLineChange]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const result = await api.uploadGcode(file);
      setGcodeText(result.gcode);
      setFilename(result.filename);
      setTotalLines(result.total_lines);
      onToolpathChange(result.toolpath);
      setCurrentLine(-1);
      onCurrentLineChange(-1);
      showToast(`Loaded ${result.filename} — ${result.total_lines} lines, ${result.toolpath.length} moves`, "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to load file", "error");
    }
    event.target.value = "";
  }

  async function handlePasteGcode() {
    if (!gcodeText.trim()) {
      showToast("Paste or type G-code first", "warning");
      return;
    }
    try {
      const result = await api.parseGcode(gcodeText);
      setTotalLines(result.total_lines);
      onToolpathChange(result.toolpath);
      setFilename("pasted");
      setCurrentLine(-1);
      onCurrentLineChange(-1);
      showToast(`Parsed — ${result.total_lines} lines, ${result.toolpath.length} moves`, "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Parse failed", "error");
    }
  }

  async function handleRun() {
    if (!gcodeText.trim()) {
      showToast("No G-code loaded", "warning");
      return;
    }
    try {
      await api.runGcode(gcodeText);
      setRunning(true);
      setPaused(false);
      startPolling();
      showToast("G-code program started", "info");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Run failed", "error");
    }
  }

  async function handlePause() {
    try {
      await api.pauseGcode();
      setPaused(true);
      showToast("Paused", "info");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Pause failed", "error");
    }
  }

  async function handleResume() {
    try {
      await api.resumeGcode();
      setPaused(false);
      showToast("Resumed", "info");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Resume failed", "error");
    }
  }

  async function handleStop() {
    try {
      await api.stopGcode();
      setRunning(false);
      setPaused(false);
      stopPolling();
      setCurrentLine(-1);
      onCurrentLineChange(-1);
      showToast("Stopped", "warning");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Stop failed", "error");
    }
  }

  function handleClear() {
    setGcodeText("");
    setFilename("");
    setTotalLines(0);
    setCurrentLine(-1);
    onToolpathChange([]);
    onCurrentLineChange(-1);
  }

  const progressPercent = totalLines > 0 && currentLine >= 0 ? Math.round((currentLine / totalLines) * 100) : 0;
  const gcodeLines = gcodeText.split("\n");

  return (
    <div className="card-panel overflow-hidden">
      <div className="card-panel-header">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-700">G-code Runner</h3>
          {filename && (
            <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
              {filename}
            </span>
          )}
          {totalLines > 0 && <span className="text-xs text-gray-400 font-mono">{totalLines} lines</span>}
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost text-xs py-1" onClick={() => setShowCode(!showCode)}>
            {showCode ? "Hide Code" : "Show Code"}
          </button>
          <button className="btn-ghost text-xs py-1" onClick={handleClear}>Clear</button>
        </div>
      </div>

      <div className="card-panel-body space-y-3">
        <div className="flex gap-2 flex-wrap">
          <input ref={fileInputRef} type="file" accept=".gcode,.nc,.ngc,.txt" className="hidden" onChange={handleFileUpload} />
          <button className="btn-secondary text-xs py-2" onClick={() => fileInputRef.current?.click()}>
            <svg className="w-4 h-4 mr-1.5 inline" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            Load File
          </button>
          <button className="btn-secondary text-xs py-2" onClick={handlePasteGcode} disabled={!gcodeText.trim()}>
            Parse
          </button>
          <div className="flex-1" />
          {running ? (
            <>
              {paused ? (
                <button className="btn-primary text-xs" onClick={handleResume}>Resume</button>
              ) : (
                <button className="bg-amber-500 text-white rounded-lg px-4 py-2 text-xs font-medium hover:bg-amber-600 shadow-sm transition-all" onClick={handlePause}>Pause</button>
              )}
              <button className="btn-danger text-xs" onClick={handleStop}>Stop</button>
            </>
          ) : (
            <button className="btn-success text-xs" onClick={handleRun} disabled={!gcodeText.trim()}>
              Run Program
            </button>
          )}
        </div>

        {running && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-gray-600">Line {currentLine + 1} / {totalLines}</span>
              <span className="font-semibold text-blue-600">{progressPercent}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all shadow-sm" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        )}
      </div>

      {showCode && (
        <div className="border-t">
          {gcodeText ? (
            <div className="h-64 overflow-y-auto bg-slate-900 font-mono text-xs">
              {gcodeLines.map((line, i) => {
                const isCurrentLine = running && i === currentLine;
                const isCompleted = running && currentLine >= 0 && i < currentLine;
                return (
                  <div
                    key={i}
                    className={`flex px-3 py-0.5 ${
                      isCurrentLine ? "bg-blue-600/30 text-blue-200" : isCompleted ? "text-gray-600" : "text-gray-300"
                    }`}
                  >
                    <span className="text-gray-600 w-12 text-right mr-3 select-none">{i + 1}</span>
                    <span className={line.startsWith(";") ? "text-gray-500 italic" : ""}>{line}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <textarea
              className="w-full h-64 p-4 font-mono text-xs resize-none focus:outline-none bg-gray-50 placeholder-gray-400"
              placeholder="Paste G-code here, or load a file..."
              value={gcodeText}
              onChange={(e) => setGcodeText(e.target.value)}
            />
          )}
        </div>
      )}
    </div>
  );
}
