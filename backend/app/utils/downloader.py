import asyncio
import libtorrent as lt
import os
from fastapi import WebSocket
from app.db.session import SessionLocal
from app.utils.extract import extract_episode_number
from app.utils.folder import get_download_folder
from app.crud.anime import create_episode


async def download_episode(torrent_magnet: str, season_id: int, websocket: WebSocket):
    db = SessionLocal()

    ses = lt.session()
    ses.listen_on(6881, 6891)

    download_path = get_download_folder(season_id)

    params = {
        "save_path": download_path,
        "storage_mode": lt.storage_mode_t.storage_mode_sparse,
    }

    handle = lt.add_magnet_uri(ses, torrent_magnet, params)

    # 1️⃣ Attendre les metadata
    while not handle.has_metadata():
        await asyncio.sleep(0.3)

    torrent_info = handle.get_torrent_info()
    filename = torrent_info.name()

    episode_number = extract_episode_number(filename)

    episode = create_episode(
        db=db,
        season_id=season_id,
        episode_number=episode_number,
        name=filename,
        path=os.path.join(download_path, filename),
    )

    try:
        # 2️⃣ Boucle de téléchargement réel
        while not handle.is_seed():
            status = handle.status()

            progress = round(status.progress * 100, 2)

            await websocket.send_json({
                "state": "downloading",
                "progress": progress,
                "episode_id": episode.id,
                "download_rate": status.download_rate,
                "peers": status.num_peers,
            })

            await asyncio.sleep(0.5)

        # 3️⃣ Terminé
        await websocket.send_json({
            "state": "seeding",
            "progress": 100,
            "episode_id": episode.id,
        })

    except Exception as e:
        await websocket.send_json({
            "state": "error",
            "message": str(e),
            "episode_id": episode.id,
        })

    finally:
        await websocket.close()
        await db.close()
