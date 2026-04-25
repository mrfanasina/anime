from sqlalchemy.orm import Session
from app.db.models.anime import Anime
from app.db.models.season import Season
from app.db.models.episode import Episode
from app.db.models.watch import Watch
from app.db.models.watch_season import WatchSeason
from app.db.models.watch_episode import WatchEpisode
from sqlalchemy import func, desc
from sqlalchemy.orm import aliased
from app.utils.media_info import extract_languages_and_subtitles
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.utils.get_anime_info import get_anime_info
from app.crud.seasonal import get_calendar_season, get_season_period, get_seasonal
import datetime
import os
from app.utils.extract import extract_episode_number, extract_season_number
from app.utils.folder import find_media_folders
from app.db.models.seasonal_animes import SeasonalAnime

def getSeasons(db :Session, anime_id):
    return db.query(Season).filter_by(anime_id=anime_id).all()

def get_all_animes(db: Session):
    animes = db.query(Anime).all()

    result = []

    for anime in animes:
        has_episodes = any(
            season.episodes for season in anime.seasons
        )

        result.append({
            # ─── champs principaux ───
            "id": anime.id,
            "name": anime.name,
            "title_nihon": anime.title_nihon,
            "title_english": anime.title_english,
            "title_romaji": anime.title_romaji,
            "path": anime.path,
            "elo": anime.elo,
            "image_url": anime.image_url,
            "description": anime.description,
            "synopsis": anime.synopsis,
            "note": anime.note,
            "status": anime.status,
            "type": anime.type,
            "rank": anime.rank,
            "created_at": anime.created_at,
            "studio": anime.studio,
            "seasons_count": anime.seasons_count,
            "seasons_diff": anime.seasons_diff,
            "fromPc": anime.fromPc,
        

            # ─── relations utiles ───
            "watchers_count": len(anime.watchers) if anime.watchers else 0,
            "genres": [g.name for g in anime.genres] if anime.genres else [],
            "status_on_disk": anime.status_on_disk,
            # ─── logique custom ───
            "is_empty": not has_episodes,
        })

    return result
 
# mise à du path de l'anime
def update_anime_path(db: Session, anime_id: int, new_path: str):
    anime = get_anime(db, anime_id)
    if anime:
        anime.path = new_path
        db.commit()
        db.refresh(anime)
    return anime

# All movies 
def get_all_movies(db: Session):
    movies = db.query(Anime).filter_by(type="MOVIE").all()
    for movie in movies:
        if is_movie_on_disk(movie.path):
            movie.is_on_disk = True
        else:
            movie.is_on_disk = False
    return movies

def get_all_tv(db: Session):
    tv_shows = db.query(Anime).filter_by(type="TV").all()
    return tv_shows

def is_movie_on_disk(path: str) -> bool:
    if not path or not os.path.exists(path):
        return False
    folders = path.lower().split(os.sep)
    return "movie" in folders or "movies" in folders

