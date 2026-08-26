"""
Routeur Anime — Endpoints pour la gestion des animés.

Fournit les routes CRUD, la recherche, la synchronisation saisonnière,
le déplacement, la copie et la gestion des dossiers médias.
"""
from fastapi import APIRouter, Body, Query, HTTPException, Depends, status
from sqlalchemy.orm import Session
import shutil
import os

from app.db.session import SessionLocal, get_db
from app.db.models.anime import Anime
from app.db.models.season import Season
from app.db.models.episode import Episode
from app.db.models.seasonal_animes import SeasonalAnime
from app.db.models.seasonal_period import SeasonalPeriod
from app.db.models.calendar_seasons import CalendarSeason
from app.utils.get_anime_info import get_anime_info, update_anime_info_in_db, add_new_info, update_anime_info
from app.utils.folder import find_media_folders
from app.crud.anime import (
    get_all_animes, get_all_tv, remove_anime, get_anime_details,
    get_anime_and_season_by_episode, get_all_movies, update_anime_path
)
from app.crud.seasonal import get_all_seasonal
from .. import schemas

router = APIRouter()


# ==================== Tous les animés ====================
@router.get("/")
def list_all_animes(db: Session = Depends(get_db)):
    """Retourne la liste de tous les animés avec leurs métadonnées."""
    return get_all_animes(db)


@router.get("/TV")
def list_tv_animes(db: Session = Depends(get_db)):
    """Retourne uniquement les animés de type TV."""
    return get_all_tv(db)


@router.get("/movies")
def list_movie_animes(db: Session = Depends(get_db)):
    """Retourne uniquement les animés de type Movie."""
    return get_all_movies(db)


# ==================== Liste complète ====================
@router.get("/all")
def list_animes_full(db: Session = Depends(get_db)):
    """Retourne tous les animés avec leurs saisons et épisodes (format détaillé)."""
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


# ==================== Recherche ====================
@router.get("/search")
def search_anime(query: str = Query(..., min_length=2), db: Session = Depends(get_db)):
    """Recherche un anime par nom (recherche partielle, insensible à la casse)."""
    animes = db.query(Anime).filter(Anime.name.ilike(f"%{query}%")).all()
    return [
        {"id": a.id, "name": a.name, "elo": a.elo, "path": a.path, "image_url": a.image_url}
        for a in animes
    ]


# ==================== Détails avec progression ====================
@router.get("/with-progress/{anime_id}")
def get_anime_with_progress(anime_id: int, userId: int = Query(None), db: Session = Depends(get_db)):
    """Détail complet d'un anime, incluant la progression utilisateur si connecté."""
    return get_anime_details(db=db, anime_id=anime_id, user_id=userId)


# ==================== Ajout ====================
@router.post("/add")
def add_anime(name: str = Body(...), path: str = Body(...), db: Session = Depends(get_db)):
    """Ajoute un anime et crée son dossier sur le disque."""
    full_path = f"{path}/{name}"
    if not os.path.exists(full_path):
        os.makedirs(full_path)

    anime = Anime(name=name, path=path, elo=1000)
    db.add(anime)
    db.commit()
    db.refresh(anime)

    # Récupération des infos en arrière-plan
    try:
        add_new_info()
    except Exception:
        pass  # Non bloquant

    return {"message": "Anime ajouté", "anime": {"id": anime.id, "name": anime.name}}


# ==================== Suppression ====================
@router.delete("/{anime_id}")
def delete_anime(anime_id: int, db: Session = Depends(get_db)):
    """Supprime un anime de la base de données."""
    anime = db.query(Anime).filter_by(id=anime_id).first()
    if not anime:
        raise HTTPException(status_code=404, detail="Anime introuvable")
    db.delete(anime)
    db.commit()
    return {"message": f"Anime {anime.name} supprimé"}


@router.delete("/delete-anime/{anime_id}")
def delete_anime_on_disk(anime_id: int):
    """Supprime un anime du disque ET de la base (à implémenter)."""
    # TODO: Implémenter la suppression sur disque
    pass


@router.delete("/remove-anime/{anime_id}")
def remove_anime_from_db(anime_id: int, db: Session = Depends(get_db)):
    """Supprime un anime uniquement de la base de données (pas du disque)."""
    try:
        remove_anime(anime_id=anime_id, db=db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la suppression de l'anime {anime_id}: {str(e)}"
        )


# ==================== Mise à jour des infos MyAnimeList ====================
@router.get("/update-info/all")
def update_all_anime_info(db: Session = Depends(get_db)):
    """Met à jour les infos de tous les animés depuis MyAnimeList/AniList."""
    try:
        animes = db.query(Anime).all()
        for anime in animes:
            info = get_anime_info(anime.name)
            if info:
                update_anime_info_in_db(db, anime.id, info)
        return {"message": "Mise à jour terminée"}
    except Exception as e:
        return {"error": str(e)}


