from fastapi import APIRouter, HTTPException
from backend.database import get_database_path
from backend.models import CalibrationProfileCreate
from backend.calibration import (
    create_calibration_profile,
    list_calibration_profiles,
    get_calibration_profile,
    update_calibration_profile,
    delete_calibration_profile,
)

router = APIRouter()


@router.get("/profiles")
async def list_profiles():
    return await list_calibration_profiles(get_database_path())


@router.post("/profiles")
async def create_profile(data: CalibrationProfileCreate):
    return await create_calibration_profile(get_database_path(), data)


@router.get("/profiles/{profile_id}")
async def get_profile(profile_id: int):
    profile = await get_calibration_profile(get_database_path(), profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.put("/profiles/{profile_id}")
async def update_profile(profile_id: int, data: CalibrationProfileCreate):
    result = await update_calibration_profile(get_database_path(), profile_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Profile not found")
    return result


@router.delete("/profiles/{profile_id}")
async def delete_profile(profile_id: int):
    deleted = await delete_calibration_profile(get_database_path(), profile_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"status": "deleted"}
