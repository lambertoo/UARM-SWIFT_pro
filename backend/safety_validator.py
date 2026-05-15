class SafetyViolation(Exception):
    pass


class SafetyValidator:
    def __init__(
        self,
        workspace_min_x: float,
        workspace_max_x: float,
        workspace_min_y: float,
        workspace_max_y: float,
        workspace_min_z: float,
        workspace_max_z: float,
        max_speed: float,
        loaded_max_speed: float,
        boundary_slowdown_distance: float,
        boundary_slowdown_factor: float,
        exclusion_zones: list[dict],
    ):
        self.workspace_min_x = workspace_min_x
        self.workspace_max_x = workspace_max_x
        self.workspace_min_y = workspace_min_y
        self.workspace_max_y = workspace_max_y
        self.workspace_min_z = workspace_min_z
        self.workspace_max_z = workspace_max_z
        self.max_speed = max_speed
        self.loaded_max_speed = loaded_max_speed
        self.boundary_slowdown_distance = boundary_slowdown_distance
        self.boundary_slowdown_factor = boundary_slowdown_factor
        self.exclusion_zones = exclusion_zones

    def validate_move(self, x: float, y: float, z: float, speed: float, vacuum_on: bool):
        if x < self.workspace_min_x:
            raise SafetyViolation(f"X={x} exceeds boundary min X={self.workspace_min_x}")
        if x > self.workspace_max_x:
            raise SafetyViolation(f"X={x} exceeds boundary max X={self.workspace_max_x}")
        if y < self.workspace_min_y:
            raise SafetyViolation(f"Y={y} exceeds boundary min Y={self.workspace_min_y}")
        if y > self.workspace_max_y:
            raise SafetyViolation(f"Y={y} exceeds boundary max Y={self.workspace_max_y}")
        if z < self.workspace_min_z:
            raise SafetyViolation(f"Z={z} exceeds boundary min Z={self.workspace_min_z}")
        if z > self.workspace_max_z:
            raise SafetyViolation(f"Z={z} exceeds boundary max Z={self.workspace_max_z}")

        if speed > self.max_speed:
            raise SafetyViolation(f"Speed {speed} exceeds maximum {self.max_speed}")
        if vacuum_on and speed > self.loaded_max_speed:
            raise SafetyViolation(f"Speed {speed} exceeds loaded maximum {self.loaded_max_speed}")

        for zone in self.exclusion_zones:
            if (
                zone["min_x"] <= x <= zone["max_x"]
                and zone["min_y"] <= y <= zone["max_y"]
                and zone["min_z"] <= z <= zone["max_z"]
            ):
                raise SafetyViolation(
                    f"Target ({x}, {y}, {z}) is inside exclusion zone '{zone['name']}'"
                )

    def apply_boundary_slowdown(self, x: float, y: float, z: float, speed: float) -> float:
        min_distance = min(
            x - self.workspace_min_x,
            self.workspace_max_x - x,
            y - self.workspace_min_y,
            self.workspace_max_y - y,
            z - self.workspace_min_z,
            self.workspace_max_z - z,
        )
        if min_distance <= self.boundary_slowdown_distance:
            return speed * self.boundary_slowdown_factor
        return speed
