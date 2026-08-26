"""Opérations CRUD pour les épisodes de watch (WatchEpisode)."""
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import datetime
from app.db.models.watch_episode import WatchEpisode
from app.db.models.watch_season import WatchSeason
from app.db.models.watch import Watch
from app.db.models.episode import Episode


def create_watch_episode(db: Session, watch_season_id: int, episode_id: int, watched: bool = False, finished: bool = False) -> WatchEpisode:
    """Crée un WatchEpisode en évitant les doublons. Met à jour si déjà existant."""
    # éviter doublons pour le même épisode dans la même watch_season
    existing = db.query(WatchEpisode).filter_by(season_id=watch_season_id, episode_id=episode_id).first()
    if existing:
        update_watch_episode(db=db, watch_episode_id=existing.id, watched=True, finished=finished)
    we = WatchEpisode(season_id=watch_season_id, episode_id=episode_id, watched=watched, finished=finished, watched_at=datetime.datetime.now() if watched else None)
    db.add(we)
    db.commit()
    db.refresh(we)
    print(we.episode_id)
    return we


def get_watch_episode(db: Session, watch_episode_id: int) -> WatchEpisode:
    """Récupère un WatchEpisode par son ID."""
    we = db.query(WatchEpisode).filter_by(id=watch_episode_id).first()
    if not we:
        raise HTTPException(status_code=404, detail="WatchEpisode introuvable")
    return we


def update_watch_episode(db: Session, watch_episode_id: int, watched: bool, finished: bool = False) -> WatchEpisode:
    """Met à jour le statut watched/finished et recalcule le statut de la saison et du watch parent."""
    we = db.query(WatchEpisode).filter_by(id=watch_episode_id).first()
    now = datetime.datetime.now()
    if not we:
        raise HTTPException(status_code=404, detail="WatchEpisode introuvable")
    we.watched = watched
    we.finished = finished
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

def get_episodes_by_watch_season(db: Session, season_id: int) -> list[WatchEpisode]:
    """Retourne tous les WatchEpisode d'une WatchSeason."""
    return db.query(WatchEpisode).filter(WatchEpisode.season_id == season_id).all()

def get_all_episodes_for_season(db: Session, season_id: int) -> list[Episode]:
    """Retourne tous les épisodes existants pour une saison (table Episode)."""
    episodes = db.query(Episode).filter(Episode.season_id == season_id).all()
    return episodes
def get_watch_episode_by_anime_and_user(db: Session, anime_id: int, user_id: int) -> list[WatchEpisode]:
    """Retourne tous les WatchEpisode pour un anime et un utilisateur donnés."""
    watch = db.query(Watch).filter(Watch.anime_id == anime_id, Watch.user_id == user_id).first()
    if not watch:
        return []

    watch_episodes = []
    for season in watch.seasons:
        episodes = db.query(WatchEpisode).filter(WatchEpisode.season_id == season.id).all()
        watch_episodes.extend(episodes)

    return watch_episodes
def get_watch_episode_by_episode_and_user(db: Session, episode_id: int, user_id: int) -> WatchEpisode | None:
    """Retourne le WatchEpisode pour un épisode et un utilisateur donnés."""
    watch_episode = db.query(WatchEpisode).join(WatchSeason).join(Watch).filter(
        WatchEpisode.episode_id == episode_id,
        Watch.user_id == user_id
    ).first()
    return watch_episode