from fastapi import APIRouter
from backend.database import get_database_path, get_connection
from backend.models import SafetyConfig, ExclusionZoneCreate
from backend.safety_validator import SafetyValidator

router = APIRouter()


@router.get("/config")
async def get_safety_config():
    db = await get_connection(get_database_path())
    try:
        cursor = await db.execute("SELECT * FROM safety_config WHERE id = 1")
        config = dict(await cursor.fetchone())
        cursor = await db.execute("SELECT * FROM exclusion_zones")
        zones = [dict(row) for row in await cursor.fetchall()]
        return {"config": config, "exclusion_zones": zones}
    finally:
        await db.close()


@router.put("/config")
async def update_safety_config(data: SafetyConfig):
    import backend.main as main_module
    db = await get_connection(get_database_path())
    try:
        await db.execute(
            """UPDATE safety_config SET max_speed=?, boundary_slowdown_distance=?,
            boundary_slowdown_factor=?, loaded_max_speed=?, estop_release_vacuum=? WHERE id=1""",
            (data.max_speed, data.boundary_slowdown_distance, data.boundary_slowdown_factor,
             data.loaded_max_speed, int(data.estop_release_vacuum)),
        )
        await db.commit()
    finally:
        await db.close()

    db2 = await get_connection(get_database_path())
    try:
        cursor = await db2.execute("SELECT * FROM exclusion_zones")
        zones = [dict(row) for row in await cursor.fetchall()]
    finally:
        await db2.close()

    main_module.safety_validator = SafetyValidator(
        workspace_min_x=-350.0, workspace_max_x=350.0,
        workspace_min_y=-350.0, workspace_max_y=350.0,
        workspace_min_z=0.0, workspace_max_z=150.0,
        max_speed=data.max_speed, loaded_max_speed=data.loaded_max_speed,
        boundary_slowdown_distance=data.boundary_slowdown_distance,
        boundary_slowdown_factor=data.boundary_slowdown_factor,
        exclusion_zones=zones,
    )
    return {"status": "updated"}


@router.post("/exclusion-zones")
async def add_exclusion_zone(data: ExclusionZoneCreate):
    db = await get_connection(get_database_path())
    try:
        cursor = await db.execute(
            "INSERT INTO exclusion_zones (name, min_x, max_x, min_y, max_y, min_z, max_z) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (data.name, data.min_x, data.max_x, data.min_y, data.max_y, data.min_z, data.max_z),
        )
        await db.commit()
        return {"id": cursor.lastrowid, **data.model_dump()}
    finally:
        await db.close()


@router.delete("/exclusion-zones/{zone_id}")
async def delete_exclusion_zone(zone_id: int):
    db = await get_connection(get_database_path())
    try:
        await db.execute("DELETE FROM exclusion_zones WHERE id = ?", (zone_id,))
        await db.commit()
        return {"status": "deleted"}
    finally:
        await db.close()
