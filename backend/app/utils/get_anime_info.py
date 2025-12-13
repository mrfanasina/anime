import requests
from sqlalchemy.orm import Session
from app.db.models.anime import Anime
from app.db.models.genre import Genre
from app.db.session import SessionLocal
import logging
import socket
import time

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


# --------------------- Episodes AniList (RESTORÉE !) ---------------------
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


# --------------------- MAJ GLOBAL ---------------------
def update_all_anime_info():
    db = SessionLocal()

    try:
        animes = db.query(Anime).all()

        for anime in animes:
            print(f"🔎 {anime.name}")

            info_anilist = get_anime_info_anilist(anime.name)
            info_jikan = get_anime_info_jikan(anime.name)

            update_anime_info_in_db(db, anime, info_anilist, info_jikan)

            time.sleep(1.5)

    finally:
        db.close()
