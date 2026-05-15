from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class ConnectRequest(BaseModel):
    port: str | None = None
    baud_rate: int = 115200


@router.get("/ports")
async def list_serial_ports():
    from backend.serial_manager import SerialManager
    return SerialManager.list_ports()


@router.post("/connect")
async def connect_serial(request: ConnectRequest):
    from backend.main import serial_manager
    try:
        serial_manager.connect(request.port)
        return {"status": "connected", "port": request.port}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/disconnect")
async def disconnect_serial():
    from backend.main import serial_manager
    serial_manager.disconnect()
    return {"status": "disconnected"}


@router.get("/info")
async def get_device_info():
    from backend.main import serial_manager
    return serial_manager.get_device_info()
