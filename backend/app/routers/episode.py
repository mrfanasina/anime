"""
Routeur Episode — Endpoints pour la gestion des épisodes.

Fournit la liste des épisodes, les détails individuels,
et la détection des épisodes manquants (via AniList ou estimation offline).
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models.episode import Episode
from app.db.models.season import Season
from app.utils.get_anime_info import get_episode_count_from_anilist

router = APIRouter()


@router.get("/")
def list_episodes(db: Session = Depends(get_db)):
    """Retourne la liste de tous les épisodes enregistrés."""
    episodes = db.query(Episode).all()
    return [
        {"id": e.id, "name": e.name, "path": e.path, "season_id": e.season_id}
        for e in episodes
    ]


@router.get("/{epId}")
def get_episode_by_id(epId: int, db: Session = Depends(get_db)):
    """Retourne les détails d'un épisode par son ID."""
    episode = db.query(Episode).filter(Episode.id == epId).first()
    return episode


@router.get("/miss/{season_id}")
def detect_missing_episodes(season_id: int, db: Session = Depends(get_db)):
    """
    Détecte les numéros d'épisodes manquants pour une saison donnée.
    
    Utilise AniList si disponible, sinon estime le nombre total
    en se basant sur le numéro le plus élevé trouvé en base (minimum 12).
    """
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        return []

    # Tentative de récupération depuis AniList
    total_expected = get_episode_count_from_anilist(season.anime.name) if season.anime else None

    # Estimation offline si AniList ne répond pas
    if not total_expected:
        total_expected = max(
            (ep.episode_number for ep in season.episodes),
            default=0
        )
        total_expected = max(total_expected, 12)  # Fallback par défaut

    existing_nums = {ep.episode_number for ep in season.episodes}
    missing = [num for num in range(1, total_expected + 1) if num not in existing_nums]

    return missing
