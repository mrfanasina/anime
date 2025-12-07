from pydantic import BaseModel
from typing import Optional

class DownloadResponse(BaseModel):
    success: bool
    message: str

class DownloadRequest(BaseModel):
    torrent_magnet: str
    season_id: Optional[int]
