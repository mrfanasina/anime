import requests
from bs4 import BeautifulSoup
from app.db.models.anime import Anime
from app.db.session import SessionLocal
from sqlalchemy.orm import Session
from typing import Optional
from sqlalchemy.exc import NoResultFound
import re
import logging
import time

logging.basicConfig(level=logging.INFO)

def get_anime_info(anime_name: str) -> Optional[dict]:
    """
    Récupère les informations d'un animé depuis MyAnimeList.
    Retourne un dictionnaire complet avec titre, image, note, description, etc.
    """
    base_url = "https://myanimelist.net"
    search_url = f"{base_url}/anime.php?q={requests.utils.quote(anime_name)}&cat=anime"

    try:
        response = requests.get(search_url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
        response.raise_for_status()
    except requests.RequestException as e:
        logging.error(f"Erreur lors de la requête vers MyAnimeList: {e}")
        return None

    soup = BeautifulSoup(response.text, 'html.parser')

    # Trouver le premier lien d’aniget_anime_infomé valide
    first_result = soup.select_one("a.hoverinfo_trigger.fw-b")
    if not first_result:
        logging.warning(f"Aucun résultat trouvé pour {anime_name}")
        return None

    anime_page_url = first_result["href"]

    # Charger la page de l’animé
    try:
        anime_response = requests.get(anime_page_url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
        anime_response.raise_for_status()
    except requests.RequestException as e:
        logging.error(f"Erreur lors de la requête vers la page de l'animé {anime_name}: {e}")
        return None

    anime_soup = BeautifulSoup(anime_response.text, "html.parser")

    try:
        #  Nom
        title = anime_soup.select_one("h1.title-name, h1.h1_bold_none").text.strip()

        #  Score (note moyenne)
        score_tag = anime_soup.select_one("div.score-label")
        score = float(score_tag.text.strip()) if score_tag and score_tag.text.strip() != "N/A" else None

        #  Image
        image_tag = anime_soup.select_one("img[itemprop='image']")
        image_url = image_tag.get("data-src") or image_tag.get("src") if image_tag else None

        #  Description
        description_tag = anime_soup.select_one("p[itemprop='description']")
        description = description_tag.text.strip() if description_tag else None

        #  Type, Statut, Studio, Date, Rank
        info_map = {
            "Type:": None,
            "Status:": None,
            "Studios:": None,
            "Premiered:": None,
            "Ranked:": None
        }

        for span in anime_soup.select("span.dark_text"):
            label = span.text.strip()
            if label in info_map:
                next_node = span.next_sibling
                if not next_node or isinstance(next_node, str):
                    next_node = span.find_next_sibling(text=True)
                if label == "Ranked:":
                    rank_match = re.search(r"#(\d+)", str(next_node))
                    info_map[label] = int(rank_match.group(1)) if rank_match else None
                else:
                    info_map[label] = str(next_node).strip()

        anime_type = info_map["Type:"]
        status = info_map["Status:"]
        studio = info_map["Studios:"]
        premiered = info_map["Premiered:"]
        rank = info_map["Ranked:"]

        #  Extraire l’année de création
        year = None
        if premiered:
            match = re.search(r"(\d{4})", premiered)
            if match:
                year = match.group(1)

        #  Résumé propre
        return {
            "title": title,
            "score": score,
            "image_url": image_url,
            "description": description,
            "type": anime_type,
            "status": status,
            "studio": studio,
            "created_at": year,
            "rank": rank
        }

    except Exception as e:
        logging.error(f"Erreur lors de l’extraction des données de {anime_name}: {e}")
        return None

def update_all_anime_info():
    """
    Met à jour tout les animes depuis mal
    """
    db = Session
    try:
        animes = db.query(Anime).all()
        for anime in animes: 
            print(anime.id)
    except Exception as e:
        print("exp",e)
        
def update_anime_info_in_db(db: Session, anime_id: int, info: dict):
    """
    Met à jour les informations d’un animé dans la base de données.
    """
    try:
        anime = db.query(Anime).filter_by(id=anime_id).first()
        if not anime:
            logging.warning(f"Animé introuvable dans la base: {anime_id}")
            return

        anime.image_url = info.get("image_url", anime.image_url)
        anime.description = info.get("description", anime.description)
        anime.type = info.get("type", anime.type)
        anime.status = info.get("status", anime.status)
        anime.rank = info.get("rank", anime.rank)
        anime.note = info.get("score", anime.note)
        anime.studio = info.get("studio", anime.studio)
        anime.created_at = info.get("created_at", anime.created_at)

        db.commit()
        logging.info(f" Informations mises à jour: {anime.name}")
    except Exception as e:
        logging.error(f"Erreur lors de la mise à jour de {anime_id}: {e}")
        db.rollback()


if __name__ == "__main__":
    db = SessionLocal()
    try:
        animes = db.query(Anime).all()
        for anime in animes:
            logging.info(f" Récupération des informations pour: {anime.name}")
            info = get_anime_info(anime.name)
            if info:
                update_anime_info_in_db(db, anime.id, info)
            else:
                logging.info(f"Aucune info trouvée pour: {anime.name}")
            time.sleep(2)  # pour ne pas spammer MyAnimeList
    finally:
        db.close()
