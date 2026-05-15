# uARM Swift Pro Control Platform — Design Spec

## Overview

A web-based control platform for the uARM Swift Pro robot arm (with vacuum gripper) that provides calibration, manual control, teach-and-replay, visual sequence scripting, 3D visualization, and safety enforcement.

**Target use cases:** Pick-and-place automation, robotics education, lab/workshop tool, product demos.

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Browser (Next.js)                  │
│                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ 3D View  │ │ Jog Ctrl │ │ Teach &  │ │Sequence│ │
│  │(Three.js)│ │  Panel   │ │ Replay   │ │ Editor │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │Calibrate │ │ Vacuum   │ │ Safety   │            │
│  │ Wizard   │ │ Control  │ │ Config   │            │
│  └──────────┘ └──────────┘ └──────────┘            │
└──────────────────┬──────────────────────────────────┘
                   │ WebSocket (real-time)
                   │ REST (config/sequences CRUD)
┌──────────────────▼──────────────────────────────────┐
│              Python FastAPI Backend                   │
│                                                      │
│  ┌──────────────────────────────────────────┐       │
│  │         Safety Validator Middleware        │       │
│  └──────────────────┬───────────────────────┘       │
│                     │                                │
│  ┌─────────┐ ┌─────▼─────┐ ┌───────────┐           │
│  │Kinematics│ │  Serial   │ │ Sequence  │           │
│  │ Engine   │ │ Manager   │ │ Runner    │           │
│  └─────────┘ └─────┬─────┘ └───────────┘           │
└─────────────────────┼────────────────────────────────┘
                      │ USB Serial (115200 baud)
                ┌─────▼─────┐
                │ uARM Swift│
                │   Pro     │
                └───────────┘
