import datetime
import requests
from sqlalchemy.orm import Session
from app.db.models.anime import Anime
from app.db.models.genre import Genre
from app.db.session import SessionLocal
import logging
import socket
from time import sleep
from app.db.models.episode import Episode
from app.db.models.season import Season
from datetime import datetime
from app.crud.seasonal import is_seasonal_anime
from app.db.models.seasonal_animes import SeasonalAnime

logging.basicConfig(level=logging.INFO)

ANILIST_GRAPHQL_URL = "https://graphql.anilist.co"
GOOGLE_TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single"


# --------------------- Traduction ---------------------
def translate_text(text: str, target_lang="fr") -> str:
    try:
        params = {
            "client": "gtx",
            "sl": "auto",
            "tl": target_lang,
            "dt": "t",
            "q": text
        }
        response = requests.get(GOOGLE_TRANSLATE_URL, params=params, timeout=5)
        response.raise_for_status()
        return response.json()[0][0][0]
    except:
        return text


# --------------------- JIKAN ---------------------
def get_anime_info_jikan(title: str) -> dict:
    url = f"https://api.jikan.moe/v4/anime?q={title}&limit=1"
    try:
        r = requests.get(url, timeout=10)
        r.raise_for_status()

        data = r.json().get("data", [])
        if not data:
            return {}

        anime = data[0]

        synopsis = anime.get("synopsis")
        if synopsis:
            synopsis = translate_text(synopsis)

        return {
            "title": anime.get("title"),
            "title_english": anime.get("title_english"),
            "title_nihon": anime.get("title_japanese"),
            "synopsis": synopsis,
            "type": anime.get("type"),
            "status": anime.get("status"),
            "studio": ", ".join([s["name"] for s in anime.get("studios", [])]),
            "created_at": anime.get("year"),
            "note": anime.get("score"),
            "rank": anime.get("rank"),
            "image_url": anime.get("images", {}).get("jpg", {}).get("large_image_url"),
            "genres": [g["name"] for g in anime.get("genres", [])],
            "episodes": anime.get("episodes")
        }

    except Exception as e:
        logging.error(f"[JIKAN] Erreur pour {title}: {e}")
        return {}

def format_name(name):
    # Format the name by replacing underscores and dots with spaces, and remove text in []
    formated_name = ""
    b = False
    for c in name:
        if c == "[":
            b = True 
        if c == "]":
            b = False
            continue
        if b:
            continue
        formated_name += c
    return formated_name.replace('_', ' ').replace('.', ' ').strip()   
# --------------------- AniList ---------------------
def get_anime_info_anilist(title: str) -> dict:
    query = """
    query ($search: String) {
      Media(search: $search, type: ANIME) {
        title { romaji english native }
        description
        episodes
        format
        status
        studios { nodes { name } }
        startDate { year }
        averageScore
        genres
        rankings { rank }
        coverImage { large }
      }
    }
    """

    try:
        socket.gethostbyname("graphql.anilist.co")

        r = requests.post(
            ANILIST_GRAPHQL_URL,
            json={"query": query, "variables": {"search": title}},
            timeout=10
        )
        r.raise_for_status()

        data = r.json().get("data", {}).get("Media", {})
        if not data:
            return {}

        desc = data.get("description")
        if desc:
            desc = translate_text(desc)

        return {
            "title": data.get("title", {}).get("romaji"),
            "title_english": data.get("title", {}).get("english"),
            "title_nihon": data.get("title", {}).get("native"),
            "description": desc,
            "type": data.get("format"),
            "status": data.get("status"),
            "studio": ", ".join([s["name"] for s in data.get("studios", {}).get("nodes", [])]),
            "created_at": data.get("startDate", {}).get("year"),
            "note": data.get("averageScore"),
            "rank": data.get("rankings")[0]["rank"] if data.get("rankings") else None,
            "image_url": data.get("coverImage", {}).get("large"),
            "genres": data.get("genres") or [],
            "episodes": data.get("episodes")
        }

    except Exception as e:
        logging.error(f"[AniList] Erreur pour {title}: {e}")
        return {}

def get_anilist_airing_schedule(title: str) -> dict:
    """
    Retourne { episode_number: date_diffusion }
    """
    query = """
    query ($search: String) {
      Media(search: $search, type: ANIME) {
        airingSchedule(first: 200) {
          nodes {
            episode
            airingAt
          }
        }
      }
    }
    """

    try:
        r = requests.post(
            ANILIST_GRAPHQL_URL,
            json={"query": query, "variables": {"search": title}},
            timeout=10
        )
        r.raise_for_status()

        nodes = (
            r.json()
            .get("data", {})
            .get("Media", {})
            .get("airingSchedule", {})
            .get("nodes", [])
        )

        return {
            n["episode"]: datetime.fromtimestamp(n["airingAt"]).date()
            for n in nodes
            if n.get("episode") and n.get("airingAt")
        }

    except Exception as e:
        logging.error(f"[AniList Episodes] Erreur {title}: {e}")
        return {}

