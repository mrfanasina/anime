# routers/episode.py
from fastapi import APIRouter
from app.db.session import SessionLocal
from app.db.models.episode import Episode
from app.crud.anime import extract_episode_number
from app.db.models.season import Season
from app.utils.get_anime_info import get_episode_count_from_anilist
router = APIRouter()

@router.get("/")
def list_episodes():
    db = SessionLocal()
    episodes = db.query(Episode).all()
    db.close()
    return [{"id": e.id, "name": e.name, "path": e.path, "season_id": e.season_id} for e in episodes]

@router.get("/miss/{season_id}")
def detect_missing_episodes(season_id: int):
    db = SessionLocal()
    season = db.query(Season).filter(Season.id == season_id).first()
    # 1. Tente de récupérer depuis AniList
    total_expected = get_episode_count_from_anilist(season.anime.name)

    # 2. Sinon, estimation offline
    if not total_expected:
        total_expected = max(
            (ep.episode_number for ep in season.episodes),
            default=0
        )
        total_expected = max(total_expected, 12)  # fallback par défaut

    existing_nums = {ep.episode_number for ep in season.episodes}
    missing = [num for num in range(1, total_expected + 1) if num not in existing_nums]

    return missing