def get_anime_details(db: Session, anime_id: int, user_id: int | None = None):
    """
    Récupère un anime avec ses saisons et épisodes.
    Si user_id est fourni, inclut la progression par épisode et la progression globale.
    """
    print(f"id = {user_id}")
    try:
        anime = get_anime(db, anime_id)
        if not anime:
            return {"error": "Anime introuvable"}

        seasons = db.query(Season).filter_by(anime_id=anime.id).all()

        folders = find_media_folders()
        isInMountedFolder = False
        for folder in folders:
            if anime.path and anime.path.startswith(folder):
                isInMountedFolder = True
                break
        seasonal = get_seasonal(db, anime)

        period = get_season_period(db, seasonal) if seasonal else None
        calendar_season = get_calendar_season(db, period) if period else None

        result = {
            "id": anime.id,
            "name": anime.name,
            "title_romaji": anime.title_romaji,
            "title_nihon": anime.title_nihon,
            "title_english": anime.title_english,
            "season_name": seasonal and calendar_season.name if seasonal and calendar_season else None,
            "season_code": seasonal and calendar_season.code if seasonal and calendar_season else None,
            "year": seasonal and period.year if seasonal and period else anime.created_at if anime.created_at else None,
            "episode_count": seasonal.episode_count if seasonal else None,
            "diffuse_day": seasonal.diffuse_day if seasonal else None,
            "diffuse_time": seasonal.diffuse_time if seasonal else None,
            "start_date": seasonal.start_date if seasonal else None,
            "end_date": seasonal.end_date if seasonal else None,
            "is_current": period.is_current if seasonal and period else None,
            "elo": anime.elo,
            "genres": [genre.name for genre in anime.genres],
            "path": anime.path,
            "seasons": [],
            "image_url": anime.image_url or "",
            "description": anime.description or "",
            "synopsis": anime.synopsis,
            "note": anime.note,
            "status": anime.status or "",
            "type": anime.type or "",
            "rank": anime.rank,
            "created_at": anime.created_at or "",
            "studio": anime.studio or "",
            "isInMountedFolder": isInMountedFolder,
            "progress": 0, # progress global initialisé à 0
            "fromPc": True 
        }
        # -------------------------
        # Ajouter les saisons saisonnières si l'anime est un saisonier
        # -------------------------
        # seasonal_entries = db.query(SeasonalAnime).filter_by(anime_id=anime.id).all()
        
        # if seasonal_entries:
        #     result["seasonal_periods"] = []
        #     for sa in seasonal_entries:
        #         period = sa.seasonal_period
        #         print(sa.diffuse_day)
        #         result["seasonal_periods"].append({
        #             "seasonal_anime_id": sa.id,
        #             "season_name": period.calendar_season.name,
        #             "season_code": period.calendar_season.code,
        #             "year": period.year,
        #             "episode_count": sa.episode_count,
        #             "diffuse_day": sa.diffuse_day,
        #             "diffuse_time": sa.diffuse_time,
        #             "start_date": sa.start_date,
        #             "end_date": sa.end_date,
        #             "is_current": period.is_current,
        #         })


        # -------------------------
        # Cas utilisateur non connecté
        # -------------------------
        if not user_id:
            for season in seasons:
                episodes = db.query(Episode).filter_by(season_id=season.id).all()
                result["seasons"].append({
                    "id": season.id,
                    "name": season.name,
                    "season_number": season.season_number,
                    "episodes": [
                        {
                            "id": ep.id,
                            "not_found": ep.not_found,
                            "name": ep.name,
                            "path": ep.path,
                            "episode_number": ep.episode_number,
                            "audio_languages": ep.audio_languages or "",
                            "subtitles": ep.subtitles
                        }
                        for ep in episodes
                    ]
                })
            return result

        # -------------------------
        # Cas utilisateur connecté → récupérer Watch
        # -------------------------
        user_watch = db.query(Watch).filter_by(user_id=user_id, anime_id=anime.id).first()
        total_eps = 0
        watched_eps = 0
        for season in seasons:
            episodes = db.query(Episode).filter_by(season_id=season.id).all()
            season_data = {
                "id": season.id,
                "name": season.name,
                "season_number": season.season_number,
                "episodes": []
            }

            # Récupérer WatchSeason si existant
            ws = None
            if user_watch:
                ws = db.query(WatchSeason).filter_by(watch_id=user_watch.id, season_id=season.id).first()

            for ep in episodes:
                total_eps += 1
                if ws:
                    we = db.query(WatchEpisode).filter_by(
                        season_id=ws.id, episode_id=ep.id
                    ).first()
                    if we:
                        ep_data = {
                            "id": ep.id,
                            "name": ep.name,
                            "path": ep.path,
                            "episode_number": ep.episode_number,
                            "audio_languages": ep.audio_languages or "",
                            "subtitles": ep.subtitles,
                            "position": we.position,
                            "duration": we.duration,
                            "watched": we.watched,
                            "finished": we.finished,
                            "not_found": ep.not_found,
                            "watched_at": we.watched_at
                        }
                        if we.watched:
                            watched_eps += 1
                    else:
                        ep_data = {
                            "id": ep.id,
                            "name": ep.name,
                            "path": ep.path,
                            "episode_number": ep.episode_number,
                            "audio_languages": ep.audio_languages or "",
                            "subtitles": ep.subtitles,
                            "position": 0,
                            "duration": 0,
                            "watched": False,
                            "finished": False,
                            "not_found": ep.not_found,
                            "watched_at": None
                        }
                else:
                    ep_data = {
                        "id": ep.id,
                        "name": ep.name,
                        "path": ep.path,
                        "episode_number": ep.episode_number,
                        "episode_number": ep.episode_number,
                        "audio_languages": ep.audio_languages or "",
                        "position": 0,
                        "duration": 0,
                        "watched": False,
                        "not_found": ep.not_found,
                        "finished": False,
                        "watched_at": None
                    }

                season_data["episodes"].append(ep_data)

            result["seasons"].append(season_data)

        # Calcul de la progression globale
        result["progress"] = round((watched_eps / total_eps) * 100) if total_eps > 0 else 0

        return result

    finally:
        db.close()

