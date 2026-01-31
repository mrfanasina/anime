import sys
import argparse
import threading
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import traceback
from app.utils.get_anime_info import update_all_seasonal_anime_info
from app.db.init_db import init_db
from app.utils.mount import mount_hdd, mount_other_disks
from app import sync
from app.routers import (
    auth, home, anime, season, episode,
    stats, player, watch, sync as sync_routes, downloader as downloader_router, system
)


# ================== INIT DB ==================
print("🗄️ Initialisation de la base...")
init_db()



# ================== FASTAPI APP ==================
app = FastAPI(title="Anime Manager Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(system.router, prefix="/system", tags=["System"])
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


# ================== ARGS ==================
def get_args():
    parser = argparse.ArgumentParser(description="Anime Manager Backend")

    parser.add_argument("-m", "--mount", action="store_true",
                        help="Monter les disques après lancement du serveur.")

    parser.add_argument("-s", "--sync", action="store_true",
                        help="Synchroniser TOUT (classique + movies + ova).")

    parser.add_argument("-ss", "--seasonal-sync", action="store_true",
                        help="Synchroniser UNIQUEMENT les animés saisonniers.")
    parser.add_argument("-se", "--externe-sync", action="store_true",
                        help="Synchroniser les animés qui utilise les app externes, et genere un QRCode  pour syncrhoniser.")
    parser.add_argument("--get-info", action="store_true",
                        help="Récupérer infos anime après lancement du serveur.")
    parser.add_argument("-i", "--get-new-info", action="store_true",
                        help="Récupérer infos anime après lancement du serveur.")
    parser.add_argument("-is", "--get-seasonal-info", action="store_true",
                        help="Récupérer infos  anime saisonnier après lancement du serveur.")

    parser.add_argument("--no-server", "--headless",
                        action="store_true",
                        help="Ne pas lancer le serveur (mode headless).")  

    return parser.parse_args()


# ================== START SERVER IN THREAD ==================
def start_server():
    config = uvicorn.Config(app, host="0.0.0.0", port=8000, log_level="info")
    server = uvicorn.Server(config)
    server.run()


# ================== MAIN ==================
def main():
    args = get_args()

    # ===== 1 — Si mode headless : AUCUN SERVEUR =====
    if args.no_server:
        print("❗Mode headless : Le serveur NE sera PAS lancé.")

        if args.mount:
            print("💽 Montage...")
            mount_hdd()
            mount_other_disks()

        if args.sync:
            print("🔄 Sync...")
            sync.sync_all_disks()
        if args.seasonal_sync:
            print("🧊 Sync saisonnier (headless)...")
            sync.sync_seasonal_only()
            return 
        if args.get_info:
            print("🌐 Get-info...")
            from app.utils import get_anime_info as mal_info
            mal_info.update_all_anime_info()
        if args.get_new_info: 
            print("🌐 Get-new-info...")
            from app.utils import get_anime_info as mal_info
            mal_info.add_new_info()
        if args.get_seasonal_info:
            print("🌐 Get-seasonal-info...")
            from app.utils import get_anime_info as mal_info
            mal_info.update_all_seasonal_anime_info()
        print("🏁 Tâches terminées (mode headless).")
        return

    # ===== 2 — Lancer le serveur PAR DÉFAUT =====
    print("🌐 Lancement du serveur FastAPI...")

    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()

    # Donne 1 seconde au serveur pour démarrer proprement
    import time
    time.sleep(1)

    # ===== 3 — Actions à lancer APRÈS démarrage du serveur =====
    if args.seasonal_sync:
        print("🧊 Synchronisation SAISONNIÈRE...")
        try:
            sync.sync_seasonal_only()
            print("✅ Sync saisonnier terminée")
        except Exception as e:
            print("❌ Erreur sync saisonnier :", e)
            traceback.print_exc()

    if args.mount:
        print("💽 Montage des disques...")
        mount_hdd()
        mount_other_disks()
        print("✅ Montage OK")

    if args.sync:
        print("🔄 Synchronisation...")
        try:
            sync.sync_all_disks()
            print("✅ Sync terminée")
        except Exception as e:
            print("❌ Erreur sync :", e)
            traceback.print_exc()

    if args.get_info:
        print("🌐 Récupération des infos anime...")
        try:
            from app.utils import get_anime_info as mal_info
            mal_info.update_all_anime_info()
            print("✅ Infos récupérées")
        except Exception as e:
            print("❌ Erreur get-info :", e)
            traceback.print_exc()
    if args.get_new_info: 
        try:
            from app.utils import get_anime_info as mal_info
            mal_info.add_new_info()
            print("✅ Infos récupérées")
        except Exception as e:
            print("❌ Erreur get-info :", e)
            traceback.print_exc()
    if args.get_seasonal_info:
        try:
            from app.utils import get_anime_info as mal_info
            mal_info.update_all_seasonal_anime_info()
            print("✅ Infos saisonnières récupérées")
        except Exception as e:
            print("❌ Erreur get-seasonal-info :", e)
            traceback.print_exc()

    # Le serveur continue à tourner
    print("🚀 Serveur opérationnel sur http://0.0.0.0:8000")

    # Empêche la fin du programme
    server_thread.join()


if __name__ == "__main__":
    main()
