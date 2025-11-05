from fastapi import APIRouter, Body, Query
from app.db.session import SessionLocal
from app.db.models.anime import Anime
from app.db.models.season import Season
from app.db.models.episode import Episode
from app.utils.get_anime_info import get_anime_info, update_anime_info_in_db
import logging

router = APIRouter()

# ---------------------------
# Liste complète des animés avec saisons et épisodes
# ---------------------------
@router.get("/all")
def list_animes_full():
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


# ---------------------------
# Recherche d'un animé
# ---------------------------
@router.get("/search")
def search_anime(query: str = Query(..., min_length=2)):
    db = SessionLocal()
    animes = db.query(Anime).filter(Anime.name.ilike(f"%{query}%")).all()
    db.close()
    return [{"id": a.id, "name": a.name, "elo": a.elo, "path": a.path, "image_url": a.image_url} for a in animes]


# ---------------------------
# Détails complet d’un animé
# ---------------------------
@router.get("/{anime_id}")
def get_anime_details(anime_id: int):
    db = SessionLocal()
    anime = db.query(Anime).filter_by(id=anime_id).first()
    if not anime:
        db.close()
        return {"error": "Anime introuvable"}
    
    seasons = db.query(Season).filter_by(anime_id=anime.id).all()
    result = {
        "id": anime.id,
        "name": anime.name,
        "elo": anime.elo,
        "path": anime.path,
        "seasons": [],
        "image_url": anime.image_url or "",
        "description": anime.description or "",
        "note": anime.note,
        "status": anime.status or "",
        "type": anime.type or "",
        "rank": anime.rank,
        "created_at": anime.created_at or "",
        "studio": anime.studio or ""
    }
    for season in seasons:
        episodes = db.query(Episode).filter_by(season_id=season.id).all()
        result["seasons"].append({
            "id": season.id,
            "name": season.name,
            "season_number": getattr(season, "season_number", None),
            "episodes": [{"id": e.id, "name": e.name, "path": e.path} for e in episodes]
        })
    db.close()
    return result


# ---------------------------
# Ajout d'un animé
# ---------------------------
@router.post("/add")
def add_anime(name: str = Body(...), path: str = Body(...), elo: int = Body(1000)):
    db = SessionLocal()
    anime = Anime(name=name, path=path, elo=elo)
    db.add(anime)
    db.commit()
    db.refresh(anime)
    db.close()
    return {"message": "Anime ajouté", "anime": {"id": anime.id, "name": anime.name}}


# ---------------------------
# Suppression d’un animé
# ---------------------------
@router.delete("/{anime_id}")
def delete_anime(anime_id: int):
    db = SessionLocal()
    anime = db.query(Anime).filter_by(id=anime_id).first()
    if not anime:
        db.close()
        return {"error": "Anime introuvable"}
    db.delete(anime)
    db.commit()
    db.close()
    return {"message": f"Anime {anime.name} supprimé"}


# ---------------------------
# Mise à jour des infos MyAnimeList
# ---------------------------
@router.get("/update-info/all")
def update_all_anime_info():
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
    db = SessionLocal()
    try:
        anime = db.query(Anime).filter_by(id=anime_id).first()
        if not anime:
            return {"error": "Animé introuvable"}
        info = get_anime_info(anime.name)
        if not info:
            return {"error": f"Aucune info trouvée pour {anime.name}"}
        update_anime_info_in_db(db, anime.id, info)
        db.refresh(anime)
        return {"message": f"Infos mises à jour pour {anime.name}"}
    finally:
        db.close()

@router.get("/seasonal/all")
def get_all_seasonal_animes():
    db = SessionLocal()
    try:
        from app.db.models.seasonal import SeasonalAnime
        seasonal_animes = db.query(SeasonalAnime).all()
        result = []
        for sa in seasonal_animes:
            anime = db.query(Anime).filter_by(id=sa.anime_id).first()
            result.append({
                "id": sa.id,
                "anime_id": sa.anime_id,
                "name": anime.name if anime else "Inconnu",
                "season_name": sa.season_name,
                "season_type": sa.season_type,
                "year": sa.year,
                "image_url": anime.image_url if anime else "",
            })
        return result
    finally:
        db.close()

@router.get("/seasonal/with-season-name")
def get_seasonal_with_season_name():
    db = SessionLocal()
    try:
        from app.db.models.seasonal import SeasonalAnime
        seasonal_animes = db.query(SeasonalAnime).all()

        grouped = {}

        for sa in seasonal_animes:
            anime = db.query(Anime).filter_by(id=sa.anime_id).first()
            season_name = sa.season_name or "Inconnu"

            anime_data = {
                "id": sa.id,
                "anime_id": sa.anime_id,
                "name": anime.name if anime else "Inconnu",
                "season_type": sa.season_type,
                "year": sa.year,
                "image_url": anime.image_url if anime else "",
            }

            if season_name not in grouped:
                grouped[season_name] = []

            grouped[season_name].append(anime_data)

        # Transformer le dict en liste d'objets
        result = [
            {
                "season_name": season,
                "animes": animes
            }
            for season, animes in grouped.items()
        ]

        return result

    finally:
        db.close()