# ---------------- All episodes for an anime ----------------
def get_all_episodes_for_anime(db: Session, anime_id: int):
    return db.query(Episode).join(Season).filter(Season.anime_id == anime_id).all()


# ---------------- Anime ----------------
def get_or_create_anime(
    db: Session,
    name: str,
    path: str,
    status_on_disk: str = "has_media", 
    force_update: bool = False,
    type: str = ""
) -> Anime:
    anime = db.query(Anime).filter_by(name=name).first()
    # if anime.path != path:
    #     # On combine les deux en deplacant l'anime vers le nouveau path
    #     #combine_anime(db, anime.id, anime.id, move=True)            
    #     pass
    if not anime :
        try:
            anime_info = get_anime_info(name) or {}
        except Exception:
            anime_info = {}

        anime = Anime(
            name=name,
            path=path,
            elo=1000,
            image_url=anime_info.get("image_url", ""),
            description=anime_info.get("description", ""),
            note=anime_info.get("note"),
            status=anime_info.get("status", ""),
            type=type,
            rank=anime_info.get("rank"),
            created_at=anime_info.get("created_at"),
            studio=anime_info.get("studio", ""),
            status_on_disk=status_on_disk

        )

        db.add(anime)
        db.commit()
        db.refresh(anime)

    elif force_update:
        updated = False

        if anime.path != path:
            anime.path = path
            updated = True
        if anime.type != type:
            anime.type = type
            updated = True
        if updated:
            db.commit()

    return anime

# ---------------- Season ----------------
def get_or_create_season(db: Session, anime: Anime, season_name: str, force_update=False) -> Season:
    season = db.query(Season).filter_by(name=season_name, anime_id=anime.id).first()
    if not season:
        season_number = extract_season_number(season_name)
        season = Season(name=season_name, anime_id=anime.id, season_number=season_number)
        db.add(season)
        db.commit()
        db.refresh(season)
    return season

# ---------------- Episode ----------------
def get_or_create_episode(
    db: Session,
    season: Season,
    episode_name: str,
    path: str,
    force_update=False
) -> Episode:

    # Recherche par nom + saison
    episode = (
        db.query(Episode)
        .filter_by(name=episode_name, season_id=season.id)
        .first()
    )

    episode_number = extract_episode_number(episode_name)
    # -------------------- CREATION --------------------
    if not episode:
        file_mtime = datetime.datetime.fromtimestamp(os.path.getmtime(path))
        print(episode_name, path)
        audio_langs, subs_langs = extract_languages_and_subtitles(path)

        episode = Episode(
            name=episode_name,
            season_id=season.id,
            episode_number=episode_number,
            path=path,
            modified_time=file_mtime,
            upload_date=datetime.datetime.now(),
            audio_languages=",".join(audio_langs),
            subtitles=",".join(subs_langs),
            not_found=False
        )

        db.add(episode)
        return episode

    # -------------------- UPDATE --------------------
    if force_update:
        file_mtime = datetime.datetime.fromtimestamp(os.path.getmtime(path))

        # Mise à jour détectée du fichier
        if episode.modified_time != file_mtime:
            episode.modified_time = file_mtime

        # Mise à jour des champs essentiels
        audio_langs, subs_langs = extract_languages_and_subtitles(path)

        episode.audio_languages = ",".join(audio_langs)
        episode.subtitles = ",".join(subs_langs)
        episode.name = episode_name
        episode.episode_number = episode_number
        episode.path = path

    # Dans tous les cas : s'il existe encore → pas disparu
    episode.not_found = False

    return episode
