"""
Schémas Pydantic pour les animés.
"""
from pydantic import BaseModel
from typing import Optional


class AnimeBase(BaseModel):
    """Schéma de base pour un anime."""
    id: int
    name: Optional[str] = None
    description: Optional[str] = None
    cover_image: Optional[str] = None
    year: Optional[int] = None
    type: Optional[str] = None

    class Config:
        from_attributes = True


class AnimeCreate(BaseModel):
    """Schéma de création d'un anime."""
    name: str
    description: Optional[str] = None
    cover_image: Optional[str] = None
    year: Optional[int] = None


class AnimeUpdate(BaseModel):
    """Schéma de mise à jour d'un anime."""
    name: Optional[str] = None
    description: Optional[str] = None
    cover_image: Optional[str] = None
    year: Optional[int] = None


class AnimeWithLastEpisodeViewed(AnimeBase):
    """Anime avec les épisodes visionnés (pour la page de détails)."""
    last_episode_viewed: Optional[int] = None
    next_episode_to_watch: Optional[int] = None


class Selection(BaseModel):
    """Sélection d'épisodes pour la copie ou le déplacement."""
    episodeIds: Optional[list[int]] = None
    type: Optional[str] = "all"


class Copy(BaseModel):
    """Paramètres de copie d'un anime."""
    animeId: int
    selection: Optional[str] = None
    targetPath: str
