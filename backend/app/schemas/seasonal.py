from pydantic import BaseModel
from typing import Optional

from pydantic import BaseModel
from typing import Optional

class SeasonalBase(BaseModel):
    id: int
    title: Optional[str] = None
    anime_id: int

    class Config:
        from_attributes = True


class SeasonalCreate(BaseModel):
    anime_id: int
    Seasonal_number: int
    title: Optional[str] = None


class SeasonalUpdate(BaseModel):
    title: Optional[str] = None
    Seasonal_number: Optional[int] = None

class SeasonalBySeasonName(BaseModel):
    season_name: str
    animes: list[SeasonalBase]

    class Config:
        from_attributes = True