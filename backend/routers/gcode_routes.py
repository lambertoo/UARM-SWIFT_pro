import asyncio
from fastapi import APIRouter, UploadFile, File, BackgroundTasks
from pydantic import BaseModel
from backend.gcode_runner import GcodeRunner

router = APIRouter()


class GcodeText(BaseModel):
    gcode: str


@router.post("/parse")
async def parse_gcode(data: GcodeText):
    toolpath = GcodeRunner.parse_toolpath(data.gcode)
    lines = [l.split(";")[0].strip() for l in data.gcode.splitlines() if l.split(";")[0].strip()]
    return {"toolpath": toolpath, "total_lines": len(lines)}


@router.post("/upload")
async def upload_gcode(file: UploadFile = File(...)):
    content = await file.read()
    gcode_text = content.decode("utf-8", errors="ignore")
    toolpath = GcodeRunner.parse_toolpath(gcode_text)
    lines = [l.split(";")[0].strip() for l in gcode_text.splitlines() if l.split(";")[0].strip()]
    return {
        "filename": file.filename,
        "gcode": gcode_text,
        "toolpath": toolpath,
        "total_lines": len(lines),
    }


@router.post("/run")
async def run_gcode(data: GcodeText, background_tasks: BackgroundTasks):
    from backend.main import gcode_runner
    if gcode_runner.is_running:
        return {"error": "Already running"}
    background_tasks.add_task(gcode_runner.run, data.gcode)
    return {"status": "started"}


@router.post("/pause")
async def pause_gcode():
    from backend.main import gcode_runner
    gcode_runner.pause()
    return {"status": "paused"}


@router.post("/resume")
async def resume_gcode():
    from backend.main import gcode_runner
    gcode_runner.resume()
    return {"status": "resumed"}


@router.post("/stop")
async def stop_gcode():
    from backend.main import gcode_runner
    gcode_runner.stop()
    return {"status": "stopped"}


@router.get("/progress")
async def gcode_progress():
    from backend.main import gcode_runner
    return gcode_runner.progress