# ----------------- Helpers -----------------
def is_video_file(filename):
    video_exts = ['.mp4', '.mkv', '.avi', '.mov', '.ts', '.flv']
    return any(filename.lower().endswith(ext) for ext in video_exts)

def get_last_episode_number(db: Session, anime_id: int) -> int:
    last_episode = (
        db.query(Episode)
        .join(Season)
        .filter(Season.anime_id == anime_id)
        .order_by(Episode.episode_number.desc())
        .first()
    )
    if last_episode:
        return last_episode.episode_number, last_episode.season_id
    return last_episode.episode_number if last_episode else 0

def get_next_episode_id(session: Session, episode_id: int):
    """
    Récupère l'ID du prochain épisode dans la même saison.
    """
    current_episode = session.query(Episode).filter_by(id=episode_id).first()
    if not current_episode:
        return None

    next_episode = (
        session.query(Episode)
        .filter(
            Episode.season_id == current_episode.season_id,
            Episode.episode_number > current_episode.episode_number
        )
        .order_by(Episode.episode_number.asc())
        .first()
    )
    return next_episode

def get_recently_watched(session: Session, user_id: int, limit: int = 5):
    """
    Récupère les animes regardés récemment par l'utilisateur, en incluant
    les détails complets du dernier épisode regardé.
    """
    
    # 1. Sous-requête pour trouver le DERNIER WatchEpisode regardé pour CHAQUE Anime
    # On utilise func.max pour trouver la dernière date de visionnage par anime_id.
    
    # Alias pour Episode pour la jointure
    E = aliased(Episode)
    
    # Sub-requête pour identifier le WatchEpisode le plus récent par Watch (et donc par Anime)
    last_watch_episode_id_subq = (
        session.query(
            Watch.anime_id,
            func.max(WatchEpisode.watched_at).label("max_watched_at")
        )
        .join(WatchSeason, WatchSeason.watch_id == Watch.id)
        .join(WatchEpisode, WatchEpisode.season_id == WatchSeason.id)
        .filter(Watch.user_id == user_id, WatchEpisode.watched == True)
        .group_by(Watch.anime_id)
        .subquery()
    )

    # 2. Requête Principale : Récupérer les données complètes
    results = (
        session.query(
            Anime.id.label("anime_id"),
            Anime.name.label("anime_name"),
            Anime.image_url,
            E.id.label("episode_id"),
            E.name.label("episode_name"),
            E.episode_number.label("episode_number"),
            WatchEpisode.position,
            WatchEpisode.duration,
            WatchEpisode.finished
        )
        .join(Watch, Watch.anime_id == Anime.id)
        .join(last_watch_episode_id_subq, last_watch_episode_id_subq.c.anime_id == Watch.anime_id)
        
        # Jointure pour trouver l'enregistrement WatchEpisode correspondant à la date max
        .join(WatchSeason, WatchSeason.watch_id == Watch.id)
        .join(WatchEpisode, WatchEpisode.season_id == WatchSeason.id)
        .filter(WatchEpisode.watched_at == last_watch_episode_id_subq.c.max_watched_at)
        
        # Jointure avec Episode pour récupérer le nom et le numéro
        .join(E, WatchEpisode.episode_id == E.id)
        .order_by(desc(last_watch_episode_id_subq.c.max_watched_at))
        .limit(limit)
        .all()
    )

    # 3. Transformer en dictionnaire pour l'API (Format attendu par le Front-end)
    return [
        {
            "id": r.anime_id,
            "name": r.anime_name,
            "image_url": r.image_url,
            "last_episode": {  # Objet complet
                "id": r.episode_id,
                "number": r.episode_number,
                "name": r.episode_name,
                "position": r.position,
                "duration": r.duration,
                "finished": r.finished,
            },
            "next_episode": get_next_episode_id(session, r.episode_id)
        }
        for r in results
    ]