```

### Tech Stack

- **Frontend:** Next.js, Three.js (3D visualization), shadcn/ui (component library), WebSocket client
- **Backend:** Python 3.12+, FastAPI, pyserial, numpy (kinematics), SQLite (storage)
- **Communication:** WebSocket for real-time arm state streaming (~10Hz), REST for CRUD operations
- **Storage:** SQLite — zero setup, portable. Stores sequences, calibration profiles, settings.

## Feature 1: Calibration Wizard

A step-by-step guided flow that runs on first use or on demand.

### Steps

1. **Connection check** — auto-detect serial port, verify firmware response, show firmware version
2. **Home position** — command the arm to home, user verifies visually
3. **Boundary mapping** — user jogs the arm to 4 corners of their workspace, system records the safe envelope
4. **Vacuum test** — toggle pump on/off, user confirms suction works by picking up a test object
5. **Coordinate verification** — arm moves to 3 known positions, user confirms accuracy. If off, user nudges to correct position and system stores offsets.
6. **Save profile** — stores calibration data to SQLite. Supports multiple profiles for different setups.

### Calibration Profile Data

| Field | Type | Description |
|---|---|---|
| serial_port_path | string | e.g., /dev/tty.usbmodem1234 |
| baud_rate | int | 115200 (default) |
| home_offset_x | float | X correction in mm |
| home_offset_y | float | Y correction in mm |
| home_offset_z | float | Z correction in mm |
| workspace_min_x | float | Minimum X boundary |
| workspace_max_x | float | Maximum X boundary |
| workspace_min_y | float | Minimum Y boundary |
| workspace_max_y | float | Maximum Y boundary |
| workspace_min_z | float | Minimum Z boundary |
| workspace_max_z | float | Maximum Z boundary |
| vacuum_verified | bool | Whether vacuum was tested |
| calibrated_at | datetime | Timestamp |
| profile_name | string | User-defined name |

## Feature 2: Manual UI Control (Jog Panel)

### Jog Controls

- **Cartesian mode** — X/Y/Z buttons with +/- directions
- **Step sizes** — 0.5mm, 1mm, 5mm, 10mm (selectable)
- **Coordinate input** — type exact X, Y, Z values and hit "Go"
- **Speed slider** — movement speed in mm/s, range from slow/precise to fast
- **Keyboard shortcuts** — arrow keys for X/Y, Page Up/Down for Z, spacebar toggles vacuum

### Vacuum Gripper Panel

- On/Off toggle with visual indicator (green = active suction)
- **Pick macro** — lower → pump on → raise (one click)
- **Place macro** — lower → pump off → raise (one click)

### Position Feedback

- Live X, Y, Z coordinate display at ~10Hz
- Current joint angles display
- Distance-from-boundary warning (yellow/red as arm approaches limits)

### 3D Visualization (Three.js)

- Simplified 3D model of the uARM Swift Pro showing current pose in real-time
- Workspace boundary rendered as translucent wireframe box
- Taught waypoints shown as small spheres
- Ground plane grid for spatial reference
- Camera orbit/zoom controls

## Feature 3: Teach & Replay

### Teaching Mode

- User enters "Teach" mode from the UI
- Jog arm to desired position using manual controls
- **Record Waypoint** — saves X, Y, Z, speed, and vacuum state (on/off)
- Waypoint list shows:
  - Position coordinates
  - Vacuum state icon
  - Editable delay (wait time before next move)
  - Drag to reorder, click to edit, swipe to delete
- **Record Continuous** — records positions at a set interval (e.g., every 200ms) as the user jogs, creating smooth paths

### Replay Mode

- **Play** — execute waypoints sequentially at recorded speeds
- **Loop** — repeat N times or infinitely
- **Pause / Stop / Emergency Stop** — interrupt at any point
- **Speed override** — 25% / 50% / 100% / 150% of recorded speed
- Progress indicator shows currently executing waypoint

### Sequence Management

- Save with name and description
- Load from saved sequence list
- Duplicate / rename / delete
- Export as JSON for sharing
- Import from JSON file

## Feature 4: Sequence Scripting Editor

A visual block-based editor for complex programs beyond teach & replay. Built using Google Blockly (open-source, battle-tested, used in Scratch and many robot education tools). Custom block definitions for robot-specific operations.

### Block Categories

| Category | Blocks |
|---|---|
| Motion | Move To (X,Y,Z), Move Relative (dX,dY,dZ), Home, Set Speed |
| Gripper | Vacuum On, Vacuum Off, Pick (macro), Place (macro) |
| Flow | Repeat N Times, Repeat Forever, If/Else, Wait (ms), Wait for Input |
| Variables | Store Position, Counter, Simple math |
| I/O | Log Message, Play Sound, Trigger Webhook |

### Editor Features

- Drag-and-drop blocks snap together vertically
- Live highlight of current block during execution
- Step-through mode — one block at a time for debugging
- Convert taught sequence into blocks (teach → script bridge)
- Export as Python script for advanced users

### Example Program

```
Repeat 10 times:
  Move To (150, 0, 50)     ← above pick position
  Move To (150, 0, 10)     ← lower to object
  Vacuum On
  Wait 300ms
  Move To (150, 0, 80)     ← lift
  Move To (-150, 0, 80)    ← move to place zone
  Move To (-150, 0, 10)    ← lower
  Vacuum Off
  Wait 300ms
  Move To (-150, 0, 80)    ← lift
