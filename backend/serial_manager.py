import threading
import serial.tools.list_ports

try:
    from uarm.wrapper import SwiftAPI
except ImportError:
    SwiftAPI = None


class SerialManager:
    def __init__(self):
        self._swift: SwiftAPI | None = None
        self._lock = threading.Lock()
        self._vacuum_on = False
        self._connected = False
        self._emergency_stopped = False

    @property
    def is_connected(self) -> bool:
        return self._connected and self._swift is not None

    @property
    def vacuum_on(self) -> bool:
        return self._vacuum_on

    def connect(self, port_path: str | None = None):
        with self._lock:
            if SwiftAPI is None:
                raise ConnectionError("uArm Python SDK not installed. Run: pip install git+https://github.com/uArm-Developer/uArm-Python-SDK.git")
            if self._swift:
                try:
                    self._swift.disconnect()
                except Exception:
                    pass
            self._swift = SwiftAPI(port=port_path, callback_thread_pool_size=1)
            self._swift.connect()
            self._swift.waiting_ready()
            self._connected = True
            self._emergency_stopped = False

    def disconnect(self):
        with self._lock:
            if self._swift:
                try:
                    self._swift.disconnect()
                except Exception:
                    pass
                self._swift = None
            self._connected = False

    def get_position(self) -> dict:
        with self._lock:
            if not self.is_connected:
                return {"x": 0.0, "y": 0.0, "z": 0.0}
            try:
                position = self._swift.get_position()
                if position and len(position) >= 3:
                    return {
                        "x": float(position[0] or 0.0),
                        "y": float(position[1] or 0.0),
                        "z": float(position[2] or 0.0),
                    }
            except Exception:
                pass
            return {"x": 0.0, "y": 0.0, "z": 0.0}

    def move_to(self, x: float, y: float, z: float, speed: float = 100.0, wait: bool = False):
        with self._lock:
            if not self.is_connected:
                raise ConnectionError("Not connected")
            if self._emergency_stopped:
                raise ConnectionError("Emergency stop active. Send home to resume.")
            self._swift.set_position(x=x, y=y, z=z, speed=speed)
            if wait:
                self._swift.waiting_ready()

    def set_pump(self, on: bool):
        with self._lock:
            if not self.is_connected:
                raise ConnectionError("Not connected")
            self._swift.set_pump(on=on)
            self._vacuum_on = on

    def set_wrist(self, angle: float):
        with self._lock:
            if not self.is_connected:
                raise ConnectionError("Not connected")
            self._swift.set_wrist(angle=angle)

    def home(self):
        with self._lock:
            if not self.is_connected:
                raise ConnectionError("Not connected")
            self._emergency_stopped = False
            self._swift.reset()
            self._swift.waiting_ready()

    def emergency_stop(self):
        with self._lock:
            if not self.is_connected:
                return
            self._emergency_stopped = True
            try:
                self._swift.send_cmd_sync("M17")
            except Exception:
                pass
            try:
                self._swift.set_pump(on=False)
                self._vacuum_on = False
            except Exception:
                pass

    def resume_from_emergency(self):
        with self._lock:
            self._emergency_stopped = False

    def send_gcode(self, gcode: str) -> str:
        with self._lock:
            if not self.is_connected:
                raise ConnectionError("Not connected")
            response = self._swift.send_cmd_sync(gcode)
            return str(response) if response else "ok"

    def get_device_info(self) -> dict:
        with self._lock:
            if not self.is_connected:
                return {}
            info = self._swift.get_device_info()
            return {"firmware": info} if info else {}

    def get_servo_angle(self, servo_id: int) -> float | None:
        with self._lock:
            if not self.is_connected:
                return None
            return self._swift.get_servo_angle(servo_id=servo_id)

    def set_servo_angle(self, servo_id: int, angle: float):
        with self._lock:
            if not self.is_connected:
                raise ConnectionError("Not connected")
            self._swift.set_servo_angle(servo_id=servo_id, angle=angle)

    def set_buzzer(self, frequency: int = 1000, duration: float = 0.5):
        with self._lock:
            if not self.is_connected:
                return
            self._swift.set_buzzer(frequency=frequency, duration=duration)

    @staticmethod
    def list_ports() -> list[dict]:
        ports = serial.tools.list_ports.comports()
        return [
            {"device": p.device, "description": p.description, "hwid": p.hwid}
            for p in ports
        ]
