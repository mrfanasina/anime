from sqlalchemy.orm import Session
from app.db.models.anime import Anime
from app.db.models.season import Season
from app.db.models.episode import Episode
import datetime
import os
from app.utils.extract import extract_episode_number, extract_season_number
# ---------------- Anime ----------------
def get_or_create_anime(db: Session, name: str, path: str, force_update=False) -> Anime:
    anime = db.query(Anime).filter_by(name=name).first()
    if not anime:
        anime = Anime(
            name=name,
            path=path,
            elo=1000,
            image_url="",
            description="",
            note=None,
            status="",
            type="",
            rank=None,
            created_at="",
            studio=""
        )
        db.add(anime)
        db.commit()
        db.refresh(anime)
    elif force_update:
        if anime.path != path:
            anime.path = path
            db.commit()
    return anime

# ---------------- Season ----------------
def get_or_create_season(db: Session, anime: Anime, season_name: str, force_update=False) -> Season:
    season = db.query(Season).filter_by(name=season_name, anime_id=anime.id).first()
    if not season:
        season_number = extract_season_number(season_name)
        season = Season(name=season_name, anime_id=anime.id, season_number=season_number)
        db.add(season)
        db.commit()
        db.refresh(season)
    return season

# ---------------- Episode ----------------
def get_or_create_episode(db: Session, season: Season, episode_name: str, path: str, force_update=False) -> Episode:
    episode = db.query(Episode).filter_by(name=episode_name, season_id=season.id).first()
    episode_number = extract_episode_number(episode_name)
    
    if not episode:
        episode = Episode(
            name=episode_name,
            season_id=season.id,
            episode_number=episode_number,
            path=path,
            modified_time=datetime.datetime.fromtimestamp(os.path.getmtime(path))
        )
        db.add(episode)
    elif force_update:
        episode.name=episode_name
        episode.episode_number=episode_number
        episode.path = path
        episode.modified_time = datetime.datetime.fromtimestamp(os.path.getmtime(path))
    return episode

# ----------------- Helpers -----------------
def is_video_file(filename):
    video_exts = ['.mp4', '.mkv', '.avi', '.mov', '.ts', '.flv']
    return any(filename.lower().endswith(ext) for ext in video_exts)

def get_last_episode_number(db: Session, anime_id: int) -> int:
    last_episode = (
        db.query(Episode)
        .join(Season)
        .filter(Season.anime_id == anime_id)
        .order_by(Episode.episode_number.desc())
        .first()
    )
    if last_episode:
        return last_episode.episode_number, last_episode.season_id
    return 0, None
    return last_episode.episode_number if last_episode else 0
