from app.db.session import SessionLocal
from app.db.models import Anime, Season
import os

def find_media_folders():
    """
    Liste les points de montage et vérifie la présence des dossiers ANIME, animes, ANIMES, MANGA.
    Retourne un dictionnaire {point_de_montage: [dossiers_trouvés]}
    """
    folders_to_check = ["ANIME", "animes", "ANIMES", "MANGA"]
    found = {}

    with open("/proc/mounts", "r") as f:
        mounts = [line.split()[1] for line in f.readlines()]
    for mount_point in mounts:
        try:
            items = os.listdir(mount_point)
            matches = [folder for folder in folders_to_check if folder in items]
            if matches:
                found[mount_point] = matches
        except Exception:
            continue

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

