"""
Schémas Pydantic pour les saisons.
"""
from pydantic import BaseModel
from typing import Optional


class SeasonBase(BaseModel):
    """Schéma de base pour une saison."""
    id: int
    season_number: int
    title: Optional[str] = None
    anime_id: int

    class Config:
        from_attributes = True


class SeasonCreate(BaseModel):
    """Schéma de création d'une saison."""
    anime_id: int
    season_number: int
    title: Optional[str] = None


class SeasonUpdate(BaseModel):
    """Schéma de mise à jour d'une saison."""
    title: Optional[str] = None
    season_number: Optional[int] = None
