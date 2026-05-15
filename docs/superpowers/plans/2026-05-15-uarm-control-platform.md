# uARM Swift Pro Control Platform — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web-based control platform for the uARM Swift Pro robot arm with vacuum gripper — calibration, manual control, teach-and-replay, block scripting, 3D visualization, and safety enforcement.

**Architecture:** Python FastAPI backend owns the serial connection and exposes WebSocket (real-time 10Hz position streaming) + REST (CRUD) APIs. Next.js frontend with Three.js for 3D arm visualization, shadcn/ui for controls, Google Blockly for visual scripting. SQLite for persistence.

**Tech Stack:** Python 3.12+ / FastAPI / pyserial / numpy / SQLite | Next.js 15 / TypeScript / Three.js / @react-three/fiber / shadcn/ui / Google Blockly

---

## File Structure

### Backend (`backend/`)

| File | Responsibility |
|---|---|
| `backend/requirements.txt` | Python dependencies |
| `backend/main.py` | FastAPI app, CORS, lifespan, mount routers |
| `backend/database.py` | SQLite connection, table creation |
| `backend/models.py` | Pydantic models for API request/response |
| `backend/serial_manager.py` | Serial connection lifecycle, send/receive G-code, position polling |
| `backend/safety_validator.py` | Validate every move command against bounds, speed limits, exclusion zones |
| `backend/kinematics.py` | uARM coordinate transforms and position queries |
| `backend/calibration.py` | Calibration profile CRUD and offset logic |
| `backend/sequence_runner.py` | Execute waypoint sequences with pause/stop/loop |
| `backend/block_interpreter.py` | Parse Blockly JSON, execute block programs |
| `backend/routers/serial_routes.py` | REST endpoints for serial connect/disconnect/ports |
| `backend/routers/calibration_routes.py` | REST endpoints for calibration profiles |
| `backend/routers/sequence_routes.py` | REST endpoints for sequence CRUD + run/stop |
| `backend/routers/safety_routes.py` | REST endpoints for safety config |
| `backend/routers/script_routes.py` | REST endpoints for block script run/export |
| `backend/routers/websocket_routes.py` | WebSocket endpoint for real-time streaming + commands |
| `tests/backend/test_safety_validator.py` | Safety validator unit tests |
| `tests/backend/test_serial_manager.py` | Serial manager tests (mocked serial) |
| `tests/backend/test_calibration.py` | Calibration CRUD tests |
| `tests/backend/test_sequence_runner.py` | Sequence execution tests |
| `tests/backend/test_block_interpreter.py` | Block interpreter tests |
| `tests/backend/test_models.py` | Pydantic model validation tests |
| `tests/backend/conftest.py` | Shared fixtures (test DB, mock serial) |

### Frontend (`frontend/`)

| File | Responsibility |
|---|---|
| `frontend/app/layout.tsx` | Root layout with emergency stop header |
| `frontend/app/page.tsx` | Dashboard — connection status, quick actions |
| `frontend/app/calibrate/page.tsx` | Calibration wizard page |
| `frontend/app/control/page.tsx` | Manual control — jog panel + 3D view |
| `frontend/app/teach/page.tsx` | Teach & replay page |
| `frontend/app/scripts/page.tsx` | Block scripting editor page |
| `frontend/components/emergency-stop.tsx` | E-stop button (header) |
| `frontend/components/connection-status.tsx` | Serial connection indicator |
| `frontend/components/position-display.tsx` | Live X/Y/Z/rotation readout |
| `frontend/components/jog-panel.tsx` | Cartesian jog buttons + step size + speed |
| `frontend/components/coordinate-input.tsx` | Type exact X/Y/Z and "Go" |
| `frontend/components/vacuum-control.tsx` | Vacuum on/off, pick/place macros |
| `frontend/components/robot-3d-view.tsx` | Three.js uARM visualization |
| `frontend/components/waypoint-list.tsx` | Draggable waypoint list for teach mode |
| `frontend/components/sequence-manager.tsx` | Save/load/export/import sequences |
| `frontend/components/block-editor.tsx` | Google Blockly wrapper |
| `frontend/components/safety-config.tsx` | Workspace bounds + exclusion zone editor |
| `frontend/components/calibration-wizard.tsx` | Step-by-step calibration flow |
| `frontend/lib/websocket.ts` | WebSocket client singleton with reconnect |
| `frontend/lib/api.ts` | REST client (typed fetch wrappers) |
| `frontend/lib/types.ts` | Shared TypeScript types matching backend models |

---

## Phase 1: Backend Foundation

### Task 1: Project Scaffolding & Dependencies

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/__init__.py`
- Create: `backend/routers/__init__.py`
- Create: `tests/__init__.py`
- Create: `tests/backend/__init__.py`

- [ ] **Step 1: Create backend directory structure**

```bash
cd "/Users/lambertrulindana/Documents/MADAGASCAR_UNIPOD/uARM SwfitPro"
mkdir -p backend/routers tests/backend
touch backend/__init__.py backend/routers/__init__.py tests/__init__.py tests/backend/__init__.py
```

- [ ] **Step 2: Write requirements.txt**

```
# backend/requirements.txt
fastapi==0.115.6
uvicorn[standard]==0.34.0
pyserial==3.5
numpy==2.2.1
pydantic==2.10.4
aiosqlite==0.20.0
pytest==8.3.4
pytest-asyncio==0.25.0
httpx==0.28.1
```

- [ ] **Step 3: Create Python virtual environment and install**

```bash
cd "/Users/lambertrulindana/Documents/MADAGASCAR_UNIPOD/uARM SwfitPro"
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
```

- [ ] **Step 4: Verify installation**

```bash
source backend/.venv/bin/activate
python -c "import fastapi, serial, numpy; print('All imports OK')"
```
Expected: `All imports OK`

- [ ] **Step 5: Commit**

```bash
git add backend/ tests/
git commit -m "feat: scaffold backend project with dependencies"
```

---

### Task 2: Database Layer

**Files:**
- Create: `backend/database.py`
- Create: `tests/backend/test_database.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/backend/test_database.py
import pytest
import asyncio
import aiosqlite
from backend.database import initialize_database, get_database_path


@pytest.fixture
def test_database_path(tmp_path):
    return str(tmp_path / "test_uarm.db")


@pytest.mark.asyncio
async def test_initialize_database_creates_tables(test_database_path):
    await initialize_database(test_database_path)
    async with aiosqlite.connect(test_database_path) as db:
        cursor = await db.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        )
        tables = [row[0] for row in await cursor.fetchall()]
    assert "calibration_profiles" in tables
    assert "sequences" in tables
    assert "waypoints" in tables
    assert "safety_config" in tables
    assert "exclusion_zones" in tables


@pytest.mark.asyncio
async def test_calibration_profiles_table_schema(test_database_path):
    await initialize_database(test_database_path)
    async with aiosqlite.connect(test_database_path) as db:
        cursor = await db.execute("PRAGMA table_info(calibration_profiles)")
        columns = {row[1] for row in await cursor.fetchall()}
    expected = {
        "id", "profile_name", "serial_port_path", "baud_rate",
        "home_offset_x", "home_offset_y", "home_offset_z",
        "workspace_min_x", "workspace_max_x",
        "workspace_min_y", "workspace_max_y",
        "workspace_min_z", "workspace_max_z",
        "vacuum_verified", "calibrated_at",
    }
    assert expected.issubset(columns)


@pytest.mark.asyncio
async def test_sequences_and_waypoints_schema(test_database_path):
    await initialize_database(test_database_path)
    async with aiosqlite.connect(test_database_path) as db:
        cursor = await db.execute("PRAGMA table_info(sequences)")
        seq_columns = {row[1] for row in await cursor.fetchall()}
        cursor = await db.execute("PRAGMA table_info(waypoints)")
        wp_columns = {row[1] for row in await cursor.fetchall()}
    assert {"id", "name", "description", "created_at", "updated_at"}.issubset(seq_columns)
    assert {"id", "sequence_id", "order_index", "x", "y", "z", "speed", "vacuum_on", "delay_ms"}.issubset(wp_columns)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "/Users/lambertrulindana/Documents/MADAGASCAR_UNIPOD/uARM SwfitPro"
source backend/.venv/bin/activate
python -m pytest tests/backend/test_database.py -v
```
Expected: FAIL — `ModuleNotFoundError: No module named 'backend.database'`

- [ ] **Step 3: Implement database.py**

```python
# backend/database.py
import aiosqlite
import os

DEFAULT_DATABASE_PATH = os.path.join(os.path.dirname(__file__), "uarm.db")


def get_database_path():
    return os.environ.get("UARM_DB_PATH", DEFAULT_DATABASE_PATH)


