"""
Routeur Home — Endpoints pour la page d'accueil dynamique.

Fournit les suggestions aléatoires, les animés en cours de visionnage,
les nouveaux épisodes, les mieux notés, et les terminés pour un utilisateur.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.session import get_db
from app.crud.anime import get_recently_added_episodes, get_recently_watched

router = APIRouter()


@router.get("/random")
def get_suggested_animes(db: Session = Depends(get_db)):
    """Retourne 10 animés suggérés aléatoirement (pour la page d'accueil sans utilisateur)."""
    query = text("""
        SELECT id, name, image_url
        FROM animes
        ORDER BY RAND()
        LIMIT 10
    """)
    result = db.execute(query)
    suggested_animes = [dict(row._mapping) for row in result]
    return {"suggestedAnimes": suggested_animes}


@router.get("/{user_id}")
def get_home_data(user_id: int, db: Session = Depends(get_db)):
    """
    Page d'accueil dynamique pour un utilisateur connecté.
    
    Retourne :
    - continueWatching : animés partiellement vus (par dernier visionnage)
    - recently_added_animes : animés ajoutés il y a moins de 7 jours
    - newEpisodes : animés marqués comme nouveaux
    - topRated : animés les mieux notés
    - notWatched : animés non encore commencés
    - finished : animés terminés (100% de progression)
    """
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id est requis")

    # Animés en cours (progress < 100%), triés par dernier watched_at
    continue_watching = get_recently_watched(db, user_id)

    # Nouveaux épisodes disponibles
    new_episodes_query = text("""
        SELECT a.id AS id, a.name, a.image_url AS image_url
        FROM animes a
        WHERE a.status = 'new'
        ORDER BY a.created_at DESC
        LIMIT 10
    """)

    # Top notés
    top_rated_query = text("""
        SELECT a.id AS id, a.name, a.image_url AS image_url, a.note AS rating
        FROM animes a
        ORDER BY a.note DESC
        LIMIT 10
    """)

    # Non encore commencés
    not_watched_query = text("""
        SELECT a.id AS id, a.name, a.image_url AS image_url
        FROM animes a
        LEFT JOIN watch_list w ON a.id = w.anime_id AND w.user_id = :user_id
        WHERE w.id IS NULL
        LIMIT 10
    """)

    # Terminés (progress = 100%)
    finished_query = text("""
        SELECT a.id AS id, a.name, a.image_url AS image_url
        FROM animes a
        JOIN watch_list w ON w.anime_id = a.id AND w.user_id = :user_id
        JOIN watch_seasons ws ON ws.watch_id = w.id
        JOIN watch_episodes we ON we.season_id = ws.id
        GROUP BY a.id
        HAVING (ROUND(SUM(CASE WHEN we.watched THEN 1 ELSE 0 END) / NULLIF(COUNT(we.id), 0) * 100, 1)) = 100
        ORDER BY MAX(we.watched_at) DESC
        LIMIT 10
    """)

    # Animés ajoutés récemment (7 derniers jours)
    recently_added_animes_query = text("""
        SELECT a.id AS id, a.name AS name, a.image_url AS image_url, a.created_at AS created_at
        FROM animes a
        WHERE a.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
        ORDER BY a.created_at DESC
        LIMIT 10
    """)

    recently_added_episodes = get_recently_added_episodes(db)

    # Exécution des requêtes
    new_episodes = [dict(row._mapping) for row in db.execute(new_episodes_query)]
    top_rated = [dict(row._mapping) for row in db.execute(top_rated_query)]
    not_watched = [dict(row._mapping) for row in db.execute(not_watched_query, {"user_id": user_id})]
    finished = [dict(row._mapping) for row in db.execute(finished_query, {"user_id": user_id})]
    recently_added_animes = [dict(row._mapping) for row in db.execute(recently_added_animes_query)]

    return {
        "continueWatching": continue_watching + recently_added_episodes,
        "recently_added_animes": recently_added_animes,
        "newEpisodes": new_episodes,
        "topRated": top_rated,
        "notWatched": not_watched,
        "finished": finished,
    }


@router.get("/last-viewed/{user_id}")
def get_last_viewed_anime(user_id: int, db: Session = Depends(get_db)):
    """
    Récupère le dernier animé visionné par un utilisateur.
    
    Utilise la date de dernier visionnage (watch_episodes.watched_at)
    pour identifier l'anime le plus récent.
    """
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id est requis")

    query = text("""
        SELECT a.id AS id, a.name AS name, a.image_url AS image_url, we.watched_at AS last_watched
        FROM animes a
        JOIN watch_list w ON w.anime_id = a.id AND w.user_id = :user_id
        JOIN watch_seasons ws ON ws.watch_id = w.id
        JOIN watch_episodes we ON we.season_id = ws.id
        WHERE we.watched = TRUE
        ORDER BY we.watched_at DESC
        LIMIT 1
    """)

    result = db.execute(query, {"user_id": user_id}).first()
    if result:
        return {"lastViewedAnime": dict(result._mapping)}
    else:
        return {"lastViewedAnime": None}
