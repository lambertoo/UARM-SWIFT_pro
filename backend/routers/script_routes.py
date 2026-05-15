import asyncio
from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.post("/run")
async def run_script(data: dict):
    from backend.main import block_interpreter
    program = data.get("program", [])
    if not program:
        raise HTTPException(status_code=400, detail="Empty program")
    asyncio.create_task(block_interpreter.execute(program))
    return {"status": "started"}


@router.post("/stop")
async def stop_script():
    from backend.main import block_interpreter
    if block_interpreter:
        block_interpreter.stop()
    return {"status": "stopped"}


@router.post("/export-python")
async def export_python(data: dict):
    from backend.main import block_interpreter
    program = data.get("program", [])
    if not program:
        raise HTTPException(status_code=400, detail="Empty program")
    script = block_interpreter.convert_to_python(program)
    return {"script": script}
