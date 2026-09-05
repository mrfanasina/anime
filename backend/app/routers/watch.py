"""
Routeur Watch — Endpoints pour la gestion de la watchlist utilisateur.

Fournit les opérations CRUD sur les watches (entrées de la watchlist),
les saisons de watch, les épisodes de watch, et le calcul de progression.
"""
from typing import List
from fastapi import APIRouter, Depends, Body, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.watch import (
    WatchCreate, WatchOut, WatchProgressResponse, WatchUpdate,
    WatchSeasonCreate, WatchSeasonOut,
    WatchEpisodeCreate, WatchEpisodeOut, WatchProgressRequest, WatchAnimeComplet
)
from app.crud import watch as crud_watch
from app.crud import watch_season as crud_wseason
from app.crud import watch_episode as crud_wep
from app.crud import anime as crud_anime

router = APIRouter()


# ==================== Watch (principal) ====================
@router.post("/", response_model=WatchOut)
def add_watch(payload: WatchCreate, db: Session = Depends(get_db)):
    """Crée une watch pour un utilisateur sur un anime donné."""
    return crud_watch.create_watch(db, user_id=payload.user_id, payload=payload)


@router.get("/user/{user_id}", response_model=List[WatchOut])
def list_user_watch(user_id: int, db: Session = Depends(get_db)):
    """Retourne la liste complète des watches d'un utilisateur (avec saisons et épisodes)."""
    return crud_watch.get_watch_list(db, user_id)


@router.get("/{watch_id}", response_model=WatchOut)
def get_watch(watch_id: int, db: Session = Depends(get_db)):
    """Retourne les détails d'une watch par son ID."""
    return crud_watch.get_watch(db, watch_id)


@router.patch("/{watch_id}", response_model=WatchOut)
def patch_watch(watch_id: int, payload: WatchUpdate, db: Session = Depends(get_db)):
    """Met à jour le statut 'completed' d'une watch."""
    return crud_watch.update_watch(db, watch_id, payload)


@router.delete("/{watch_id}")
def delete_watch(watch_id: int, db: Session = Depends(get_db)):
    """Supprime une watch et ses sous-ressources."""
    return crud_watch.delete_watch(db, watch_id)


# ==================== WatchSeason (sous-ressource) ====================
@router.post("/{watch_id}/season", response_model=WatchSeasonOut)
def add_watch_season(watch_id: int, payload: WatchSeasonCreate, db: Session = Depends(get_db)):
    """Ajoute une saison à une watch existante."""
    return crud_wseason.create_watch_season(
        db, watch_id=watch_id, season_id=payload.season_id, completed=payload.completed
    )


@router.get("/season/{watch_season_id}", response_model=WatchSeasonOut)
def get_watch_season(watch_season_id: int, db: Session = Depends(get_db)):
    """Retourne les détails d'une WatchSeason par son ID."""
    return crud_wseason.get_watch_season(db, watch_season_id)


@router.patch("/season/{watch_season_id}", response_model=WatchSeasonOut)
def patch_watch_season(
    watch_season_id: int,
    payload: WatchSeasonCreate = Body(...),
    db: Session = Depends(get_db)
):
    """Met à jour le statut 'completed' d'une WatchSeason."""
    return crud_wseason.update_watch_season(db, watch_season_id=watch_season_id, completed=payload.completed)


@router.delete("/season/{watch_season_id}")
def delete_watch_season(watch_season_id: int, db: Session = Depends(get_db)):
    """Supprime une WatchSeason et recalcule le statut du watch parent."""
    return crud_wseason.delete_watch_season(db, watch_season_id)


# ==================== WatchEpisode (sous-ressource) ====================
def _ensure_watch_and_season(db: Session, payload: WatchEpisodeCreate):
    """
    S'assure que la watch et la saison existent pour un payload WatchEpisode.
    
    Crée automatiquement la watch et la saison si elles n'existent pas.
    Retourne (watch, season).
    """
    # Récupérer anime_id si non fourni
    anime_id = payload.anime_id
    if anime_id is None:
        anime_id = crud_anime.get_anime_id_by_episode(db, payload.episode_id)
        if anime_id is None:
            raise HTTPException(400, "Impossible de retrouver l'anime depuis episode_id")
    payload.anime_id = anime_id

    # Vérifier/créer watch
    watch = crud_watch.get_watch_by_user_anime(db, payload.user_id, payload.anime_id)
    if not watch:
        watch = crud_watch.create_watch(
            db, user_id=payload.user_id,
            payload=WatchCreate(user_id=payload.user_id, anime_id=payload.anime_id, status="watching")
        )

    # Vérifier/créer watch_season
    season = crud_wseason.get_watch_season_by_watch_and_season(db, watch.id, payload.season_id)
    if not season:
        season = crud_wseason.create_watch_season(db, watch_id=watch.id, season_id=payload.season_id, completed=False)

    return watch, season


