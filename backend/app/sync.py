import os
import datetime
import re
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models.anime import Anime
from app.crud import anime as anime_crud
from app.crud import seasonal as seasonal_crud
from app.utils.folder import find_media_folders

# ============================================================
# 🧠 NOUVEAU : STATUS DISK (DISQUE UNIQUEMENT)
# ============================================================
def compute_anime_disk_status(anime_path: str) -> str:
    """
    Analyse UNIQUEMENT le disque et retourne un status_on_disk.

    Returns:
        - "empty"         : dossier vide (aucun sous-dossier, aucun fichier)
        - "empty_shelves" : structure existe mais aucun fichier vidéo
        - "has_media"     : au moins une vidéo détectée
    """

    if not os.path.exists(anime_path):
        return "empty"

    # Cas film en fichier unique (pas un dossier)
    if os.path.isfile(anime_path):
        return "has_media" if anime_crud.is_video_file(anime_path) else "empty"

    has_video = False
    has_dirs = False

    for root, dirs, files in os.walk(anime_path):
        if dirs:
            has_dirs = True

        for f in files:
            if anime_crud.is_video_file(f):
                has_video = True
                break

        if has_video:
            break

    if not has_video and not has_dirs:
        return "empty"

    if not has_video and has_dirs:
        return "empty_shelves"

    if has_video:
        return "has_media"

    return "empty"


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
                    continue
                if not os.path.isdir(item_path):
                    continue

                # ====================================================
                # 🧠 NOUVEAU : status disque calculé ici
                # ====================================================
                status = compute_anime_disk_status(item_path)

                anime = anime_crud.get_or_create_anime(
                    db,
                    item_name,
                    item_path,
                    status_on_disk=status,
                    force_update=True,
                    type="TV"
                )

                sync_anime_files(item_path, anime, db, force_update=True)

    # ====================================================
    # 🧠 Vérification sérieuse de l'existence sur disque :
    #   marque "missing" les animés supprimés du disque
    #   (ils restent en base) et rafraîchit le statut de tous.
    # ====================================================
    verify_animes_on_disk(db)

    db.commit()
    db.close()
    print("✅ Synchronisation terminée.")


# ------------------ Synchronisation des fichiers ------------------
def sync_anime_files(anime_path: str, anime, db: Session, force_update=False):

    existing_files = []

    for root, _, files in os.walk(anime_path):
        for file in files:
            if anime_crud.is_video_file(file):
                full_path = os.path.abspath(os.path.join(root, file))
                existing_files.append(full_path)

    existing_files_set = set(existing_files)

    db_episodes = anime_crud.get_all_episodes_for_anime(db, anime.id)

    for ep in db_episodes:
        if ep.path and os.path.abspath(ep.path) not in existing_files_set:
            if not ep.not_found:
                ep.not_found = True
                print(f"⚠️ Épisode introuvable : {ep.path}")
        else:
            if ep.not_found:
                ep.not_found = False

    season_1 = anime_crud.get_or_create_season(
        db, anime, "Saison 1", force_update=force_update
    )

    for root, dirs, files in os.walk(anime_path):
        video_files = [f for f in files if anime_crud.is_video_file(f)]
        relative = os.path.relpath(root, anime_path)

        if relative == ".":
            target_season = season_1

        elif len(video_files) == 1 and not dirs:
            target_season = season_1

        else:
            season_name = relative.replace("\\", "/")
            target_season = anime_crud.get_or_create_season(
                db, anime, season_name, force_update=force_update
            )

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

    for item in os.listdir(movies_root):
        item_path = os.path.join(movies_root, item)
        status = compute_anime_disk_status(item_path)
        
        if os.path.isfile(item_path) and anime_crud.is_video_file(item):
            anime_name = os.path.splitext(item)[0]
            print(f"🎬 Film détecté : {anime_name}")

            anime = anime_crud.get_or_create_anime(
                db,
                anime_name,
                item_path,
                force_update=True,
                status_on_disk=status,
                type="movie"
            )

            season = anime_crud.get_or_create_season(db, anime, "Film")
            anime_crud.get_or_create_episode(db, season, item, item_path, force_update=True)

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

            sync_anime_files(item_path, anime, db, force_update=True)


