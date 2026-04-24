from pydantic import BaseModel
from typing import Optional

class AnimeBase(BaseModel):
    id: int
    name: Optional[str] = None
    description: Optional[str] = None
    cover_image: Optional[str] = None
    year: Optional[int] = None
    type: Optional[str] = None
    
    class Config:
        from_attributes = True


class AnimeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    cover_image: Optional[str] = None
    year: Optional[int] = None


class AnimeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    cover_image: Optional[str] = None
    year: Optional[int] = None

class AnimeWithLastEpisodeViewed(AnimeBase):
    last_episode_viewed: Optional[int] = None
    next_episode_to_watch: Optional[int] = None
    
class Selection(BaseModel):
    episodeIds: Optional[list[int]] = None
    type: Optional[str] = "all"
    
class Copy(BaseModel):
    animeId: int
    selection: Optional[str] = None
    targetPath: str
    