@router.post("/episode", response_model=WatchEpisodeOut)
def add_or_update_watch_episode(payload: WatchEpisodeCreate, db: Session = Depends(get_db)):
    """
    Ajoute ou met à jour un épisode dans la watchlist.
    
    Si la watch ou la saison n'existe pas, elle est créée automatiquement.
    Si l'épisode existe déjà, il est mis à jour.
    """
    _, season = _ensure_watch_and_season(db, payload)

    try:
        episode = crud_wep.create_watch_episode(
            db, watch_season_id=season.id, episode_id=payload.episode_id, watched=payload.watched
        )
    except HTTPException as e:
        if e.status_code == status.HTTP_400_BAD_REQUEST:
            # Déjà existant → update
            episode = crud_wep.update_watch_episode(db, watch_episode_id=e.detail["id"], watched=payload.watched)
        else:
            raise e

    return episode


@router.patch("/episode/{watch_episode_id}", response_model=WatchEpisodeOut)
def patch_watch_episode(
    watch_episode_id: int,
    payload: WatchEpisodeCreate = Body(...),
    db: Session = Depends(get_db)
):
    """Met à jour le statut 'watched' d'un épisode. Crée l'entrée si nécessaire."""
    if not crud_wep.get_watch_episode(db, watch_episode_id):
        crud_wep.create_watch_episode(db, watch_episode_id=watch_episode_id, watched=payload.watched)

    return crud_wep.update_watch_episode(db, watch_episode_id=watch_episode_id, watched=payload.watched)


@router.delete("/episode/{watch_episode_id}")
def delete_watch_episode(watch_episode_id: int, db: Session = Depends(get_db)):
    """Supprime un WatchEpisode et recalcule le statut de la saison et du watch parent."""
    return crud_wep.delete_watch_episode(db, watch_episode_id)


@router.patch("/episode/by-episode-id", response_model=WatchEpisodeOut)
def update_watch_episode_by_episode_id(payload: WatchEpisodeCreate, db: Session = Depends(get_db)):
    """
    Met à jour le statut 'watched' d'un épisode en utilisant episode_id.
    
    Crée la watch, la saison et l'épisode si nécessaire.
    """
    _, season = _ensure_watch_and_season(db, payload)

    try:
        episode = crud_wep.create_watch_episode(
            db, watch_season_id=season.id, episode_id=payload.episode_id, watched=payload.watched
        )
    except HTTPException as e:
        if e.status_code == status.HTTP_400_BAD_REQUEST:
            episode = crud_wep.update_watch_episode(db, watch_episode_id=e.detail["id"], watched=payload.watched)
        else:
            raise e

    return episode


# ==================== Progression ====================
@router.post("/progress")
def get_watch_progress(payload: WatchProgressRequest, db: Session = Depends(get_db)):
    """
    Calcule la progression de visionnage d'un anime pour un utilisateur.
    
    Retourne la progression globale et la progression par saison,
    avec les IDs des épisodes en cours de visionnage.
    """
    watch = crud_watch.get_watch_by_user_anime(db, payload.user_id, payload.anime_id)
    if not watch:
        raise HTTPException(status_code=404, detail="Aucune progression trouvée pour cet anime")

    seasons = crud_wseason.get_watch_seasons_by_watch(db, watch.id)
    season_progress = []
    total_episodes = 0
    total_watched = 0

    for s in seasons:
        all_episodes = crud_wep.get_all_episodes_for_season(db, s.season_id)
        watched_episodes = crud_wep.get_episodes_by_watch_season(db, s.id)

        season_total = len(all_episodes)
        watched_count = sum(1 for e in watched_episodes if e.watched)
        progress = round((watched_count / season_total) * 100) if season_total > 0 else 0

        total_episodes += season_total
        total_watched += watched_count

        # Épisodes en cours de visionnage (pas encore terminés)
        watching_episode_ids = [ep.episode_id for ep in watched_episodes if not ep.finished]

        season_progress.append({
            "season_watch_id": s.id,
            "season_id": s.season_id,
            "progress": progress,
            "watching_eps": watching_episode_ids
        })

    anime_progress = round((total_watched / total_episodes) * 100) if total_episodes > 0 else 0
    anime_progress = min(anime_progress, 100)

    return {
        "anime_id": payload.anime_id,
        "progress": anime_progress,
        "seasons": season_progress
    }


# ==================== Marquer comme terminé ====================
@router.post("season/{watch_season_id}/complete", response_model=WatchSeasonOut)
def complete_watch_season(watch_season_id: int, db: Session = Depends(get_db)):
    """Marque une WatchSeason et tous ses épisodes comme terminés."""
    return crud_wseason.complete_watch_season(db, watch_season_id)


@router.post("/complete/anime", response_model=WatchOut)
def complete_watch_anime(payload: WatchAnimeComplet, db: Session = Depends(get_db)):
    """Marque un anime entier comme terminé (toutes saisons et épisodes cochés)."""
    return crud_watch.complete_watch_anime(db, payload.user_id, payload.anime_id)
