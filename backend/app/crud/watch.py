from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.db.models.watch import Watch
from app.db.models.watch_season import WatchSeason
from app.db.models.anime import Anime
from app.schemas.watch import WatchCreate, WatchUpdate

# CREATE
def create_watch(db: Session, user_id: int, payload: WatchCreate) -> Watch:
    # éviter doublons
    existing = db.query(Watch).filter_by(user_id=user_id, anime_id=payload.anime_id).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Anime déjà dans la watchlist")

    watch = Watch(user_id=user_id, anime_id=payload.anime_id, completed=payload.completed)
    db.add(watch)
    db.flush()  # pour avoir watch.id

    # saisons + épisodes si fournis
    if payload.seasons:
        for s in payload.seasons:
            ws = WatchSeason(watch_id=watch.id, season_id=s.season_id, completed=s.completed)
            db.add(ws)
            db.flush()
            if getattr(s, "episodes", None):
                for e in s.episodes:
                    from app.db.models.watch_episode import WatchEpisode
                    db.add(WatchEpisode(season_id=ws.id, episode_id=e.episode_id, watched=e.watched))

    db.commit()
    db.refresh(watch)
    return watch

# READ - liste complète de l'utilisateur (avec saison/episodes)
def get_watch_list(db: Session, user_id: int) -> List[Watch]:
    watches = db.query(Watch).options(
        joinedload(Watch.seasons).joinedload(WatchSeason.episodes)
    ).filter(Watch.user_id == user_id).all()
    return watches

# READ - un élément watch par id (avec relations)
def get_watch(db: Session, watch_id: int) -> Watch:
    watch = db.query(Watch).options(
        joinedload(Watch.seasons).joinedload(WatchSeason.episodes)
    ).filter(Watch.id == watch_id).first()
    if not watch:
        raise HTTPException(status_code=404, detail="Watch entry not found")
    return watch

# UPDATE - champs basiques (completed)
def update_watch(db: Session, watch_id: int, data: WatchUpdate) -> Watch:
    watch = db.query(Watch).filter_by(id=watch_id).first()
    if not watch:
        raise HTTPException(status_code=404, detail="Watch entry not found")
    if data.completed is not None:
        watch.completed = data.completed
    db.commit()
    db.refresh(watch)
    return watch

# DELETE
def delete_watch(db: Session, watch_id: int):
    watch = db.query(Watch).filter_by(id=watch_id).first()
    if not watch:
        raise HTTPException(status_code=404, detail="Watch entry not found")
    db.delete(watch)
    db.commit()
    return {"detail": "Supprimé avec succès"}


# Helper: recalculer l'état "completed" du Watch principal en fonction des saisons
def refresh_watch_completed(db: Session, watch: Watch):
    all_seasons = db.query(WatchSeason).filter_by(watch_id=watch.id).all()
    if not all_seasons:
        watch.completed = False
    else:
        watch.completed = all(s.completed for s in all_seasons)
    db.commit()
    db.refresh(watch)
    return watch

# Vérifie si l'utilisateur a déjà une watch pour cet anime
def get_watch_by_user_anime(db: Session, user_id: int, anime_id: int) -> Watch | None:
    return db.query(Watch).filter_by(user_id=user_id, anime_id=anime_id).first()

def get_watch_seasons_by_watch(db: Session, watch_id: int):
    return db.query(WatchSeason).filter(WatchSeason.watch_id == watch_id).all()

def complete_watch_anime(db: Session, user_id: int, anime_id: int) -> Watch:
    watch = get_watch_by_user_anime(db, user_id, anime_id)
    if not watch:
        raise HTTPException(status_code=404, detail="Aucune watch trouvée pour cet anime et utilisateur")

    # Marquer toutes les saisons et épisodes comme complétés
    seasons = db.query(WatchSeason).filter_by(watch_id=watch.id).all()
    for season in seasons:
        from app.crud.watch_season import complete_watch_season
        complete_watch_season(db, season.id)

    # Mettre à jour le watch principal
    refresh_watch_completed(db, watch)
    return watch