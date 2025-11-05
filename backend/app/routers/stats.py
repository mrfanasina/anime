from fastapi import APIRouter, Body
from app.db.session import SessionLocal
from app.db.models.anime import Anime
from app.db.models.season import Season
from app.db.models.episode import Episode

router = APIRouter()

# ---------------------------
# Statistiques globales
# ---------------------------
@router.get("/")
def get_stats():
    db = SessionLocal()
    try:
        total_animes = db.query(Anime).count()
        total_seasons = db.query(Season).count()
        total_episodes = db.query(Episode).count()

        avg_elo_query = db.query(Anime.elo).all()
        avg_elo = round(sum([e[0] for e in avg_elo_query]) / len(avg_elo_query), 2) if avg_elo_query else 0

        top_anime = db.query(Anime).order_by(Anime.elo.desc()).first()
        return {
            "total_animes": total_animes,
            "total_saisons": total_seasons,
            "total_episodes": total_episodes,
            "elo_moyen": avg_elo,
            "meilleur_anime": {
                "id": top_anime.id,
                "name": top_anime.name,
                "elo": top_anime.elo
            } if top_anime else None
        }
    finally:
        db.close()


# ---------------------------
# ELO — Calcul duel
# ---------------------------
def expected_score(rating_a, rating_b):
    return 1 / (1 + 10 ** ((rating_b - rating_a) / 400))

def update_elo(anime1, anime2, winner, k=32):
    R1, R2 = anime1.elo, anime2.elo
    E1, E2 = expected_score(R1, R2), expected_score(R2, R1)
    S1, S2 = (1, 0) if winner == anime1.id else (0, 1)
    anime1.elo = round(R1 + k * (S1 - E1))
    anime2.elo = round(R2 + k * (S2 - E2))

@router.post("/duel")
def duel(anime1_id: int = Body(...), anime2_id: int = Body(...), winner_id: int = Body(...)):
    db = SessionLocal()
    anime1 = db.query(Anime).filter_by(id=anime1_id).first()
    anime2 = db.query(Anime).filter_by(id=anime2_id).first()
    if not anime1 or not anime2 or winner_id not in [anime1_id, anime2_id]:
        db.close()
        return {"error": "Animés invalides"}
    update_elo(anime1, anime2, winner=winner_id)
    db.commit()
    classement = db.query(Anime).order_by(Anime.elo.desc()).limit(10).all()
    db.close()
    return {
        "message": "Elo mis à jour",
        "classement": [{"id": a.id, "name": a.name, "elo": a.elo} for a in classement]
    }

@router.get("/classement")
def top_elo():
    db = SessionLocal()
    classement = db.query(Anime).order_by(Anime.elo.desc()).limit(10).all()
    db.close()
    return [{"id": a.id, "name": a.name, "elo": a.elo} for a in classement]
