from fastapi import APIRouter, Body, Query
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models.seasonal import SeasonalAnime
from app.db.models.anime import Anime
from app.db.models.season import Season
from app.db.models.episode import Episode
from app.db.models.watch_episode import WatchEpisode
from app.db.models.watch_season import WatchSeason
from app.db.models.watch import Watch
from app.utils.get_anime_info import get_anime_info, update_anime_info_in_db
from app.utils.folder import find_media_folders
from app.crud.anime import get_all_animes, get_anime_details
import logging
import os

router = APIRouter()


# -------------------------
# Helper pour DB session
# -------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
# -------------------------
# Tous les animes
# -------------------------
@router.get("/")
def get_animes():
    db = SessionLocal()
    try:
        animes = get_all_animes(db)
        return animes
    finally:
        db.close()

# -------------------------
# Liste complète des animés avec saisons et épisodes
# -------------------------
@router.get("/all")
def list_animes_full():
    """Retourne tous les animés avec leurs saisons et épisodes"""
    db = SessionLocal()
    try:
        animes = db.query(Anime).all()
        result = []

        for anime in animes:
            seasons = db.query(Season).filter_by(anime_id=anime.id).all()
            seasons_data = []

            for season in seasons:
                episodes = db.query(Episode).filter_by(season_id=season.id).all()
                episodes_data = [
                    {
                        "id": ep.id,
                        "name": ep.name,
                        "path": ep.path,
                        "episode_number": ep.episode_number,
                        "modified": ep.modified_time.isoformat() if ep.modified_time else None
                    }
                    for ep in episodes
                ]
                seasons_data.append({
                    "id": season.id,
                    "name": season.name,
                    "season_number": getattr(season, "season_number", None),
                    "episodes": episodes_data
                })

            result.append({
                "id": anime.id,
                "name": anime.name,
                "path": anime.path,
                "elo": anime.elo,
                "image_url": anime.image_url or "",
                "description": anime.description or "",
                "synopsis": anime.synopsis,
                "note": anime.note,
                "status": anime.status or "",
                "type": anime.type or "",
                "rank": anime.rank,
                "created_at": anime.created_at or "",
                "studio": anime.studio or "",
                "seasons": seasons_data
            })
        return result
    finally:
        db.close()

# -------------------------
# Recherche d'un animé
# -------------------------
@router.get("/search")
def search_anime(query: str = Query(..., min_length=2)):
    """Recherche un anime par nom"""
    db = SessionLocal()
    try:
        animes = db.query(Anime).filter(Anime.name.ilike(f"%{query}%")).all()
        return [
            {"id": a.id, "name": a.name, "elo": a.elo, "path": a.path, "image_url": a.image_url}
            for a in animes
        ]
    finally:
        db.close()

# -------------------------
# Détails complet d’un animé avec progression utilisateur
# -------------------------
@router.get("/with-progress/{anime_id}")
def get_anime_with_progress(anime_id: int, userId: int = Query(None)):
    """Detail complet d'un anime"""
    db = SessionLocal()
    a = get_anime_details(db=db, anime_id=anime_id,user_id=userId)
    return a
# -------------------------
# Ajout d'un animé
# -------------------------
@router.post("/add")
def add_anime(name: str = Body(...), path: str = Body(...)):
    """Ajoute un anime et crée son dossier"""
    full_path = f"{path}/{name}"
    if not os.path.exists(full_path):
        os.makedirs(full_path)
    db = SessionLocal()
    try:
        anime = Anime(name=name, path=path, elo=1000)
        db.add(anime)
        db.commit()
        db.refresh(anime)
        return {"message": "Anime ajouté", "anime": {"id": anime.id, "name": anime.name}}
    finally:
        db.close()

# -------------------------
# Suppression d’un animé
# -------------------------
@router.delete("/{anime_id}")
def delete_anime(anime_id: int):
    """Supprime un anime de la base"""
    db = SessionLocal()
    try:
        anime = db.query(Anime).filter_by(id=anime_id).first()
        if not anime:
            return {"error": "Anime introuvable"}
        db.delete(anime)
        db.commit()
        return {"message": f"Anime {anime.name} supprimé"}
    finally:
        db.close()


# -------------------------
# Mise à jour des infos MyAnimeList
# -------------------------
@router.get("/update-info/all")
def update_all_anime_info():
    """Met à jour les infos de tous les animés depuis MyAnimeList"""
    db = SessionLocal()
    try:
        animes = db.query(Anime).all()
        for anime in animes:
            logging.info(f"Récupération des infos pour {anime.name}")
            info = get_anime_info(anime.name)
            if info:
                update_anime_info_in_db(db, anime.id, info)
        return {"message": "Mise à jour terminée"}
    except Exception as e:
        return {"error": str(e)}
    finally:
        db.close()


@router.post("/update-info/{anime_id}")
def update_anime_info(anime_id: int):
    """Met à jour les infos d'un anime spécifique"""
    db = SessionLocal()
    try:
        anime = db.query(Anime).filter_by(id=anime_id).first()
        if not anime:
            return {"error": "Anime introuvable"}
        info = get_anime_info(anime.name)
        if not info:
            return {"error": f"Aucune info trouvée pour {anime.name}"}
        update_anime_info_in_db(db, anime.id, info)
        db.refresh(anime)
        return {"message": f"Infos mises à jour pour {anime.name}"}
    finally:
        db.close()

#Seasonal Anime
@router.get("/seasonal/with-season-name")
def get_seasonal():
    db = SessionLocal()
    try:
        # On récupère toutes les entrées seasonal
        seasonal_records = db.query(SeasonalAnime).all()

        # Dictionnaire regroupé par "season_name"
        seasonal_map = {}

        for entry in seasonal_records:
            anime = db.query(Anime).filter_by(id=entry.anime_id).first()
            if not anime:
                continue

            season_name = entry.season_name

            if season_name not in seasonal_map:
                seasonal_map[season_name] = {
                    "season_name": season_name,
                    "animes": []
                }

            seasonal_map[season_name]["animes"].append({
                "id": anime.id,
                "anime_id": anime.id,
                "name": anime.name,
                "image_url": anime.image_url or "",
                "description": anime.description or "",
                "elo": anime.elo,
                "rank": anime.rank,
                "note": anime.note,
                "status": anime.status,
                "studio": anime.studio,
            })

        # Retourner sous forme de liste
        return list(seasonal_map.values())

    finally:
        db.close()

# -------------------------
# Récupérer dossiers médias
# -------------------------
@router.get("/folders/all")
def get_folders():
    """Retourne la liste des dossiers médias disponibles"""
    folders = find_media_folders()
    return [{"path": f, "folder": folders[f]} for f in folders]