async def initialize_database(database_path: str | None = None):
    path = database_path or get_database_path()
    async with aiosqlite.connect(path) as db:
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS calibration_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                profile_name TEXT NOT NULL,
                serial_port_path TEXT NOT NULL,
                baud_rate INTEGER NOT NULL DEFAULT 115200,
                home_offset_x REAL NOT NULL DEFAULT 0.0,
                home_offset_y REAL NOT NULL DEFAULT 0.0,
                home_offset_z REAL NOT NULL DEFAULT 0.0,
                workspace_min_x REAL NOT NULL DEFAULT -350.0,
                workspace_max_x REAL NOT NULL DEFAULT 350.0,
                workspace_min_y REAL NOT NULL DEFAULT -350.0,
                workspace_max_y REAL NOT NULL DEFAULT 350.0,
                workspace_min_z REAL NOT NULL DEFAULT 0.0,
                workspace_max_z REAL NOT NULL DEFAULT 150.0,
                vacuum_verified INTEGER NOT NULL DEFAULT 0,
                calibrated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sequences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS waypoints (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sequence_id INTEGER NOT NULL,
                order_index INTEGER NOT NULL,
                x REAL NOT NULL,
                y REAL NOT NULL,
                z REAL NOT NULL,
                speed REAL NOT NULL DEFAULT 50.0,
                vacuum_on INTEGER NOT NULL DEFAULT 0,
                delay_ms INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (sequence_id) REFERENCES sequences(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS safety_config (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                max_speed REAL NOT NULL DEFAULT 200.0,
                boundary_slowdown_distance REAL NOT NULL DEFAULT 10.0,
                boundary_slowdown_factor REAL NOT NULL DEFAULT 0.25,
                loaded_max_speed REAL NOT NULL DEFAULT 100.0,
                estop_release_vacuum INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS exclusion_zones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                min_x REAL NOT NULL,
                max_x REAL NOT NULL,
                min_y REAL NOT NULL,
                max_y REAL NOT NULL,
                min_z REAL NOT NULL,
                max_z REAL NOT NULL
            );

            INSERT OR IGNORE INTO safety_config (id, max_speed, boundary_slowdown_distance, boundary_slowdown_factor, loaded_max_speed, estop_release_vacuum)
            VALUES (1, 200.0, 10.0, 0.25, 100.0, 0);
        """)
        await db.commit()


async def get_connection(database_path: str | None = None):
    path = database_path or get_database_path()
    db = await aiosqlite.connect(path)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA foreign_keys = ON")
    return db
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
python -m pytest tests/backend/test_database.py -v
```
Expected: 3 passed

- [ ] **Step 5: Commit**

```bash
git add backend/database.py tests/backend/test_database.py
git commit -m "feat: add SQLite database layer with all tables"
```

---

### Task 3: Pydantic Models

**Files:**
- Create: `backend/models.py`
- Create: `tests/backend/test_models.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/backend/test_models.py
import pytest
from pydantic import ValidationError
from backend.models import (
    CalibrationProfile,
    CalibrationProfileCreate,
    Waypoint,
    WaypointCreate,
    Sequence,
    SequenceCreate,
    SafetyConfig,
    ExclusionZone,
    ExclusionZoneCreate,
    ArmPosition,
    JogCommand,
    MoveToCommand,
    VacuumCommand,
    WebSocketMessage,
)


def test_calibration_profile_create_valid():
    profile = CalibrationProfileCreate(
        profile_name="Test Setup",
        serial_port_path="/dev/ttyUSB0",
    )
    assert profile.baud_rate == 115200
    assert profile.home_offset_x == 0.0


def test_calibration_profile_create_rejects_empty_name():
    with pytest.raises(ValidationError):
        CalibrationProfileCreate(
            profile_name="",
            serial_port_path="/dev/ttyUSB0",
        )


def test_waypoint_create_valid():
    wp = WaypointCreate(x=150.0, y=0.0, z=80.0, speed=50.0, vacuum_on=True, delay_ms=300)
    assert wp.vacuum_on is True
    assert wp.delay_ms == 300


def test_waypoint_create_rejects_negative_speed():
    with pytest.raises(ValidationError):
        WaypointCreate(x=0, y=0, z=0, speed=-10, vacuum_on=False, delay_ms=0)


def test_jog_command_valid():
    cmd = JogCommand(axis="x", distance=5.0, speed=50.0)
    assert cmd.axis == "x"


def test_jog_command_rejects_invalid_axis():
    with pytest.raises(ValidationError):
        JogCommand(axis="w", distance=5.0, speed=50.0)


def test_move_to_command_valid():
    cmd = MoveToCommand(x=150.0, y=0.0, z=80.0, speed=100.0)
    assert cmd.speed == 100.0


def test_arm_position():
    pos = ArmPosition(x=150.2, y=0.0, z=80.5, rotation=45.0, vacuum_on=False, connected=True)
    assert pos.connected is True


def test_safety_config_defaults():
    config = SafetyConfig(
        max_speed=200.0,
        boundary_slowdown_distance=10.0,
        boundary_slowdown_factor=0.25,
        loaded_max_speed=100.0,
        estop_release_vacuum=False,
    )
    assert config.boundary_slowdown_factor == 0.25


def test_exclusion_zone_create_valid():
    zone = ExclusionZoneCreate(
        name="Camera Mount",
        min_x=-50, max_x=50, min_y=-50, max_y=50, min_z=0, max_z=100,
    )
    assert zone.name == "Camera Mount"


def test_exclusion_zone_rejects_inverted_bounds():
    with pytest.raises(ValidationError):
        ExclusionZoneCreate(
            name="Bad Zone",
            min_x=100, max_x=50, min_y=0, max_y=50, min_z=0, max_z=100,
        )


def test_sequence_create_valid():
    seq = SequenceCreate(name="Pick and Place", description="Demo sequence")
    assert seq.name == "Pick and Place"


def test_websocket_message_jog():
    msg = WebSocketMessage(type="jog", payload={"axis": "x", "distance": 5.0, "speed": 50.0})
    assert msg.type == "jog"
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python -m pytest tests/backend/test_models.py -v
```
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement models.py**

```python
# backend/models.py
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
python -m pytest tests/backend/test_models.py -v
```
Expected: 13 passed

- [ ] **Step 5: Commit**

```bash
git add backend/models.py tests/backend/test_models.py
git commit -m "feat: add Pydantic models for all API types"
```

---

### Task 4: Serial Manager

**Files:**
- Create: `backend/serial_manager.py`
- Create: `tests/backend/test_serial_manager.py`
- Create: `tests/backend/conftest.py`

- [ ] **Step 1: Write conftest with mock serial fixture**

```python
# tests/backend/conftest.py
import pytest
import asyncio
from unittest.mock import MagicMock, patch
from backend.database import initialize_database


@pytest.fixture
def test_database_path(tmp_path):
    return str(tmp_path / "test_uarm.db")


@pytest.fixture
def mock_serial_port():
    mock_port = MagicMock()
    mock_port.is_open = True
    mock_port.readline.return_value = b"ok\n"
    mock_port.write.return_value = None
    mock_port.in_waiting = 0
    return mock_port


@pytest.fixture
def mock_serial_class(mock_serial_port):
    with patch("serial.Serial", return_value=mock_serial_port) as mock_cls:
        yield mock_cls
```

- [ ] **Step 2: Write the failing test**

```python
# tests/backend/test_serial_manager.py
import pytest
from unittest.mock import MagicMock, patch, PropertyMock
from backend.serial_manager import SerialManager


@pytest.fixture
def mock_serial_port():
    mock_port = MagicMock()
    mock_port.is_open = True
    mock_port.readline.return_value = b"ok\n"
    mock_port.write.return_value = None
    mock_port.in_waiting = 0
    return mock_port


def test_connect_opens_serial_port(mock_serial_port):
    with patch("serial.Serial", return_value=mock_serial_port):
        manager = SerialManager()
        manager.connect("/dev/ttyUSB0", 115200)
        assert manager.is_connected is True


def test_disconnect_closes_port(mock_serial_port):
    with patch("serial.Serial", return_value=mock_serial_port):
        manager = SerialManager()
        manager.connect("/dev/ttyUSB0", 115200)
        manager.disconnect()
        mock_serial_port.close.assert_called_once()
        assert manager.is_connected is False


def test_send_command_writes_gcode(mock_serial_port):
    with patch("serial.Serial", return_value=mock_serial_port):
        manager = SerialManager()
        manager.connect("/dev/ttyUSB0", 115200)
        response = manager.send_command("G0 X150 Y0 Z80 F1000")
        mock_serial_port.write.assert_called_with(b"G0 X150 Y0 Z80 F1000\n")
        assert response == "ok"


def test_send_command_raises_when_disconnected():
    manager = SerialManager()
    with pytest.raises(ConnectionError):
        manager.send_command("G0 X150 Y0 Z80 F1000")


def test_get_position_parses_response(mock_serial_port):
    mock_serial_port.readline.return_value = b"ok X:150.20 Y:0.00 Z:80.50\n"
    with patch("serial.Serial", return_value=mock_serial_port):
        manager = SerialManager()
        manager.connect("/dev/ttyUSB0", 115200)
        position = manager.get_position()
        assert position["x"] == pytest.approx(150.20)
        assert position["y"] == pytest.approx(0.00)
        assert position["z"] == pytest.approx(80.50)


def test_set_vacuum_sends_pump_command(mock_serial_port):
    with patch("serial.Serial", return_value=mock_serial_port):
        manager = SerialManager()
        manager.connect("/dev/ttyUSB0", 115200)
        manager.set_vacuum(True)
        mock_serial_port.write.assert_called_with(b"M2231 V1\n")
        manager.set_vacuum(False)
        mock_serial_port.write.assert_called_with(b"M2231 V0\n")


def test_home_sends_homing_command(mock_serial_port):
    with patch("serial.Serial", return_value=mock_serial_port):
        manager = SerialManager()
        manager.connect("/dev/ttyUSB0", 115200)
        manager.home()
        mock_serial_port.write.assert_called_with(b"M2400\n")


def test_move_to_sends_gcode_with_feedrate(mock_serial_port):
    with patch("serial.Serial", return_value=mock_serial_port):
        manager = SerialManager()
        manager.connect("/dev/ttyUSB0", 115200)
        manager.move_to(150.0, 0.0, 80.0, speed=100.0)
        written = mock_serial_port.write.call_args[0][0].decode()
        assert "G0" in written
        assert "X150" in written
        assert "Y0" in written
        assert "Z80" in written
        assert "F6000" in written


def test_emergency_stop_sends_stop(mock_serial_port):
    with patch("serial.Serial", return_value=mock_serial_port):
        manager = SerialManager()
        manager.connect("/dev/ttyUSB0", 115200)
        manager.emergency_stop()
        mock_serial_port.write.assert_called_with(b"M112\n")


def test_list_ports_returns_list():
    with patch("serial.tools.list_ports.comports") as mock_comports:
        mock_port = MagicMock()
        mock_port.device = "/dev/ttyUSB0"
        mock_port.description = "uArm Swift Pro"
        mock_comports.return_value = [mock_port]
        ports = SerialManager.list_ports()
        assert len(ports) == 1
        assert ports[0]["device"] == "/dev/ttyUSB0"
```

- [ ] **Step 3: Run test to verify it fails**

```bash
python -m pytest tests/backend/test_serial_manager.py -v
```
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 4: Implement serial_manager.py**

```python
# backend/serial_manager.py
import re
import serial
import serial.tools.list_ports
import threading


class SerialManager:
    def __init__(self):
        self._port: serial.Serial | None = None
        self._lock = threading.Lock()
        self._vacuum_on = False

    @property
    def is_connected(self) -> bool:
        return self._port is not None and self._port.is_open

    @property
    def vacuum_on(self) -> bool:
        return self._vacuum_on

    def connect(self, port_path: str, baud_rate: int = 115200):
        with self._lock:
            if self._port and self._port.is_open:
                self._port.close()
            self._port = serial.Serial(port_path, baud_rate, timeout=2)

    def disconnect(self):
        with self._lock:
            if self._port and self._port.is_open:
                self._port.close()
            self._port = None

    def send_command(self, command: str) -> str:
        with self._lock:
            if not self.is_connected:
                raise ConnectionError("Serial port not connected")
            self._port.write(f"{command}\n".encode())
            response = self._port.readline().decode().strip()
            return response

    def get_position(self) -> dict:
        response = self.send_command("P2220")
        match_x = re.search(r"X:([-\d.]+)", response)
        match_y = re.search(r"Y:([-\d.]+)", response)
        match_z = re.search(r"Z:([-\d.]+)", response)
        return {
            "x": float(match_x.group(1)) if match_x else 0.0,
            "y": float(match_y.group(1)) if match_y else 0.0,
            "z": float(match_z.group(1)) if match_z else 0.0,
        }

    def move_to(self, x: float, y: float, z: float, speed: float = 100.0):
        feedrate = int(speed * 60)
        self.send_command(f"G0 X{x:.1f} Y{y:.1f} Z{z:.1f} F{feedrate}")

    def set_vacuum(self, on: bool):
        value = 1 if on else 0
        self.send_command(f"M2231 V{value}")
        self._vacuum_on = on

    def home(self):
        self.send_command("M2400")

    def emergency_stop(self):
        with self._lock:
            if not self.is_connected:
                return
            self._port.write(b"M112\n")

    @staticmethod
    def list_ports() -> list[dict]:
        ports = serial.tools.list_ports.comports()
        return [
            {"device": p.device, "description": p.description}
            for p in ports
        ]
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
python -m pytest tests/backend/test_serial_manager.py -v
```
Expected: 10 passed

- [ ] **Step 6: Commit**

```bash
git add backend/serial_manager.py tests/backend/test_serial_manager.py tests/backend/conftest.py
git commit -m "feat: add serial manager for uARM G-code communication"
```

---

### Task 5: Safety Validator

**Files:**
- Create: `backend/safety_validator.py`
- Create: `tests/backend/test_safety_validator.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/backend/test_safety_validator.py
import pytest
from backend.safety_validator import SafetyValidator, SafetyViolation


@pytest.fixture
def validator():
    return SafetyValidator(
        workspace_min_x=-300.0, workspace_max_x=300.0,
        workspace_min_y=-300.0, workspace_max_y=300.0,
        workspace_min_z=0.0, workspace_max_z=150.0,
        max_speed=200.0,
        loaded_max_speed=100.0,
        boundary_slowdown_distance=10.0,
        boundary_slowdown_factor=0.25,
        exclusion_zones=[],
    )


def test_valid_move_passes(validator):
    validator.validate_move(150.0, 0.0, 80.0, speed=100.0, vacuum_on=False)


def test_move_outside_x_boundary_raises(validator):
    with pytest.raises(SafetyViolation, match="X=400.0 exceeds boundary max X=300.0"):
        validator.validate_move(400.0, 0.0, 80.0, speed=100.0, vacuum_on=False)


def test_move_outside_z_min_raises(validator):
    with pytest.raises(SafetyViolation, match="Z=-10.0 exceeds boundary min Z=0.0"):
        validator.validate_move(0.0, 0.0, -10.0, speed=100.0, vacuum_on=False)


def test_speed_exceeds_max_raises(validator):
    with pytest.raises(SafetyViolation, match="Speed 250.0 exceeds maximum 200.0"):
        validator.validate_move(0.0, 0.0, 80.0, speed=250.0, vacuum_on=False)


def test_loaded_speed_limit_enforced(validator):
    with pytest.raises(SafetyViolation, match="Speed 150.0 exceeds loaded maximum 100.0"):
        validator.validate_move(0.0, 0.0, 80.0, speed=150.0, vacuum_on=True)


def test_loaded_speed_within_limit_passes(validator):
    validator.validate_move(0.0, 0.0, 80.0, speed=90.0, vacuum_on=True)


def test_exclusion_zone_blocks_move():
    validator = SafetyValidator(
        workspace_min_x=-300.0, workspace_max_x=300.0,
        workspace_min_y=-300.0, workspace_max_y=300.0,
        workspace_min_z=0.0, workspace_max_z=150.0,
        max_speed=200.0, loaded_max_speed=100.0,
        boundary_slowdown_distance=10.0, boundary_slowdown_factor=0.25,
        exclusion_zones=[{
            "name": "Camera Mount",
            "min_x": -50, "max_x": 50,
            "min_y": -50, "max_y": 50,
            "min_z": 0, "max_z": 100,
        }],
    )
    with pytest.raises(SafetyViolation, match="inside exclusion zone 'Camera Mount'"):
        validator.validate_move(0.0, 0.0, 50.0, speed=50.0, vacuum_on=False)


def test_point_outside_exclusion_zone_passes():
    validator = SafetyValidator(
        workspace_min_x=-300.0, workspace_max_x=300.0,
        workspace_min_y=-300.0, workspace_max_y=300.0,
        workspace_min_z=0.0, workspace_max_z=150.0,
        max_speed=200.0, loaded_max_speed=100.0,
        boundary_slowdown_distance=10.0, boundary_slowdown_factor=0.25,
        exclusion_zones=[{
            "name": "Camera Mount",
            "min_x": -50, "max_x": 50,
            "min_y": -50, "max_y": 50,
            "min_z": 0, "max_z": 100,
        }],
    )
    validator.validate_move(200.0, 200.0, 50.0, speed=50.0, vacuum_on=False)


def test_apply_boundary_slowdown_near_edge(validator):
    adjusted_speed = validator.apply_boundary_slowdown(295.0, 0.0, 80.0, speed=100.0)
    assert adjusted_speed == pytest.approx(25.0)


def test_apply_boundary_slowdown_center_no_change(validator):
    adjusted_speed = validator.apply_boundary_slowdown(0.0, 0.0, 80.0, speed=100.0)
    assert adjusted_speed == pytest.approx(100.0)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python -m pytest tests/backend/test_safety_validator.py -v
```
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement safety_validator.py**

```python
# backend/safety_validator.py


class SafetyViolation(Exception):
    pass


class SafetyValidator:
    def __init__(
        self,
        workspace_min_x: float,
        workspace_max_x: float,
        workspace_min_y: float,
        workspace_max_y: float,
        workspace_min_z: float,
        workspace_max_z: float,
        max_speed: float,
        loaded_max_speed: float,
        boundary_slowdown_distance: float,
        boundary_slowdown_factor: float,
        exclusion_zones: list[dict],
    ):
        self.workspace_min_x = workspace_min_x
        self.workspace_max_x = workspace_max_x
        self.workspace_min_y = workspace_min_y
        self.workspace_max_y = workspace_max_y
        self.workspace_min_z = workspace_min_z
        self.workspace_max_z = workspace_max_z
        self.max_speed = max_speed
        self.loaded_max_speed = loaded_max_speed
        self.boundary_slowdown_distance = boundary_slowdown_distance
        self.boundary_slowdown_factor = boundary_slowdown_factor
        self.exclusion_zones = exclusion_zones

    def validate_move(self, x: float, y: float, z: float, speed: float, vacuum_on: bool):
        if x < self.workspace_min_x:
            raise SafetyViolation(f"X={x} exceeds boundary min X={self.workspace_min_x}")
        if x > self.workspace_max_x:
            raise SafetyViolation(f"X={x} exceeds boundary max X={self.workspace_max_x}")
        if y < self.workspace_min_y:
            raise SafetyViolation(f"Y={y} exceeds boundary min Y={self.workspace_min_y}")
        if y > self.workspace_max_y:
            raise SafetyViolation(f"Y={y} exceeds boundary max Y={self.workspace_max_y}")
        if z < self.workspace_min_z:
            raise SafetyViolation(f"Z={z} exceeds boundary min Z={self.workspace_min_z}")
        if z > self.workspace_max_z:
            raise SafetyViolation(f"Z={z} exceeds boundary max Z={self.workspace_max_z}")

        if speed > self.max_speed:
            raise SafetyViolation(f"Speed {speed} exceeds maximum {self.max_speed}")
        if vacuum_on and speed > self.loaded_max_speed:
            raise SafetyViolation(f"Speed {speed} exceeds loaded maximum {self.loaded_max_speed}")

        for zone in self.exclusion_zones:
            if (
                zone["min_x"] <= x <= zone["max_x"]
                and zone["min_y"] <= y <= zone["max_y"]
                and zone["min_z"] <= z <= zone["max_z"]
            ):
                raise SafetyViolation(
                    f"Target ({x}, {y}, {z}) is inside exclusion zone '{zone['name']}'"
                )

    def apply_boundary_slowdown(self, x: float, y: float, z: float, speed: float) -> float:
        min_distance = min(
            x - self.workspace_min_x,
            self.workspace_max_x - x,
            y - self.workspace_min_y,
            self.workspace_max_y - y,
            z - self.workspace_min_z,
            self.workspace_max_z - z,
        )
        if min_distance <= self.boundary_slowdown_distance:
            return speed * self.boundary_slowdown_factor
        return speed
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
python -m pytest tests/backend/test_safety_validator.py -v
```
Expected: 10 passed

- [ ] **Step 5: Commit**

```bash
git add backend/safety_validator.py tests/backend/test_safety_validator.py
git commit -m "feat: add safety validator with boundary and exclusion zone checks"
```

---

### Task 6: Calibration CRUD

**Files:**
- Create: `backend/calibration.py`
- Create: `tests/backend/test_calibration.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/backend/test_calibration.py
import pytest
from backend.database import initialize_database, get_connection
from backend.calibration import (
    create_calibration_profile,
    list_calibration_profiles,
    get_calibration_profile,
    update_calibration_profile,
    delete_calibration_profile,
)
from backend.models import CalibrationProfileCreate


@pytest.fixture
def test_database_path(tmp_path):
    return str(tmp_path / "test_uarm.db")


@pytest.mark.asyncio
async def test_create_and_list_profiles(test_database_path):
    await initialize_database(test_database_path)
    profile_data = CalibrationProfileCreate(
        profile_name="Test Setup",
        serial_port_path="/dev/ttyUSB0",
    )
    created = await create_calibration_profile(test_database_path, profile_data)
    assert created["id"] == 1
    assert created["profile_name"] == "Test Setup"

    profiles = await list_calibration_profiles(test_database_path)
    assert len(profiles) == 1
    assert profiles[0]["profile_name"] == "Test Setup"


@pytest.mark.asyncio
async def test_get_profile_by_id(test_database_path):
    await initialize_database(test_database_path)
    profile_data = CalibrationProfileCreate(
        profile_name="My Arm",
        serial_port_path="/dev/ttyUSB0",
    )
    created = await create_calibration_profile(test_database_path, profile_data)
    fetched = await get_calibration_profile(test_database_path, created["id"])
    assert fetched["profile_name"] == "My Arm"


@pytest.mark.asyncio
async def test_get_nonexistent_profile_returns_none(test_database_path):
    await initialize_database(test_database_path)
    result = await get_calibration_profile(test_database_path, 999)
    assert result is None


@pytest.mark.asyncio
async def test_update_profile(test_database_path):
    await initialize_database(test_database_path)
    profile_data = CalibrationProfileCreate(
        profile_name="Original",
        serial_port_path="/dev/ttyUSB0",
    )
    created = await create_calibration_profile(test_database_path, profile_data)
    updated_data = CalibrationProfileCreate(
        profile_name="Updated",
        serial_port_path="/dev/ttyUSB0",
        home_offset_x=1.5,
    )
    updated = await update_calibration_profile(test_database_path, created["id"], updated_data)
    assert updated["profile_name"] == "Updated"
    assert updated["home_offset_x"] == 1.5


@pytest.mark.asyncio
async def test_delete_profile(test_database_path):
    await initialize_database(test_database_path)
    profile_data = CalibrationProfileCreate(
        profile_name="To Delete",
        serial_port_path="/dev/ttyUSB0",
    )
    created = await create_calibration_profile(test_database_path, profile_data)
    deleted = await delete_calibration_profile(test_database_path, created["id"])
    assert deleted is True
    profiles = await list_calibration_profiles(test_database_path)
    assert len(profiles) == 0
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python -m pytest tests/backend/test_calibration.py -v
```
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement calibration.py**

```python
# backend/calibration.py
from datetime import datetime, timezone
from backend.database import get_connection
from backend.models import CalibrationProfileCreate


async def create_calibration_profile(database_path: str, data: CalibrationProfileCreate) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    db = await get_connection(database_path)
    try:
        cursor = await db.execute(
            """INSERT INTO calibration_profiles
            (profile_name, serial_port_path, baud_rate,
             home_offset_x, home_offset_y, home_offset_z,
             workspace_min_x, workspace_max_x,
             workspace_min_y, workspace_max_y,
             workspace_min_z, workspace_max_z,
             vacuum_verified, calibrated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                data.profile_name, data.serial_port_path, data.baud_rate,
                data.home_offset_x, data.home_offset_y, data.home_offset_z,
                data.workspace_min_x, data.workspace_max_x,
                data.workspace_min_y, data.workspace_max_y,
                data.workspace_min_z, data.workspace_max_z,
                int(data.vacuum_verified), now,
            ),
        )
        await db.commit()
        return {**data.model_dump(), "id": cursor.lastrowid, "calibrated_at": now}
    finally:
        await db.close()


async def list_calibration_profiles(database_path: str) -> list[dict]:
    db = await get_connection(database_path)
    try:
        cursor = await db.execute("SELECT * FROM calibration_profiles ORDER BY calibrated_at DESC")
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        await db.close()


async def get_calibration_profile(database_path: str, profile_id: int) -> dict | None:
    db = await get_connection(database_path)
    try:
        cursor = await db.execute("SELECT * FROM calibration_profiles WHERE id = ?", (profile_id,))
        row = await cursor.fetchone()
        return dict(row) if row else None
    finally:
        await db.close()


async def update_calibration_profile(database_path: str, profile_id: int, data: CalibrationProfileCreate) -> dict | None:
    now = datetime.now(timezone.utc).isoformat()
    db = await get_connection(database_path)
    try:
        await db.execute(
            """UPDATE calibration_profiles SET
            profile_name=?, serial_port_path=?, baud_rate=?,
            home_offset_x=?, home_offset_y=?, home_offset_z=?,
            workspace_min_x=?, workspace_max_x=?,
            workspace_min_y=?, workspace_max_y=?,
            workspace_min_z=?, workspace_max_z=?,
            vacuum_verified=?, calibrated_at=?
            WHERE id=?""",
            (
                data.profile_name, data.serial_port_path, data.baud_rate,
                data.home_offset_x, data.home_offset_y, data.home_offset_z,
                data.workspace_min_x, data.workspace_max_x,
                data.workspace_min_y, data.workspace_max_y,
                data.workspace_min_z, data.workspace_max_z,
                int(data.vacuum_verified), now, profile_id,
            ),
        )
        await db.commit()
        return {**data.model_dump(), "id": profile_id, "calibrated_at": now}
    finally:
        await db.close()


async def delete_calibration_profile(database_path: str, profile_id: int) -> bool:
    db = await get_connection(database_path)
    try:
        cursor = await db.execute("DELETE FROM calibration_profiles WHERE id = ?", (profile_id,))
        await db.commit()
        return cursor.rowcount > 0
    finally:
        await db.close()
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
python -m pytest tests/backend/test_calibration.py -v
```
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add backend/calibration.py tests/backend/test_calibration.py
git commit -m "feat: add calibration profile CRUD operations"
```

---

### Task 7: Sequence Runner

**Files:**
- Create: `backend/sequence_runner.py`
- Create: `tests/backend/test_sequence_runner.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/backend/test_sequence_runner.py
import pytest
import asyncio
from unittest.mock import MagicMock, AsyncMock
from backend.sequence_runner import SequenceRunner


@pytest.fixture
def mock_serial_manager():
    manager = MagicMock()
    manager.move_to = MagicMock()
    manager.set_vacuum = MagicMock()
    manager.is_connected = True
    return manager


@pytest.fixture
def mock_safety_validator():
    validator = MagicMock()
    validator.validate_move = MagicMock()
    validator.apply_boundary_slowdown = MagicMock(side_effect=lambda x, y, z, speed: speed)
    return validator


@pytest.fixture
def sample_waypoints():
    return [
        {"x": 150, "y": 0, "z": 80, "speed": 100, "vacuum_on": False, "delay_ms": 0},
        {"x": 150, "y": 0, "z": 10, "speed": 50, "vacuum_on": True, "delay_ms": 300},
        {"x": -150, "y": 0, "z": 80, "speed": 100, "vacuum_on": True, "delay_ms": 0},
        {"x": -150, "y": 0, "z": 10, "speed": 50, "vacuum_on": False, "delay_ms": 300},
    ]


@pytest.mark.asyncio
async def test_run_sequence_executes_all_waypoints(mock_serial_manager, mock_safety_validator, sample_waypoints):
    runner = SequenceRunner(mock_serial_manager, mock_safety_validator)
    await runner.run_sequence(sample_waypoints, speed_override=1.0, loop_count=1)
    assert mock_serial_manager.move_to.call_count == 4
    assert mock_serial_manager.set_vacuum.call_count == 3


@pytest.mark.asyncio
async def test_run_sequence_applies_speed_override(mock_serial_manager, mock_safety_validator, sample_waypoints):
    runner = SequenceRunner(mock_serial_manager, mock_safety_validator)
    await runner.run_sequence(sample_waypoints, speed_override=0.5, loop_count=1)
    first_call = mock_serial_manager.move_to.call_args_list[0]
    assert first_call[1]["speed"] == pytest.approx(50.0)


@pytest.mark.asyncio
async def test_run_sequence_loops(mock_serial_manager, mock_safety_validator, sample_waypoints):
    runner = SequenceRunner(mock_serial_manager, mock_safety_validator)
    await runner.run_sequence(sample_waypoints, speed_override=1.0, loop_count=3)
    assert mock_serial_manager.move_to.call_count == 12


@pytest.mark.asyncio
async def test_stop_sequence_halts_execution(mock_serial_manager, mock_safety_validator, sample_waypoints):
    runner = SequenceRunner(mock_serial_manager, mock_safety_validator)

    async def stop_after_short_delay():
        await asyncio.sleep(0.01)
        runner.stop()

    slow_waypoints = [
        {"x": 150, "y": 0, "z": 80, "speed": 100, "vacuum_on": False, "delay_ms": 500},
        {"x": -150, "y": 0, "z": 80, "speed": 100, "vacuum_on": False, "delay_ms": 500},
        {"x": 150, "y": 0, "z": 80, "speed": 100, "vacuum_on": False, "delay_ms": 500},
    ]
    stop_task = asyncio.create_task(stop_after_short_delay())
    await runner.run_sequence(slow_waypoints, speed_override=1.0, loop_count=1)
    await stop_task
    assert mock_serial_manager.move_to.call_count < 3


@pytest.mark.asyncio
async def test_pause_and_resume(mock_serial_manager, mock_safety_validator):
    runner = SequenceRunner(mock_serial_manager, mock_safety_validator)
    assert runner.is_paused is False
    runner.pause()
    assert runner.is_paused is True
    runner.resume()
    assert runner.is_paused is False


@pytest.mark.asyncio
async def test_current_waypoint_index_tracks_progress(mock_serial_manager, mock_safety_validator, sample_waypoints):
    runner = SequenceRunner(mock_serial_manager, mock_safety_validator)
    assert runner.current_waypoint_index == -1
    await runner.run_sequence(sample_waypoints, speed_override=1.0, loop_count=1)
    assert runner.current_waypoint_index == 3
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python -m pytest tests/backend/test_sequence_runner.py -v
```
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement sequence_runner.py**

```python
# backend/sequence_runner.py
import asyncio


class SequenceRunner:
    def __init__(self, serial_manager, safety_validator):
        self._serial_manager = serial_manager
        self._safety_validator = safety_validator
        self._running = False
        self._paused = False
        self._current_waypoint_index = -1

    @property
    def is_running(self) -> bool:
        return self._running

    @property
    def is_paused(self) -> bool:
        return self._paused

    @property
    def current_waypoint_index(self) -> int:
        return self._current_waypoint_index

    def stop(self):
        self._running = False

    def pause(self):
        self._paused = True

    def resume(self):
        self._paused = False

    async def run_sequence(
        self,
        waypoints: list[dict],
        speed_override: float = 1.0,
        loop_count: int = 1,
    ):
        self._running = True
        self._current_waypoint_index = -1
        last_vacuum_state = None

        try:
            for _ in range(loop_count):
                if not self._running:
                    break

                for index, waypoint in enumerate(waypoints):
                    if not self._running:
                        break

                    while self._paused and self._running:
                        await asyncio.sleep(0.05)

                    if not self._running:
                        break

                    self._current_waypoint_index = index

                    adjusted_speed = waypoint["speed"] * speed_override
                    adjusted_speed = self._safety_validator.apply_boundary_slowdown(
                        waypoint["x"], waypoint["y"], waypoint["z"], adjusted_speed
                    )

                    self._safety_validator.validate_move(
                        waypoint["x"], waypoint["y"], waypoint["z"],
                        speed=adjusted_speed,
                        vacuum_on=waypoint["vacuum_on"],
                    )

                    self._serial_manager.move_to(
                        waypoint["x"], waypoint["y"], waypoint["z"],
                        speed=adjusted_speed,
                    )

                    if waypoint["vacuum_on"] != last_vacuum_state:
                        self._serial_manager.set_vacuum(waypoint["vacuum_on"])
                        last_vacuum_state = waypoint["vacuum_on"]

                    if waypoint["delay_ms"] > 0:
                        delay_seconds = waypoint["delay_ms"] / 1000.0
                        elapsed = 0.0
                        while elapsed < delay_seconds and self._running:
                            await asyncio.sleep(min(0.05, delay_seconds - elapsed))
                            elapsed += 0.05
        finally:
            self._running = False
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
python -m pytest tests/backend/test_sequence_runner.py -v
```
Expected: 6 passed

- [ ] **Step 5: Commit**

```bash
git add backend/sequence_runner.py tests/backend/test_sequence_runner.py
git commit -m "feat: add sequence runner with pause/stop/loop support"
```

---

### Task 8: Block Interpreter

**Files:**
- Create: `backend/block_interpreter.py`
- Create: `tests/backend/test_block_interpreter.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/backend/test_block_interpreter.py
import pytest
import asyncio
from unittest.mock import MagicMock
from backend.block_interpreter import BlockInterpreter


@pytest.fixture
def mock_serial_manager():
    manager = MagicMock()
    manager.move_to = MagicMock()
    manager.set_vacuum = MagicMock()
    manager.home = MagicMock()
    manager.is_connected = True
    return manager


@pytest.fixture
def mock_safety_validator():
    validator = MagicMock()
    validator.validate_move = MagicMock()
    validator.apply_boundary_slowdown = MagicMock(side_effect=lambda x, y, z, speed: speed)
    return validator


@pytest.mark.asyncio
async def test_execute_move_to_block(mock_serial_manager, mock_safety_validator):
    interpreter = BlockInterpreter(mock_serial_manager, mock_safety_validator)
    program = [
        {"type": "move_to", "x": 150, "y": 0, "z": 80, "speed": 100},
    ]
    await interpreter.execute(program)
    mock_serial_manager.move_to.assert_called_once_with(150, 0, 80, speed=100)


@pytest.mark.asyncio
async def test_execute_vacuum_blocks(mock_serial_manager, mock_safety_validator):
    interpreter = BlockInterpreter(mock_serial_manager, mock_safety_validator)
    program = [
        {"type": "vacuum_on"},
        {"type": "vacuum_off"},
    ]
    await interpreter.execute(program)
    assert mock_serial_manager.set_vacuum.call_count == 2
    mock_serial_manager.set_vacuum.assert_any_call(True)
    mock_serial_manager.set_vacuum.assert_any_call(False)


@pytest.mark.asyncio
async def test_execute_home_block(mock_serial_manager, mock_safety_validator):
    interpreter = BlockInterpreter(mock_serial_manager, mock_safety_validator)
    program = [{"type": "home"}]
    await interpreter.execute(program)
    mock_serial_manager.home.assert_called_once()


@pytest.mark.asyncio
async def test_execute_wait_block(mock_serial_manager, mock_safety_validator):
    interpreter = BlockInterpreter(mock_serial_manager, mock_safety_validator)
    program = [{"type": "wait", "ms": 100}]
    await interpreter.execute(program)


@pytest.mark.asyncio
async def test_execute_repeat_block(mock_serial_manager, mock_safety_validator):
    interpreter = BlockInterpreter(mock_serial_manager, mock_safety_validator)
    program = [
        {
            "type": "repeat",
            "count": 3,
            "body": [
                {"type": "move_to", "x": 100, "y": 0, "z": 50, "speed": 50},
            ],
        },
    ]
    await interpreter.execute(program)
    assert mock_serial_manager.move_to.call_count == 3


@pytest.mark.asyncio
async def test_execute_move_relative_block(mock_serial_manager, mock_safety_validator):
    mock_serial_manager.get_position = MagicMock(return_value={"x": 100, "y": 0, "z": 50})
    interpreter = BlockInterpreter(mock_serial_manager, mock_safety_validator)
    program = [
        {"type": "move_relative", "dx": 10, "dy": 5, "dz": -20, "speed": 50},
    ]
    await interpreter.execute(program)
    mock_serial_manager.move_to.assert_called_once_with(110, 5, 30, speed=50)


@pytest.mark.asyncio
async def test_execute_set_speed_block(mock_serial_manager, mock_safety_validator):
    interpreter = BlockInterpreter(mock_serial_manager, mock_safety_validator)
    program = [
        {"type": "set_speed", "speed": 75},
        {"type": "move_to", "x": 100, "y": 0, "z": 50},
    ]
    await interpreter.execute(program)
    mock_serial_manager.move_to.assert_called_once_with(100, 0, 50, speed=75)


@pytest.mark.asyncio
async def test_stop_halts_execution(mock_serial_manager, mock_safety_validator):
    interpreter = BlockInterpreter(mock_serial_manager, mock_safety_validator)
    program = [
        {"type": "wait", "ms": 500},
        {"type": "move_to", "x": 100, "y": 0, "z": 50, "speed": 50},
    ]

    async def stop_soon():
        await asyncio.sleep(0.01)
        interpreter.stop()

    stop_task = asyncio.create_task(stop_soon())
    await interpreter.execute(program)
    await stop_task
    assert mock_serial_manager.move_to.call_count == 0


@pytest.mark.asyncio
async def test_convert_to_python_script(mock_serial_manager, mock_safety_validator):
    interpreter = BlockInterpreter(mock_serial_manager, mock_safety_validator)
    program = [
        {"type": "move_to", "x": 150, "y": 0, "z": 80, "speed": 100},
        {"type": "vacuum_on"},
        {"type": "wait", "ms": 300},
        {"type": "repeat", "count": 2, "body": [
            {"type": "move_to", "x": 0, "y": 0, "z": 50, "speed": 50},
        ]},
    ]
    script = interpreter.convert_to_python(program)
    assert "arm.move_to(150, 0, 80, speed=100)" in script
    assert "arm.set_vacuum(True)" in script
    assert "time.sleep(0.3)" in script
    assert "for _ in range(2):" in script
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python -m pytest tests/backend/test_block_interpreter.py -v
```
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement block_interpreter.py**

```python
# backend/block_interpreter.py
import asyncio


class BlockInterpreter:
    def __init__(self, serial_manager, safety_validator):
        self._serial_manager = serial_manager
        self._safety_validator = safety_validator
        self._running = False
        self._current_speed = 100.0
        self._execution_log: list[str] = []

    @property
    def is_running(self) -> bool:
        return self._running

    @property
    def execution_log(self) -> list[str]:
        return self._execution_log

    def stop(self):
        self._running = False

    async def execute(self, program: list[dict]):
        self._running = True
        self._current_speed = 100.0
        self._execution_log = []
        try:
            await self._execute_blocks(program)
        finally:
            self._running = False

    async def _execute_blocks(self, blocks: list[dict]):
        for block in blocks:
            if not self._running:
                return
            await self._execute_block(block)

    async def _execute_block(self, block: dict):
        block_type = block["type"]

        if block_type == "move_to":
            speed = block.get("speed", self._current_speed)
            self._safety_validator.validate_move(
                block["x"], block["y"], block["z"],
                speed=speed, vacuum_on=False,
            )
            self._serial_manager.move_to(block["x"], block["y"], block["z"], speed=speed)
            self._execution_log.append(f"move_to({block['x']}, {block['y']}, {block['z']})")

        elif block_type == "move_relative":
            position = self._serial_manager.get_position()
            target_x = position["x"] + block["dx"]
            target_y = position["y"] + block["dy"]
            target_z = position["z"] + block["dz"]
            speed = block.get("speed", self._current_speed)
            self._safety_validator.validate_move(
                target_x, target_y, target_z, speed=speed, vacuum_on=False,
            )
            self._serial_manager.move_to(target_x, target_y, target_z, speed=speed)

        elif block_type == "vacuum_on":
            self._serial_manager.set_vacuum(True)

        elif block_type == "vacuum_off":
            self._serial_manager.set_vacuum(False)

        elif block_type == "home":
            self._serial_manager.home()

        elif block_type == "set_speed":
            self._current_speed = block["speed"]

        elif block_type == "wait":
            delay_seconds = block["ms"] / 1000.0
            elapsed = 0.0
            while elapsed < delay_seconds and self._running:
                await asyncio.sleep(min(0.05, delay_seconds - elapsed))
                elapsed += 0.05

        elif block_type == "repeat":
            count = block["count"]
            body = block["body"]
            for _ in range(count):
                if not self._running:
                    return
                await self._execute_blocks(body)

        elif block_type == "log":
            self._execution_log.append(block.get("message", ""))

    def convert_to_python(self, program: list[dict], indent: int = 0) -> str:
        lines = []
        if indent == 0:
            lines.append("import time")
            lines.append("from uarm_sdk import UarmSwiftPro")
            lines.append("")
            lines.append("arm = UarmSwiftPro()")
            lines.append("arm.connect()")
            lines.append("")

        prefix = "    " * indent
        for block in program:
            block_type = block["type"]

            if block_type == "move_to":
                speed = block.get("speed", 100)
                lines.append(f"{prefix}arm.move_to({block['x']}, {block['y']}, {block['z']}, speed={speed})")

            elif block_type == "move_relative":
                speed = block.get("speed", 100)
                lines.append(f"{prefix}arm.move_relative({block['dx']}, {block['dy']}, {block['dz']}, speed={speed})")

            elif block_type == "vacuum_on":
                lines.append(f"{prefix}arm.set_vacuum(True)")

            elif block_type == "vacuum_off":
                lines.append(f"{prefix}arm.set_vacuum(False)")

            elif block_type == "home":
                lines.append(f"{prefix}arm.home()")

            elif block_type == "set_speed":
                lines.append(f"{prefix}arm.set_speed({block['speed']})")

            elif block_type == "wait":
                seconds = block["ms"] / 1000.0
                lines.append(f"{prefix}time.sleep({seconds})")

            elif block_type == "repeat":
                lines.append(f"{prefix}for _ in range({block['count']}):")
                body_code = self.convert_to_python(block["body"], indent + 1)
                lines.append(body_code)

            elif block_type == "log":
                lines.append(f"{prefix}print({block.get('message', '')!r})")

        return "\n".join(lines)
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
python -m pytest tests/backend/test_block_interpreter.py -v
```
Expected: 9 passed

- [ ] **Step 5: Commit**

```bash
git add backend/block_interpreter.py tests/backend/test_block_interpreter.py
git commit -m "feat: add block interpreter for visual scripting execution"
```

---

### Task 9: FastAPI App & REST Routers

**Files:**
- Create: `backend/main.py`
- Create: `backend/routers/serial_routes.py`
- Create: `backend/routers/calibration_routes.py`
- Create: `backend/routers/sequence_routes.py`
- Create: `backend/routers/safety_routes.py`
- Create: `backend/routers/script_routes.py`
- Create: `backend/routers/websocket_routes.py`

- [ ] **Step 1: Implement main.py**

```python
# backend/main.py
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import initialize_database, get_database_path
from backend.serial_manager import SerialManager
from backend.safety_validator import SafetyValidator
from backend.sequence_runner import SequenceRunner
from backend.block_interpreter import BlockInterpreter

serial_manager = SerialManager()
safety_validator: SafetyValidator | None = None
sequence_runner: SequenceRunner | None = None
block_interpreter: BlockInterpreter | None = None


def create_default_safety_validator() -> SafetyValidator:
    return SafetyValidator(
        workspace_min_x=-350.0, workspace_max_x=350.0,
        workspace_min_y=-350.0, workspace_max_y=350.0,
        workspace_min_z=0.0, workspace_max_z=150.0,
        max_speed=200.0, loaded_max_speed=100.0,
        boundary_slowdown_distance=10.0,
        boundary_slowdown_factor=0.25,
        exclusion_zones=[],
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    global safety_validator, sequence_runner, block_interpreter
    await initialize_database()
    safety_validator = create_default_safety_validator()
    sequence_runner = SequenceRunner(serial_manager, safety_validator)
    block_interpreter = BlockInterpreter(serial_manager, safety_validator)
    yield
    if serial_manager.is_connected:
        serial_manager.disconnect()


app = FastAPI(title="uARM Swift Pro Control", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from backend.routers.serial_routes import router as serial_router
from backend.routers.calibration_routes import router as calibration_router
from backend.routers.sequence_routes import router as sequence_router
from backend.routers.safety_routes import router as safety_router
from backend.routers.script_routes import router as script_router
from backend.routers.websocket_routes import router as websocket_router

app.include_router(serial_router, prefix="/api/serial", tags=["serial"])
app.include_router(calibration_router, prefix="/api/calibration", tags=["calibration"])
app.include_router(sequence_router, prefix="/api/sequences", tags=["sequences"])
app.include_router(safety_router, prefix="/api/safety", tags=["safety"])
app.include_router(script_router, prefix="/api/scripts", tags=["scripts"])
app.include_router(websocket_router, tags=["websocket"])


@app.get("/api/status")
async def get_status():
    return {
        "connected": serial_manager.is_connected,
        "vacuum_on": serial_manager.vacuum_on,
        "sequence_running": sequence_runner.is_running if sequence_runner else False,
    }
```

- [ ] **Step 2: Implement serial_routes.py**

```python
# backend/routers/serial_routes.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.main import serial_manager

router = APIRouter()


class ConnectRequest(BaseModel):
    port: str
    baud_rate: int = 115200


@router.get("/ports")
async def list_serial_ports():
    return serial_manager.list_ports()


@router.post("/connect")
async def connect_serial(request: ConnectRequest):
    try:
        serial_manager.connect(request.port, request.baud_rate)
        return {"status": "connected", "port": request.port}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/disconnect")
async def disconnect_serial():
    serial_manager.disconnect()
    return {"status": "disconnected"}
```

- [ ] **Step 3: Implement calibration_routes.py**

```python
# backend/routers/calibration_routes.py
from fastapi import APIRouter, HTTPException
from backend.database import get_database_path
from backend.models import CalibrationProfileCreate
from backend.calibration import (
    create_calibration_profile,
    list_calibration_profiles,
    get_calibration_profile,
    update_calibration_profile,
    delete_calibration_profile,
)

router = APIRouter()


@router.get("/profiles")
async def list_profiles():
    return await list_calibration_profiles(get_database_path())


@router.post("/profiles")
async def create_profile(data: CalibrationProfileCreate):
    return await create_calibration_profile(get_database_path(), data)


@router.get("/profiles/{profile_id}")
async def get_profile(profile_id: int):
    profile = await get_calibration_profile(get_database_path(), profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.put("/profiles/{profile_id}")
async def update_profile(profile_id: int, data: CalibrationProfileCreate):
    result = await update_calibration_profile(get_database_path(), profile_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Profile not found")
    return result


@router.delete("/profiles/{profile_id}")
async def delete_profile(profile_id: int):
    deleted = await delete_calibration_profile(get_database_path(), profile_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"status": "deleted"}
```

- [ ] **Step 4: Implement sequence_routes.py**

```python
# backend/routers/sequence_routes.py
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from backend.database import get_database_path, get_connection
from backend.models import SequenceCreate, WaypointCreate
from backend.main import sequence_runner

router = APIRouter()


@router.get("")
async def list_sequences():
    db = await get_connection(get_database_path())
    try:
        cursor = await db.execute("SELECT * FROM sequences ORDER BY updated_at DESC")
        return [dict(row) for row in await cursor.fetchall()]
    finally:
        await db.close()


@router.post("")
async def create_sequence(data: SequenceCreate):
    now = datetime.now(timezone.utc).isoformat()
    db = await get_connection(get_database_path())
    try:
        cursor = await db.execute(
            "INSERT INTO sequences (name, description, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (data.name, data.description, now, now),
        )
        await db.commit()
        return {"id": cursor.lastrowid, "name": data.name, "description": data.description, "created_at": now, "updated_at": now}
    finally:
        await db.close()


@router.get("/{sequence_id}")
async def get_sequence(sequence_id: int):
    db = await get_connection(get_database_path())
    try:
        cursor = await db.execute("SELECT * FROM sequences WHERE id = ?", (sequence_id,))
        seq = await cursor.fetchone()
        if not seq:
            raise HTTPException(status_code=404, detail="Sequence not found")
        cursor = await db.execute(
            "SELECT * FROM waypoints WHERE sequence_id = ? ORDER BY order_index", (sequence_id,)
        )
        waypoints = [dict(row) for row in await cursor.fetchall()]
        return {**dict(seq), "waypoints": waypoints}
    finally:
        await db.close()


@router.put("/{sequence_id}")
async def update_sequence(sequence_id: int, data: dict):
    now = datetime.now(timezone.utc).isoformat()
    db = await get_connection(get_database_path())
    try:
        if "name" in data or "description" in data:
            await db.execute(
                "UPDATE sequences SET name=COALESCE(?, name), description=COALESCE(?, description), updated_at=? WHERE id=?",
                (data.get("name"), data.get("description"), now, sequence_id),
            )

        if "waypoints" in data:
            await db.execute("DELETE FROM waypoints WHERE sequence_id = ?", (sequence_id,))
            for index, wp in enumerate(data["waypoints"]):
                await db.execute(
                    "INSERT INTO waypoints (sequence_id, order_index, x, y, z, speed, vacuum_on, delay_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (sequence_id, index, wp["x"], wp["y"], wp["z"], wp.get("speed", 50), int(wp.get("vacuum_on", False)), wp.get("delay_ms", 0)),
                )

        await db.commit()
        return {"status": "updated", "id": sequence_id}
    finally:
        await db.close()


@router.delete("/{sequence_id}")
async def delete_sequence(sequence_id: int):
    db = await get_connection(get_database_path())
    try:
        cursor = await db.execute("DELETE FROM sequences WHERE id = ?", (sequence_id,))
        await db.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Sequence not found")
        return {"status": "deleted"}
    finally:
        await db.close()


@router.post("/{sequence_id}/run")
async def run_sequence(sequence_id: int, speed_override: float = 1.0, loop_count: int = 1):
    db = await get_connection(get_database_path())
    try:
        cursor = await db.execute(
            "SELECT * FROM waypoints WHERE sequence_id = ? ORDER BY order_index", (sequence_id,)
        )
        waypoints = [dict(row) for row in await cursor.fetchall()]
    finally:
        await db.close()

    if not waypoints:
        raise HTTPException(status_code=400, detail="Sequence has no waypoints")

    import asyncio
    asyncio.create_task(
        sequence_runner.run_sequence(waypoints, speed_override=speed_override, loop_count=loop_count)
    )
    return {"status": "started", "waypoint_count": len(waypoints)}


@router.post("/stop")
async def stop_sequence():
    if sequence_runner:
        sequence_runner.stop()
    return {"status": "stopped"}


@router.get("/{sequence_id}/export")
async def export_sequence(sequence_id: int):
    db = await get_connection(get_database_path())
    try:
        cursor = await db.execute("SELECT * FROM sequences WHERE id = ?", (sequence_id,))
        seq = await cursor.fetchone()
        if not seq:
            raise HTTPException(status_code=404, detail="Sequence not found")
        cursor = await db.execute(
            "SELECT x, y, z, speed, vacuum_on, delay_ms FROM waypoints WHERE sequence_id = ? ORDER BY order_index",
            (sequence_id,),
        )
        waypoints = [dict(row) for row in await cursor.fetchall()]
        return JSONResponse(content={
            "name": seq["name"],
            "description": seq["description"],
            "waypoints": waypoints,
        })
    finally:
        await db.close()


@router.post("/import")
async def import_sequence(data: dict):
    now = datetime.now(timezone.utc).isoformat()
    db = await get_connection(get_database_path())
    try:
        cursor = await db.execute(
            "INSERT INTO sequences (name, description, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (data["name"], data.get("description", ""), now, now),
        )
        sequence_id = cursor.lastrowid
        for index, wp in enumerate(data["waypoints"]):
            await db.execute(
                "INSERT INTO waypoints (sequence_id, order_index, x, y, z, speed, vacuum_on, delay_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (sequence_id, index, wp["x"], wp["y"], wp["z"], wp.get("speed", 50), int(wp.get("vacuum_on", False)), wp.get("delay_ms", 0)),
            )
        await db.commit()
        return {"status": "imported", "id": sequence_id}
    finally:
        await db.close()
```

- [ ] **Step 5: Implement safety_routes.py**

```python
# backend/routers/safety_routes.py
from fastapi import APIRouter
from backend.database import get_database_path, get_connection
from backend.models import SafetyConfig, ExclusionZoneCreate
from backend.main import safety_validator
from backend.safety_validator import SafetyValidator

router = APIRouter()


@router.get("/config")
async def get_safety_config():
    db = await get_connection(get_database_path())
    try:
        cursor = await db.execute("SELECT * FROM safety_config WHERE id = 1")
        config = dict(await cursor.fetchone())
        cursor = await db.execute("SELECT * FROM exclusion_zones")
        zones = [dict(row) for row in await cursor.fetchall()]
        return {"config": config, "exclusion_zones": zones}
    finally:
        await db.close()


@router.put("/config")
async def update_safety_config(data: SafetyConfig):
    import backend.main as main_module
    db = await get_connection(get_database_path())
    try:
        await db.execute(
            """UPDATE safety_config SET
            max_speed=?, boundary_slowdown_distance=?,
            boundary_slowdown_factor=?, loaded_max_speed=?,
            estop_release_vacuum=?
            WHERE id=1""",
            (data.max_speed, data.boundary_slowdown_distance,
             data.boundary_slowdown_factor, data.loaded_max_speed,
             int(data.estop_release_vacuum)),
        )
        await db.commit()
    finally:
        await db.close()

    cursor_zones = await (await get_connection(get_database_path())).execute("SELECT * FROM exclusion_zones")
    zones = [dict(row) for row in await cursor_zones.fetchall()]

    main_module.safety_validator = SafetyValidator(
        workspace_min_x=-350.0, workspace_max_x=350.0,
        workspace_min_y=-350.0, workspace_max_y=350.0,
        workspace_min_z=0.0, workspace_max_z=150.0,
        max_speed=data.max_speed,
        loaded_max_speed=data.loaded_max_speed,
        boundary_slowdown_distance=data.boundary_slowdown_distance,
        boundary_slowdown_factor=data.boundary_slowdown_factor,
        exclusion_zones=zones,
    )
    return {"status": "updated"}


@router.post("/exclusion-zones")
async def add_exclusion_zone(data: ExclusionZoneCreate):
    db = await get_connection(get_database_path())
    try:
        cursor = await db.execute(
            "INSERT INTO exclusion_zones (name, min_x, max_x, min_y, max_y, min_z, max_z) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (data.name, data.min_x, data.max_x, data.min_y, data.max_y, data.min_z, data.max_z),
        )
        await db.commit()
        return {"id": cursor.lastrowid, **data.model_dump()}
    finally:
        await db.close()


@router.delete("/exclusion-zones/{zone_id}")
async def delete_exclusion_zone(zone_id: int):
    db = await get_connection(get_database_path())
    try:
        await db.execute("DELETE FROM exclusion_zones WHERE id = ?", (zone_id,))
        await db.commit()
        return {"status": "deleted"}
    finally:
        await db.close()
```

- [ ] **Step 6: Implement script_routes.py**

```python
# backend/routers/script_routes.py
import asyncio
from fastapi import APIRouter, HTTPException
from backend.main import block_interpreter

router = APIRouter()


@router.post("/run")
async def run_script(data: dict):
    program = data.get("program", [])
    if not program:
        raise HTTPException(status_code=400, detail="Empty program")
    asyncio.create_task(block_interpreter.execute(program))
    return {"status": "started"}


@router.post("/stop")
async def stop_script():
    if block_interpreter:
        block_interpreter.stop()
    return {"status": "stopped"}


@router.post("/export-python")
async def export_python(data: dict):
    program = data.get("program", [])
    if not program:
        raise HTTPException(status_code=400, detail="Empty program")
    script = block_interpreter.convert_to_python(program)
    return {"script": script}
```

- [ ] **Step 7: Implement websocket_routes.py**

```python
# backend/routers/websocket_routes.py
import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.main import serial_manager, safety_validator
from backend.safety_validator import SafetyViolation

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    position_task = None

    async def stream_position():
        while True:
            try:
                if serial_manager.is_connected:
                    position = serial_manager.get_position()
                    await ws.send_json({
                        "type": "position",
                        "x": position["x"],
                        "y": position["y"],
                        "z": position["z"],
                        "rotation": 0.0,
                        "vacuum_on": serial_manager.vacuum_on,
                        "connected": True,
                    })
                else:
                    await ws.send_json({
                        "type": "position",
                        "x": 0, "y": 0, "z": 0, "rotation": 0,
                        "vacuum_on": False, "connected": False,
                    })
                await asyncio.sleep(0.1)
            except Exception:
                break

    try:
        position_task = asyncio.create_task(stream_position())

        while True:
            raw = await ws.receive_text()
            message = json.loads(raw)
            msg_type = message.get("type")

            try:
                if msg_type == "jog":
                    axis = message["axis"]
                    distance = message["distance"]
                    speed = message.get("speed", 50)
                    position = serial_manager.get_position()
                    target = dict(position)
                    target[axis] = position[axis] + distance
                    safety_validator.validate_move(
                        target["x"], target["y"], target["z"],
                        speed=speed, vacuum_on=serial_manager.vacuum_on,
                    )
                    speed = safety_validator.apply_boundary_slowdown(
                        target["x"], target["y"], target["z"], speed
                    )
                    serial_manager.move_to(target["x"], target["y"], target["z"], speed=speed)

                elif msg_type == "move_to":
                    x, y, z = message["x"], message["y"], message["z"]
                    speed = message.get("speed", 100)
                    safety_validator.validate_move(x, y, z, speed=speed, vacuum_on=serial_manager.vacuum_on)
                    speed = safety_validator.apply_boundary_slowdown(x, y, z, speed)
                    serial_manager.move_to(x, y, z, speed=speed)

                elif msg_type == "vacuum":
                    serial_manager.set_vacuum(message["state"])

                elif msg_type == "emergency_stop":
                    serial_manager.emergency_stop()
                    await ws.send_json({"type": "emergency_stop", "status": "stopped"})

                elif msg_type == "home":
                    serial_manager.home()

                await ws.send_json({"type": "ack", "command": msg_type, "status": "ok"})

            except SafetyViolation as e:
                await ws.send_json({"type": "error", "command": msg_type, "message": str(e)})
            except ConnectionError as e:
                await ws.send_json({"type": "error", "command": msg_type, "message": str(e)})

    except WebSocketDisconnect:
        pass
    finally:
        if position_task:
            position_task.cancel()
```

- [ ] **Step 8: Verify backend starts**

```bash
cd "/Users/lambertrulindana/Documents/MADAGASCAR_UNIPOD/uARM SwfitPro"
source backend/.venv/bin/activate
python -c "from backend.main import app; print(f'Routes: {len(app.routes)}')"
```
Expected: prints route count without errors

- [ ] **Step 9: Commit**

```bash
git add backend/main.py backend/routers/
git commit -m "feat: add FastAPI app with all REST and WebSocket routes"
```

---

## Phase 2: Frontend Foundation

### Task 10: Next.js Project Setup

**Files:**
- Create: `frontend/` (scaffolded by create-next-app)

- [ ] **Step 1: Scaffold Next.js project**

```bash
cd "/Users/lambertrulindana/Documents/MADAGASCAR_UNIPOD/uARM SwfitPro"
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm --yes
```

- [ ] **Step 2: Install dependencies**

```bash
cd "/Users/lambertrulindana/Documents/MADAGASCAR_UNIPOD/uARM SwfitPro/frontend"
npm install three @react-three/fiber @react-three/drei blockly
npm install -D @types/three
```

- [ ] **Step 3: Initialize shadcn/ui**

```bash
cd "/Users/lambertrulindana/Documents/MADAGASCAR_UNIPOD/uARM SwfitPro/frontend"
npx shadcn@latest init --defaults --yes
```

- [ ] **Step 4: Add shadcn components**

```bash
npx shadcn@latest add button slider card tabs badge input label dialog select separator toast -y
```

- [ ] **Step 5: Verify dev server starts**

```bash
cd "/Users/lambertrulindana/Documents/MADAGASCAR_UNIPOD/uARM SwfitPro/frontend"
npm run build
```
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
cd "/Users/lambertrulindana/Documents/MADAGASCAR_UNIPOD/uARM SwfitPro"
git add frontend/
git commit -m "feat: scaffold Next.js frontend with Three.js, Blockly, and shadcn/ui"
```

---

### Task 11: Shared Types & API Client

**Files:**
- Create: `frontend/lib/types.ts`
- Create: `frontend/lib/api.ts`
- Create: `frontend/lib/websocket.ts`

- [ ] **Step 1: Write TypeScript types**

```typescript
// frontend/lib/types.ts
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
}

