import sys
import argparse
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import traceback

# Imports internes
from app.db.init_db import init_db
from app.utils.mount import mount_hdd, mount_other_disks
from app import sync
from app.routers import (
    auth, home, anime, season, episode,
    stats, player, watch, sync as sync_routes, downloader as downloader_router
)

# === Initialisation de la base ===
print("🗄️ Initialisation de la base de données...")
init_db()

# === Application FastAPI ===
app = FastAPI(title="Anime Manager Backend")

# === CORS ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Inclusion des routes ===
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(anime.router, prefix="/anime", tags=["Anime"])
app.include_router(season.router, prefix="/season", tags=["Season"])
app.include_router(episode.router, prefix="/episode", tags=["Episode"])
app.include_router(stats.router, prefix="/stats", tags=["Stats"])
app.include_router(player.router, prefix="/player", tags=["Player"])
app.include_router(sync_routes.router, prefix="/sync", tags=["Sync"])
app.include_router(watch.router, prefix="/watch", tags=["Watch"])
app.include_router(home.router, prefix="/home", tags=["Home"])
app.include_router(downloader_router.router, prefix="/download", tags=["Downloader"])

def get_args():
    """Analyse les arguments de ligne de commande."""
    parser = argparse.ArgumentParser(
        description="Anime Manager Backend - Gestion locale et sync MyAnimeList."
    )
    parser.add_argument(
        "-m", "--mount", action="store_true",
        help="Monter les disques externes avant le démarrage."
    )
    parser.add_argument(
        "-s", "--sync", action="store_true",
        help="Exécuter la synchronisation initiale des disques."
    )
    parser.add_argument(
        "--get-info", action="store_true",
        help="Récupérer les informations d'anime depuis MyAnimeList."
    )
    return parser.parse_args()


def main():
    args = get_args()
    print("🚀 Démarrage du backend Anime Manager...")

    # === Montage du disque (optionnel) ===
    if args.mount:
        try:
            print("💽 Montage des disques...")
            mount_hdd()
            mount_other_disks()
            print("✅ Disques montés avec succès.")
        except Exception as e:
            print("⚠️ Erreur lors du montage :", e)
            traceback.print_exc()
    else:
        print("⏭ Montage des disques ignoré (utiliser -m pour activer).")

    # === Synchronisation (optionnelle) ===
    if args.sync:
        try:
            print("🔄 Synchronisation initiale en cours...")
            sync.sync_all_disks()
            print("✅ Synchronisation terminée !")
        except Exception as e:
            print("❌ Erreur lors de la synchronisation :", e)
            traceback.print_exc()
    else:
        print("⏭ Synchronisation désactivée (utiliser -s pour activer).")

    # === Récupération d’infos MyAnimeList (optionnelle) ===
    if args.get_info:
        try:
            from app.utils import get_anime_info as mal_info
            print("🌐 Récupération des informations depuis MyAnimeList...")
            mal_info.update_all_anime_info()
            print("✅ Récupération des informations terminée !")
        except Exception as e:
            print("❌ Erreur lors de la récupération des infos :", e)
            traceback.print_exc()
    else:
        print("⏭ Récupération MyAnimeList désactivée (--get-info pour activer).")

    # === Lancement du serveur FastAPI ===
    print("🌐 Serveur disponible sur http://0.0.0.0:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)


if __name__ == "__main__":
    main()
