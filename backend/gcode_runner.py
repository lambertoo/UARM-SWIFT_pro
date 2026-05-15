import asyncio
import re
from backend.serial_manager import SerialManager


class GcodeRunner:
    def __init__(self, serial_manager: SerialManager):
        self._serial_manager = serial_manager
        self._running = False
        self._paused = False
        self._current_line = 0
        self._total_lines = 0
        self._lines: list[str] = []
        self._cancel_event = asyncio.Event()
        self._pause_event = asyncio.Event()
        self._pause_event.set()

    @property
    def is_running(self) -> bool:
        return self._running

    @property
    def is_paused(self) -> bool:
        return self._paused

    @property
    def progress(self) -> dict:
        return {
            "running": self._running,
            "paused": self._paused,
            "current_line": self._current_line,
            "total_lines": self._total_lines,
            "current_command": self._lines[self._current_line] if self._running and self._current_line < len(self._lines) else "",
        }

    @staticmethod
    def parse_toolpath(gcode_text: str) -> list[dict]:
        toolpath = []
        current_x, current_y, current_z = 0.0, 0.0, 0.0
        current_f = 1000.0

        for line in gcode_text.splitlines():
            line = line.split(";")[0].strip()
            if not line:
                continue

            is_move = line.startswith("G0") or line.startswith("G1") or line.startswith("G00") or line.startswith("G01")
            if not is_move:
                continue

            x_match = re.search(r"X([-\d.]+)", line)
            y_match = re.search(r"Y([-\d.]+)", line)
            z_match = re.search(r"Z([-\d.]+)", line)
            f_match = re.search(r"F([-\d.]+)", line)

            if x_match:
                current_x = float(x_match.group(1))
            if y_match:
                current_y = float(y_match.group(1))
            if z_match:
                current_z = float(z_match.group(1))
            if f_match:
                current_f = float(f_match.group(1))

            is_rapid = line.startswith("G0 ") or line.startswith("G00 ") or line == "G0" or line == "G00"

            toolpath.append({
                "x": current_x, "y": current_y, "z": current_z,
                "f": current_f, "rapid": is_rapid,
            })

        return toolpath

    async def run(self, gcode_text: str) -> None:
        if self._running:
            raise RuntimeError("G-code program already running")
        if not self._serial_manager.is_connected:
            raise ConnectionError("Robot not connected")

        self._lines = [
            line.split(";")[0].strip()
            for line in gcode_text.splitlines()
            if line.split(";")[0].strip()
        ]
        self._total_lines = len(self._lines)
        self._current_line = 0
        self._running = True
        self._paused = False
        self._cancel_event.clear()
        self._pause_event.set()

        try:
            for i, line in enumerate(self._lines):
                if self._cancel_event.is_set():
                    break

                await self._pause_event.wait()

                if self._cancel_event.is_set():
                    break

                self._current_line = i

                if not line or line.startswith(";") or line.startswith("(") or line.startswith("%"):
                    continue

                await asyncio.to_thread(self._serial_manager.send_gcode, line)

        finally:
            self._running = False
            self._paused = False

    def pause(self):
        if self._running and not self._paused:
            self._paused = True
            self._pause_event.clear()

    def resume(self):
        if self._running and self._paused:
            self._paused = False
            self._pause_event.set()

    def stop(self):
        self._cancel_event.set()
        self._pause_event.set()
        self._running = False
