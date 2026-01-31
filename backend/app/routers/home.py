from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from app.crud.anime import get_recently_added_episodes, get_recently_watched

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
    continue_watching_query_backup = text("""
        SELECT 
            a.id AS id,
            a.name AS name,
            a.image_url AS image_url,
            we_last.last_watched
        FROM animes a
        JOIN watch_list w ON w.anime_id = a.id AND w.user_id = :user_id
        JOIN (
            SELECT w2.anime_id, MAX(we.watched_at) AS last_watched
            FROM watch_list w2
            JOIN watch_seasons ws ON ws.watch_id = w2.id
            JOIN watch_episodes we ON we.season_id = ws.id
            WHERE we.watched = TRUE
            GROUP BY w2.anime_id
        ) AS we_last ON we_last.anime_id = a.id
        ORDER BY we_last.last_watched DESC
        LIMIT 10;

    """)

    continue_watching_query = get_recently_watched(db, user_id)
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
    # Episode ajouté recement (date d'ajout de l'episode)

    # Anime ajouté recement
    recently_added_animes_query = text("""
        SELECT 
            a.id AS id,
            a.name AS name,
            a.image_url AS image_url,
            a.created_at AS created_at
        FROM animes a
        WHERE a.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
        ORDER BY a.created_at DESC
        LIMIT 10
    """)

    recently_added_episodes = get_recently_added_episodes(db)
    # ⚙️ Exécution des requêtes
    continue_watching = continue_watching_query
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
def get_last_viewed_anime_by_watch_ep(user_id: int, db: Session = Depends(get_db)):
    """
    Récupère le dernier animé visionné par un utilisateur en se basant sur watch_episodes. Avec l'episode vu et la suite possible.
    """
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id est requis")

    query = text("""
        SELECT 
            a.id AS id,
            a.name AS name,
            a.image_url AS image_url,
            we.watched_at AS last_watched
        FROM animes a
        JOIN watch_list w ON w.anime_id = a.id AND w.user_id = :user_id
        JOIN watch_seasons ws ON ws.watch_id = w.id
        JOIN watch_episodes we ON we.season_id = ws.id
        WHERE we.watched = TRUE
        ORDER BY we.watched_at DESC
        LIMIT 1
    """)

    animes_viewed = db.execute(query, {"user_id": user_id}).first()
    result = [
       ""        
    ]
    if result:
        return {"lastViewedAnime": dict(result._mapping)}
    else:
        return {"lastViewedAnime": None}