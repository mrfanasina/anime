from pydantic import BaseModel
from typing import Optional

class AnimeBase(BaseModel):
    id: int
    title: Optional[str] = None
    description: Optional[str] = None
    cover_image: Optional[str] = None
    year: Optional[int] = None

    class Config:
        from_attributes = True


class AnimeCreate(BaseModel):
    title: str
    description: Optional[str] = None
    cover_image: Optional[str] = None
    year: Optional[int] = None


class AnimeUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    cover_image: Optional[str] = None
    year: Optional[int] = None
