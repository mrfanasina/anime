from datetime import datetime
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.db.models.watch_season import WatchSeason
from app.db.models.watch_episode import WatchEpisode
from app.db.models.watch import Watch

# CREATE
def create_watch_season(db: Session, watch_id: int, season_id: int, completed: bool = False) -> WatchSeason:
    # éviter doublons de saison pour la même watch
    existing = db.query(WatchSeason).filter_by(watch_id=watch_id, season_id=season_id).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Season déjà liée à cette watch")
    ws = WatchSeason(watch_id=watch_id, season_id=season_id, completed=completed)
    db.add(ws)
    db.commit()
    db.refresh(ws)
    return ws

# READ
def get_watch_season(db: Session, watch_season_id: int) -> WatchSeason:
    ws = db.query(WatchSeason).options(joinedload(WatchSeason.episodes)).filter_by(id=watch_season_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="WatchSeason introuvable")
    return ws

# UPDATE
def update_watch_season(db: Session, watch_season_id: int, completed: bool = None) -> WatchSeason:
    ws = db.query(WatchSeason).filter_by(id=watch_season_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="WatchSeason introuvable")
    if completed is not None:
        ws.completed = completed
    db.commit()
    db.refresh(ws)

    # mettre à jour le parent Watch
    parent = db.query(Watch).filter_by(id=ws.watch_id).first()
    if parent:
        from app.crud.watch import refresh_watch_completed
        refresh_watch_completed(db, parent)

    return ws

# DELETE
def delete_watch_season(db: Session, watch_season_id: int):
    ws = db.query(WatchSeason).filter_by(id=watch_season_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="WatchSeason introuvable")
    watch_id = ws.watch_id
    db.delete(ws)
    db.commit()

    # refresh parent
    parent = db.query(Watch).filter_by(id=watch_id).first()
    if parent:
        from app.crud.watch import refresh_watch_completed
        refresh_watch_completed(db, parent)

    return {"detail": "WatchSeason supprimée"}

def get_watch_season_by_watch_and_season(db: Session, watch_id: int, season_id: int) -> WatchSeason | None:
    return db.query(WatchSeason).filter_by(watch_id=watch_id, season_id=season_id).first()

def get_watch_seasons_by_watch(db: Session, watch_id: int):
    return db.query(WatchSeason).filter(WatchSeason.watch_id == watch_id).all()

def complete_watch_season(db: Session, watch_season_id: int):
    """Marque une WatchSeason comme complétée en cochant tous ses épisodes comme vus."""
    ws = db.query(WatchSeason).filter_by(id=watch_season_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="WatchSeason introuvable")

    # Récupérer tous les épisodes liés à cette WatchSeason
    episodes = db.query(WatchEpisode).filter_by(season_id=ws.id).all()

    # Marquer tous les épisodes comme vus
    now = datetime.now()
    for ep in episodes:
        ep.watched = True
        ep.watched_at = now

    # Marquer la saison comme complétée
    ws.completed = True

    db.commit()
    db.refresh(ws)

    # Mettre à jour le parent Watch
    parent = db.query(Watch).filter_by(id=ws.watch_id).first()
    if parent:
        from app.crud.watch import refresh_watch_completed
        refresh_watch_completed(db, parent)

    return ws