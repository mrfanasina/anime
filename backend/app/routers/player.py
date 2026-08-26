"""
Routeur Player — Endpoints pour la lecture vidéo via MPV.

Fournit la lecture d'épisodes individuels et de playlists via le lecteur MPV,
avec suivi de progression en temps réel via SSE (Server-Sent Events).
Gère également le streaming et le téléchargement direct de fichiers vidéo.
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
import subprocess
import asyncio
import json
import os
from datetime import datetime

from app.db.session import SessionLocal, get_db
from app.db.models.episode import Episode
from app.db.models.watch_episode import WatchEpisode
from app.db.models.watch_season import WatchSeason
from app.db.models.watch import Watch
from app.db.models.user import User

router = APIRouter()

# ==================== Constantes ====================
VIEWED_THRESHOLD = 120  # Secondes : seuil pour considérer un épisode comme "vu"
MPV_SOCKET = "/tmp/player_mpv_socket"

# État global de la playlist en cours (un seul à la fois)
CURRENT_PLAYLIST = {
    "episodes": [],
    "start_times": {},
    "watch_episode_map": {},
    "user_id": None,
}


class PlaylistRequest(BaseModel):
    """Schéma de requête pour le lancement d'une playlist."""
    episode_ids: list[int]


# ==================== Fonctions utilitaires ====================
async def _wait_for_socket(socket_path: str, timeout: float = 10.0) -> bool:
    """Attend que le socket MPV soit disponible (max timeout secondes)."""
    elapsed = 0.0
    while not os.path.exists(socket_path) and elapsed < timeout:
        await asyncio.sleep(0.1)
        elapsed += 0.1
    return os.path.exists(socket_path)


def _ensure_watch_episode(db: Session, user: User, episode: Episode):
    """
    S'assure que la structure Watch → WatchSeason → WatchEpisode existe
    pour un utilisateur et un épisode donnés.
    
    Retourne (watch_episode_id, watch_season_id).
    """
    # Watch (user + anime)
    watch = db.query(Watch).filter_by(
        user_id=user.id,
        anime_id=episode.season.anime.id
    ).first()
    if not watch:
        watch = Watch(user_id=user.id, anime_id=episode.season.anime.id, completed=False)
        db.add(watch)
        db.commit()
        db.refresh(watch)

    # WatchSeason (watch + season)
    watch_season = db.query(WatchSeason).filter_by(
        watch_id=watch.id,
        season_id=episode.season.id
    ).first()
    if not watch_season:
        watch_season = WatchSeason(watch_id=watch.id, season_id=episode.season.id, completed=False)
        db.add(watch_season)
        db.commit()
        db.refresh(watch_season)

    # WatchEpisode (watchSeason + episode)
    watch_episode = db.query(WatchEpisode).filter_by(
        season_id=watch_season.id,
        episode_id=episode.id
    ).first()
    if not watch_episode:
        watch_episode = WatchEpisode(
            season_id=watch_season.id,
            episode_id=episode.id,
            watched=False,
            finished=False,
            position=0
        )
        db.add(watch_episode)
        db.commit()
        db.refresh(watch_episode)

    return watch_episode.id, watch_season.id


def _start_mpv(path: str, start_time: int = 0, extra_args: list = None):
    """
    Lance MPV en mode plein écran avec un socket IPC.
    
    Important : on injecte DISPLAY et WAYLAND_DISPLAY dans l'environnement
    de MPV car le serveur FastAPI tourne en arrière-plan et n'a pas accès
    à l'environnement graphique de l'utilisateur.
    """
    socket_path = "/tmp/mpv_socket"
    if os.path.exists(socket_path):
        os.remove(socket_path)

    cmd = [
        "mpv",
        path,
        "--fs",
        f"--input-ipc-server={socket_path}",
        f"--start={start_time}",
        "--pause=no"
    ]
    if extra_args:
        cmd.extend(extra_args)

    # Injecter les variables d'environnement graphiques
    env = os.environ.copy()
    if "DISPLAY" not in env:
        env["DISPLAY"] = ":0"
    if "WAYLAND_DISPLAY" not in env:
        env["WAYLAND_DISPLAY"] = "wayland-0"

    subprocess.Popen(cmd, env=env, start_new_session=True)
    return socket_path


