from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db

router = APIRouter()

@router.get("/random")
def get_suggested_animes(db: Session = Depends(get_db)):
    """
    Récupère une liste d'animés suggérés aléatoirement.
    """
    query = text("""
        SELECT 
            id, name, image_url
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
    Page d'accueil dynamique pour un utilisateur :
    - continueWatching : animés partiellement vus
    - newEpisodes : animés avec nouveaux épisodes
    - topRated : animés les mieux notés
    - notWatched : animés non encore commencés
    - finished : animés terminés
    """

    if not user_id:
        raise HTTPException(status_code=400, detail="user_id est requis")

    # 🔁 Animés en cours (progress < 100%), triés par dernier watched_at
    continue_watching_query = text("""
        SELECT 
            a.id AS id,
            a.name ,
            a.image_url AS image_url,
            ROUND(SUM(CASE WHEN we.watched THEN 1 ELSE 0 END) / NULLIF(COUNT(we.id),0) * 100, 1) AS progress,
            MAX(we.watched_at) AS last_watched
        FROM animes a
        JOIN watch_list w ON w.anime_id = a.id AND w.user_id = :user_id
        JOIN watch_seasons ws ON ws.watch_id = w.id
        JOIN watch_episodes we ON we.season_id = ws.id
        GROUP BY a.id
        HAVING (SUM(CASE WHEN we.watched THEN 1 ELSE 0 END) / NULLIF(COUNT(we.id),0) * 100) < 100
        ORDER BY last_watched DESC
        LIMIT 10
    """)

    # 🆕 Nouveaux épisodes disponibles (ex: status='new')
    new_episodes_query = text("""
        SELECT 
            a.id AS id,
            a.name ,
            a.image_url AS image_url
        FROM animes a
        WHERE a.status = 'new'
        ORDER BY a.created_at DESC
        LIMIT 10
    """)

    # ❤️ Top notés
    top_rated_query = text("""
        SELECT 
            a.id AS id,
            a.name ,
            a.image_url AS image_url,
            a.note AS rating
        FROM animes a
        ORDER BY a.note DESC
        LIMIT 10
    """)

    # 💤 Non encore commencés
    not_watched_query = text("""
        SELECT 
            a.id AS id,
            a.name ,
            a.image_url AS image_url
        FROM animes a
        LEFT JOIN watch_list w ON a.id = w.anime_id AND w.user_id = :user_id
        WHERE w.id IS NULL
        LIMIT 10
    """)

    # 🔚 Terminés (progress = 100%)
    finished_query = text("""
        SELECT 
            a.id AS id,
            a.name ,
            a.image_url AS image_url
        FROM animes a
        JOIN watch_list w ON w.anime_id = a.id AND w.user_id = :user_id
        JOIN watch_seasons ws ON ws.watch_id = w.id
        JOIN watch_episodes we ON we.season_id = ws.id
        GROUP BY a.id
        HAVING (ROUND(SUM(CASE WHEN we.watched THEN 1 ELSE 0 END) / NULLIF(COUNT(we.id),0) * 100, 1)) = 100
        ORDER BY MAX(we.watched_at) DESC
        LIMIT 10
    """)

    # ⚙️ Exécution des requêtes
    continue_watching = [dict(row._mapping) for row in db.execute(continue_watching_query, {"user_id": user_id})]
    new_episodes = [dict(row._mapping) for row in db.execute(new_episodes_query)]
    top_rated = [dict(row._mapping) for row in db.execute(top_rated_query)]
    not_watched = [dict(row._mapping) for row in db.execute(not_watched_query, {"user_id": user_id})]
    finished = [dict(row._mapping) for row in db.execute(finished_query, {"user_id": user_id})]

    return {
        "continueWatching": continue_watching,
        "newEpisodes": new_episodes,
        "topRated": top_rated,
        "notWatched": not_watched,
        "finished": finished,
    }