# ------------------ Synchronisation des OVA ------------------
def sync_ova(db: Session, ova_root: str):

    for item in os.listdir(ova_root):
        item_path = os.path.join(ova_root, item)
        
        status = compute_anime_disk_status(item_path)

        if os.path.isfile(item_path) and anime_crud.is_video_file(item):
            anime_name = os.path.splitext(item)[0]
            print(f"📀 OVA détecté : {anime_name}")

            anime = anime_crud.get_or_create_anime(
                db,
                anime_name,
                item_path,
                force_update=True,
                status_on_disk=status,
                type="ova"
            )

            season = anime_crud.get_or_create_season(db, anime, "OVA")
            anime_crud.get_or_create_episode(db, season, item, item_path, force_update=True)

        elif os.path.isdir(item_path):
            anime_name = item
            print(f"📀 OVA dossier : {anime_name}")

            anime = anime_crud.get_or_create_anime(
                db,
                anime_name,
                item_path,
                status_on_disk=status,
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

        verify_animes_on_disk(db)
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
            status = compute_anime_disk_status(anime_path)

            # Anime et saison saisonnière
            anime = anime_crud.get_or_create_anime(
                db,
                anime_name,
                anime_path,
                status_on_disk=status,
                force_update=True
            )            
            sync_anime_files(anime_path, anime, db, force_update=True)
            seasonal_period = seasonal_crud.get_or_create_seasonal_period(db, season_name)
            seasonal_crud.get_or_create_seasonal(
                db,
                anime=anime,
                seasonal_period=seasonal_period,
                force_update=True
            )


def is_mount_available(anime_path: str) -> bool:
    """
    Vérifie que le point de montage contenant le chemin est toujours monté.
    Évite de marquer tous les animés comme "missing" lorsqu'un disque
    est simplement débranché / démonté.
    """
    try:
        with open("/proc/mounts", "r") as f:
            current_mounts = [line.split()[1] for line in f]
    except Exception:
        return True

    # Trouve le point de montage le plus précis englobant le chemin
    best_mount = None
    for mount in current_mounts:
        if anime_path.startswith(mount) and (best_mount is None or len(mount) > len(best_mount)):
            best_mount = mount

    # Aucun point de montage connu → le chemin est sur le FS racine, toujours dispo
    if best_mount is None:
        return True

    # Le point de montage doit exister ET être toujours monté
    return os.path.exists(best_mount) and os.path.ismount(best_mount)


def verify_animes_on_disk(db: Session):
    """
    Vérification sérieuse de l'existence des animés sur le disque.

    Pour CHAQUE anime en base (pas seulement ceux déjà marqués) :
      - Si son point de montage est indisponible (disque débranché) → on ignore,
        on ne marque rien pour éviter les faux positifs.
      - Si le dossier/fichier n'existe plus → status_on_disk = "missing"
        (l'anime reste dans la base).
      - Sinon → recalcule le vrai status disque (has_media / empty_shelves / empty).
    """
    all_animes = db.query(Anime).all()
    missing_count = 0
    restored_count = 0
    refreshed_count = 0

    for anime in all_animes:
        if not anime.path:
            continue

        # Les animés externes (fromPc=False) ne sont pas sur le disque local
        if anime.fromPc is False:
            continue

        if not is_mount_available(anime.path):
            print(f"⚠️ Disque indisponible, ignoré : {anime.name} ({anime.path})")
            continue

        if not os.path.exists(anime.path):
            if anime.status_on_disk != "missing":
                anime.status_on_disk = "missing"
                missing_count += 1
                print(f"❌ Manquant : {anime.name} (dossier introuvable : {anime.path})")
        else:
            new_status = compute_anime_disk_status(anime.path)
            if anime.status_on_disk == "missing":
                restored_count += 1
                print(f"✅ Restauré : {anime.name} (status: {new_status})")
            elif anime.status_on_disk != new_status:
                refreshed_count += 1
                print(f"🔄 Rafraîchi : {anime.name} ({anime.status_on_disk} → {new_status})")
            anime.status_on_disk = new_status

    if missing_count or restored_count or refreshed_count:
        print(f"📊 Résumé : {missing_count} manquant(s), {restored_count} restauré(s), {refreshed_count} rafraîchi(s)")


def compute_anime_status(anime_path: str, db_episodes: list):
    """
    Détermine le status d'un anime basé sur le disque + DB.
    """

    has_files = False
    has_episodes = len(db_episodes) > 0

    for root, _, files in os.walk(anime_path):
        if any(anime_crud.is_video_file(f) for f in files):
            has_files = True
            break

    if not has_files:
        return "empty"

    if not has_episodes:
        return "incomplete"

    return "complete"

def remove_all_animes_from_db():
    """ !!!!!Supprime tous les animes de la base de données (pour debug)."""
    db = SessionLocal()
    try:
        animes = anime_crud.get_all_animes(db)
        for anime in animes:
            db.delete(anime)
        db.commit()
        print("✅ Tous les animes ont été supprimés de la DB.")
    except Exception as e:
        db.rollback()
        print("❌ Erreur lors de la suppression des animes :", e)
    finally:
        db.close()