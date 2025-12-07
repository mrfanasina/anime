from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session

import subprocess
import asyncio
import json
import os
from datetime import datetime

from app.db.session import SessionLocal
from app.db.models.episode import Episode
from app.db.models.watch_episode import WatchEpisode
from app.db.models.watch_season import WatchSeason
from app.db.models.watch import Watch
from app.db.models.user import User

router = APIRouter()

# ---------------------
# DB Dependency
# ---------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================
# 🔥 PLAY EPISODE - MPV with Watch Handling (User optional)
# ============================================================
@router.get("/play/{episode_id}")
async def play_episode(episode_id: int, db: Session = Depends(get_db), userId: int = None):

    # -----------------------------------------------------------------
    # 1. Vérifier épisode
    # -----------------------------------------------------------------
    episode = db.query(Episode).filter(Episode.id == episode_id).first()
    if not episode:
        raise HTTPException(404, "Épisode introuvable")

    path = episode.path
    if not os.path.exists(path):
        raise HTTPException(404, "Fichier vidéo introuvable")

    # -----------------------------------------------------------------
    # 2. Récupérer user si présent
    # -----------------------------------------------------------------
    user = db.query(User).filter(User.id == userId).first() if userId else None

    watch_episode = None
    watch_episode_id = None
    watch_season_id = None

    # -----------------------------------------------------------------
    # 3. GESTION WATCHLIST (si user)
    # -----------------------------------------------------------------
    if user:
        # 3.1 Watch (user + anime)
        watch = db.query(Watch).filter_by(
            user_id=user.id,
            anime_id=episode.season.anime.id
        ).first()
        if not watch:
            watch = Watch(
                user_id=user.id,
                anime_id=episode.season.anime.id,
                completed=False
            )
            db.add(watch)
            db.commit()
            db.refresh(watch)

        # 3.2 WatchSeason (watch + season)
        watch_season = db.query(WatchSeason).filter_by(
            watch_id=watch.id,
            season_id=episode.season.id
        ).first()
        if not watch_season:
            watch_season = WatchSeason(
                watch_id=watch.id,
                season_id=episode.season.id,
                completed=False
            )
            db.add(watch_season)
            db.commit()
            db.refresh(watch_season)

        watch_season_id = watch_season.id

        # 3.3 WatchEpisode (watchSeason + episode)
        watch_episode = db.query(WatchEpisode).filter_by(
            season_id=watch_season_id,
            episode_id=episode.id
        ).first()
        if not watch_episode:
            watch_episode = WatchEpisode(
                season_id=watch_season_id,
                episode_id=episode.id,
                watched=False,
                finished=False,
                position=0
            )
            db.add(watch_episode)
            db.commit()
            db.refresh(watch_episode)

        watch_episode_id = watch_episode.id

    else:
        # Pas de user → lecture simple sans persistance
        watch_episode = db.query(WatchEpisode).filter_by(
            episode_id=episode_id
        ).order_by(WatchEpisode.id.desc()).first()
        if watch_episode:
            watch_episode_id = watch_episode.id

    start_time = watch_episode.position if watch_episode else 0

    # -----------------------------------------------------------------
    # 4. Lancer MPV
    # -----------------------------------------------------------------
    socket_path = "/tmp/mpv_socket"
    if os.path.exists(socket_path):
        os.remove(socket_path)

    subprocess.Popen([
        "mpv",
        path,
        "--fs",
        f"--input-ipc-server={socket_path}",
        f"--start={start_time}",
        "--pause=no"
    ])

    # -----------------------------------------------------------------
    # 5. SSE STREAM : progression + end-file
    # -----------------------------------------------------------------
    async def event_stream():

        while not os.path.exists(socket_path):
            await asyncio.sleep(0.1)

        reader, writer = await asyncio.open_unix_connection(socket_path)

        # Observe properties
        writer.write(json.dumps({"command": ["observe_property", 1, "time-pos"]}).encode() + b"\n")
        writer.write(json.dumps({"command": ["observe_property", 2, "duration"]}).encode() + b"\n")
        await writer.drain()

        duration = 0
        last_yield = asyncio.get_event_loop().time()
        last_save = last_yield

        while True:
            raw = await reader.readline()
            if not raw:
                await asyncio.sleep(0.01)
                continue

            try:
                data = json.loads(raw.decode())
            except:
                continue

            event_type = data.get("event")

            # ----------------------------------------------------------
            # 🔁 Progression normale
            # ----------------------------------------------------------
            if event_type == "property-change":
                name = data.get("name")
                value = data.get("data", 0)

                # ---------------- time-pos ------------------
                if name == "time-pos":
                    pos = value
                    now = asyncio.get_event_loop().time()

                if event_type == "property-change" and name == "time-pos":
                    pos = value
                    # Sauvegarder périodiquement
                    now = asyncio.get_event_loop().time()
                    if user and watch_episode_id and now - last_save > 1: 
                        db2 = SessionLocal()
                        wp = db2.query(WatchEpisode).filter_by(id=watch_episode_id).first()
                        if wp:
                            wp.position = pos
                            db2.commit()
                        db2.close()
                        last_save = now
                    yield f"data: {json.dumps({'position': pos, 'duration': duration})}\n\n"
                    last_yield = now
                # ---------------- duration ------------------
                elif name == "duration":
                    duration = value



            # ----------------------------------------------------------
            # 🔚 FIN DE L'ÉPISODE
            # ----------------------------------------------------------
            elif event_type == "end-file":
                print("Episode ended")
                print(f"Final position: {pos}, duration: {duration}")
                if user and watch_episode_id:
                    db2 = SessionLocal()
                    wp = db2.query(WatchEpisode).filter_by(id=watch_episode_id).first()
                    if wp:
                        wp.duration = duration
                        wp.finished = True
                        wp.watched = True
                        wp.watched_at = datetime.utcnow()
                        db2.commit()
                    db2.close()

                yield f"data: {json.dumps({'ended': True})}\n\n"
                break

            # Heartbeat: keep SSE alive
            now = asyncio.get_event_loop().time()
            if now - last_yield > 2:
                yield "data: {}\n\n"
                last_yield = now

            await asyncio.sleep(0.01)

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ============================================================
# 🔥 STREAM : Lecture vidéo directe (frontend web)
# ============================================================
@router.get("/stream/{episode_id}")
def stream_episode(episode_id: int, db: Session = Depends(get_db)):
    episode = db.query(Episode).filter(Episode.id == episode_id).first()
    if not episode:
        raise HTTPException(404, "Épisode introuvable")
    if not os.path.exists(episode.path):
        raise HTTPException(404, "Vidéo introuvable")

    return FileResponse(
        episode.path,
        media_type="video/mp4"
    )


# ============================================================
# 🔥 DOWNLOAD : Téléchargement direct
# ============================================================
@router.get("/download/{episode_id}")
def download_episode(episode_id: int, db: Session = Depends(get_db)):
    episode = db.query(Episode).filter(Episode.id == episode_id).first()
    if not episode:
        raise HTTPException(404, "Épisode introuvable")

    path = episode.path
    filename = os.path.basename(path)

    return FileResponse(
        path,
        media_type="application/octet-stream",
        filename=filename
    )
