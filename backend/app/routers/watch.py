from typing import List
from fastapi import APIRouter, Depends, Body, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.schemas.watch import (
    WatchCreate, WatchOut, WatchProgressResponse, WatchUpdate,
    WatchSeasonCreate, WatchSeasonOut,
    WatchEpisodeCreate, WatchEpisodeOut, WatchProgressRequest
)
from app.crud import watch as crud_watch
from app.crud import watch_season as crud_wseason
from app.crud import watch_episode as crud_wep

router = APIRouter()

# -------------------------
# Helper pour la db
# -------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# -------------------------
# Watch (principal)
# -------------------------
@router.post("/", response_model=WatchOut)
def add_watch(payload: WatchCreate, db: Session = Depends(get_db)):
    """Crée une watch pour un utilisateur"""
    w = crud_watch.create_watch(db, user_id=payload.user_id, payload=payload)
    return w

@router.get("/user/{user_id}", response_model=List[WatchOut])
def list_user_watch(user_id: int, db: Session = Depends(get_db)):
    return crud_watch.get_watch_list(db, user_id)

@router.get("/{watch_id}", response_model=WatchOut)
def get_watch(watch_id: int, db: Session = Depends(get_db)):
    return crud_watch.get_watch(db, watch_id)

@router.patch("/{watch_id}", response_model=WatchOut)
def patch_watch(watch_id: int, payload: WatchUpdate, db: Session = Depends(get_db)):
    return crud_watch.update_watch(db, watch_id, payload)

@router.delete("/{watch_id}")
def delete_watch(watch_id: int, db: Session = Depends(get_db)):
    return crud_watch.delete_watch(db, watch_id)


# -------------------------
# WatchSeason (sous-ressource)
# -------------------------
@router.post("/{watch_id}/season", response_model=WatchSeasonOut)
def add_watch_season(watch_id: int, payload: WatchSeasonCreate, db: Session = Depends(get_db)):
    """Ajoute une saison à une watch"""
    ws = crud_wseason.create_watch_season(
        db,
        watch_id=watch_id,
        season_id=payload.season_id,
        completed=payload.completed
    )
    return ws

@router.get("/season/{watch_season_id}", response_model=WatchSeasonOut)
def get_watch_season(watch_season_id: int, db: Session = Depends(get_db)):
    return crud_wseason.get_watch_season(db, watch_season_id)

@router.patch("/season/{watch_season_id}", response_model=WatchSeasonOut)
def patch_watch_season(watch_season_id: int, payload: WatchSeasonCreate = Body(...), db: Session = Depends(get_db)):
    """Met à jour le statut 'completed' d'une saison"""
    return crud_wseason.update_watch_season(
        db,
        watch_season_id=watch_season_id,
        completed=payload.completed
    )

@router.delete("/season/{watch_season_id}")
def delete_watch_season(watch_season_id: int, db: Session = Depends(get_db)):
    return crud_wseason.delete_watch_season(db, watch_season_id)


# -------------------------
# WatchEpisode (sous-ressource)
# -------------------------
@router.post("/episode", response_model=WatchEpisodeOut)
def add_or_update_watch_episode(payload: WatchEpisodeCreate, db: Session = Depends(get_db)):
    """
    Ajoute un épisode à une watch.
    Si la watch ou la saison n'existe pas, elle sera créée automatiquement.
    """
    # Vérifier si watch existe pour l'anime
    watch = crud_watch.get_watch_by_user_anime(db, payload.user_id, payload.anime_id)
    if not watch:
        watch = crud_watch.create_watch(db, user_id=payload.user_id, payload=WatchCreate(user_id=payload.user_id, anime_id=payload.anime_id, status="watching"))

    # Vérifier si watch_season existe pour la saison
    season = crud_wseason.get_watch_season_by_watch_and_season(db, watch.id, payload.season_id)
    if not season:
        season = crud_wseason.create_watch_season(db, watch_id=watch.id, season_id=payload.season_id, completed=False)

    # Ajouter ou mettre à jour l'épisode
    try:
        episode = crud_wep.create_watch_episode(db, watch_season_id=season.id, episode_id=payload.episode_id, watched=payload.watched)
    except HTTPException as e:
        if e.status_code == status.HTTP_400_BAD_REQUEST:
            # déjà existant → update
            episode = crud_wep.update_watch_episode(db, watch_episode_id=e.detail["id"], watched=payload.watched)
        else:
            raise e

    return episode

@router.get("/episode/{watch_episode_id}", response_model=WatchEpisodeOut)
def get_watch_episode(watch_episode_id: int, db: Session = Depends(get_db)):
    return crud_wep.get_watch_episode(db, watch_episode_id)

@router.patch("/episode/{watch_episode_id}", response_model=WatchEpisodeOut)
def patch_watch_episode(watch_episode_id: int, payload: WatchEpisodeCreate = Body(...), db: Session = Depends(get_db)):
    """Met à jour le statut 'watched' d'un épisode, cree si nécessaire"""
    
    if not crud_wep.get_watch_episode(db, watch_episode_id):
        crud_wep.create_watch_episode(db, watch_episode_id=watch_episode_id, watched=payload.watched)
    
    return crud_wep.update_watch_episode(db, watch_episode_id=watch_episode_id, watched=payload.watched)

@router.delete("/episode/{watch_episode_id}")
def delete_watch_episode(watch_episode_id: int, db: Session = Depends(get_db)):
    return crud_wep.delete_watch_episode(db, watch_episode_id)

@router.post("/progress", response_model=WatchProgressResponse)
def get_watch_progress(payload: WatchProgressRequest, db: Session = Depends(get_db)):
    watch = crud_watch.get_watch_by_user_anime(db, payload.user_id, payload.anime_id)
    if not watch:
        raise HTTPException(status_code=404, detail="Aucune progression trouvée pour cet anime")

    seasons = crud_wseason.get_watch_seasons_by_watch(db, watch.id)
    season_progress = []
    total_episodes = 0
    total_watched = 0

    for s in seasons:
        # Tous les épisodes de la saison (pas seulement ceux regardés)
        all_episodes = crud_wep.get_all_episodes_for_season(db, s.season_id)  # à implémenter
        watched_episodes = crud_wep.get_episodes_by_watch_season(db, s.id)

        season_total = len(all_episodes)
        watched_count = sum(1 for e in watched_episodes if e.watched)
        
        progress = round((watched_count / season_total) * 100) if season_total > 0 else 0

        total_episodes += season_total
        total_watched += watched_count

        season_progress.append({
            "season_id": s.season_id,
            "progress": progress
        })

    anime_progress = round((total_watched / total_episodes) * 100) if total_episodes > 0 else 0

    return {
        "anime_id": payload.anime_id,
        "progress": anime_progress,
        "seasons": season_progress
    }

@router.post("season/{watch_season_id}/complete", response_model=WatchSeasonOut)
def complete_watch_season(watch_season_id: int, db: Session = Depends(get_db)):
    return crud_wseason.complete_watch_season(db, watch_season_id)

@router.post("anime/{user_id}/{anime_id}/complete", response_model=WatchOut)
def complete_watch_anime(user_id: int, anime_id: int, db: Session = Depends(get_db)):
    return crud_watch.complete_watch_anime(db, user_id, anime_id)
