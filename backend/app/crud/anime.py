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

import datetime
import os
from app.utils.extract import extract_episode_number, extract_season_number

# ---------------- Tout les animes ----------------
def get_all_animes(db: Session):
    return db.query(Anime).all()


def get_anime_details(db: Session, anime_id: int, user_id: int | None = None):
    """
    Récupère un anime avec ses saisons et épisodes.
    Si user_id est fourni, inclut la progression par épisode et la progression globale.
    """
    print(f"id = {user_id}")
    try:
        anime = db.query(Anime).filter_by(id=anime_id).first()
        if not anime:
            return {"error": "Anime introuvable"}

        seasons = db.query(Season).filter_by(anime_id=anime.id).all()

        result = {
            "id": anime.id,
            "name": anime.name,
            "title_romaji": anime.title_romaji,
            "title_nihon": anime.title_nihon,
            "title_english": anime.title_english,
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
            "progress": 0  # progress global initialisé à 0
        }

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
def get_or_create_anime(db: Session, name: str, path: str, force_update=False, type="") -> Anime:
    anime = db.query(Anime).filter_by(name=name).first()
    if not anime:
        anime = Anime(
            name=name,
            path=path,
            elo=1000,
            image_url="",
            description="",
            note=None,
            status="",
            type=type,
            rank=None,
            created_at="",
            studio=""
        )
        db.add(anime)
        db.commit()
        db.refresh(anime)
    elif force_update:
        if anime.path != path:
            anime.path = path
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
    print(episode_name)
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
    return 0, None
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
def get_recently_watched(session: Session, user_id: int, limit: int = 10):
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

def get_anime_id_by_episode(db: Session, episode_id: int) -> int:
    episode = db.query(Episode).filter(Episode.id == episode_id).first()
    if not episode:
        return None

    season = db.query(Season).filter(Season.id == episode.season_id).first()
    if not season:
        return None

    return season.anime_id