export interface WebSocketCommand {
  type: "jog" | "move_to" | "vacuum" | "emergency_stop" | "home";
  [key: string]: unknown;
}

export interface WebSocketResponse {
  type: "position" | "ack" | "error" | "emergency_stop";
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
```

- [ ] **Step 2: Write REST API client**

```typescript
// frontend/lib/api.ts
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

  listSerialPorts: () => request<{ device: string; description: string }[]>("/api/serial/ports"),
  connectSerial: (port: string, baud_rate = 115200) =>
    request("/api/serial/connect", { method: "POST", body: JSON.stringify({ port, baud_rate }) }),
  disconnectSerial: () => request("/api/serial/disconnect", { method: "POST" }),

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
    request("/api/sequences", { method: "POST", body: JSON.stringify(data) }),
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
};
```

- [ ] **Step 3: Write WebSocket client**

```typescript
// frontend/lib/websocket.ts
import { ArmPosition, WebSocketCommand, WebSocketResponse } from "./types";

type PositionListener = (position: ArmPosition) => void;
type ErrorListener = (error: { command: string; message: string }) => void;
type ConnectionListener = (connected: boolean) => void;

class RobotWebSocket {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private positionListeners: Set<PositionListener> = new Set();
  private errorListeners: Set<ErrorListener> = new Set();
  private connectionListeners: Set<ConnectionListener> = new Set();
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
      this.connectionListeners.forEach((listener) => listener(true));
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      const data: WebSocketResponse = JSON.parse(event.data);
      this.missedHeartbeats = 0;

