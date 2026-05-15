from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import initialize_database
from backend.serial_manager import SerialManager
from backend.safety_validator import SafetyValidator
from backend.sequence_runner import SequenceRunner
from backend.block_interpreter import BlockInterpreter
from backend.gcode_runner import GcodeRunner

serial_manager = SerialManager()
safety_validator: SafetyValidator | None = None
sequence_runner: SequenceRunner | None = None
block_interpreter: BlockInterpreter | None = None
gcode_runner: GcodeRunner | None = None


def create_default_safety_validator() -> SafetyValidator:
    return SafetyValidator(
        workspace_min_x=-350.0, workspace_max_x=350.0,
        workspace_min_y=-350.0, workspace_max_y=350.0,
        workspace_min_z=0.0, workspace_max_z=150.0,
        max_speed=200.0, loaded_max_speed=100.0,
        boundary_slowdown_distance=10.0, boundary_slowdown_factor=0.25,
        exclusion_zones=[],
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    global safety_validator, sequence_runner, block_interpreter, gcode_runner
    await initialize_database()
    safety_validator = create_default_safety_validator()
    sequence_runner = SequenceRunner(serial_manager, safety_validator)
    block_interpreter = BlockInterpreter(serial_manager, safety_validator)
    gcode_runner = GcodeRunner(serial_manager)
    yield
    if serial_manager.is_connected:
        serial_manager.disconnect()


app = FastAPI(title="uARM Swift Pro Control", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
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
from backend.routers.gcode_routes import router as gcode_router

app.include_router(serial_router, prefix="/api/serial", tags=["serial"])
app.include_router(calibration_router, prefix="/api/calibration", tags=["calibration"])
app.include_router(sequence_router, prefix="/api/sequences", tags=["sequences"])
app.include_router(safety_router, prefix="/api/safety", tags=["safety"])
app.include_router(script_router, prefix="/api/scripts", tags=["scripts"])
app.include_router(gcode_router, prefix="/api/gcode", tags=["gcode"])
app.include_router(websocket_router, tags=["websocket"])


@app.get("/api/status")
async def get_status():
    return {
        "connected": serial_manager.is_connected,
        "vacuum_on": serial_manager.vacuum_on,
        "sequence_running": sequence_runner.is_running if sequence_runner else False,
    }
