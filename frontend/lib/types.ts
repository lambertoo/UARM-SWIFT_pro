export interface ArmPosition {
  x: number;
  y: number;
  z: number;
  rotation: number;
  vacuum_on: boolean;
  connected: boolean;
}

export interface CalibrationProfile {
  id: number;
  profile_name: string;
  serial_port_path: string;
  baud_rate: number;
  home_offset_x: number;
  home_offset_y: number;
  home_offset_z: number;
  workspace_min_x: number;
  workspace_max_x: number;
  workspace_min_y: number;
  workspace_max_y: number;
  workspace_min_z: number;
  workspace_max_z: number;
  vacuum_verified: boolean;
  calibrated_at: string;
}

export interface CalibrationProfileCreate {
  profile_name: string;
  serial_port_path: string;
  baud_rate?: number;
  home_offset_x?: number;
  home_offset_y?: number;
  home_offset_z?: number;
  workspace_min_x?: number;
  workspace_max_x?: number;
  workspace_min_y?: number;
  workspace_max_y?: number;
  workspace_min_z?: number;
  workspace_max_z?: number;
  vacuum_verified?: boolean;
}

export interface Waypoint {
  id?: number;
  x: number;
  y: number;
  z: number;
  speed: number;
  vacuum_on: boolean;
  delay_ms: number;
}

export interface Sequence {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  waypoints?: Waypoint[];
}

export interface SafetyConfig {
  max_speed: number;
  boundary_slowdown_distance: number;
  boundary_slowdown_factor: number;
  loaded_max_speed: number;
  estop_release_vacuum: boolean;
}

export interface ExclusionZone {
  id: number;
  name: string;
  min_x: number;
  max_x: number;
  min_y: number;
  max_y: number;
  min_z: number;
  max_z: number;
}

export interface SerialPort {
  device: string;
  description: string;
  hwid: string;
}

export interface WebSocketCommand {
  type: "jog" | "move_to" | "vacuum" | "emergency_stop" | "home";
  [key: string]: unknown;
}

export type BlockType =
  | "move_to"
  | "move_relative"
  | "vacuum_on"
  | "vacuum_off"
  | "home"
  | "set_speed"
  | "wait"
  | "repeat"
  | "log";

export interface ProgramBlock {
  type: BlockType;
  [key: string]: unknown;
}