      if (data.type === "position") {
        const position = data as unknown as ArmPosition;
        this.positionListeners.forEach((listener) => listener(position));
      } else if (data.type === "error") {
        this.errorListeners.forEach((listener) =>
          listener({ command: data.command as string, message: data.message as string })
        );
      }
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      this.connectionListeners.forEach((listener) => listener(false));
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
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

  onPosition(listener: PositionListener) {
    this.positionListeners.add(listener);
    return () => this.positionListeners.delete(listener);
  }

  onError(listener: ErrorListener) {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  onConnection(listener: ConnectionListener) {
    this.connectionListeners.add(listener);
    return () => this.connectionListeners.delete(listener);
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.missedHeartbeats++;
      if (this.missedHeartbeats >= 3) {
        this.ws?.close();
      }
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
```

- [ ] **Step 4: Commit**

```bash
cd "/Users/lambertrulindana/Documents/MADAGASCAR_UNIPOD/uARM SwfitPro"
git add frontend/lib/
git commit -m "feat: add TypeScript types, REST API client, and WebSocket client"
```

---

### Task 12: Emergency Stop & Layout

**Files:**
- Create: `frontend/components/emergency-stop.tsx`
- Create: `frontend/components/connection-status.tsx`
- Modify: `frontend/app/layout.tsx`

- [ ] **Step 1: Write emergency stop component**

```tsx
// frontend/components/emergency-stop.tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { robotSocket } from "@/lib/websocket";

export function EmergencyStop() {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        robotSocket.emergencyStop();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <Button
      variant="destructive"
      size="lg"
      className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 text-lg rounded-full shadow-lg"
      onClick={() => robotSocket.emergencyStop()}
    >
      EMERGENCY STOP
    </Button>
  );
}
```

- [ ] **Step 2: Write connection status component**

```tsx
// frontend/components/connection-status.tsx
"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { robotSocket } from "@/lib/websocket";

export function ConnectionStatus() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    robotSocket.connect();
    const unsubscribe = robotSocket.onConnection(setConnected);
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <Badge variant={connected ? "default" : "secondary"}>
      {connected ? "Connected" : "Disconnected"}
    </Badge>
  );
}
```

- [ ] **Step 3: Update root layout**

```tsx
// frontend/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { EmergencyStop } from "@/components/emergency-stop";
import { ConnectionStatus } from "@/components/connection-status";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "uARM Swift Pro Control",
  description: "Control platform for uARM Swift Pro robot arm",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <header className="border-b bg-background sticky top-0 z-50">
          <div className="container mx-auto flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-6">
              <h1 className="text-xl font-bold">uARM Control</h1>
              <nav className="flex gap-4">
                <Link href="/" className="text-sm hover:underline">Dashboard</Link>
                <Link href="/calibrate" className="text-sm hover:underline">Calibrate</Link>
                <Link href="/control" className="text-sm hover:underline">Control</Link>
                <Link href="/teach" className="text-sm hover:underline">Teach</Link>
                <Link href="/scripts" className="text-sm hover:underline">Scripts</Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <ConnectionStatus />
              <EmergencyStop />
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd "/Users/lambertrulindana/Documents/MADAGASCAR_UNIPOD/uARM SwfitPro"
git add frontend/components/emergency-stop.tsx frontend/components/connection-status.tsx frontend/app/layout.tsx
git commit -m "feat: add app layout with emergency stop and connection status"
```

---

### Task 13: Dashboard Page

**Files:**
- Modify: `frontend/app/page.tsx`

- [ ] **Step 1: Write dashboard page**

```tsx
// frontend/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { SerialPort } from "@/lib/types";
import Link from "next/link";