# ==================== Lecture d'un épisode ====================
@router.get("/play/{episode_id}")
async def play_episode(episode_id: int, db: Session = Depends(get_db), userId: int = None):
    """
    Lance la lecture d'un épisode via MPV avec suivi de progression SSE.
    
    Args:
        episode_id: ID de l'épisode à lire.
        userId: ID de l'utilisateur (optionnel, pour le suivi watchlist).
    
    Returns:
        StreamingResponse SSE avec les événements : position, duration, ended.
    """
    SEEN_THRESHOLD = 92  # Secondes

    # 1. Vérifier l'épisode
    episode = db.query(Episode).filter(Episode.id == episode_id).first()
    if not episode:
        raise HTTPException(404, "Épisode introuvable")

    path = episode.path
    if not os.path.exists(path):
        raise HTTPException(404, "Fichier vidéo introuvable")

    # 2. Récupérer l'utilisateur si fourni
    user = db.query(User).filter(User.id == userId).first() if userId else None
    watch_episode_id = None

    # 3. Gestion de la watchlist
    if user:
        watch_episode_id, _ = _ensure_watch_episode(db, user, episode)
    else:
        # Lecture sans persistance : récupérer la dernière position
        watch_episode = db.query(WatchEpisode).filter_by(
            episode_id=episode_id
        ).order_by(WatchEpisode.id.desc()).first()
        if watch_episode:
            watch_episode_id = watch_episode.id

    # 4. Calculer le temps de départ
    start_time = 0
    if watch_episode_id:
        we = db.query(WatchEpisode).filter_by(id=watch_episode_id).first()
        if we and we.position and abs(we.position - (we.duration or 0)) > SEEN_THRESHOLD:
            start_time = we.position

    # 5. Lancer MPV
    socket_path = _start_mpv(path, start_time)

    # 6. SSE Stream : progression + end-file
    async def event_stream():
        if not await _wait_for_socket(socket_path):
            return

        reader, writer = await asyncio.open_unix_connection(socket_path)

        # Observer les propriétés
        writer.write(json.dumps({"command": ["observe_property", 1, "time-pos"]}).encode() + b"\n")
        writer.write(json.dumps({"command": ["observe_property", 2, "duration"]}).encode() + b"\n")
        await writer.drain()

        duration = 0
        pos = 0
        last_yield = asyncio.get_event_loop().time()
        last_save = last_yield

        while True:
            raw = await reader.readline()
            if not raw:
                await asyncio.sleep(0.01)
                continue

            try:
                data = json.loads(raw.decode())
            except Exception:
                continue

            event_type = data.get("event")

            # Progression normale
            if event_type == "property-change":
                name = data.get("name")
                value = data.get("data", 0)

                if name == "time-pos":
                    pos = value
                    now = asyncio.get_event_loop().time()

                    # Sauvegarde périodique (toutes les secondes)
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

                elif name == "duration":
                    duration = value

            # Fin de l'épisode
            elif event_type == "end-file":
                if user and watch_episode_id:
                    db2 = SessionLocal()
                    wp = db2.query(WatchEpisode).filter_by(id=watch_episode_id).first()
                    if wp:
                        wp.duration = duration
                        if not wp.finished:
                            wp.finished = abs(pos - duration) < SEEN_THRESHOLD
                        wp.watched = True
                        wp.watched_at = datetime.utcnow()
                        db2.commit()
                    db2.close()

                yield f"data: {json.dumps({'ended': True})}\n\n"
                break

            # Heartbeat SSE
            now = asyncio.get_event_loop().time()
            if now - last_yield > 2:
                yield "data: {}\n\n"
                last_yield = now

            await asyncio.sleep(0.01)

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ==================== Lecture de playlist ====================
@router.post("/play-playlist")
async def play_playlist(
    payload: PlaylistRequest,
    db: Session = Depends(get_db),
    userId: int | None = None
):
    """
    Lance la lecture d'une playlist d'épisodes via MPV.
    
    Les épisodes sont lus en séquence. La progression est sauvegardée
    périodiquement pour chaque épisode.
    """
    # 1. Charger les épisodes
    episodes = (
        db.query(Episode)
        .filter(Episode.id.in_(payload.episode_ids))
        .order_by(Episode.id)
        .all()
    )
    if len(episodes) != len(payload.episode_ids):
        found_ids = {ep.id for ep in episodes}
        missing = set(payload.episode_ids) - found_ids
        raise HTTPException(404, f"Episodes not found: {sorted(missing)}")

    for ep in episodes:
        if not os.path.exists(ep.path):
            raise HTTPException(404, f"File not found: {ep.path}")

    # 2. Setup utilisateur & watch
    user = db.query(User).filter(User.id == userId).first() if userId else None
    watch_episode_map = {}
    start_times = {}

    if user:
        anime_id = episodes[0].season.anime.id
        watch = db.query(Watch).filter_by(user_id=user.id, anime_id=anime_id).first()
        if not watch:
            watch = Watch(user_id=user.id, anime_id=anime_id, completed=False)
            db.add(watch)
            db.commit()
            db.refresh(watch)

        for ep in episodes:
            watch_season = db.query(WatchSeason).filter_by(
                watch_id=watch.id, season_id=ep.season.id
            ).first()
            if not watch_season:
                watch_season = WatchSeason(watch_id=watch.id, season_id=ep.season.id, completed=False)
                db.add(watch_season)
                db.commit()
                db.refresh(watch_season)

            watch_ep = db.query(WatchEpisode).filter_by(
                season_id=watch_season.id, episode_id=ep.id
            ).first()
            if not watch_ep:
                watch_ep = WatchEpisode(
                    season_id=watch_season.id, episode_id=ep.id,
                    watched=False, finished=False, position=0
                )
                db.add(watch_ep)
                db.commit()
                db.refresh(watch_ep)

            watch_episode_map[ep.id] = watch_ep.id
            if watch_ep.position and abs(watch_ep.position - (watch_ep.duration or 0)) > VIEWED_THRESHOLD:
                start_times[ep.id] = watch_ep.position
            else:
                start_times[ep.id] = 0

    # 3. Lancer MPV avec la playlist
    if os.path.exists(MPV_SOCKET):
        os.remove(MPV_SOCKET)

    cmd = ["mpv", "--fs", "--pause=no", f"--input-ipc-server={MPV_SOCKET}"] + [ep.path for ep in episodes]

    # Injecter les variables d'environnement graphiques
    env = os.environ.copy()
    if "DISPLAY" not in env:
        env["DISPLAY"] = ":0"
    if "WAYLAND_DISPLAY" not in env:
        env["WAYLAND_DISPLAY"] = "wayland-0"

    subprocess.Popen(cmd, env=env, start_new_session=True)

    # 4. Stocker le contexte pour le SSE
    CURRENT_PLAYLIST.update({
        "episodes": episodes,
        "start_times": start_times,
        "watch_episode_map": watch_episode_map,
        "user_id": userId,
    })

    return {"status": "started", "episodes": len(episodes)}


