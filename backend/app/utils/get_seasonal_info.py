import requests
import logging
from datetime import datetime, date, timezone
import re

from app.utils.http_client import request_with_retry

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
        r = request_with_retry(
            "POST",
            ANILIST_GRAPHQL_URL,
            json={"query": query, "variables": {"search": clean}},
            headers=headers,
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

# --- Exemple ---
if __name__ == "__main__":
    titles = [
        "JUJUTSU KAISEN S3 PART1",
        "Kaya-chan wa Kowakunai",
        "Oshi no ko S3",
        "Yuusha Kei ni Shosu: Choubatsu Yuusha 9004-tai Keimu Kiroku"
    ]

    for t in titles:
        info = get_anilist_seasonal_info(t)
        print(t, "=>", info)
