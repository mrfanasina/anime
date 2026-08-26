"""
Schémas Pydantic pour les animés saisonniers.
"""
from pydantic import BaseModel
from typing import Optional


class SeasonalBase(BaseModel):
    """Schéma de base pour un anime saisonnier."""
    id: int
    title: Optional[str] = None
    anime_id: int

    class Config:
        from_attributes = True


class SeasonalCreate(BaseModel):
    """Schéma de création d'un anime saisonnier."""
    anime_id: int
    Seasonal_number: int
    title: Optional[str] = None


class SeasonalUpdate(BaseModel):
    """Schéma de mise à jour d'un anime saisonnier."""
    title: Optional[str] = None
    Seasonal_number: Optional[int] = None


class SeasonalBySeasonName(BaseModel):
    """Schéma pour le regroupement d'animes par nom de saison."""
    season_name: str
    animes: list[SeasonalBase]

    class Config:
        from_attributes = True