@router.get("/play-playlist/stream")
async def play_playlist_stream():
    """
    SSE Stream pour le suivi de progression d'une playlist MPV.
    
    Émet les événements : episode-change, progress, episode-ended, playlist-ended.
    """
    async def event_stream():
        if not await _wait_for_socket(MPV_SOCKET):
            return

        reader, writer = await asyncio.open_unix_connection(MPV_SOCKET)

        # Observer les propriétés MPV
        props = {"time-pos": 1, "duration": 2, "playlist-pos": 3}
        for prop, pid in props.items():
            writer.write(json.dumps({"command": ["observe_property", pid, prop]}).encode() + b"\n")
        await writer.drain()

        episodes = CURRENT_PLAYLIST["episodes"]
        start_times = CURRENT_PLAYLIST["start_times"]
        watch_episode_map = CURRENT_PLAYLIST["watch_episode_map"]
        user_id = CURRENT_PLAYLIST["user_id"]

        current_index = 0
        current_episode = episodes[0]
        duration = 0
        position = 0
        last_save = asyncio.get_event_loop().time()
        start_sent = False

        while True:
            raw = await reader.readline()
            if not raw:
                await asyncio.sleep(0.01)
                continue

            try:
                data = json.loads(raw.decode())
            except Exception:
                continue

            event = data.get("event")
            name = data.get("name")
            value = data.get("data")

            # Début : chercher le start time
            if not start_sent and start_times.get(current_episode.id, 0) > 0:
                writer.write(json.dumps({
                    "command": ["set_property", "time-pos", start_times[current_episode.id]]
                }).encode() + b"\n")
                await writer.drain()
                start_sent = True

            can_seek = False

            # Changement d'épisode
            if event == "property-change" and name == "playlist-pos":
                if value is not None and value < len(episodes):
                    current_index = value
                    current_episode = episodes[value]
                    start_sent = False
                    can_seek = False
                    duration = 0
                    yield f"data: {json.dumps({'type': 'episode-change', 'episodeId': current_episode.id, 'index': current_index})}\n\n"

            elif event == "property-change" and name == "duration":
                duration = value or 0
                if duration > 0:
                    can_seek = True

            # Seek au démarrage si nécessaire
            if not start_sent and can_seek and start_times.get(current_episode.id, 0) > 0:
                writer.write(json.dumps({
                    "command": ["set_property", "time-pos", start_times[current_episode.id]]
                }).encode() + b"\n")
                await writer.drain()
                start_sent = True

            # Progression
            elif event == "property-change" and name == "time-pos":
                if value is not None:
                    position = value
                    now = asyncio.get_event_loop().time()

                    # Sauvegarde périodique
                    if user_id and current_episode.id in watch_episode_map and now - last_save > 1:
                        db = SessionLocal()
                        wp = db.query(WatchEpisode).filter_by(
                            id=watch_episode_map[current_episode.id]
                        ).first()
                        if wp:
                            wp.position = position
                            if not wp.finished:
                                wp.finished = abs(wp.duration - wp.position) <= VIEWED_THRESHOLD
                            db.commit()
                        db.close()
                        last_save = now

                    yield f"data: {json.dumps({'type': 'progress', 'episodeId': current_episode.id, 'position': position, 'duration': duration})}\n\n"

            # Fin d'épisode
            elif event == "end-file":
                if user_id and current_episode.id in watch_episode_map:
                    db = SessionLocal()
                    wp = db.query(WatchEpisode).filter_by(
                        id=watch_episode_map[current_episode.id]
                    ).first()
                    if wp:
                        wp.duration = duration
                        wp.finished = abs(wp.duration - wp.position) <= VIEWED_THRESHOLD
                        wp.watched = True
                        wp.watched_at = datetime.utcnow()
                        db.commit()
                    db.close()

                yield f"data: {json.dumps({'type': 'episode-ended', 'episodeId': current_episode.id})}\n\n"

            # Fermeture de MPV (fin de playlist)
            elif event == "shutdown":
                yield f"data: {json.dumps({'type': 'playlist-ended'})}\n\n"
                break

            await asyncio.sleep(0.01)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ==================== Arrêt de MPV ====================