```

## Feature 5: Safety Limits & Workspace Boundaries

### Workspace Boundaries

- 3D bounding box (min/max X, Y, Z) defined during calibration
- Visible in 3D view as translucent box
- Optional **exclusion zones** — rectangular volumes where the arm must not enter (e.g., camera mount, fixture)

### Speed Limits

- Maximum speed cap (mm/s) — configurable per profile
- Automatic speed reduction near boundaries (25% within 10mm of limit)
- Separate limits for loaded (vacuum on) vs unloaded movement

### Command Validation (Safety Middleware)

- Every move command passes through the safety validator before reaching serial
- Checks: target within bounds, speed within limits, not in exclusion zone
- Violations are **rejected** (not clamped) — clear error message returned to UI
- Example: "Target X=400 exceeds boundary max X=350"

### Emergency Stop

- Big red button always visible in UI header
- Keyboard shortcut: **Escape**
- Sends immediate stop, kills running sequence
- Vacuum behavior on e-stop: configurable (auto-release or hold)

### Connection Safety

- Serial drop mid-sequence: stop execution, alert user
- WebSocket disconnect: backend pauses running sequence, waits for reconnection
- Heartbeat ping every 2 seconds — 3 missed triggers safe stop

## Project Structure

```
uARM-SwiftPro/
├── frontend/                  # Next.js app
│   ├── app/
│   │   ├── page.tsx           # Main dashboard
│   │   ├── calibrate/         # Calibration wizard
│   │   ├── control/           # Jog panel + 3D view
│   │   ├── teach/             # Teach & replay
│   │   └── scripts/           # Sequence scripting editor
│   ├── components/
│   │   ├── robot-3d-view.tsx  # Three.js arm visualization
│   │   ├── jog-panel.tsx      # Manual jog controls
│   │   ├── waypoint-list.tsx  # Teach mode waypoint list
│   │   ├── block-editor.tsx   # Visual scripting editor
│   │   ├── vacuum-control.tsx # Gripper toggle + macros
│   │   ├── emergency-stop.tsx # E-stop button
│   │   └── position-display.tsx
│   └── lib/
│       ├── websocket.ts       # WebSocket client
│       └── api.ts             # REST client
│
├── backend/                   # Python FastAPI
│   ├── main.py                # FastAPI app, WebSocket + REST routes
│   ├── serial_manager.py      # Serial connection, send/receive G-code
│   ├── safety_validator.py    # Command validation middleware
│   ├── kinematics.py          # Coordinate transforms, forward/inverse
│   ├── sequence_runner.py     # Execute waypoint sequences and scripts
│   ├── calibration.py         # Calibration logic and profile management
│   ├── models.py              # SQLite models (sequences, profiles, settings)
│   └── block_interpreter.py   # Parse and execute block-based programs
│
├── docs/
│   └── superpowers/specs/     # This spec
│
└── README.md
```

## API Design

### WebSocket (ws://localhost:8000/ws)

**Server → Client (10Hz):**
```json
{
  "type": "position",
  "x": 150.2,
  "y": 0.0,
  "z": 80.5,
  "rotation": 45.0,
  "vacuum_on": false,
  "connected": true
}
```

**Client → Server:**
```json
{"type": "jog", "axis": "x", "distance": 5.0, "speed": 50}
{"type": "move_to", "x": 150, "y": 0, "z": 80, "speed": 100}
{"type": "vacuum", "state": true}
{"type": "emergency_stop"}
{"type": "home"}
```

### REST Endpoints

| Method | Path | Description |
|---|---|---|
| GET | /api/status | Arm connection status + current position |
| GET | /api/serial/ports | List available serial ports |
| POST | /api/serial/connect | Connect to serial port |
| POST | /api/serial/disconnect | Disconnect |
| GET | /api/calibration/profiles | List calibration profiles |
| POST | /api/calibration/profiles | Save new profile |
| PUT | /api/calibration/profiles/{id} | Update profile |
| DELETE | /api/calibration/profiles/{id} | Delete profile |
| GET | /api/sequences | List saved sequences |
| POST | /api/sequences | Save new sequence |
| PUT | /api/sequences/{id} | Update sequence |
| DELETE | /api/sequences/{id} | Delete sequence |
| POST | /api/sequences/{id}/run | Start sequence execution |
| POST | /api/sequences/stop | Stop running sequence |
| GET | /api/sequences/{id}/export | Export as JSON |
| POST | /api/sequences/import | Import from JSON |
| GET | /api/safety/config | Get safety configuration |
| PUT | /api/safety/config | Update safety limits |
| POST | /api/scripts/run | Execute a block-based script |
| POST | /api/scripts/export-python | Convert blocks to Python |
