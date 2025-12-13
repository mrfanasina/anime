from app.db.session import SessionLocal
from app.db.models import Anime, Season
import os
import os

FOLDERS_TO_CHECK = {"anime", "animes", "manga", "movies", "movie", "ova"}

def find_media_folders():
    """
    Analyse les points de montage et détecte les dossiers intéressants.
    Retourne un dict : { "/mnt/sdX" : ["anime", "manga"] }
    """
    found = {}

    try:
        with open("/proc/mounts", "r") as f:
            mounts = [line.split()[1] for line in f]
    except Exception:
        return {}

    for mount_point in mounts:
        try:
            items = os.listdir(mount_point)
        except Exception:
            continue

        # normalisation lowercase
        normalized_items = {item.lower(): item for item in items}

        # on garde les noms d'origine pour éviter d'écraser les majuscules
        matches = [
            normalized_items[name]
            for name in FOLDERS_TO_CHECK
            if name in normalized_items
        ]

        if matches:
            found[mount_point] = matches

    return found

def get_download_folder(season_id: int):
    db = SessionLocal()
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        db.close()
        return None
    anime = db.query(Anime).filter(Anime.id == season.anime_id).first()
    db.close()

    default_folder_download = find_media_folders()

    if anime and anime.path:
        folder_download = os.path.join(anime.path, season.name)
    else:
        # choisir le premier dossier existant ou le default
        if isinstance(default_folder_download, (list, tuple)):
            for p in default_folder_download:
                if os.path.isdir(p):
                    folder_download = p
                    break
            else:
                folder_download = default_folder_download[0]
        else:
            folder_download = default_folder_download
    return folder_download

