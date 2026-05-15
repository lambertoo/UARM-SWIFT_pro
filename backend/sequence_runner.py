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
                        self._serial_manager.set_pump(waypoint["vacuum_on"])
                        last_vacuum_state = waypoint["vacuum_on"]
                    if waypoint["delay_ms"] > 0:
                        delay_seconds = waypoint["delay_ms"] / 1000.0
                        elapsed = 0.0
                        while elapsed < delay_seconds and self._running:
                            await asyncio.sleep(min(0.05, delay_seconds - elapsed))
                            elapsed += 0.05
        finally:
            self._running = False
