import os
import datetime
import re
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.crud import anime as anime_crud
from app.crud import seasonal as seasonal_crud
from app.utils.folder import find_media_folders
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

            normalized = folder.lower()
            # ---------------- MOVIES ----------------
            if normalized in ("movie", "movies"):
                print(f"🎬 Synchronisation MOVIES : {folder_path}")
                sync_movies(db, folder_path)
                continue

            # ---------------- OVA ----------------
            if normalized == "ova":
                print(f"📀 Synchronisation OVA : {folder_path}")
                sync_ova(db, folder_path)
                continue


            # ---------------- ANIME CLASSIQUE ----------------
            for item_name in os.listdir(folder_path):
                item_path = os.path.join(folder_path, item_name)
                # ---------------- DOSSIERS SAISONNIERS ----------------
                if item_name.startswith('#'):
                    print(f"📂 Synchronisation saisonniers trouvée : {folder_path}")
                    sync_seasonal_animes(db, item_path)
                if not os.path.isdir(item_path):
                    continue


                anime = anime_crud.get_or_create_anime(db, item_name, item_path, force_update=True)
                sync_anime_files(item_path, anime, db, force_update=True)

    db.commit()
    db.close()
    print("✅ Synchronisation terminée.")

# ------------------ Synchronisation des fichiers ------------------
def sync_anime_files(anime_path: str, anime, db: Session, force_update=False):
    """
    Synchronise les épisodes d'un anime avec les fichiers présents sur le disque.

    Règles :
    - Un dossier n'est considéré comme une saison QUE s'il contient :
        - plusieurs épisodes
        - ou des sous-dossiers
    - Un dossier contenant un seul épisode est ignoré comme saison
      → l'épisode est placé dans la Saison 1
    """

    # ============================================================
    # 1️⃣ Récupération de tous les fichiers vidéo existants
    # ============================================================
    existing_files = []

    for root, _, files in os.walk(anime_path):
        for file in files:
            if anime_crud.is_video_file(file):
                full_path = os.path.abspath(os.path.join(root, file))
                existing_files.append(full_path)

    existing_files_set = set(existing_files)

    # ============================================================
    # 2️⃣ Récupération des épisodes en base
    # ============================================================
    db_episodes = anime_crud.get_all_episodes_for_anime(db, anime.id)

    # ============================================================
    # 3️⃣ Marquer les épisodes absents comme introuvables
    # ============================================================
    for ep in db_episodes:
        if ep.path and os.path.abspath(ep.path) not in existing_files_set:
            if not ep.not_found:
                ep.not_found = True
                print(f"⚠️ Épisode introuvable : {ep.path}")
        else:
            if ep.not_found:
                ep.not_found = False

    # ============================================================
    # 4️⃣ Analyse des dossiers pour déterminer les vraies saisons
    # ============================================================
    season_1 = anime_crud.get_or_create_season(
        db, anime, "Saison 1", force_update=force_update
    )

    for root, dirs, files in os.walk(anime_path):
        video_files = [f for f in files if anime_crud.is_video_file(f)]

        # Chemin relatif par rapport à l'anime
        relative = os.path.relpath(root, anime_path)

        # 📌 Cas racine → Saison 1
        if relative == ".":
            target_season = season_1

        # 📌 Faux dossier de saison (1 seul épisode, pas de sous-dossiers)
        elif len(video_files) == 1 and not dirs:
            target_season = season_1

        # 📌 Vraie saison
        else:
            season_name = relative.replace("\\", "/")
            target_season = anime_crud.get_or_create_season(
                db, anime, season_name, force_update=force_update
            )

        # ========================================================
        # 5️⃣ Création / mise à jour des épisodes
        # ========================================================
        for file in video_files:
            file_path = os.path.join(root, file)
            anime_crud.get_or_create_episode(
                db,
                target_season,
                file,
                file_path,
                force_update=force_update
            )


# ------------------ Synchronisation des films ------------------
def sync_movies(db: Session, movies_root: str):
    """
    Synchronise tous les films dans le dossier movie/movies.
    Chaque fichier vidéo devient un anime de type 'movie'.
    """
    for item in os.listdir(movies_root):
        item_path = os.path.join(movies_root, item)

        # 📌 Cas 1 : fichiers vidéos directement dans /movies
        if os.path.isfile(item_path) and anime_crud.is_video_file(item):
            anime_name = os.path.splitext(item)[0]  # nom sans extension
            print(f"🎬 Film détecté : {anime_name}")
            
            anime = anime_crud.get_or_create_anime(
                db,
                anime_name,
                item_path,
                force_update=True,
                type="movie"
            )

            season = anime_crud.get_or_create_season(db, anime, "Film")
            anime_crud.get_or_create_episode(db, season, item, item_path, force_update=True)

        # 📌 Cas 2 : sous-dossier = un film
        elif os.path.isdir(item_path):
            anime_name = item
            print(f"🎬 Film en dossier : {anime_name}")

            anime = anime_crud.get_or_create_anime(
                db,
                anime_name,
                item_path,
                force_update=True,
                type="movie"
            )

            # saison unique "Film"
            sync_anime_files(item_path, anime, db, force_update=True)

# ------------------ Synchronisation des OVA ------------------
def sync_ova(db: Session, ova_root: str):
    """
    Synchronisation des OVA.
    Même logique que les movies mais type = 'ova'.
    """
    for item in os.listdir(ova_root):
        item_path = os.path.join(ova_root, item)

        # OVA direct en fichier
        if os.path.isfile(item_path) and anime_crud.is_video_file(item):
            anime_name = os.path.splitext(item)[0]
            print(f"📀 OVA détecté : {anime_name}")

            anime = anime_crud.get_or_create_anime(
                db,
                anime_name,
                item_path,
                force_update=True,
                type="ova"
            )

            season = anime_crud.get_or_create_season(db, anime, "OVA")
            anime_crud.get_or_create_episode(db, season, item, item_path, force_update=True)

        # OVA dans un dossier
        elif os.path.isdir(item_path):
            anime_name = item
            print(f"📀 OVA dossier : {anime_name}")

            anime = anime_crud.get_or_create_anime(
                db,
                anime_name,
                item_path,
                force_update=True,
                type="ova"
            )

            sync_anime_files(item_path, anime, db, force_update=True)


def sync_seasonal_only():
    """
    Synchronise UNIQUEMENT les dossiers saisonniers (#...).
    """
    print("🧊 Synchronisation SAISONNIÈRE uniquement...")
    db = SessionLocal()

    try:
        media_folders = find_media_folders()

        for mount_point, folders in media_folders.items():
            for folder in folders:
                root_path = os.path.join(mount_point, folder)
                if not os.path.exists(root_path):
                    continue

                for item in os.listdir(root_path):
                    if not item.startswith("#"):
                        continue

                    saisonnier_path = os.path.join(root_path, item)
                    print(f"📂 Saisonniers trouvés : {saisonnier_path}")

                    from app.sync import sync_seasonal_animes
                    sync_seasonal_animes(db, saisonnier_path)

        db.commit()
        print("✅ Synchronisation saisonnière terminée")

    except Exception as e:
        db.rollback()
        print("❌ Erreur sync saisonnier :", e)
        raise
    finally:
        db.close()

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

    # cas 1: #Saisonnier/Season Name/Anime Name/...
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
            sync_anime_files(anime_path, anime, db, force_update=True)
            seasonal_period = seasonal_crud.get_or_create_seasonal_period(db, season_name)
            seasonal_crud.get_or_create_seasonal(
                db,
                anime=anime,
                seasonal_period=seasonal_period,
                force_update=True
            )
