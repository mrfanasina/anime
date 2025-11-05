from pydantic import BaseModel
from typing import Optional

class SeasonBase(BaseModel):
    id: int
    season_number: int
    title: Optional[str] = None
    anime_id: int

    class Config:
        from_attributes = True


class SeasonCreate(BaseModel):
    anime_id: int
    season_number: int
    title: Optional[str] = None


class SeasonUpdate(BaseModel):
    title: Optional[str] = None
    season_number: Optional[int] = None
