from datetime import datetime, timezone
from backend.database import get_connection
from backend.models import CalibrationProfileCreate


async def create_calibration_profile(database_path: str, data: CalibrationProfileCreate) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    db = await get_connection(database_path)
    try:
        cursor = await db.execute(
            """INSERT INTO calibration_profiles
            (profile_name, serial_port_path, baud_rate,
             home_offset_x, home_offset_y, home_offset_z,
             workspace_min_x, workspace_max_x,
             workspace_min_y, workspace_max_y,
             workspace_min_z, workspace_max_z,
             vacuum_verified, calibrated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                data.profile_name, data.serial_port_path, data.baud_rate,
                data.home_offset_x, data.home_offset_y, data.home_offset_z,
                data.workspace_min_x, data.workspace_max_x,
                data.workspace_min_y, data.workspace_max_y,
                data.workspace_min_z, data.workspace_max_z,
                int(data.vacuum_verified), now,
            ),
        )
        await db.commit()
        return {**data.model_dump(), "id": cursor.lastrowid, "calibrated_at": now}
    finally:
        await db.close()


async def list_calibration_profiles(database_path: str) -> list[dict]:
    db = await get_connection(database_path)
    try:
        cursor = await db.execute("SELECT * FROM calibration_profiles ORDER BY calibrated_at DESC")
        return [dict(row) for row in await cursor.fetchall()]
    finally:
        await db.close()


async def get_calibration_profile(database_path: str, profile_id: int) -> dict | None:
    db = await get_connection(database_path)
    try:
        cursor = await db.execute("SELECT * FROM calibration_profiles WHERE id = ?", (profile_id,))
        row = await cursor.fetchone()
        return dict(row) if row else None
    finally:
        await db.close()


async def update_calibration_profile(database_path: str, profile_id: int, data: CalibrationProfileCreate) -> dict | None:
    now = datetime.now(timezone.utc).isoformat()
    db = await get_connection(database_path)
    try:
        await db.execute(
            """UPDATE calibration_profiles SET
            profile_name=?, serial_port_path=?, baud_rate=?,
            home_offset_x=?, home_offset_y=?, home_offset_z=?,
            workspace_min_x=?, workspace_max_x=?,
            workspace_min_y=?, workspace_max_y=?,
            workspace_min_z=?, workspace_max_z=?,
            vacuum_verified=?, calibrated_at=?
            WHERE id=?""",
            (
                data.profile_name, data.serial_port_path, data.baud_rate,
                data.home_offset_x, data.home_offset_y, data.home_offset_z,
                data.workspace_min_x, data.workspace_max_x,
                data.workspace_min_y, data.workspace_max_y,
                data.workspace_min_z, data.workspace_max_z,
                int(data.vacuum_verified), now, profile_id,
            ),
        )
        await db.commit()
        return {**data.model_dump(), "id": profile_id, "calibrated_at": now}
    finally:
        await db.close()


async def delete_calibration_profile(database_path: str, profile_id: int) -> bool:
    db = await get_connection(database_path)
    try:
        cursor = await db.execute("DELETE FROM calibration_profiles WHERE id = ?", (profile_id,))
        await db.commit()
        return cursor.rowcount > 0
    finally:
        await db.close()