@router.post("/stop")
def stop_player():
    """
    Arrête le lecteur MPV en envoyant la commande 'quit' via le socket IPC.
    Fonctionne aussi bien pour un épisode seul que pour une playlist.
    """
    import socket as sock

    for socket_path in ["/tmp/mpv_socket", MPV_SOCKET]:
        if not os.path.exists(socket_path):
            continue
        try:
            s = sock.socket(sock.AF_UNIX, sock.SOCK_STREAM)
            s.connect(socket_path)
            s.sendall(json.dumps({"command": ["quit"]}).encode() + b"\n")
            s.close()
            return {"message": "MPV arrêté"}
        except Exception:
            pass

    # Fallback : tuer le processus MPV directement
    import subprocess
    try:
        subprocess.run(["pkill", "-f", "mpv"], capture_output=True)
        return {"message": "MPV arrêté (pkill)"}
    except Exception:
        raise HTTPException(status_code=500, detail="Impossible d'arrêter MPV")


# ==================== Mapping extensions → MIME types ====================
MIME_TYPES = {
    ".mp4": "video/mp4",
    ".mkv": "video/x-matroska",
    ".webm": "video/webm",
    ".avi": "video/x-msvideo",
    ".mov": "video/quicktime",
    ".ts": "video/mp2t",
    ".flv": "video/x-flv",
    ".wmv": "video/x-ms-wmv",
    ".m4v": "video/mp4",
    ".3gp": "video/3gpp",
}


# ==================== Stream vidéo direct ====================
@router.get("/stream/{episode_id}")
def stream_episode(episode_id: int, db: Session = Depends(get_db)):
    """
    Retourne le fichier vidéo pour streaming direct dans le navigateur.
    
    Le type MIME est détecté automatiquement selon l'extension du fichier.
    Attention : les navigateurs ne supportent pas tous les codecs.
    MKV (Matroska) est courant pour les animes mais n'est pas supporté
    par tous les navigateurs — utilisera le fallback audio si nécessaire.
    """
    episode = db.query(Episode).filter(Episode.id == episode_id).first()
    if not episode:
        raise HTTPException(404, "Épisode introuvable")
    if not os.path.exists(episode.path):
        raise HTTPException(404, "Vidéo introuvable")

    ext = os.path.splitext(episode.path)[1].lower()
    media_type = MIME_TYPES.get(ext, "video/mp4")

    return FileResponse(episode.path, media_type=media_type)


# ==================== Téléchargement direct ====================
@router.get("/download/{episode_id}")
def download_episode_file(episode_id: int, db: Session = Depends(get_db)):
    """
    Télécharge le fichier vidéo d'un épisode.
    
    Retourne le fichier avec le Content-Disposition: attachment.
    """
    episode = db.query(Episode).filter(Episode.id == episode_id).first()
    if not episode:
        raise HTTPException(404, "Épisode introuvable")

    path = episode.path
    filename = os.path.basename(path)

    return FileResponse(path, media_type="application/octet-stream", filename=filename)