export default function DashboardPage() {
  const [serialPorts, setSerialPorts] = useState<SerialPort[]>([]);
  const [selectedPort, setSelectedPort] = useState("");
  const [connected, setConnected] = useState(false);
  const [sequenceRunning, setSequenceRunning] = useState(false);

  useEffect(() => {
    refreshStatus();
    refreshPorts();
  }, []);

  async function refreshStatus() {
    try {
      const status = await api.getStatus();
      setConnected(status.connected);
      setSequenceRunning(status.sequence_running);
    } catch {
      setConnected(false);
    }
  }

  async function refreshPorts() {
    try {
      const ports = await api.listSerialPorts();
      setSerialPorts(ports);
      if (ports.length > 0 && !selectedPort) {
        setSelectedPort(ports[0].device);
      }
    } catch {
      setSerialPorts([]);
    }
  }

  async function handleConnect() {
    if (!selectedPort) return;
    try {
      await api.connectSerial(selectedPort);
      setConnected(true);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Connection failed");
    }
  }

  async function handleDisconnect() {
    await api.disconnectSerial();
    setConnected(false);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>

      <Card>
        <CardHeader>
          <CardTitle>Serial Connection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Serial Port</label>
              <Select value={selectedPort} onValueChange={setSelectedPort}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a port" />
                </SelectTrigger>
                <SelectContent>
                  {serialPorts.map((port) => (
                    <SelectItem key={port.device} value={port.device}>
                      {port.device} — {port.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={refreshPorts} variant="outline">Refresh</Button>
            {connected ? (
              <Button onClick={handleDisconnect} variant="destructive">Disconnect</Button>
            ) : (
              <Button onClick={handleConnect}>Connect</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/calibrate">
          <Card className="hover:border-primary cursor-pointer transition-colors">
            <CardHeader><CardTitle className="text-lg">Calibrate</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">Set up and calibrate the robot arm</p></CardContent>
          </Card>
        </Link>
        <Link href="/control">
          <Card className="hover:border-primary cursor-pointer transition-colors">
            <CardHeader><CardTitle className="text-lg">Control</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">Manual jog and 3D visualization</p></CardContent>
          </Card>
        </Link>
        <Link href="/teach">
          <Card className="hover:border-primary cursor-pointer transition-colors">
            <CardHeader><CardTitle className="text-lg">Teach & Replay</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">Record and replay waypoint sequences</p></CardContent>
          </Card>
        </Link>
        <Link href="/scripts">
          <Card className="hover:border-primary cursor-pointer transition-colors">
            <CardHeader><CardTitle className="text-lg">Scripts</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">Visual block-based programming</p></CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd "/Users/lambertrulindana/Documents/MADAGASCAR_UNIPOD/uARM SwfitPro/frontend"
npm run build
```
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
cd "/Users/lambertrulindana/Documents/MADAGASCAR_UNIPOD/uARM SwfitPro"
git add frontend/app/page.tsx
git commit -m "feat: add dashboard page with serial connection UI"
```

---

## Phase 3: Control Page (Jog + 3D + Vacuum)

### Task 14: Position Display Component

**Files:**
- Create: `frontend/components/position-display.tsx`

- [ ] **Step 1: Write position display**

```tsx
// frontend/components/position-display.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { robotSocket } from "@/lib/websocket";
import { ArmPosition } from "@/lib/types";

export function PositionDisplay() {
  const [position, setPosition] = useState<ArmPosition>({
    x: 0, y: 0, z: 0, rotation: 0, vacuum_on: false, connected: false,
  });

  useEffect(() => {
    const unsubscribe = robotSocket.onPosition(setPosition);
    return unsubscribe;
  }, []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Position</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-xs text-muted-foreground">X</div>
            <div className="text-lg font-mono font-bold">{position.x.toFixed(1)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Y</div>
            <div className="text-lg font-mono font-bold">{position.y.toFixed(1)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Z</div>
            <div className="text-lg font-mono font-bold">{position.z.toFixed(1)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">R</div>
            <div className="text-lg font-mono font-bold">{position.rotation.toFixed(1)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/position-display.tsx
git commit -m "feat: add live position display component"
```

---

### Task 15: Jog Panel Component

**Files:**
- Create: `frontend/components/jog-panel.tsx`

- [ ] **Step 1: Write jog panel**

```tsx
// frontend/components/jog-panel.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { robotSocket } from "@/lib/websocket";

const STEP_SIZES = [0.5, 1, 5, 10];

export function JogPanel() {
  const [stepSize, setStepSize] = useState(5);
  const [speed, setSpeed] = useState(50);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement) return;
      switch (event.key) {
        case "ArrowRight": robotSocket.jog("x", stepSize, speed); break;
        case "ArrowLeft": robotSocket.jog("x", -stepSize, speed); break;
        case "ArrowUp": robotSocket.jog("y", stepSize, speed); break;
        case "ArrowDown": robotSocket.jog("y", -stepSize, speed); break;
        case "PageUp": robotSocket.jog("z", stepSize, speed); break;
        case "PageDown": robotSocket.jog("z", -stepSize, speed); break;
        case " ":
          event.preventDefault();
          robotSocket.setVacuum(true);
          break;
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [stepSize, speed]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Jog Control</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <div />
          <Button variant="outline" size="sm" onClick={() => robotSocket.jog("y", stepSize, speed)}>Y+</Button>
          <div />
          <Button variant="outline" size="sm" onClick={() => robotSocket.jog("x", -stepSize, speed)}>X-</Button>
          <Button variant="outline" size="sm" onClick={() => robotSocket.home()}>Home</Button>
          <Button variant="outline" size="sm" onClick={() => robotSocket.jog("x", stepSize, speed)}>X+</Button>
          <div />
          <Button variant="outline" size="sm" onClick={() => robotSocket.jog("y", -stepSize, speed)}>Y-</Button>
          <div />
        </div>

        <div className="flex gap-2 justify-center">
          <Button variant="outline" size="sm" onClick={() => robotSocket.jog("z", stepSize, speed)}>Z+</Button>
          <Button variant="outline" size="sm" onClick={() => robotSocket.jog("z", -stepSize, speed)}>Z-</Button>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Step Size (mm)</label>
          <div className="flex gap-1 mt-1">
            {STEP_SIZES.map((size) => (
              <Button
                key={size}
                variant={stepSize === size ? "default" : "outline"}
                size="sm"
                onClick={() => setStepSize(size)}
              >
                {size}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Speed: {speed} mm/s</label>
          <Slider
            value={[speed]}
            onValueChange={([value]) => setSpeed(value)}
            min={10}
            max={200}
            step={10}
            className="mt-1"
          />
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/jog-panel.tsx
git commit -m "feat: add jog panel with keyboard shortcuts"
```

---

### Task 16: Coordinate Input Component

**Files:**
- Create: `frontend/components/coordinate-input.tsx`

- [ ] **Step 1: Write coordinate input**

```tsx
// frontend/components/coordinate-input.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { robotSocket } from "@/lib/websocket";

export function CoordinateInput() {
  const [x, setX] = useState("0");
  const [y, setY] = useState("0");
  const [z, setZ] = useState("80");
  const [speed, setSpeed] = useState("100");

  function handleGo() {
    robotSocket.moveTo(
      parseFloat(x) || 0,
      parseFloat(y) || 0,
      parseFloat(z) || 0,
      parseFloat(speed) || 100,
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Go To Position</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-4 gap-2">
          <div>
            <Label className="text-xs">X</Label>
            <Input type="number" value={x} onChange={(e) => setX(e.target.value)} className="h-8" />
          </div>
          <div>
            <Label className="text-xs">Y</Label>
            <Input type="number" value={y} onChange={(e) => setY(e.target.value)} className="h-8" />
          </div>
          <div>
            <Label className="text-xs">Z</Label>
            <Input type="number" value={z} onChange={(e) => setZ(e.target.value)} className="h-8" />
          </div>
          <div>
            <Label className="text-xs">Speed</Label>
            <Input type="number" value={speed} onChange={(e) => setSpeed(e.target.value)} className="h-8" />
          </div>
        </div>
        <Button className="w-full" onClick={handleGo}>Go</Button>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/coordinate-input.tsx
git commit -m "feat: add coordinate input component"
```

---

### Task 17: Vacuum Control Component

**Files:**
- Create: `frontend/components/vacuum-control.tsx`

- [ ] **Step 1: Write vacuum control**

```tsx
// frontend/components/vacuum-control.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { robotSocket } from "@/lib/websocket";

export function VacuumControl() {
  const [vacuumOn, setVacuumOn] = useState(false);

  useEffect(() => {
    const unsubscribe = robotSocket.onPosition((pos) => {
      setVacuumOn(pos.vacuum_on);
    });
    return unsubscribe;
  }, []);

  function handleToggle() {
    robotSocket.setVacuum(!vacuumOn);
  }

  function handlePick() {
    robotSocket.jog("z", -70, 30);
    setTimeout(() => robotSocket.setVacuum(true), 1500);
    setTimeout(() => robotSocket.jog("z", 70, 30), 2000);
  }

  function handlePlace() {
    robotSocket.jog("z", -70, 30);
    setTimeout(() => robotSocket.setVacuum(false), 1500);
    setTimeout(() => robotSocket.jog("z", 70, 30), 2000);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Vacuum Gripper</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          className="w-full"
          variant={vacuumOn ? "default" : "outline"}
          onClick={handleToggle}
        >
          <span
            className={`inline-block w-3 h-3 rounded-full mr-2 ${vacuumOn ? "bg-green-400" : "bg-gray-400"}`}
          />
          Vacuum {vacuumOn ? "ON" : "OFF"}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={handlePick}>Pick</Button>
          <Button variant="outline" size="sm" onClick={handlePlace}>Place</Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/vacuum-control.tsx
git commit -m "feat: add vacuum control with pick/place macros"
```

---

### Task 18: 3D Robot Visualization

**Files:**
- Create: `frontend/components/robot-3d-view.tsx`

- [ ] **Step 1: Write 3D visualization component**

```tsx
// frontend/components/robot-3d-view.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import * as THREE from "three";
import { robotSocket } from "@/lib/websocket";
import { ArmPosition, Waypoint } from "@/lib/types";

function ArmModel({ position }: { position: ArmPosition }) {
  const baseRef = useRef<THREE.Mesh>(null);
  const arm1Ref = useRef<THREE.Group>(null);
  const arm2Ref = useRef<THREE.Group>(null);
  const endEffectorRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (endEffectorRef.current) {
      endEffectorRef.current.position.set(
        position.x / 100,
        position.z / 100,
        position.y / 100,
      );
    }
  });

  return (
    <group>
      <mesh ref={baseRef} position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.4, 0.5, 0.3, 32]} />
        <meshStandardMaterial color="#444" />
      </mesh>

      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.12, 0.15, 0.7, 16]} />
        <meshStandardMaterial color="#666" />
      </mesh>

      <mesh ref={endEffectorRef} position={[1.5, 0.8, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color={position.vacuum_on ? "#22c55e" : "#ef4444"} />
      </mesh>

      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([0, 0.85, 0, position.x / 100, position.z / 100, position.y / 100]), 3]}
            count={2}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#888" linewidth={2} />
      </line>
    </group>
  );
}

function WorkspaceBoundary({ bounds }: { bounds?: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number } }) {
  if (!bounds) return null;
  const width = (bounds.maxX - bounds.minX) / 100;
  const height = (bounds.maxZ - bounds.minZ) / 100;
  const depth = (bounds.maxY - bounds.minY) / 100;
  const centerX = (bounds.minX + bounds.maxX) / 200;
  const centerY = (bounds.minZ + bounds.maxZ) / 200;
  const centerZ = (bounds.minY + bounds.maxY) / 200;

  return (
    <mesh position={[centerX, centerY, centerZ]}>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color="#3b82f6" transparent opacity={0.05} wireframe />
    </mesh>
  );
}

function WaypointMarkers({ waypoints }: { waypoints: Waypoint[] }) {
  return (
    <>
      {waypoints.map((wp, index) => (
        <mesh key={index} position={[wp.x / 100, wp.z / 100, wp.y / 100]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color={wp.vacuum_on ? "#22c55e" : "#f59e0b"} />
        </mesh>
      ))}
    </>
  );
}

interface Robot3DViewProps {
  waypoints?: Waypoint[];
  workspaceBounds?: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
}

export function Robot3DView({ waypoints = [], workspaceBounds }: Robot3DViewProps) {
  const [position, setPosition] = useState<ArmPosition>({
    x: 0, y: 0, z: 0, rotation: 0, vacuum_on: false, connected: false,
  });

  useEffect(() => {
    const unsubscribe = robotSocket.onPosition(setPosition);
    return unsubscribe;
  }, []);

  return (
    <div className="w-full h-[500px] rounded-lg border bg-black/5">
      <Canvas camera={{ position: [4, 3, 4], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={0.8} />
        <ArmModel position={position} />
        <WorkspaceBoundary bounds={workspaceBounds} />
        <WaypointMarkers waypoints={waypoints} />
        <Grid args={[10, 10]} cellColor="#888" sectionColor="#444" fadeDistance={15} />
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/robot-3d-view.tsx
git commit -m "feat: add Three.js 3D robot arm visualization"
```

---

### Task 19: Control Page Assembly

**Files:**
- Create: `frontend/app/control/page.tsx`

- [ ] **Step 1: Write control page**

```tsx
// frontend/app/control/page.tsx
"use client";

import { PositionDisplay } from "@/components/position-display";
import { JogPanel } from "@/components/jog-panel";
import { CoordinateInput } from "@/components/coordinate-input";
import { VacuumControl } from "@/components/vacuum-control";
import { Robot3DView } from "@/components/robot-3d-view";

export default function ControlPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Manual Control</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Robot3DView />
        </div>
        <div className="space-y-4">
          <PositionDisplay />
          <JogPanel />
          <CoordinateInput />
          <VacuumControl />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd "/Users/lambertrulindana/Documents/MADAGASCAR_UNIPOD/uARM SwfitPro/frontend"
npm run build
```
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
cd "/Users/lambertrulindana/Documents/MADAGASCAR_UNIPOD/uARM SwfitPro"
git add frontend/app/control/
git commit -m "feat: assemble control page with 3D view, jog, and vacuum panels"
```

---

## Phase 4: Teach & Replay Page

### Task 20: Waypoint List Component

**Files:**
- Create: `frontend/components/waypoint-list.tsx`

- [ ] **Step 1: Write waypoint list**

```tsx
// frontend/components/waypoint-list.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Waypoint } from "@/lib/types";

interface WaypointListProps {
  waypoints: Waypoint[];
  onUpdate: (waypoints: Waypoint[]) => void;
  currentIndex?: number;
}

export function WaypointList({ waypoints, onUpdate, currentIndex = -1 }: WaypointListProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  function handleDelete(index: number) {
    const updated = waypoints.filter((_, i) => i !== index);
    onUpdate(updated);
  }

  function handleMoveUp(index: number) {
    if (index === 0) return;
    const updated = [...waypoints];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onUpdate(updated);
  }

  function handleMoveDown(index: number) {
    if (index === waypoints.length - 1) return;
    const updated = [...waypoints];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onUpdate(updated);
  }

  function handleUpdateDelay(index: number, delay_ms: number) {
    const updated = [...waypoints];
    updated[index] = { ...updated[index], delay_ms };
    onUpdate(updated);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Waypoints ({waypoints.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {waypoints.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No waypoints recorded</p>
        ) : (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {waypoints.map((wp, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 p-2 rounded text-sm ${
                  index === currentIndex ? "bg-primary/10 border border-primary" : "bg-muted/50"
                }`}
              >
                <span className="font-mono w-6 text-muted-foreground">{index + 1}</span>
                <span className="font-mono flex-1">
                  ({wp.x.toFixed(1)}, {wp.y.toFixed(1)}, {wp.z.toFixed(1)})
                </span>
                <span className={`w-3 h-3 rounded-full ${wp.vacuum_on ? "bg-green-400" : "bg-gray-300"}`} />
                <Input
                  type="number"
                  value={wp.delay_ms}
                  onChange={(e) => handleUpdateDelay(index, parseInt(e.target.value) || 0)}
                  className="w-20 h-6 text-xs"
                  placeholder="ms"
                />
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleMoveUp(index)}>&#8593;</Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleMoveDown(index)}>&#8595;</Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => handleDelete(index)}>&#10005;</Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/waypoint-list.tsx
git commit -m "feat: add waypoint list with reorder and edit"
```

---

### Task 21: Sequence Manager Component

**Files:**
- Create: `frontend/components/sequence-manager.tsx`

- [ ] **Step 1: Write sequence manager**

```tsx
// frontend/components/sequence-manager.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { Sequence, Waypoint } from "@/lib/types";

interface SequenceManagerProps {
  onLoad: (waypoints: Waypoint[]) => void;
  currentWaypoints: Waypoint[];
}

export function SequenceManager({ onLoad, currentWaypoints }: SequenceManagerProps) {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshSequences();
  }, []);

  async function refreshSequences() {
    try {
      const list = await api.listSequences();
      setSequences(list);
    } catch {
      setSequences([]);
    }
  }

  async function handleSave() {
    if (!saveName.trim()) return;
    try {
      const created = await api.createSequence({ name: saveName, description: saveDescription });
      await api.updateSequence(created.id, { waypoints: currentWaypoints });
      setSaveName("");
      setSaveDescription("");
      await refreshSequences();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Save failed");
    }
  }

  async function handleLoad(sequenceId: number) {
    try {
      const sequence = await api.getSequence(sequenceId);
      if (sequence.waypoints) {
        onLoad(sequence.waypoints);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Load failed");
    }
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
    const text = await file.text();
    const data = JSON.parse(text);
    await api.importSequence(data);
    await refreshSequences();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Sequences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input placeholder="Name" value={saveName} onChange={(e) => setSaveName(e.target.value)} className="h-8" />
          <Button size="sm" onClick={handleSave} disabled={!saveName.trim() || currentWaypoints.length === 0}>
            Save
          </Button>
        </div>

        <div className="space-y-1 max-h-48 overflow-y-auto">
          {sequences.map((seq) => (
            <div key={seq.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm">
              <span className="flex-1 truncate">{seq.name}</span>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => handleLoad(seq.id)}>Load</Button>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => handleExport(seq.id)}>Export</Button>
              <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={() => handleDelete(seq.id)}>Del</Button>
            </div>
          ))}
        </div>

        <div>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          <Button variant="outline" size="sm" className="w-full" onClick={() => fileInputRef.current?.click()}>
            Import JSON
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/sequence-manager.tsx
git commit -m "feat: add sequence manager with save/load/export/import"
```

---

### Task 22: Teach & Replay Page

**Files:**
- Create: `frontend/app/teach/page.tsx`

- [ ] **Step 1: Write teach page**

```tsx
// frontend/app/teach/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PositionDisplay } from "@/components/position-display";
import { JogPanel } from "@/components/jog-panel";
import { VacuumControl } from "@/components/vacuum-control";
import { Robot3DView } from "@/components/robot-3d-view";
import { WaypointList } from "@/components/waypoint-list";
import { SequenceManager } from "@/components/sequence-manager";
import { robotSocket } from "@/lib/websocket";
import { api } from "@/lib/api";
import { ArmPosition, Waypoint } from "@/lib/types";

export default function TeachPage() {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [recording, setRecording] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speedOverride, setSpeedOverride] = useState(1.0);
  const [loopCount, setLoopCount] = useState(1);
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState(-1);
  const positionRef = useRef<ArmPosition>({ x: 0, y: 0, z: 0, rotation: 0, vacuum_on: false, connected: false });
  const continuousRecordRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const unsubscribe = robotSocket.onPosition((pos) => {
      positionRef.current = pos;
    });
    return unsubscribe;
  }, []);

  function recordWaypoint() {
    const pos = positionRef.current;
    setWaypoints((prev) => [
      ...prev,
      { x: pos.x, y: pos.y, z: pos.z, speed: 50, vacuum_on: pos.vacuum_on, delay_ms: 0 },
    ]);
  }

  function startContinuousRecording() {
    setRecording(true);
    continuousRecordRef.current = setInterval(() => {
      const pos = positionRef.current;
      setWaypoints((prev) => [
        ...prev,
        { x: pos.x, y: pos.y, z: pos.z, speed: 50, vacuum_on: pos.vacuum_on, delay_ms: 0 },
      ]);
    }, 200);
  }

  function stopContinuousRecording() {
    setRecording(false);
    if (continuousRecordRef.current) {
      clearInterval(continuousRecordRef.current);
      continuousRecordRef.current = null;
    }
  }

  async function handlePlay() {
    if (waypoints.length === 0) return;
    setPlaying(true);
    try {
      const created = await api.createSequence({ name: `_temp_${Date.now()}`, description: "temp" });
      await api.updateSequence(created.id, { waypoints });
      await api.runSequence(created.id, speedOverride, loopCount);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Play failed");
    }
  }

  async function handleStop() {
    await api.stopSequence();
    setPlaying(false);
    setCurrentWaypointIndex(-1);
  }

  function clearWaypoints() {
    setWaypoints([]);
  }

  const speedLabels: Record<number, string> = { 0.25: "25%", 0.5: "50%", 1: "100%", 1.5: "150%" };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Teach & Replay</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Robot3DView waypoints={waypoints} />

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Teach Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <Button onClick={recordWaypoint}>Record Waypoint</Button>
                {recording ? (
                  <Button variant="destructive" onClick={stopContinuousRecording}>Stop Recording</Button>
                ) : (
                  <Button variant="outline" onClick={startContinuousRecording}>Record Continuous</Button>
                )}
                <Button variant="outline" onClick={clearWaypoints}>Clear All</Button>
              </div>

              <div className="flex gap-4 items-end">
                <div>
                  <label className="text-xs text-muted-foreground">Speed Override</label>
                  <div className="flex gap-1 mt-1">
                    {[0.25, 0.5, 1.0, 1.5].map((speed) => (
                      <Button
                        key={speed}
                        variant={speedOverride === speed ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSpeedOverride(speed)}
                      >
                        {speedLabels[speed]}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Loops</label>
                  <div className="flex gap-1 mt-1">
                    {[1, 3, 5, 0].map((count) => (
                      <Button
                        key={count}
                        variant={loopCount === count ? "default" : "outline"}
                        size="sm"
                        onClick={() => setLoopCount(count)}
                      >
                        {count === 0 ? "∞" : count}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                {playing ? (
                  <Button variant="destructive" onClick={handleStop}>Stop</Button>
                ) : (
                  <Button onClick={handlePlay} disabled={waypoints.length === 0}>Play</Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <PositionDisplay />
          <JogPanel />
          <VacuumControl />
          <WaypointList waypoints={waypoints} onUpdate={setWaypoints} currentIndex={currentWaypointIndex} />
          <SequenceManager onLoad={setWaypoints} currentWaypoints={waypoints} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd "/Users/lambertrulindana/Documents/MADAGASCAR_UNIPOD/uARM SwfitPro/frontend"
npm run build
```
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
cd "/Users/lambertrulindana/Documents/MADAGASCAR_UNIPOD/uARM SwfitPro"
git add frontend/app/teach/
git commit -m "feat: add teach and replay page with recording and playback"
```

---

## Phase 5: Calibration & Scripting Pages

### Task 23: Calibration Wizard Component & Page

**Files:**
- Create: `frontend/components/calibration-wizard.tsx`
- Create: `frontend/app/calibrate/page.tsx`

- [ ] **Step 1: Write calibration wizard component**

```tsx
// frontend/components/calibration-wizard.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { robotSocket } from "@/lib/websocket";
import { ArmPosition, SerialPort, CalibrationProfileCreate } from "@/lib/types";

const STEPS = [
  "Connection Check",
  "Home Position",
  "Boundary Mapping",
  "Vacuum Test",
  "Coordinate Verification",
  "Save Profile",
];

export function CalibrationWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [serialPorts, setSerialPorts] = useState<SerialPort[]>([]);
  const [selectedPort, setSelectedPort] = useState("");
  const [connected, setConnected] = useState(false);
  const [profileName, setProfileName] = useState("Default Setup");
  const [boundaryCorners, setBoundaryCorners] = useState<ArmPosition[]>([]);
  const [vacuumVerified, setVacuumVerified] = useState(false);
  const [offsets, setOffsets] = useState({ x: 0, y: 0, z: 0 });
  const positionRef = useRef<ArmPosition>({ x: 0, y: 0, z: 0, rotation: 0, vacuum_on: false, connected: false });

  useEffect(() => {
    api.listSerialPorts().then(setSerialPorts).catch(() => {});
    const unsubscribe = robotSocket.onPosition((pos) => {
      positionRef.current = pos;
    });
    return unsubscribe;
  }, []);

  async function handleConnect() {
    try {
      await api.connectSerial(selectedPort);
      setConnected(true);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Connection failed");
    }
  }

  function handleHome() {
    robotSocket.home();
  }

  function recordBoundaryCorner() {
    setBoundaryCorners((prev) => [...prev, { ...positionRef.current }]);
  }

  function handleVacuumTest(on: boolean) {
    robotSocket.setVacuum(on);
  }

  async function handleSaveProfile() {
    const minX = Math.min(...boundaryCorners.map((c) => c.x), -300);
    const maxX = Math.max(...boundaryCorners.map((c) => c.x), 300);
    const minY = Math.min(...boundaryCorners.map((c) => c.y), -300);
    const maxY = Math.max(...boundaryCorners.map((c) => c.y), 300);
    const minZ = Math.min(...boundaryCorners.map((c) => c.z), 0);
    const maxZ = Math.max(...boundaryCorners.map((c) => c.z), 150);

    const profile: CalibrationProfileCreate = {
      profile_name: profileName,
      serial_port_path: selectedPort,
      home_offset_x: offsets.x,
      home_offset_y: offsets.y,
      home_offset_z: offsets.z,
      workspace_min_x: minX,
      workspace_max_x: maxX,
      workspace_min_y: minY,
      workspace_max_y: maxY,
      workspace_min_z: minZ,
      workspace_max_z: maxZ,
      vacuum_verified: vacuumVerified,
    };
    await api.createProfile(profile);
    alert("Calibration profile saved!");
  }

  function renderStepContent() {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Select and connect to your uARM Swift Pro.</p>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label>Serial Port</Label>
                <Select value={selectedPort} onValueChange={setSelectedPort}>
                  <SelectTrigger><SelectValue placeholder="Select port" /></SelectTrigger>
                  <SelectContent>
                    {serialPorts.map((p) => (
                      <SelectItem key={p.device} value={p.device}>{p.device} — {p.description}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleConnect} disabled={!selectedPort}>Connect</Button>
            </div>
            {connected && <Badge variant="default">Connected</Badge>}
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Send the arm to its home position. Visually verify it reached home.</p>
            <Button onClick={handleHome}>Send Home</Button>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Jog the arm to each corner of your workspace and record the position. Record at least 4 corners.</p>
            <Button onClick={recordBoundaryCorner}>Record Corner ({boundaryCorners.length}/4)</Button>
            {boundaryCorners.map((corner, i) => (
              <p key={i} className="text-xs font-mono">Corner {i + 1}: ({corner.x.toFixed(1)}, {corner.y.toFixed(1)}, {corner.z.toFixed(1)})</p>
            ))}
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Test the vacuum gripper. Turn it on, pick up an object, then turn off.</p>
            <div className="flex gap-2">
              <Button onClick={() => handleVacuumTest(true)}>Vacuum ON</Button>
              <Button variant="outline" onClick={() => handleVacuumTest(false)}>Vacuum OFF</Button>
            </div>
            <Button variant={vacuumVerified ? "default" : "outline"} onClick={() => setVacuumVerified(true)}>
              {vacuumVerified ? "Verified" : "Confirm Working"}
            </Button>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">If the arm position is off, enter correction offsets (mm).</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">X Offset</Label>
                <Input type="number" value={offsets.x} onChange={(e) => setOffsets({ ...offsets, x: parseFloat(e.target.value) || 0 })} className="h-8" />
              </div>
              <div>
                <Label className="text-xs">Y Offset</Label>
                <Input type="number" value={offsets.y} onChange={(e) => setOffsets({ ...offsets, y: parseFloat(e.target.value) || 0 })} className="h-8" />
              </div>
              <div>
                <Label className="text-xs">Z Offset</Label>
                <Input type="number" value={offsets.z} onChange={(e) => setOffsets({ ...offsets, z: parseFloat(e.target.value) || 0 })} className="h-8" />
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Name your calibration profile and save.</p>
            <div>
              <Label>Profile Name</Label>
              <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} />
            </div>
            <Button onClick={handleSaveProfile}>Save Profile</Button>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calibration Wizard</CardTitle>
        <div className="flex gap-2 mt-2">
          {STEPS.map((step, index) => (
            <Badge
              key={step}
              variant={index === currentStep ? "default" : index < currentStep ? "secondary" : "outline"}
              className="text-xs cursor-pointer"
              onClick={() => setCurrentStep(index)}
            >
              {index + 1}. {step}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderStepContent()}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => setCurrentStep((s) => s - 1)} disabled={currentStep === 0}>
            Previous
          </Button>
          <Button onClick={() => setCurrentStep((s) => s + 1)} disabled={currentStep === STEPS.length - 1}>
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Write calibrate page**

```tsx
// frontend/app/calibrate/page.tsx
"use client";

import { CalibrationWizard } from "@/components/calibration-wizard";
import { JogPanel } from "@/components/jog-panel";
import { PositionDisplay } from "@/components/position-display";

export default function CalibratePage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Calibration</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CalibrationWizard />
        </div>
        <div className="space-y-4">
          <PositionDisplay />
          <JogPanel />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/lambertrulindana/Documents/MADAGASCAR_UNIPOD/uARM SwfitPro"
git add frontend/components/calibration-wizard.tsx frontend/app/calibrate/
git commit -m "feat: add calibration wizard with 6-step flow"
```

---

### Task 24: Block Editor & Scripts Page

**Files:**
- Create: `frontend/components/block-editor.tsx`
- Create: `frontend/app/scripts/page.tsx`

- [ ] **Step 1: Write block editor wrapper**

```tsx
// frontend/components/block-editor.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { ProgramBlock } from "@/lib/types";

interface BlockEditorProps {
  onProgramChange?: (program: ProgramBlock[]) => void;
}

export function BlockEditor({ onProgramChange }: BlockEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<any>(null);
  const [initialized, setInitialized] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    async function initBlockly() {
      const Blockly = await import("blockly");

      defineRobotBlocks(Blockly);

      if (editorRef.current && !workspaceRef.current) {
        workspaceRef.current = Blockly.inject(editorRef.current, {
          toolbox: {
            kind: "categoryToolbox",
            contents: [
              {
                kind: "category", name: "Motion", colour: "#4C97AF",
                contents: [
                  { kind: "block", type: "robot_move_to" },
                  { kind: "block", type: "robot_move_relative" },
                  { kind: "block", type: "robot_home" },
                  { kind: "block", type: "robot_set_speed" },
                ],
              },
              {
                kind: "category", name: "Gripper", colour: "#5BA55B",
                contents: [
                  { kind: "block", type: "robot_vacuum_on" },
                  { kind: "block", type: "robot_vacuum_off" },
                ],
              },
              {
                kind: "category", name: "Flow", colour: "#A55BA5",
                contents: [
                  { kind: "block", type: "robot_repeat" },
                  { kind: "block", type: "robot_wait" },
                ],
              },
              {
                kind: "category", name: "I/O", colour: "#A5745B",
                contents: [
                  { kind: "block", type: "robot_log" },
                ],
              },
            ],
          },
        });

        workspaceRef.current.addChangeListener(() => {
          const program = workspaceToProgram(Blockly, workspaceRef.current);
          onProgramChange?.(program);
        });

        setInitialized(true);
      }
    }

    initBlockly();

    return () => {
      if (workspaceRef.current) {
        workspaceRef.current.dispose();
        workspaceRef.current = null;
      }
    };
  }, []);

  function getProgram(): ProgramBlock[] {
    if (!workspaceRef.current) return [];
    return import("blockly").then((Blockly) => workspaceToProgram(Blockly, workspaceRef.current)) as any;
  }

  async function handleRun() {
    const Blockly = await import("blockly");
    const program = workspaceToProgram(Blockly, workspaceRef.current);
    if (program.length === 0) return;
    setRunning(true);
    try {
      await api.runScript(program);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Run failed");
    }
  }

  async function handleStop() {
    await api.stopScript();
    setRunning(false);
  }

  async function handleExportPython() {
    const Blockly = await import("blockly");
    const program = workspaceToProgram(Blockly, workspaceRef.current);
    const result = await api.exportPython(program);
    const blob = new Blob([result.script], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "robot_program.py";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Block Editor</CardTitle>
          <div className="flex gap-2">
            {running ? (
              <Button variant="destructive" size="sm" onClick={handleStop}>Stop</Button>
            ) : (
              <Button size="sm" onClick={handleRun}>Run</Button>
            )}
            <Button variant="outline" size="sm" onClick={handleExportPython}>Export Python</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={editorRef} className="w-full h-[500px] border rounded" />
      </CardContent>
    </Card>
  );
}

function defineRobotBlocks(Blockly: any) {
  Blockly.Blocks["robot_move_to"] = {
    init() {
      this.appendDummyInput()
        .appendField("Move To X").appendField(new Blockly.FieldNumber(0), "X")
        .appendField("Y").appendField(new Blockly.FieldNumber(0), "Y")
        .appendField("Z").appendField(new Blockly.FieldNumber(80), "Z")
        .appendField("Speed").appendField(new Blockly.FieldNumber(100), "SPEED");
      this.setPreviousStatement(true); this.setNextStatement(true);
      this.setColour(190);
    },
  };

  Blockly.Blocks["robot_move_relative"] = {
    init() {
      this.appendDummyInput()
        .appendField("Move Relative dX").appendField(new Blockly.FieldNumber(0), "DX")
        .appendField("dY").appendField(new Blockly.FieldNumber(0), "DY")
        .appendField("dZ").appendField(new Blockly.FieldNumber(0), "DZ")
        .appendField("Speed").appendField(new Blockly.FieldNumber(50), "SPEED");
      this.setPreviousStatement(true); this.setNextStatement(true);
      this.setColour(190);
    },
  };

  Blockly.Blocks["robot_home"] = {
    init() {
      this.appendDummyInput().appendField("Home");
      this.setPreviousStatement(true); this.setNextStatement(true);
      this.setColour(190);
    },
  };

  Blockly.Blocks["robot_set_speed"] = {
    init() {
      this.appendDummyInput()
        .appendField("Set Speed").appendField(new Blockly.FieldNumber(100), "SPEED");
      this.setPreviousStatement(true); this.setNextStatement(true);
      this.setColour(190);
    },
  };

  Blockly.Blocks["robot_vacuum_on"] = {
    init() {
      this.appendDummyInput().appendField("Vacuum ON");
      this.setPreviousStatement(true); this.setNextStatement(true);
      this.setColour(120);
    },
  };

  Blockly.Blocks["robot_vacuum_off"] = {
    init() {
      this.appendDummyInput().appendField("Vacuum OFF");
      this.setPreviousStatement(true); this.setNextStatement(true);
      this.setColour(120);
    },
  };

  Blockly.Blocks["robot_repeat"] = {
    init() {
      this.appendDummyInput()
        .appendField("Repeat").appendField(new Blockly.FieldNumber(3, 1), "COUNT").appendField("times");
      this.appendStatementInput("BODY");
      this.setPreviousStatement(true); this.setNextStatement(true);
      this.setColour(280);
    },
  };

  Blockly.Blocks["robot_wait"] = {
    init() {
      this.appendDummyInput()
        .appendField("Wait").appendField(new Blockly.FieldNumber(300, 0), "MS").appendField("ms");
      this.setPreviousStatement(true); this.setNextStatement(true);
      this.setColour(280);
    },
  };

  Blockly.Blocks["robot_log"] = {
    init() {
      this.appendDummyInput()
        .appendField("Log").appendField(new Blockly.FieldTextInput("message"), "MESSAGE");
      this.setPreviousStatement(true); this.setNextStatement(true);
      this.setColour(30);
    },
  };
}

function workspaceToProgram(Blockly: any, workspace: any): ProgramBlock[] {
  const topBlocks = workspace.getTopBlocks(true);
  const program: ProgramBlock[] = [];

  for (const block of topBlocks) {
    let current = block;
    while (current) {
      program.push(blockToJson(Blockly, current));
      current = current.getNextBlock();
    }
  }
  return program;
}

function blockToJson(Blockly: any, block: any): ProgramBlock {
  switch (block.type) {
    case "robot_move_to":
      return { type: "move_to", x: block.getFieldValue("X"), y: block.getFieldValue("Y"), z: block.getFieldValue("Z"), speed: block.getFieldValue("SPEED") };
    case "robot_move_relative":
      return { type: "move_relative", dx: block.getFieldValue("DX"), dy: block.getFieldValue("DY"), dz: block.getFieldValue("DZ"), speed: block.getFieldValue("SPEED") };
    case "robot_home":
      return { type: "home" };
    case "robot_set_speed":
      return { type: "set_speed", speed: block.getFieldValue("SPEED") };
    case "robot_vacuum_on":
      return { type: "vacuum_on" };
    case "robot_vacuum_off":
      return { type: "vacuum_off" };
    case "robot_wait":
      return { type: "wait", ms: block.getFieldValue("MS") };
    case "robot_log":
      return { type: "log", message: block.getFieldValue("MESSAGE") };
    case "robot_repeat": {
      const body: ProgramBlock[] = [];
      let child = block.getInputTargetBlock("BODY");
      while (child) {
        body.push(blockToJson(Blockly, child));
        child = child.getNextBlock();
      }
      return { type: "repeat", count: block.getFieldValue("COUNT"), body };
    }
    default:
      return { type: "log", message: `Unknown block: ${block.type}` };
  }
}
```

- [ ] **Step 2: Write scripts page**

```tsx
// frontend/app/scripts/page.tsx
"use client";

import { BlockEditor } from "@/components/block-editor";
import { PositionDisplay } from "@/components/position-display";
import { VacuumControl } from "@/components/vacuum-control";
import { Robot3DView } from "@/components/robot-3d-view";

export default function ScriptsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Visual Scripting</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <BlockEditor />
          <Robot3DView />
        </div>
        <div className="space-y-4">
          <PositionDisplay />
          <VacuumControl />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
cd "/Users/lambertrulindana/Documents/MADAGASCAR_UNIPOD/uARM SwfitPro/frontend"
npm run build
```
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
cd "/Users/lambertrulindana/Documents/MADAGASCAR_UNIPOD/uARM SwfitPro"
git add frontend/components/block-editor.tsx frontend/app/scripts/
git commit -m "feat: add Blockly visual scripting editor and scripts page"
```

---

## Phase 6: Safety Config Page & Final Integration

### Task 25: Safety Config Component

**Files:**
- Create: `frontend/components/safety-config.tsx`

- [ ] **Step 1: Write safety config component**

```tsx
// frontend/components/safety-config.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { SafetyConfig, ExclusionZone } from "@/lib/types";

export function SafetyConfigPanel() {
  const [config, setConfig] = useState<SafetyConfig>({
    max_speed: 200, boundary_slowdown_distance: 10,
    boundary_slowdown_factor: 0.25, loaded_max_speed: 100,
    estop_release_vacuum: false,
  });
  const [exclusionZones, setExclusionZones] = useState<ExclusionZone[]>([]);
  const [newZone, setNewZone] = useState({ name: "", min_x: 0, max_x: 0, min_y: 0, max_y: 0, min_z: 0, max_z: 0 });

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getSafetyConfig();
        setConfig(data.config);
        setExclusionZones(data.exclusion_zones);
      } catch {}
    }
    load();
  }, []);

  async function handleSaveConfig() {
    try {
      await api.updateSafetyConfig(config);
      alert("Safety config saved");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Save failed");
    }
  }

  async function handleAddZone() {
    if (!newZone.name) return;
    try {
      const created = await api.addExclusionZone(newZone);
      setExclusionZones([...exclusionZones, created]);
      setNewZone({ name: "", min_x: 0, max_x: 0, min_y: 0, max_y: 0, min_z: 0, max_z: 0 });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Add failed");
    }
  }

  async function handleDeleteZone(zoneId: number) {
    await api.deleteExclusionZone(zoneId);
    setExclusionZones(exclusionZones.filter((z) => z.id !== zoneId));
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Speed Limits</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Max Speed: {config.max_speed} mm/s</Label>
            <Slider value={[config.max_speed]} onValueChange={([v]) => setConfig({ ...config, max_speed: v })} min={10} max={500} step={10} />
          </div>
          <div>
            <Label>Loaded Max Speed: {config.loaded_max_speed} mm/s</Label>
            <Slider value={[config.loaded_max_speed]} onValueChange={([v]) => setConfig({ ...config, loaded_max_speed: v })} min={10} max={300} step={10} />
          </div>
          <div>
            <Label>Boundary Slowdown Distance: {config.boundary_slowdown_distance} mm</Label>
            <Slider value={[config.boundary_slowdown_distance]} onValueChange={([v]) => setConfig({ ...config, boundary_slowdown_distance: v })} min={5} max={50} step={5} />
          </div>
          <div>
            <Label>Boundary Slowdown Factor: {(config.boundary_slowdown_factor * 100).toFixed(0)}%</Label>
            <Slider value={[config.boundary_slowdown_factor * 100]} onValueChange={([v]) => setConfig({ ...config, boundary_slowdown_factor: v / 100 })} min={10} max={100} step={5} />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.estop_release_vacuum}
              onChange={(e) => setConfig({ ...config, estop_release_vacuum: e.target.checked })}
            />
            <Label>Release vacuum on emergency stop</Label>
          </div>
          <Button onClick={handleSaveConfig}>Save Config</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Exclusion Zones</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {exclusionZones.map((zone) => (
            <div key={zone.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm">
              <span className="flex-1">{zone.name} ({zone.min_x},{zone.min_y},{zone.min_z}) → ({zone.max_x},{zone.max_y},{zone.max_z})</span>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteZone(zone.id)}>Delete</Button>
            </div>
          ))}
          <Separator />
          <div className="grid grid-cols-7 gap-1">
            <div className="col-span-7"><Input placeholder="Zone Name" value={newZone.name} onChange={(e) => setNewZone({ ...newZone, name: e.target.value })} className="h-8" /></div>
            <Input type="number" placeholder="minX" value={newZone.min_x} onChange={(e) => setNewZone({ ...newZone, min_x: parseFloat(e.target.value) || 0 })} className="h-8" />
            <Input type="number" placeholder="maxX" value={newZone.max_x} onChange={(e) => setNewZone({ ...newZone, max_x: parseFloat(e.target.value) || 0 })} className="h-8" />
            <Input type="number" placeholder="minY" value={newZone.min_y} onChange={(e) => setNewZone({ ...newZone, min_y: parseFloat(e.target.value) || 0 })} className="h-8" />
            <Input type="number" placeholder="maxY" value={newZone.max_y} onChange={(e) => setNewZone({ ...newZone, max_y: parseFloat(e.target.value) || 0 })} className="h-8" />
            <Input type="number" placeholder="minZ" value={newZone.min_z} onChange={(e) => setNewZone({ ...newZone, min_z: parseFloat(e.target.value) || 0 })} className="h-8" />
            <Input type="number" placeholder="maxZ" value={newZone.max_z} onChange={(e) => setNewZone({ ...newZone, max_z: parseFloat(e.target.value) || 0 })} className="h-8" />
            <Button size="sm" onClick={handleAddZone}>Add</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Add safety tab to control page**

Update `frontend/app/control/page.tsx` to import and render `SafetyConfigPanel`:

```tsx
// Add to imports at top of frontend/app/control/page.tsx:
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SafetyConfigPanel } from "@/components/safety-config";

// Replace the return statement with:
return (
  <div className="space-y-4">
    <h2 className="text-2xl font-bold">Manual Control</h2>
    <Tabs defaultValue="control">
      <TabsList>
        <TabsTrigger value="control">Control</TabsTrigger>
        <TabsTrigger value="safety">Safety</TabsTrigger>
      </TabsList>
      <TabsContent value="control">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Robot3DView />
          </div>
          <div className="space-y-4">
            <PositionDisplay />
            <JogPanel />
            <CoordinateInput />
            <VacuumControl />
          </div>
        </div>
      </TabsContent>
      <TabsContent value="safety">
        <SafetyConfigPanel />
      </TabsContent>
    </Tabs>
  </div>
);
```

- [ ] **Step 3: Verify build**

```bash
cd "/Users/lambertrulindana/Documents/MADAGASCAR_UNIPOD/uARM SwfitPro/frontend"
npm run build
```
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
cd "/Users/lambertrulindana/Documents/MADAGASCAR_UNIPOD/uARM SwfitPro"
git add frontend/components/safety-config.tsx frontend/app/control/page.tsx
git commit -m "feat: add safety configuration panel with exclusion zones"
```

---

### Task 26: Run All Backend Tests

- [ ] **Step 1: Run full test suite**

```bash
cd "/Users/lambertrulindana/Documents/MADAGASCAR_UNIPOD/uARM SwfitPro"
source backend/.venv/bin/activate
python -m pytest tests/backend/ -v
```
Expected: All tests pass

- [ ] **Step 2: Fix any failures**

If any tests fail, fix the underlying issue and re-run.

- [ ] **Step 3: Verify frontend build**

```bash
cd "/Users/lambertrulindana/Documents/MADAGASCAR_UNIPOD/uARM SwfitPro/frontend"
npm run build
```
Expected: Build succeeds

- [ ] **Step 4: Final commit**

```bash
cd "/Users/lambertrulindana/Documents/MADAGASCAR_UNIPOD/uARM SwfitPro"
git add -A
git commit -m "feat: complete uARM Swift Pro control platform v1.0"
```

---

## Startup Instructions

### Backend
```bash
cd backend
source .venv/bin/activate
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm run dev
```

Open http://localhost:3000 in a browser. Connect the uARM Swift Pro via USB before using the control interface.
