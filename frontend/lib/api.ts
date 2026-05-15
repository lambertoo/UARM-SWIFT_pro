const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || "Request failed");
  }
  return response.json();
}

export const api = {
  getStatus: () => request<{ connected: boolean; vacuum_on: boolean; sequence_running: boolean }>("/api/status"),

  listSerialPorts: () => request<{ device: string; description: string; hwid: string }[]>("/api/serial/ports"),
  connectSerial: (port?: string) =>
    request("/api/serial/connect", { method: "POST", body: JSON.stringify({ port }) }),
  disconnectSerial: () => request("/api/serial/disconnect", { method: "POST" }),
  getDeviceInfo: () => request<Record<string, unknown>>("/api/serial/info"),

  listProfiles: () => request<import("./types").CalibrationProfile[]>("/api/calibration/profiles"),
  createProfile: (data: import("./types").CalibrationProfileCreate) =>
    request("/api/calibration/profiles", { method: "POST", body: JSON.stringify(data) }),
  updateProfile: (id: number, data: import("./types").CalibrationProfileCreate) =>
    request(`/api/calibration/profiles/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteProfile: (id: number) =>
    request(`/api/calibration/profiles/${id}`, { method: "DELETE" }),

  listSequences: () => request<import("./types").Sequence[]>("/api/sequences"),
  getSequence: (id: number) => request<import("./types").Sequence>(`/api/sequences/${id}`),
  createSequence: (data: { name: string; description?: string }) =>
    request<{ id: number }>("/api/sequences", { method: "POST", body: JSON.stringify(data) }),
  updateSequence: (id: number, data: Record<string, unknown>) =>
    request(`/api/sequences/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteSequence: (id: number) => request(`/api/sequences/${id}`, { method: "DELETE" }),
  runSequence: (id: number, speed_override = 1.0, loop_count = 1) =>
    request(`/api/sequences/${id}/run?speed_override=${speed_override}&loop_count=${loop_count}`, { method: "POST" }),
  stopSequence: () => request("/api/sequences/stop", { method: "POST" }),
  exportSequence: (id: number) => request<{ name: string; waypoints: import("./types").Waypoint[] }>(`/api/sequences/${id}/export`),
  importSequence: (data: { name: string; waypoints: import("./types").Waypoint[] }) =>
    request("/api/sequences/import", { method: "POST", body: JSON.stringify(data) }),

  getSafetyConfig: () => request<{ config: import("./types").SafetyConfig; exclusion_zones: import("./types").ExclusionZone[] }>("/api/safety/config"),
  updateSafetyConfig: (data: import("./types").SafetyConfig) =>
    request("/api/safety/config", { method: "PUT", body: JSON.stringify(data) }),
  addExclusionZone: (data: Omit<import("./types").ExclusionZone, "id">) =>
    request("/api/safety/exclusion-zones", { method: "POST", body: JSON.stringify(data) }),
  deleteExclusionZone: (id: number) =>
    request(`/api/safety/exclusion-zones/${id}`, { method: "DELETE" }),

  runScript: (program: import("./types").ProgramBlock[]) =>
    request("/api/scripts/run", { method: "POST", body: JSON.stringify({ program }) }),
  stopScript: () => request("/api/scripts/stop", { method: "POST" }),
  exportPython: (program: import("./types").ProgramBlock[]) =>
    request<{ script: string }>("/api/scripts/export-python", { method: "POST", body: JSON.stringify({ program }) }),

  parseGcode: (gcode: string) =>
    request<{ toolpath: import("./types").GcodeToolpathPoint[]; total_lines: number }>("/api/gcode/parse", { method: "POST", body: JSON.stringify({ gcode }) }),
  uploadGcode: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${API_BASE}/api/gcode/upload`, { method: "POST", body: formData });
    if (!response.ok) throw new Error("Upload failed");
    return response.json() as Promise<{ filename: string; gcode: string; toolpath: import("./types").GcodeToolpathPoint[]; total_lines: number }>;
  },
  runGcode: (gcode: string) =>
    request("/api/gcode/run", { method: "POST", body: JSON.stringify({ gcode }) }),
  pauseGcode: () => request("/api/gcode/pause", { method: "POST" }),
  resumeGcode: () => request("/api/gcode/resume", { method: "POST" }),
  stopGcode: () => request("/api/gcode/stop", { method: "POST" }),
  gcodeProgress: () =>
    request<{ running: boolean; paused: boolean; current_line: number; total_lines: number; current_command: string }>("/api/gcode/progress"),
};
