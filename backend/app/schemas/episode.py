from pydantic import BaseModel
from typing import Optional

class EpisodeBase(BaseModel):
    id: int
    episode_number: int
    title: Optional[str] = None
    season_id: int
    
    class Config:
        from_attributes = True


class EpisodeCreate(BaseModel):
    season_id: int
    episode_number: int
    title: Optional[str] = None


class EpisodeUpdate(BaseModel):
    title: Optional[str] = None
    episode_number: Optional[int] = None