import requests
import logging
from datetime import datetime, timezone, time, date
import re
    
ANILIST_GRAPHQL_URL = "https://graphql.anilist.co"


def clean_title(title: str) -> str:
    return re.sub(r"[^a-zA-Z0-9\s]", "", title).strip()

def get_anilist_seasonal_info(title: str) -> dict:
    query = """
    query ($search: String) {
      Media(search: $search, type: ANIME) {
        id
        season
        seasonYear
        episodes
        startDate { year month day }
        endDate { year month day }
        nextAiringEpisode {
          airingAt
          episode
        }
      }
    }
    """

    clean = clean_title(title)
    print("Fetching seasonal info for:", clean)

    try:
        headers = {"Content-Type": "application/json"}
        r = requests.post(
            ANILIST_GRAPHQL_URL,
            json={"query": query, "variables": {"search": clean}},
            headers=headers,
            timeout=10
        )
        r.raise_for_status()

        media = r.json().get("data", {}).get("Media")
        if not media:
            logging.warning(f"[AniList Seasonal] Aucun média trouvé pour: {title}")
            return {}

        # --- Dates ---
        def build_date(d):
            if d and d.get("year") and d.get("month") and d.get("day"):
                return date(d["year"], d["month"], d["day"])
            return None

        start_date = build_date(media.get("startDate"))
        end_date = build_date(media.get("endDate"))

        # --- Diffusion (UTC) ---
        diffuse_day = None
        diffuse_time = None
        next_episode = media.get("nextAiringEpisode")
        if next_episode and next_episode.get("airingAt"):
            airing_dt = datetime.fromtimestamp(next_episode["airingAt"], tz=timezone.utc)
            diffuse_day = airing_dt.strftime("%A")
            diffuse_time = airing_dt.time().replace(tzinfo=None)

        # --- Saison ---
        season = media.get("season")
        year = media.get("seasonYear")

        return {
            "season_type": season.capitalize() if season else None,
            "year": year,
            "episode_count": media.get("episodes"),
            "diffuse_day": diffuse_day,
            "diffuse_time": diffuse_time,
            "start_date": start_date,
            "end_date": end_date,
        }

    except requests.exceptions.HTTPError as http_err:
        logging.error(f"[AniList Seasonal] HTTP Error {title}: {http_err} - Response: {r.text}")
        return {}
    except Exception as e:
        logging.error(f"[AniList Seasonal] Erreur {title}: {e}")
        return {}

# --------------------- Fusion (RESTORÉE !) ---------------------
def get_anime_info(title: str) -> dict:
    """Fusion ANIList + Jikan pour compatibilité."""
    info_anilist = get_anime_info_anilist(title)
    info_jikan = get_anime_info_jikan(title)

    merged = {}

    merged.update(info_jikan)
    merged.update(info_anilist)

    merged["description"] = info_anilist.get("description") or info_jikan.get("synopsis")
    merged["synopsis"] = info_jikan.get("synopsis")

    merged["genres"] = list(
        set((info_anilist.get("genres") or []) + (info_jikan.get("genres") or []))
    )

    return merged

def update_episodes_from_anilist(db: Session, anime: Anime):
    schedule = get_anilist_airing_schedule(anime.name)
    if not schedule:
        return

    seasons = (
        db.query(Season)
        .filter_by(anime_id=anime.id)
        .order_by(Season.season_number)
        .all()
    )

    episode_offset = 0

    for season in seasons:
        episodes = (
            db.query(Episode)
            .filter_by(season_id=season.id)
            .order_by(Episode.episode_number)
            .all()
        )

        for ep in episodes:
            global_ep_number = episode_offset + ep.episode_number

            if global_ep_number in schedule:
                ep.date_diffusion = schedule[global_ep_number]

        episode_offset += len(episodes)

    db.commit()

# --------------------- Episodes AniList ---------------------
def get_episode_count_from_anilist(title: str, default=24) -> int:
    query = """
    query ($search: String) {
      Media(search: $search, type: ANIME) {
        episodes
      }
    }
    """
    try:
        r = requests.post(
            ANILIST_GRAPHQL_URL,
            json={"query": query, "variables": {"search": title}},
            timeout=8
        )
        r.raise_for_status()

        eps = r.json().get("data", {}).get("Media", {}).get("episodes")
        return eps if eps else default

    except:
        return default

