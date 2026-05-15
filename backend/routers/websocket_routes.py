import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.safety_validator import SafetyViolation

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    from backend.main import serial_manager, safety_validator
    await ws.accept()
    position_task = None

    async def stream_position():
        while True:
            try:
                if serial_manager.is_connected:
                    position = serial_manager.get_position()
                    await ws.send_json({
                        "type": "position",
                        "x": position["x"], "y": position["y"], "z": position["z"],
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
                    position = serial_manager.get_position()
                    axis = message["axis"]
                    distance = message["distance"]
                    speed = message.get("speed", 50)
                    target = dict(position)
                    target[axis] = position[axis] + distance
                    safety_validator.validate_move(target["x"], target["y"], target["z"], speed=speed, vacuum_on=serial_manager.vacuum_on)
                    speed = safety_validator.apply_boundary_slowdown(target["x"], target["y"], target["z"], speed)
                    serial_manager.move_to(target["x"], target["y"], target["z"], speed=speed)

                elif msg_type == "move_to":
                    x, y, z = message["x"], message["y"], message["z"]
                    speed = message.get("speed", 100)
                    safety_validator.validate_move(x, y, z, speed=speed, vacuum_on=serial_manager.vacuum_on)
                    speed = safety_validator.apply_boundary_slowdown(x, y, z, speed)
                    serial_manager.move_to(x, y, z, speed=speed)

                elif msg_type == "vacuum":
                    serial_manager.set_pump(message["state"])

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
