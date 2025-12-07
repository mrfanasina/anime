from fastapi import APIRouter, Query, WebSocket
import requests, re
from bs4 import BeautifulSoup
from app.db.session import SessionLocal
from app.db.models import Anime, Season, Episode
import app.crud.anime as crud_ep
from app.schemas import DownloadRequest
from app.utils.downloader import download_episode
from typing import List, Dict, Optional
from app.crud.anime import extract_episode_number
from app.utils.get_anime_info import get_episode_count_from_anilist

router = APIRouter()

BASE_URL = "https://nyaa.si"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; AnimeScraper/2.0)"}

# --- Scraper ---
def scrape_nyaa(query: str, page: int = 1, missing_episodes: Optional[List[int]] = None) -> List[Dict]:
    url = f"{BASE_URL}/?f=0&c=0_0&q={query}&p={page}"
    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        r.raise_for_status()
    except Exception:
        return []

    soup = BeautifulSoup(r.text, "html.parser")
    rows = soup.select("table.table tbody tr")
    results = []

    for row in rows:
        cols = row.find_all("td")
        if len(cols) < 6:
            continue

        title_tag = cols[1].find("a") or cols[2].find("a")
        if not title_tag:
            continue

        magnet_tag = row.find("a", href=lambda h: h and "magnet" in h)
        if not magnet_tag:
            continue

        title = title_tag.text.strip()
        magnet = magnet_tag["href"]
        size = cols[3].text.strip()
        seeders = cols[5].text.strip()
        leechers = cols[6].text.strip() if len(cols) > 6 else "0"

        # Détection de langue
        t = title.upper()
        if "VF" in t:
            lang = "VF"
        elif "VOSTFR" in t or "SUBFR" in t:
            lang = "VOSTFR"
        else:
            lang = "Autre"

        # Extraction du numéro d’épisode
        ep_num = extract_episode_number(title)

        # Ajout du flag "missing"
        is_missing = ep_num in missing_episodes if missing_episodes else False

        results.append({
            "title": title,
            "magnet": magnet,
            "size": size,
            "seeders": int(seeders) if seeders.isdigit() else 0,
            "leechers": int(leechers) if leechers.isdigit() else 0,
            "language": lang,
            "query": query,
            "episode_number": ep_num,
            "missing": is_missing,
        })

    return results

# --- Utils ---
def build_queries(anime_name: str, episode_number: int) -> List[str]:
    anime_name = anime_name.strip()
    ep_str = str(episode_number).zfill(2)
    base = anime_name.split(" ")[0] if anime_name else ""
    return [
        f"{anime_name} {ep_str}",     # Anime complet + épisode
        f"{base} {ep_str}",           # Base du nom + épisode
        anime_name                    # juste le nom (pour recherche générale)
    ]

def sort_results(results: List[Dict]) -> List[Dict]:
    lang_priority = {"VF": 3, "VOSTFR": 2, "Autre": 1}
    return sorted(results, key=lambda r: (lang_priority.get(r["language"], 0), r["seeders"]), reverse=True)


def get_anime_and_next_episode(db, anime_id: int):
    anime: Optional[Anime] = db.query(Anime).filter(Anime.id == anime_id).first()
    if not anime:
        return None, None, None

    last_ep = crud_ep.get_last_episode_number(db, anime_id)
    if not last_ep:
        last_ep = (0, 1)

    next_ep_number = last_ep[0] + 1
    season_id = last_ep[1]
    return anime, next_ep_number, season_id


# --- Détection des épisodes manquants ---
def detect_missing_episodes(season_id: int):
    db = SessionLocal()
    season = db.query(Season).filter(Season.id == season_id).first()
    if season is None:
        db.close()
        return []
    # 1. Essaye AniList
    total_expected = get_episode_count_from_anilist(season.anime.name) if season.anime else None

    # 2. Sinon, estimation offline
    if not total_expected:
        total_expected = max(
            (ep.episode_number for ep in season.episodes),
            default=0
        )
        total_expected = max(total_expected, 12)

    existing_nums = {ep.episode_number for ep in season.episodes}
    missing = [num for num in range(1, total_expected + 1) if num not in existing_nums]

    db.close()
    return missing


# --- Route principale ---
@router.get("/search-downloadable-anime/{anime_id}", response_model=dict)
def search_downloadable_anime(
    anime_id: int,
    mode: str = Query("next", enum=["next", "all"])
):
    """
    mode="next" : retourne le meilleur résultat pour le prochain épisode
    mode="all"  : retourne tous les résultats pour tous les épisodes manquants
                 et d'autres résultats disponibles pour l'anime
    """
    db = SessionLocal()
    try:
        anime, next_ep, season_id = get_anime_and_next_episode(db, anime_id)
        if not anime:
            return {"error": "Anime not found"}

        miss_ep = detect_missing_episodes(season_id)
        results = []
        queries_tried = []

        if mode == "next":
            # --- Recherche du prochain épisode uniquement ---
            queries = build_queries(anime.name, next_ep)
            for q in queries:
                temp = scrape_nyaa(q, missing_episodes=[next_ep])
                if temp:
                    results.extend(temp)
                    queries_tried.append(f"episode {next_ep} -> {q}")
                    break
        else:
            # --- Mode "all" ---
            queries_tried_set = set()  # pour éviter les doublons

            # 1️⃣ Recherche pour tous les épisodes manquants
            for ep_num in miss_ep:
                queries = build_queries(anime.name, ep_num)
                found_for_episode = False
                for q in queries:
                    temp = scrape_nyaa(q, missing_episodes=[ep_num])
                    if temp:
                        results.extend(temp)
                        queries_tried_set.add(f"episode {ep_num} -> {q}")
                        found_for_episode = True
                        break
                if not found_for_episode:
                    queries_tried_set.add(f"episode {ep_num} -> {anime.name} {ep_num} (no results)")

            # 2️⃣ Recherche générale pour l'anime (juste le nom)
            general_results = scrape_nyaa(anime.name)
            if general_results:
                results.extend(general_results)
                queries_tried_set.add(f"general -> {anime.name}")

            queries_tried = list(queries_tried_set)
        if not miss_ep:
            res = scrape_nyaa(anime.name)
            return {
                "anime": anime.name,
                "results_found": len(res),
                "best_result": results[0] if results else None,
                "results": res
            }

        # Trie global par langue et seeders
        results = sort_results(results)

        return {
            "anime": anime.name,
            "season_id": season_id,
            "episode_number": next_ep,
            "missing_episodes": miss_ep,
            "queries_tried": queries_tried,
            "results_found": len(results),
            "best_result": results[0] if results else None,
            "results": results
        }

    finally:
        db.close()

# --- WebSocket de téléchargement ---
@router.websocket("/download-anime/{season_id}")
async def ws_download_anime(websocket: WebSocket, season_id: int):
    await websocket.accept()

    try:
        query_params = dict(websocket.query_params)
        magnet = query_params.get("magnet")
        print(f"🔗 Magnet reçu: {magnet}")
        if not magnet:
            await websocket.send_json({
                "state": "error",
                "message": "Paramètre 'magnet' manquant"
            })
            await websocket.close(code=4000)
            return

        print(f"📥 Connexion WS — season_id={season_id}")
        await download_episode(magnet, season_id, websocket)

    except Exception as e:
        print(f"❌ Erreur WebSocket: {e}")
        await websocket.send_json({
            "state": "error",
            "message": str(e)
        })
    finally:
        await websocket.close()