def get_recently_added_episodes(db: Session, limit: int = 5):
    """
    Retourne les animes récemment mis à jour (sans doublons),
    avec leurs épisodes ajoutés récemment.
    """

    # On prend plus large pour éviter qu'un seul anime prenne tout
    EPISODE_MULTIPLIER = 5

    recent_episodes = (
        db.query(Episode, Anime)
        .join(Season, Episode.season_id == Season.id)
        .join(Anime, Season.anime_id == Anime.id)
        .order_by(Episode.upload_date.desc())
        .limit(limit * EPISODE_MULTIPLIER)
        .all()
    )

    animes_map = {}

    for episode, anime in recent_episodes:
        # Stop dès qu'on a assez d'animes uniques
        if len(animes_map) >= limit and anime.id not in animes_map:
            break

        if anime.id not in animes_map:
            animes_map[anime.id] = {
                "id": anime.id,
                "name": anime.name,
                "image_url": anime.image_url,
                "recent_episodes_count": 0,
                "recent_episodes": [],
                "last_episode": None,
                "next_episode": None,
            }

        anime_entry = animes_map[anime.id]

        episode_data = {
            "id": episode.id,
            "number": episode.episode_number,
            "name": episode.name,
            "path": episode.path,
        }

        anime_entry["recent_episodes"].append(episode_data)
        anime_entry["recent_episodes_count"] += 1

        # Le premier épisode rencontré est le plus récent
        if anime_entry["last_episode"] is None:
            anime_entry["last_episode"] = episode_data
            anime_entry["next_episode"] = get_next_episode_id(db, episode.id)

    return list(animes_map.values())

def get_anime_id_by_episode(db: Session, episode_id: int) -> int:
    episode = db.query(Episode).filter(Episode.id == episode_id).first()
    if not episode:
        return None

    season = db.query(Season).filter(Season.id == episode.season_id).first()
    if not season:
        return None

    return season.anime_id

def get_anime_and_season_by_episode(db: Session, episode_id: int) -> int:
    episode = db.query(Episode).filter(Episode.id == episode_id).first()
    if not episode:
        return None

    season = db.query(Season).filter(Season.id == episode.season_id).first()
    if not season:
        return None
    anime = db.query(Anime).filter(Anime.id == season.anime_id).first()
    if not anime:
        return None
    
    return anime, season

def create_episode(
    db: AsyncSession,
    *,
    season_id: int,
    episode_number: int,
    name: str,
    path: str,
):
    episode = Episode(
        name=name,
        title=name,
        season_id=season_id,
        episode_number=episode_number,
        path=path,
        not_found=False,
        upload_date=datetime.datetime.utcnow(),
        modified_time=None,
        audio_languages=None,
        subtitles=None,
    )

    db.add(episode)
    db.commit()
    db.refresh(episode)

    return episode

def get_seasons_by_anime(db: Session, anime_id):
    """
    Retourne tout les saisons d'un anime
    """
    seasons = db.query(Season).filter_by(anime_id=anime_id).all()
    return seasons

def combine_anime(db : Session, dest_id, anime_id, move=False):
    anime_d = db.query(Anime).filter_by(id=dest_id).first()
    if not anime_d:
        raise
    
    anime = get_anime(db, anime_id)
    if not anime:
        return
    if move:
        for season in anime.seasons:
            season.anime_id = anime_d.id
            db.commit()
            for episode in season.episodes:
                episode.season_id = season.id
                db.commit()
                
        anime.path = anime_d.path
        db.commit()
        
    seasons = get_seasons_by_anime(anime_id)    

def get_anime(db: Session, anime_id: int):
    return db.query(Anime).filter_by(id=anime_id).first()

    
def remove_anime(db: Session, anime_id, delete=False):
    if delete:
        #delete from file
        pass
    anime = get_anime(db, anime_id)
    print(anime.name)
    if not anime:
        raise 
    seasons = get_seasons_by_anime(db, anime_id)
    
    episodes = get_all_episodes_for_anime(db, anime_id)
    try:
        db.delete(anime)
        db.commit()
        print("removed ")
    except Exception as e: 
        print(e)