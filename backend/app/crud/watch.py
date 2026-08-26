"""Opérations CRUD pour la gestion de la watchlist (entrées principales)."""
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.db.models.watch import Watch
from app.db.models.watch_season import WatchSeason
from app.db.models.anime import Anime
from app.schemas.watch import WatchCreate, WatchUpdate


def create_watch(db: Session, user_id: int, payload: WatchCreate) -> Watch:
    """Crée une nouvelle watch en évitant les doublons par (user_id, anime_id)."""
    # Éviter les doublons
    existing = db.query(Watch).filter_by(user_id=user_id, anime_id=payload.anime_id).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Anime déjà dans la watchlist")

    watch = Watch(user_id=user_id, anime_id=payload.anime_id, completed=payload.completed)
    db.add(watch)
    db.flush()  # pour avoir watch.id

        
    # Saisons + épisodes si fournis
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


def get_watch_list(db: Session, user_id: int) -> List[Watch]:
    """Retourne la liste complète des watches d'un utilisateur (avec saisons et épisodes)."""
    watches = db.query(Watch).options(
        joinedload(Watch.seasons).joinedload(WatchSeason.episodes)
    ).filter(Watch.user_id == user_id).all()
    return watches


def get_watch(db: Session, watch_id: int) -> Watch:
    """Récupère une watch par son ID avec ses relations chargées."""
    watch = db.query(Watch).options(
        joinedload(Watch.seasons).joinedload(WatchSeason.episodes)
    ).filter(Watch.id == watch_id).first()
    if not watch:
        raise HTTPException(status_code=404, detail="Watch entry not found")
    return watch


def update_watch(db: Session, watch_id: int, data: WatchUpdate) -> Watch:
    """Met à jour le champ 'completed' d'une watch."""
    watch = db.query(Watch).filter_by(id=watch_id).first()
    if not watch:
        raise HTTPException(status_code=404, detail="Watch entry not found")
    if data.completed is not None:
        watch.completed = data.completed
    db.commit()
    db.refresh(watch)
    return watch


def delete_watch(db: Session, watch_id: int):
    watch = db.query(Watch).filter_by(id=watch_id).first()
    if not watch:
        raise HTTPException(status_code=404, detail="Watch entry not found")
    db.delete(watch)
    db.commit()
    return {"detail": "Supprimé avec succès"}


def refresh_watch_completed(db: Session, watch: Watch) -> Watch:
    """Recalcule le statut 'completed' du Watch principal en fonction de ses saisons."""

    all_seasons = db.query(WatchSeason).filter_by(watch_id=watch.id).all()
    if not all_seasons:
        watch.completed = False
    else:
        watch.completed = all(s.completed for s in all_seasons)  # noqa: all est OK ici
    db.commit()
    db.refresh(watch)
    return watch


def get_watch_by_user_anime(db: Session, user_id: int, anime_id: int) -> Watch | None:
    """Vérifie si l'utilisateur a déjà une watch pour cet anime."""
    return db.query(Watch).filter_by(user_id=user_id, anime_id=anime_id).first()

def get_watch_seasons_by_watch(db: Session, watch_id: int):
    return db.query(WatchSeason).filter(WatchSeason.watch_id == watch_id).all()

def complete_watch_anime(db: Session, user_id: int, anime_id: int) -> Watch:
    """Marque un anime entier comme terminé (toutes saisons et épisodes cochés)."""
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