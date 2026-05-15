import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from backend.database import get_database_path, get_connection
from backend.models import SequenceCreate

router = APIRouter()


@router.get("")
async def list_sequences():
    db = await get_connection(get_database_path())
    try:
        cursor = await db.execute("SELECT * FROM sequences ORDER BY updated_at DESC")
        return [dict(row) for row in await cursor.fetchall()]
    finally:
        await db.close()


@router.post("")
async def create_sequence(data: SequenceCreate):
    now = datetime.now(timezone.utc).isoformat()
    db = await get_connection(get_database_path())
    try:
        cursor = await db.execute(
            "INSERT INTO sequences (name, description, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (data.name, data.description, now, now),
        )
        await db.commit()
        return {"id": cursor.lastrowid, "name": data.name, "description": data.description, "created_at": now, "updated_at": now}
    finally:
        await db.close()


@router.get("/{sequence_id}")
async def get_sequence(sequence_id: int):
    db = await get_connection(get_database_path())
    try:
        cursor = await db.execute("SELECT * FROM sequences WHERE id = ?", (sequence_id,))
        seq = await cursor.fetchone()
        if not seq:
            raise HTTPException(status_code=404, detail="Sequence not found")
        cursor = await db.execute("SELECT * FROM waypoints WHERE sequence_id = ? ORDER BY order_index", (sequence_id,))
        waypoints = [dict(row) for row in await cursor.fetchall()]
        return {**dict(seq), "waypoints": waypoints}
    finally:
        await db.close()


@router.put("/{sequence_id}")
async def update_sequence(sequence_id: int, data: dict):
    now = datetime.now(timezone.utc).isoformat()
    db = await get_connection(get_database_path())
    try:
        if "name" in data or "description" in data:
            await db.execute(
                "UPDATE sequences SET name=COALESCE(?, name), description=COALESCE(?, description), updated_at=? WHERE id=?",
                (data.get("name"), data.get("description"), now, sequence_id),
            )
        if "waypoints" in data:
            await db.execute("DELETE FROM waypoints WHERE sequence_id = ?", (sequence_id,))
            for index, wp in enumerate(data["waypoints"]):
                await db.execute(
                    "INSERT INTO waypoints (sequence_id, order_index, x, y, z, speed, vacuum_on, delay_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (sequence_id, index, wp["x"], wp["y"], wp["z"], wp.get("speed", 50), int(wp.get("vacuum_on", False)), wp.get("delay_ms", 0)),
                )
        await db.commit()
        return {"status": "updated", "id": sequence_id}
    finally:
        await db.close()


@router.delete("/{sequence_id}")
async def delete_sequence(sequence_id: int):
    db = await get_connection(get_database_path())
    try:
        cursor = await db.execute("DELETE FROM sequences WHERE id = ?", (sequence_id,))
        await db.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Sequence not found")
        return {"status": "deleted"}
    finally:
        await db.close()


@router.post("/{sequence_id}/run")
async def run_sequence(sequence_id: int, speed_override: float = 1.0, loop_count: int = 1):
    from backend.main import sequence_runner
    db = await get_connection(get_database_path())
    try:
        cursor = await db.execute("SELECT * FROM waypoints WHERE sequence_id = ? ORDER BY order_index", (sequence_id,))
        waypoints = [dict(row) for row in await cursor.fetchall()]
    finally:
        await db.close()
    if not waypoints:
        raise HTTPException(status_code=400, detail="Sequence has no waypoints")
    asyncio.create_task(sequence_runner.run_sequence(waypoints, speed_override=speed_override, loop_count=loop_count))
    return {"status": "started", "waypoint_count": len(waypoints)}


@router.post("/stop")
async def stop_sequence():
    from backend.main import sequence_runner
    if sequence_runner:
        sequence_runner.stop()
    return {"status": "stopped"}


@router.get("/{sequence_id}/export")
async def export_sequence(sequence_id: int):
    db = await get_connection(get_database_path())
    try:
        cursor = await db.execute("SELECT * FROM sequences WHERE id = ?", (sequence_id,))
        seq = await cursor.fetchone()
        if not seq:
            raise HTTPException(status_code=404, detail="Sequence not found")
        cursor = await db.execute("SELECT x, y, z, speed, vacuum_on, delay_ms FROM waypoints WHERE sequence_id = ? ORDER BY order_index", (sequence_id,))
        waypoints = [dict(row) for row in await cursor.fetchall()]
        return JSONResponse(content={"name": seq["name"], "description": seq["description"], "waypoints": waypoints})
    finally:
        await db.close()


@router.post("/import")
async def import_sequence(data: dict):
    now = datetime.now(timezone.utc).isoformat()
    db = await get_connection(get_database_path())
    try:
        cursor = await db.execute(
            "INSERT INTO sequences (name, description, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (data["name"], data.get("description", ""), now, now),
        )
        sequence_id = cursor.lastrowid
        for index, wp in enumerate(data["waypoints"]):
            await db.execute(
                "INSERT INTO waypoints (sequence_id, order_index, x, y, z, speed, vacuum_on, delay_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (sequence_id, index, wp["x"], wp["y"], wp["z"], wp.get("speed", 50), int(wp.get("vacuum_on", False)), wp.get("delay_ms", 0)),
            )
        await db.commit()
        return {"status": "imported", "id": sequence_id}
    finally:
        await db.close()
