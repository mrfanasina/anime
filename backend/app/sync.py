import os
import datetime
import re
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.crud import anime as anime_crud
from app.crud import seasonal as seasonal_crud
from app.utils.mount import find_media_folders

# ------------------ Synchronisation principale ------------------
def sync_all_disks():
    """Parcours tous les disques et synchronise tous les animes et saisons."""
    print("🔄 Synchronisation complète des disques...")
    db = SessionLocal()
    media_folders = find_media_folders()
    print(media_folders)
    for mount_point, folders in media_folders.items():
        for folder in folders:
            folder_path = os.path.join(mount_point, folder)
            if not os.path.exists(folder_path):
                continue

            for item_name in os.listdir(folder_path):
                item_path = os.path.join(folder_path, item_name)
                if not os.path.isdir(item_path):
                    continue

                # Dossier saisonnier
                if item_name.startswith('#'):
                    print(f"📂 Synchronisation saisonniers trouvée : {item_path}")
                    sync_seasonal_animes(db, item_path)
                    continue

                # Anime classique
                anime = anime_crud.get_or_create_anime(db, item_name, item_path, force_update=True)
                sync_anime_files(item_path, anime, db, force_update=True)

    db.commit()
    db.close()
    print("✅ Synchronisation terminée.")

# ------------------ Synchronisation des fichiers ------------------
def sync_anime_files(anime_path: str, anime, db: Session, force_update=False):
    """Synchronise les épisodes d'un anime (classique ou saisonnier)."""
    for root, _, files in os.walk(anime_path):
        relative = os.path.relpath(root, anime_path)
        season_name = "Saison 1" if relative == "." else relative
        season = anime_crud.get_or_create_season(db, anime, season_name, force_update=force_update)

        for file in files:
            if anime_crud.is_video_file(file):
                file_path = os.path.join(root, file)
                anime_crud.get_or_create_episode(db, season, file, file_path, force_update=force_update)

    db.commit()

# ------------------ Synchronisation saisonniers ------------------
def sync_seasonal_animes(db: Session, saisonnier_root: str):
    """
    Synchronisation des animés saisonniers situés dans #Saisonnier.
    Tous les animés sont ajoutés dans Anime et SeasonalAnime.
    """
    if not os.path.exists(saisonnier_root):
        print(f"❌ Dossier saisonnier inexistant : {saisonnier_root}")
        return

    print(f"🧊 Synchronisation saisonniers : {saisonnier_root}")

    for season_folder in os.listdir(saisonnier_root):
        season_path = os.path.join(saisonnier_root, season_folder)
        if not os.path.isdir(season_path):
            continue

        season_name = season_folder.strip()
        print(f"📅 Saison détectée : {season_name}")

        for anime_name in os.listdir(season_path):
            anime_path = os.path.join(season_path, anime_name)
            if not os.path.isdir(anime_path):
                continue

            # Anime et saison saisonnière
            anime = anime_crud.get_or_create_anime(db, anime_name, anime_path, force_update=True)
            seasonal_crud.get_or_create_seasonal(db, anime, season_name, force_update=True)
            sync_anime_files(anime_path, anime, db, force_update=True)