# --------------------- Mise à jour DB ---------------------
def update_anime_info_in_db(db: Session, anime: Anime, info_anilist: dict, info_jikan: dict):
    print(f"   ➡️ MAJ {anime.name}")
    print(f"      AniList: {info_anilist}")
    print(f"      Jikan: {info_jikan}")
    try:
        # TITRES
        for key, attr in {
            "title": "title_romaji",
            "title_english": "title_english",
            "title_nihon": "title_nihon"
        }.items():
            if info_anilist.get(key):
                setattr(anime, attr, info_anilist[key])
            elif info_jikan.get(key):
                setattr(anime, attr, info_jikan[key])

        # DESCRIPTION
        if info_anilist.get("description"):
            anime.description = info_anilist["description"]
        elif info_jikan.get("synopsis"):
            anime.description = info_jikan["synopsis"]

        # SYNOPSIS
        if info_jikan.get("synopsis"):
            anime.synopsis = info_jikan["synopsis"]

        # AUTRES CHAMPS
        for key in ["type", "status", "studio", "created_at", "note", "rank", "image_url", "episodes"]:
            if info_anilist.get(key) is not None:
                setattr(anime, key, info_anilist[key])
            elif info_jikan.get(key) is not None:
                setattr(anime, key, info_jikan[key])

        # GENRES
        genres = set((info_anilist.get("genres") or []) + (info_jikan.get("genres") or []))

        for g in genres:
            g = g.strip()
            if not g:
                continue

            genre = db.query(Genre).filter_by(name=g).first()
            if not genre:
                genre = Genre(name=g)
                db.add(genre)
                db.commit()
                db.refresh(genre)

            if genre not in anime.genres:
                anime.genres.append(genre)

        db.commit()

    except Exception as e:
        logging.error(f"Erreur MAJ {anime.name}: {e}")
        db.rollback()

def update_anime_info(anime: Anime, db: Session):
    name = format_name(anime.name)
    print(f"➡️ Mise à jour des infos pour {name}")
    try:
        info_anilist = get_anime_info_anilist(name)
    except Exception as e:
        logging.error(f"[AniList Info] Erreur {anime.name}: {e}")
        info_anilist = None

    try:
        info_jikan = get_anime_info_jikan(name)
    except Exception as e:
        logging.error(f"[Jikan] Erreur {anime.name}: {e}")
        info_jikan = None

    try:
        update_anime_info_in_db(db, anime, info_anilist, info_jikan)
    except Exception as e:
        logging.error(f"[DB Update] Erreur {anime.name}: {e}")
        db.rollback()

    try:
        update_episodes_from_anilist(db, anime)
    except Exception as e:
        logging.error(f"[AniList Episodes] Erreur {anime.name}: {e}")
        db.rollback()

def update_seasonal_anime_info(anime: Anime, db: Session):
    name = format_name(anime.name)
    print(f"➡️ Mise à jour des infos saisonnières pour {name}")
    try:
        seasonal_info = get_anilist_seasonal_info(name)
        if not seasonal_info:
            return

        seasonal = (
            db.query(SeasonalAnime)
            .filter_by(anime_id=anime.id)
            .first()
        )
        if not seasonal:
            return

        # Mise à jour des infos saisonnières
        updated = False
        for key, value in seasonal_info.items():
            if hasattr(seasonal, key) and value is not None:
                setattr(seasonal, key, value)
                updated = True
        if updated:
            db.commit()
    except:
        return

def update_all_seasonal_anime_info():
    db = SessionLocal()

    try:
        animes = db.query(Anime).all()

        for anime in animes:
            if is_seasonal_anime(db, anime):
                update_seasonal_anime_info(anime, db)
            sleep(1.5)

    finally:
        db.close()

# --------------------- MAJ GLOBAL ---------------------
def update_all_anime_info():
    db = SessionLocal()

    try:
        animes = db.query(Anime).all()

        for anime in animes:
            if is_seasonal_anime(db, anime):
                update_seasonal_anime_info(anime, db)
            update_anime_info(anime,db)
            sleep(1.5)

    finally:
        db.close()

def add_new_info():
    """
        Ajouter des infos si n'en contient pas encore
    """
    db = SessionLocal()
    try:
        animes = db.query(Anime).filter_by(description="").all()
        for anime in animes:
            update_anime_info(anime,db)            
            sleep(1.5)
    finally:
        db.close()
        
if __name__ == "__main__":
    print(format_name('[Fa] Attack.On.Titan_Fa'))