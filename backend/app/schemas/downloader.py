"""
Schémas Pydantic pour le téléchargement d'animes.
"""
from pydantic import BaseModel
from typing import Optional


class DownloadResponse(BaseModel):
    """Réponse après une opération de téléchargement."""
    success: bool
    message: str


class DownloadRequest(BaseModel):
    """Requête de téléchargement d'un torrent."""
    torrent_magnet: str
    season_id: Optional[int] = None
