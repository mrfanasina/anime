from fastapi import APIRouter, Body
from fastapi.responses import FileResponse
from os import system

router = APIRouter()

@router.post("/play")
def play_anime(path: str = Body(..., embed=True)):
    system(f"mpv '{path}' -fs &")
    return {"status": "playing", "path": path}

@router.get("/stream")
def stream_episode(path: str):
    return FileResponse(path, media_type="video/mp4")

@router.get("/download")
def download_episode(path: str):
    return FileResponse(path, media_type="application/octet-stream", filename=path.split("/")[-1])
