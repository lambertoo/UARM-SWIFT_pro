from pydantic import BaseModel, field_validator, model_validator
from typing import Literal, Any


class CalibrationProfileCreate(BaseModel):
    profile_name: str
    serial_port_path: str
    baud_rate: int = 115200
    home_offset_x: float = 0.0
    home_offset_y: float = 0.0
    home_offset_z: float = 0.0
    workspace_min_x: float = -350.0
    workspace_max_x: float = 350.0
    workspace_min_y: float = -350.0
    workspace_max_y: float = 350.0
    workspace_min_z: float = 0.0
    workspace_max_z: float = 150.0
    vacuum_verified: bool = False

    @field_validator("profile_name")
    @classmethod
    def profile_name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("profile_name must not be empty")
        return v.strip()


class CalibrationProfile(CalibrationProfileCreate):
    id: int
    calibrated_at: str


class WaypointCreate(BaseModel):
    x: float
    y: float
    z: float
    speed: float = 50.0
    vacuum_on: bool = False
    delay_ms: int = 0

    @field_validator("speed")
    @classmethod
    def speed_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("speed must be positive")
        return v

    @field_validator("delay_ms")
    @classmethod
    def delay_not_negative(cls, v: int) -> int:
        if v < 0:
            raise ValueError("delay_ms must not be negative")
        return v


class Waypoint(WaypointCreate):
    id: int
    sequence_id: int
    order_index: int


class SequenceCreate(BaseModel):
    name: str
    description: str = ""


class Sequence(SequenceCreate):
    id: int
    created_at: str
    updated_at: str


class SequenceWithWaypoints(Sequence):
    waypoints: list[Waypoint] = []


class SafetyConfig(BaseModel):
    max_speed: float = 200.0
    boundary_slowdown_distance: float = 10.0
    boundary_slowdown_factor: float = 0.25
    loaded_max_speed: float = 100.0
    estop_release_vacuum: bool = False


class ExclusionZoneCreate(BaseModel):
    name: str
    min_x: float
    max_x: float
    min_y: float
    max_y: float
    min_z: float
    max_z: float

    @model_validator(mode="after")
    def bounds_are_valid(self):
        if self.min_x >= self.max_x:
            raise ValueError("min_x must be less than max_x")
        if self.min_y >= self.max_y:
            raise ValueError("min_y must be less than max_y")
        if self.min_z >= self.max_z:
            raise ValueError("min_z must be less than max_z")
        return self


class ExclusionZone(ExclusionZoneCreate):
    id: int


class ArmPosition(BaseModel):
    x: float
    y: float
    z: float
    rotation: float
    vacuum_on: bool
    connected: bool


class JogCommand(BaseModel):
    axis: Literal["x", "y", "z"]
    distance: float
    speed: float = 50.0

    @field_validator("speed")
    @classmethod
    def speed_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("speed must be positive")
        return v


class MoveToCommand(BaseModel):
    x: float
    y: float
    z: float
    speed: float = 100.0

    @field_validator("speed")
    @classmethod
    def speed_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("speed must be positive")
        return v


class VacuumCommand(BaseModel):
    state: bool


class WebSocketMessage(BaseModel):
    type: str
    payload: dict[str, Any] = {}
