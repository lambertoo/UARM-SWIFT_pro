import { ArmPosition, WebSocketCommand } from "./types";

type PositionListener = (position: ArmPosition) => void;
type ErrorListener = (error: { command: string; message: string }) => void;
type ConnectionListener = (connected: boolean) => void;
type GcodeResponseListener = (data: { command: string; response: string }) => void;

class RobotWebSocket {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private positionListeners: Set<PositionListener> = new Set();
  private errorListeners: Set<ErrorListener> = new Set();
  private connectionListeners: Set<ConnectionListener> = new Set();
  private gcodeListeners: Set<GcodeResponseListener> = new Set();
  private url: string;
  private missedHeartbeats = 0;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(url = "ws://localhost:8000/ws") {
    this.url = url;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.missedHeartbeats = 0;
      this.connectionListeners.forEach((l) => l(true));
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.missedHeartbeats = 0;
      if (data.type === "position") {
        this.positionListeners.forEach((l) => l(data as ArmPosition));
      } else if (data.type === "error") {
        this.errorListeners.forEach((l) => l({ command: data.command, message: data.message }));
      } else if (data.type === "gcode_response") {
        this.gcodeListeners.forEach((l) => l({ command: data.command, response: data.response }));
      }
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      this.connectionListeners.forEach((l) => l(false));
      this.scheduleReconnect();
    };

    this.ws.onerror = () => { this.ws?.close(); };
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  send(command: WebSocketCommand) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(command));
    }
  }

  jog(axis: "x" | "y" | "z", distance: number, speed = 50) {
    this.send({ type: "jog", axis, distance, speed });
  }

  moveTo(x: number, y: number, z: number, speed = 100) {
    this.send({ type: "move_to", x, y, z, speed });
  }

  setVacuum(state: boolean) {
    this.send({ type: "vacuum", state });
  }

  emergencyStop() {
    this.send({ type: "emergency_stop" });
  }

  home() {
    this.send({ type: "home" });
  }

  sendGcode(command: string) {
    this.send({ type: "gcode", command } as any);
  }

  onPosition(listener: PositionListener) {
    this.positionListeners.add(listener);
    return () => { this.positionListeners.delete(listener); };
  }

  onError(listener: ErrorListener) {
    this.errorListeners.add(listener);
    return () => { this.errorListeners.delete(listener); };
  }

  onConnection(listener: ConnectionListener) {
    this.connectionListeners.add(listener);
    return () => { this.connectionListeners.delete(listener); };
  }

  onGcodeResponse(listener: GcodeResponseListener) {
    this.gcodeListeners.add(listener);
    return () => { this.gcodeListeners.delete(listener); };
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.missedHeartbeats++;
      if (this.missedHeartbeats >= 3) this.ws?.close();
    }, 2000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
  }

  private scheduleReconnect() {
    this.reconnectTimer = setTimeout(() => this.connect(), 2000);
  }
}

export const robotSocket = new RobotWebSocket();