@router.post("/update-info/{anime_id}")
def update_single_anime_info(anime_id: int, db: Session = Depends(get_db)):
    """Met à jour les infos d'un anime spécifique depuis MyAnimeList/AniList."""
    anime = db.query(Anime).filter_by(id=anime_id).first()
    if not anime:
        raise HTTPException(status_code=404, detail="Anime introuvable")
    update_anime_info(anime, db=db)
    return {"message": f"Infos de {anime.name} mises à jour"}


# ==================== Saisonniers ====================
@router.get("/seasonal")
def get_seasonal(db: Session = Depends(get_db)):
    """Retourne les animés saisonniers groupés par saison et année."""
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


# ==================== Dossiers médias ====================
@router.get("/folders/all")
def get_folders():
    """Retourne la liste des dossiers médias disponibles."""
    folders = find_media_folders()
    return [{"path": f, "folder": folders[f]} for f in folders]


# ==================== Anime par épisode ====================
@router.get("/episode/{episode_id}")
def get_anime_by_episode(episode_id: int, db: Session = Depends(get_db)):
    """Récupère l'anime et la saison associés à un épisode donné."""
    anime, season = get_anime_and_season_by_episode(db, episode_id)
    return {"anime": anime, "season": season}


# ==================== Déplacement ====================
@router.post("/move/{anime_id}", status_code=status.HTTP_200_OK)
def move_anime(anime_id: int, path: str = Body(..., embed=True), db: Session = Depends(get_db)):
    """
    Déplace un anime vers un nouveau dossier.
    Crée le dossier cible, déplace le contenu, et met à jour le chemin en base.
    """
    anime = db.query(Anime).filter(Anime.id == anime_id).first()
    if not anime:
        raise HTTPException(status_code=404, detail="Anime introuvable.")

    if not path or not path.strip():
        raise HTTPException(status_code=400, detail="Le chemin fourni est invalide.")

    old_path = anime.path
    new_path = os.path.join(path, anime.name)

    # Création du nouveau dossier
    try:
        os.makedirs(new_path, exist_ok=True)
    except OSError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Impossible de créer le dossier cible : {str(e)}"
        )

    # Déplacement du contenu
    if old_path and os.path.exists(old_path) and old_path != new_path:
        try:
            for item in os.listdir(old_path):
                shutil.move(os.path.join(old_path, item), os.path.join(new_path, item))
            try:
                os.rmdir(old_path)
            except OSError:
                pass  # Dossier non vide ou déjà supprimé
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Erreur lors du déplacement du contenu : {str(e)}"
            )

    anime.path = new_path
    db.commit()
    db.refresh(anime)

    return {
        "message": "Anime déplacé avec succès.",
        "anime": {"id": anime.id, "name": anime.name, "path": anime.path}
    }


# ==================== Copie ====================
@router.post("/copy")
def copy_anime(
    animeId: int = Body(..., embed=True),
    selection: schemas.Selection = Body(..., embed=True),
    targetPath: str = Body(..., embed=True),
    db: Session = Depends(get_db)
):
    """Copie les fichiers d'un anime vers un dossier cible."""
    anime = db.query(Anime).filter(Anime.id == animeId).first()
    if not anime:
        raise HTTPException(status_code=404, detail="Anime introuvable.")

    if not targetPath or not targetPath.strip():
        raise HTTPException(status_code=400, detail="Le chemin fourni est invalide.")

    new_path = os.path.join(targetPath, anime.name)
    try:
        os.makedirs(new_path, exist_ok=True)
    except OSError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Impossible de créer le dossier cible : {str(e)}"
        )

    # Déterminer les fichiers à copier
    if selection.type == "all":
        files = os.listdir(anime.path) if anime.path else []
    elif selection.episodeIds:
        files = []
        for ep_id in selection.episodeIds:
            ep = db.query(Episode).filter_by(id=ep_id).first()
            if ep and ep.path:
                files.append(ep.path)
    else:
        files = []

    # Copie des fichiers
    if anime.path and os.path.exists(anime.path) and anime.path != new_path:
        try:
            for item in files:
                src = os.path.join(anime.path, item)
                if os.path.exists(src):
                    shutil.copy(src, new_path)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Erreur lors de la copie du contenu : {str(e)}"
            )

    return {"message": "Anime copié avec succès.", "path": new_path}


# ==================== Gestionnaire de disques ====================
@router.get("/manager/disk")
def get_all_hierarchy_folder_disk():
    """Récupère la hiérarchie des disques et partitions du système."""
    from app.utils.manager import get_active_disks
    try:
        return get_active_disks()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la récupération des disques : {str(e)}"
        )


# ==================== Navigation de dossiers ====================
@router.post("/next-folder/")
def get_next_folder(path: str = Body(..., embed=True)):
    """Retourne les sous-dossiers du chemin donné pour la navigation dans l'interface."""
    if not path or not path.strip():
        raise HTTPException(status_code=400, detail="Le chemin fourni est invalide.")

    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Le dossier spécifié n'existe pas.")

    subfolders = [item for item in os.listdir(path) if os.path.isdir(os.path.join(path, item))]
    if not subfolders:
        raise HTTPException(status_code=404, detail="Aucun dossier trouvé dans le chemin spécifié.")

    return {"next_folder": subfolders}
