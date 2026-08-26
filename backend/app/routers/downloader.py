"""
Routeur Downloader — Endpoints pour la recherche et le téléchargement d'animes via Nyaa.

Fournit la recherche de torrents sur nyaa.si, la détection des épisodes manquants,
et un WebSocket de téléchargement en temps réel avec progression.
"""
from fastapi import APIRouter, Query, WebSocket
import requests
import re
from bs4 import BeautifulSoup
from typing import List, Dict, Optional

from app.db.session import SessionLocal
from app.db.models import Anime, Season, Episode
import app.crud.anime as crud_ep
from app.utils.downloader import download_episode
from app.crud.anime import extract_episode_number
from app.utils.get_anime_info import get_episode_count_from_anilist

router = APIRouter()

BASE_URL = "https://nyaa.si"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; AnimeScraper/2.0)"}


# ==================== Scraper Nyaa ====================
def scrape_nyaa(query: str, page: int = 1, missing_episodes: Optional[List[int]] = None) -> List[Dict]:
    """
    Scrape les résultats de recherche sur nyaa.si pour une requête donnée.
    
    Args:
        query: Terme de recherche.
        page: Numéro de page (défaut: 1).
        missing_episodes: Liste des numéros d'épisodes manquants (pour le marquage).
    
    Returns:
        Liste de résultats avec titre, magnet, taille, seeders, langue, etc.
    """
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

        # Extraction du numéro d'épisode
        ep_num = extract_episode_number(title)
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


# ==================== Utilitaires de recherche ====================
def build_queries(anime_name: str, episode_number: int) -> List[str]:
    """
    Construit les requêtes de recherche pour un épisode donné.
    
    Génère 3 variantes : nom complet + épisode, base du nom + épisode, nom seul.
    """
    anime_name = anime_name.strip()
    ep_str = str(episode_number).zfill(2)
    base = anime_name.split(" ")[0] if anime_name else ""
    return [
        f"{anime_name} {ep_str}",     # Nom complet + épisode
        f"{base} {ep_str}",           # Base du nom + épisode
        anime_name                     # Nom seul (recherche générale)
    ]


def sort_results(results: List[Dict]) -> List[Dict]:
    """Trie les résultats par langue (VF > VOSTFR > Autre) puis par seeders décroissants."""
    lang_priority = {"VF": 3, "VOSTFR": 2, "Autre": 1}
    return sorted(
        results,
        key=lambda r: (lang_priority.get(r["language"], 0), r["seeders"]),
        reverse=True
    )


def get_anime_and_next_episode(db, anime_id: int):
    """
    Récupère un anime et le numéro de son prochain épisode attendu.
    
    Returns:
        Tuple (anime, next_ep_number, season_id) ou (None, None, None).
    """
    anime = db.query(Anime).filter(Anime.id == anime_id).first()
    if not anime:
        return None, None, None

    last_ep = crud_ep.get_last_episode_number(db, anime_id)
    if not last_ep:
        last_ep = (0, 1)

    next_ep_number = last_ep[0] + 1
    season_id = last_ep[1]
    return anime, next_ep_number, season_id


def detect_missing_episodes(db, season_id: int) -> List[int]:
    """
    Détecte les épisodes manquants pour une saison.
    
    Utilise AniList si disponible, sinon estime le total
    à partir du numéro d'épisode le plus élevé trouvé (minimum 12).
    """
    season = db.query(Season).filter(Season.id == season_id).first()
    if season is None:
        return []

    total_expected = get_episode_count_from_anilist(season.anime.name) if season.anime else None

    if not total_expected:
        total_expected = max(
            (ep.episode_number for ep in season.episodes),
            default=0
        )
        total_expected = max(total_expected, 12)

    existing_nums = {ep.episode_number for ep in season.episodes}
    return [num for num in range(1, total_expected + 1) if num not in existing_nums]


# ==================== Route principale ====================
@router.get("/search-downloadable-anime/{anime_id}", response_model=dict)
def search_downloadable_anime(
    anime_id: int,
    mode: str = Query("next", enum=["next", "all"])
):
    """
    Recherche les torrents disponibles pour un anime sur Nyaa.
    
    Modes :
    - "next" : retourne le meilleur résultat pour le prochain épisode.
    - "all"  : retourne tous les résultats pour tous les épisodes manquants.
    """
    db = SessionLocal()
    try:
        anime, next_ep, season_id = get_anime_and_next_episode(db, anime_id)
        if not anime:
            return {"error": "Anime not found"}

        miss_ep = detect_missing_episodes(db, season_id)
        results = []
        queries_tried = []

        if mode == "next":
            queries = build_queries(anime.name, next_ep)
            for q in queries:
                temp = scrape_nyaa(q, missing_episodes=[next_ep])
                if temp:
                    results.extend(temp)
                    queries_tried.append(f"episode {next_ep} -> {q}")
                    break
        else:
            queries_tried_set = set()

            # Recherche pour tous les épisodes manquants
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

            # Recherche générale pour l'anime
            general_results = scrape_nyaa(anime.name)
            if general_results:
                results.extend(general_results)
                queries_tried_set.add(f"general -> {anime.name}")

            queries_tried = list(queries_tried_set)

        # Cas sans épisodes manquants
        if not miss_ep:
            res = scrape_nyaa(anime.name)
            return {
                "anime": anime.name,
                "results_found": len(res),
                "best_result": results[0] if results else None,
                "results": res
            }

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


# ==================== WebSocket de téléchargement ====================
@router.websocket("/download-anime/{season_id}")
async def ws_download_anime(websocket: WebSocket, season_id: int):
    """
    WebSocket de téléchargement d'anime via lien magnet.
    
    Attend un paramètre 'magnet' dans les query params.
    Envoie les mises à jour de progression en temps réel.
    """
    await websocket.accept()
    try:
        query_params = dict(websocket.query_params)
        magnet = query_params.get("magnet")
        if not magnet:
            await websocket.send_json({
                "state": "error",
                "message": "Paramètre 'magnet' manquant"
            })
            await websocket.close(code=4000)
            return

        await download_episode(magnet, season_id, websocket)
    except Exception as e:
        await websocket.send_json({
            "state": "error",
            "message": str(e)
        })
    finally:
        await websocket.close()
