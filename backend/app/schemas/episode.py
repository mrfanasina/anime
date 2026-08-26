"""
Schémas Pydantic pour les épisodes.
"""
from pydantic import BaseModel
from typing import Optional


class EpisodeBase(BaseModel):
    """Schéma de base pour un épisode."""
    id: int
    episode_number: int
    title: Optional[str] = None
    season_id: int

    class Config:
        from_attributes = True


class EpisodeCreate(BaseModel):
    """Schéma de création d'un épisode."""
    season_id: int
    episode_number: int
    title: Optional[str] = None


class EpisodeUpdate(BaseModel):
    """Schéma de mise à jour d'un épisode."""
    title: Optional[str] = None
    episode_number: Optional[int] = None
