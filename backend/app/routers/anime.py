from fastapi import APIRouter, Body, Query, HTTPException, status
import shutil
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models.seasonal_animes import SeasonalAnime
from app.db.models.anime import Anime
from app.db.models.season import Season
from app.db.models.episode import Episode
from app.db.models.watch_episode import WatchEpisode
from app.db.models.watch_season import WatchSeason
from app.db.models.watch import Watch
from app.utils.get_anime_info import get_anime_info, update_anime_info_in_db
from app.utils.folder import find_media_folders
from app.utils.get_anime_info import add_new_info, update_anime_info
from app.crud.anime import get_all_animes, get_all_tv, remove_anime, get_anime_details, get_anime_and_season_by_episode, get_all_movies, update_anime_path
from app.crud.seasonal import get_all_seasonal
from app.db.models.seasonal_period import SeasonalPeriod
from app.db.models.calendar_seasons import CalendarSeason
import logging
import os
from .. import schemas

router = APIRouter()
db = SessionLocal()    

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
        
@router.get("/TV")
def get_animes():
    db = SessionLocal()
    try:
        animes = get_all_tv(db)
        return animes
    finally:
        db.close()
@router.get("/movies")
def get_animes():
    db = SessionLocal()
    try:
        animes = get_all_movies(db)
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
        add_new_info()


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
def update_info(anime_id: int):
    """Met à jour les infos d'un anime spécifique"""
    db = SessionLocal()
    try:
        anime = db.query(Anime).filter_by(id=anime_id).first()
        if not anime:
            return {"error": "Anime introuvable"}
        update_anime_info(anime, db=db) 
        
    finally:
        db.close()




@router.get("/seasonal")
def get_seasonal():
    db = SessionLocal()
    try:
        rows = (
            db.query(SeasonalAnime, Anime, SeasonalPeriod, CalendarSeason)
            .join(Anime, Anime.id == SeasonalAnime.anime_id)
            .join(SeasonalPeriod, SeasonalPeriod.id == SeasonalAnime.seasonal_period_id)
            .join(CalendarSeason, CalendarSeason.id == SeasonalPeriod.calendar_season_id)
            .all()
        )

        seasonal_map = {}

        for sa, anime, period, season in rows:
            key = f"{season.code}-{period.year}"

            if key not in seasonal_map:
                seasonal_map[key] = {
                    "season_code": season.code,
                    "season_name": season.name,
                    "year": period.year,
                    "is_current": period.is_current,
                    "animes": []
                }

            seasonal_map[key]["animes"].append({
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

        return sorted(
            seasonal_map.values(),
            key=lambda x: (x["year"], x["season_code"]),
            reverse=True
        )

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

# -------------------------
#  Récupérer un Anime par episodeId
# -------------------------
@router.get("/episode/{episode_id}")
def get_anime_by_episode(episode_id: int):
    db = SessionLocal()    
    anime, season = get_anime_and_season_by_episode(db, episode_id)
    return {
        "anime": anime,
        "season": season
    }

@router.post("/move/{anime_id}", status_code=status.HTTP_200_OK)
def move_anime(anime_id: int, path: str = Body(..., embed=True)):
    """
    Crée un nouveau dossier pour l'anime.
    Si l'ancien dossier existe, son contenu est déplacé.
    Met à jour le chemin en base.
    """

    #  Récupération anime
    anime = db.query(Anime).filter(Anime.id == anime_id).first()
    if not anime:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Anime introuvable."
        )

    if not path or not path.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le chemin fourni est invalide."
        )

    #  Chemins
    old_path = anime.path
    new_path = os.path.join(path, anime.name)

    #  Création du nouveau dossier (toujours)
    try:
        os.makedirs(new_path, exist_ok=True)
    except OSError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Impossible de créer le dossier cible : {str(e)}"
        )

    # Déplacement du contenu si l'ancien dossier existe
    if old_path and os.path.exists(old_path) and old_path != new_path:
        try:
            for item in os.listdir(old_path):
                src = os.path.join(old_path, item)
                dst = os.path.join(new_path, item)
                shutil.move(src, dst)

            # Suppression de l'ancien dossier (s'il est vide)
            try:
                os.rmdir(old_path)
            except OSError:
                pass  # sécurité : dossier non vide ou déjà supprimé

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors du déplacement du contenu : {str(e)}"
            )

    # Mise à jour DB (source de vérité)
    anime.path = new_path
    db.commit()
    db.refresh(anime)

    return {
        "message": "Anime déplacé avec succès.",
        "anime": {
            "id": anime.id,
            "name": anime.name,
            "path": anime.path
        }
    }

@router.delete("/delete-anime/{anime_id}")
def delete_anime(anime_id: int):
    # !!! delete anime in disk and in bd
    pass

@router.delete("/remove-anime/{anime_id}")
def suppress_anime(anime_id: int):
    
    # delete only in db
    try : 
        remove_anime(anime_id=anime_id, db=db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la suppression de l'anime : {anime_id}: {str(e)}"
        )
    
@router.get("/manager/disk")
def get_all_hierarchy_folder_disk():
    """
    Récupère la hiérarchie des disques et partitions du système.
    """
    from app.utils.manager import get_active_disks
    try:
        data = get_active_disks()
        return data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération des disques : {str(e)}"
        )

# -------------------------
# Récuperer le dossier a afficher, pour l'interface
@router.post("/next-folder/")
def get_next_folder(path: str = Body(..., embed=True)):
    """
    Retourne le prochain dossier à afficher dans l'interface.
    """
    if not path or not path.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le chemin fourni est invalide."
        )

    #  Vérification si le dossier existe
    if not os.path.exists(path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Le dossier spécifié n'existe pas."
        )

    #  Récupération du prochain dossier
    next_folder = [item for item in os.listdir(path) if os.path.isdir(os.path.join(path, item))]
    if not next_folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucun dossier trouvé dans le chemin spécifié."
        )

    return {"next_folder": next_folder}

#Copier les animes 
@router.post("/copy")
def copyAnime(animeId: int = Body(..., embed=True) ,
              selection: schemas.Selection = Body(..., embed=True), 
              targetPath: str = Body(..., embed=True)):
    #  Récupération anime
    anime = db.query(Anime).filter(Anime.id == animeId).first()
    if not anime:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Anime introuvable."
        )

    if not targetPath or not targetPath.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le chemin fourni est invalide."
        )
    new_path = os.path.join(targetPath, anime.name)
    #  Création du nouveau dossier (toujours)
    try:
        os.makedirs(new_path, exist_ok=True)
    except OSError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Impossible de créer le dossier cible : {str(e)}"
        )

    # Fichier a copier 
    if selection.type == "all": 
        files = os.listdir(anime.path)
    elif selection.episodeIds:
        files = []
        for i in selection.episodeIds:
            ep = db.query(Episode).filter_by(id=i).first()
            files.append(ep.path)
            
    # Déplacement du contenu si l'ancien dossier existe
    if anime.path and os.path.exists(anime.path) and anime.path != new_path:
        try:
            for item in files:
                src = os.path.join(anime.path, item)
                dst = os.path.join(new_path)
                shutil.copy(src, dst)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors du copie du contenu : {str(e)}"
            )
    
