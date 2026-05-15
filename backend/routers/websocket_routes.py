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
                        "x": float(position.get("x", 0)),
                        "y": float(position.get("y", 0)),
                        "z": float(position.get("z", 0)),
                        "rotation": 0.0,
                        "vacuum_on": serial_manager.vacuum_on,
                        "connected": True,
                        "learning_mode": serial_manager.learning_mode,
                    })
                else:
                    await ws.send_json({
                        "type": "position",
                        "x": 0.0, "y": 0.0, "z": 0.0, "rotation": 0.0,
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
                    distance = float(message["distance"])
                    speed = float(message.get("speed", 50))
                    target = dict(position)
                    target[axis] = float(position[axis]) + distance
                    safety_validator.validate_move(target["x"], target["y"], target["z"], speed=speed, vacuum_on=serial_manager.vacuum_on)
                    speed = safety_validator.apply_boundary_slowdown(target["x"], target["y"], target["z"], speed)
                    serial_manager.move_to(target["x"], target["y"], target["z"], speed=speed, wait=False)

                elif msg_type == "move_to":
                    x, y, z = float(message["x"]), float(message["y"]), float(message["z"])
                    speed = float(message.get("speed", 100))
                    safety_validator.validate_move(x, y, z, speed=speed, vacuum_on=serial_manager.vacuum_on)
                    speed = safety_validator.apply_boundary_slowdown(x, y, z, speed)
                    serial_manager.move_to(x, y, z, speed=speed, wait=False)

                elif msg_type == "vacuum":
                    serial_manager.set_pump(message["state"])

                elif msg_type == "emergency_stop":
                    serial_manager.emergency_stop()
                    await ws.send_json({"type": "emergency_stop", "status": "stopped"})

                elif msg_type == "home":
                    await asyncio.to_thread(serial_manager.home)

                elif msg_type == "learning_mode":
                    enabled = bool(message.get("enabled", False))
                    await asyncio.to_thread(serial_manager.set_learning_mode, enabled)
                    await ws.send_json({"type": "learning_mode", "enabled": enabled})

                elif msg_type == "gcode":
                    gcode_line = message.get("command", "").strip()
                    if gcode_line:
                        response = await asyncio.to_thread(serial_manager.send_gcode, gcode_line)
                        await ws.send_json({"type": "gcode_response", "command": gcode_line, "response": response})

                await ws.send_json({"type": "ack", "command": msg_type, "status": "ok"})

            except SafetyViolation as e:
                await ws.send_json({"type": "error", "command": msg_type, "message": str(e)})
            except ConnectionError as e:
                await ws.send_json({"type": "error", "command": msg_type, "message": str(e)})
            except Exception as e:
                await ws.send_json({"type": "error", "command": msg_type, "message": str(e)})

    except WebSocketDisconnect:
        pass
    finally:
        if position_task:
            position_task.cancel()
