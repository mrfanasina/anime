import asyncio
import libtorrent as lt
import os
import logging
from logging.handlers import RotatingFileHandler
from fastapi import WebSocket
from app.utils.folder import get_download_folder

# === LOG SETUP ===
log_file = "torrent_downloads.log"
logger = logging.getLogger("torrent")
logger.setLevel(logging.INFO)

handler = RotatingFileHandler(log_file, maxBytes=5*1024*1024, backupCount=3)
formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] %(message)s")
handler.setFormatter(formatter)
logger.addHandler(handler)

async def download_episode(torrent_magnet: str, season_id: int, websocket: WebSocket):
    logger.info(f"Start download | season={season_id} | magnet={torrent_magnet}")

    try:
        folder_download = get_download_folder(season_id)
        if not folder_download:
            raise ValueError(f"Saison {season_id} introuvable — dossier introuvable")

        os.makedirs(folder_download, exist_ok=True)

        ses = lt.session()
        ses.listen_on(6881, 6891)

        if torrent_magnet.startswith("magnet:"):
            params = {"save_path": folder_download, "storage_mode": lt.storage_mode_t(2)}
            handle = lt.add_magnet_uri(ses, torrent_magnet, params)
        else:
            ti = lt.torrent_info(torrent_magnet)
            handle = ses.add_torrent({"ti": ti, "save_path": folder_download})

        await websocket.send_json({"message": "Downloading...", "folder": folder_download})

        while not handle.is_seed():
            s = handle.status()

            progress = round(s.progress * 100, 2)
            down_rate = round(s.download_rate / 1000, 1)
            up_rate = round(s.upload_rate / 1000, 1)
            peers = s.num_peers
            state = str(s.state).split('.')[-1]

            # Console + log
            msg = f"{progress}% | ↓ {down_rate} kB/s | ↑ {up_rate} kB/s | peers={peers} | state={state}"
            print(msg)
            logger.info(msg)

            await websocket.send_json({
                "progress": progress,
                "state": state,
                "download_kBps": down_rate,
                "upload_kBps": up_rate,
                "peers": peers
            })

            await asyncio.sleep(1)

        # End
        logger.info(f"Download finished | season={season_id}")
        await websocket.send_json({
            "progress": 100,
            "state": "seeding",
            "message": "Téléchargement terminé ✅"
        })

    except Exception as e:
        logger.error(f"Error during download | season={season_id} | {e}")
        await websocket.send_json({
            "state": "error",
            "message": f"Erreur: {str(e)}"
        })

    finally:
        await websocket.close()