#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"

echo "=== Building backend executable ==="

cd "$BACKEND_DIR"

if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
    .venv/bin/pip install -r requirements.txt
fi

.venv/bin/pip install pyinstaller 2>/dev/null

echo "Running PyInstaller..."
.venv/bin/pyinstaller \
    --name uarm-backend \
    --onefile \
    --hidden-import=uvicorn.logging \
    --hidden-import=uvicorn.loops \
    --hidden-import=uvicorn.loops.auto \
    --hidden-import=uvicorn.protocols \
    --hidden-import=uvicorn.protocols.http \
    --hidden-import=uvicorn.protocols.http.auto \
    --hidden-import=uvicorn.protocols.websockets \
    --hidden-import=uvicorn.protocols.websockets.auto \
    --hidden-import=uvicorn.lifespan \
    --hidden-import=uvicorn.lifespan.on \
    --hidden-import=backend.main \
    --hidden-import=backend.database \
    --hidden-import=backend.models \
    --hidden-import=backend.serial_manager \
    --hidden-import=backend.safety_validator \
    --hidden-import=backend.calibration \
    --hidden-import=backend.sequence_runner \
    --hidden-import=backend.block_interpreter \
    --hidden-import=backend.routers.serial_routes \
    --hidden-import=backend.routers.calibration_routes \
    --hidden-import=backend.routers.sequence_routes \
    --hidden-import=backend.routers.safety_routes \
    --hidden-import=backend.routers.script_routes \
    --hidden-import=backend.routers.websocket_routes \
    --add-data "../backend:backend" \
    --distpath "$PROJECT_ROOT/frontend/backend-dist" \
    "$PROJECT_ROOT/scripts/backend_entry.py"

echo "=== Backend build complete ==="
echo "Output: $PROJECT_ROOT/frontend/backend-dist/uarm-backend"
