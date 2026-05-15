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
            self._safety_validator.validate_move(block["x"], block["y"], block["z"], speed=speed, vacuum_on=False)
            self._serial_manager.move_to(block["x"], block["y"], block["z"], speed=speed)

        elif block_type == "move_relative":
            position = self._serial_manager.get_position()
            target_x = position["x"] + block["dx"]
            target_y = position["y"] + block["dy"]
            target_z = position["z"] + block["dz"]
            speed = block.get("speed", self._current_speed)
            self._safety_validator.validate_move(target_x, target_y, target_z, speed=speed, vacuum_on=False)
            self._serial_manager.move_to(target_x, target_y, target_z, speed=speed)

        elif block_type == "vacuum_on":
            self._serial_manager.set_pump(True)

        elif block_type == "vacuum_off":
            self._serial_manager.set_pump(False)

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
            for _ in range(block["count"]):
                if not self._running:
                    return
                await self._execute_blocks(block["body"])

        elif block_type == "log":
            self._execution_log.append(block.get("message", ""))

    def convert_to_python(self, program: list[dict], indent: int = 0) -> str:
        lines = []
        if indent == 0:
            lines.append("import time")
            lines.append("from uarm.wrapper import SwiftAPI")
            lines.append("")
            lines.append("arm = SwiftAPI()")
            lines.append("arm.connect()")
            lines.append("arm.waiting_ready()")
            lines.append("")

        prefix = "    " * indent
        for block in program:
            block_type = block["type"]
            if block_type == "move_to":
                speed = block.get("speed", 100)
                lines.append(f"{prefix}arm.set_position(x={block['x']}, y={block['y']}, z={block['z']}, speed={speed})")
                lines.append(f"{prefix}arm.waiting_ready()")
            elif block_type == "move_relative":
                speed = block.get("speed", 100)
                lines.append(f"{prefix}pos = arm.get_position()")
                lines.append(f"{prefix}arm.set_position(x=pos[0]+{block['dx']}, y=pos[1]+{block['dy']}, z=pos[2]+{block['dz']}, speed={speed})")
                lines.append(f"{prefix}arm.waiting_ready()")
            elif block_type == "vacuum_on":
                lines.append(f"{prefix}arm.set_pump(on=True)")
            elif block_type == "vacuum_off":
                lines.append(f"{prefix}arm.set_pump(on=False)")
            elif block_type == "home":
                lines.append(f"{prefix}arm.reset()")
                lines.append(f"{prefix}arm.waiting_ready()")
            elif block_type == "set_speed":
                lines.append(f"{prefix}# Default speed set to {block['speed']}")
            elif block_type == "wait":
                lines.append(f"{prefix}time.sleep({block['ms'] / 1000.0})")
            elif block_type == "repeat":
                lines.append(f"{prefix}for _ in range({block['count']}):")
                body_code = self.convert_to_python(block["body"], indent + 1)
                lines.append(body_code)
            elif block_type == "log":
                lines.append(f"{prefix}print({block.get('message', '')!r})")

        return "\n".join(lines)
