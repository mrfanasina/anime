from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import datetime
from app.db.models.watch_episode import WatchEpisode
from app.db.models.watch_season import WatchSeason
from app.db.models.watch import Watch
from app.db.models.episode import Episode

# CREATE
def create_watch_episode(db: Session, watch_season_id: int, episode_id: int, watched: bool = False) -> WatchEpisode:
    # éviter doublons pour le même épisode dans la même watch_season
    existing = db.query(WatchEpisode).filter_by(season_id=watch_season_id, episode_id=episode_id).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Episode déjà dans la season")
    we = WatchEpisode(season_id=watch_season_id, episode_id=episode_id, watched=watched, watched_at=datetime.datetime.now() if watched else None)
    db.add(we)
    db.commit()
    db.refresh(we)
    return we

# READ
def get_watch_episode(db: Session, watch_episode_id: int) -> WatchEpisode:
    we = db.query(WatchEpisode).filter_by(id=watch_episode_id).first()
    if not we:
        raise HTTPException(status_code=404, detail="WatchEpisode introuvable")
    return we

# UPDATE - toggle / set watched
def update_watch_episode(db: Session, watch_episode_id: int, watched: bool) -> WatchEpisode:
    we = db.query(WatchEpisode).filter_by(id=watch_episode_id).first()
    now = datetime.datetime.now()
    if not we:
        raise HTTPException(status_code=404, detail="WatchEpisode introuvable")
    we.watched = watched
    we.watched_at = now if watched else None
    db.commit()
    db.refresh(we)

    # si tous les épisodes de la saison sont vus, marquer la season comme completed
    season = db.query(WatchSeason).filter_by(id=we.season_id).first()
    if season:
        all_eps = db.query(WatchEpisode).filter_by(season_id=season.id).all()
        season.completed = all(e.watched for e in all_eps) if all_eps else False
        db.commit()
        db.refresh(season)

        # rafraîchir watch parent
        parent = db.query(Watch).filter_by(id=season.watch_id).first()
        if parent:
            from app.crud.watch import refresh_watch_completed
            refresh_watch_completed(db, parent)

    return we

# DELETE
def delete_watch_episode(db: Session, watch_episode_id: int):
    we = db.query(WatchEpisode).filter_by(id=watch_episode_id).first()
    if not we:
        raise HTTPException(status_code=404, detail="WatchEpisode introuvable")
    season_id = we.season_id
    db.delete(we)
    db.commit()

    # recalc saison/parent
    season = db.query(WatchSeason).filter_by(id=season_id).first()
    if season:
        episodes = db.query(WatchEpisode).filter_by(season_id=season.id).all()
        season.completed = all(e.watched for e in episodes) if episodes else False
        db.commit()
        db.refresh(season)
        parent = db.query(Watch).filter_by(id=season.watch_id).first()
        if parent:
            from app.crud.watch import refresh_watch_completed
            refresh_watch_completed(db, parent)

    return {"detail": "WatchEpisode supprimé"}

def get_episodes_by_watch_season(db: Session, season_id: int):
    return db.query(WatchEpisode).filter(WatchEpisode.season_id == season_id).all()

def get_all_episodes_for_season(db: Session, season_id: int):
    """Retourne tous les épisodes existants pour une saison (dans la table Episode)."""
    episodes = db.query(Episode).filter(Episode.season_id == season_id).all()
    return episodes
