"""
Routeur Stats — Endpoints pour les statistiques et le système ELO.

Fournit les stats globales (nombre d'animes, saisons, épisodes),
le système de duel ELO entre animés, et le classement.
"""
from fastapi import APIRouter, Body, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models.anime import Anime
from app.db.models.season import Season
from app.db.models.episode import Episode

router = APIRouter()


# ==================== Statistiques globales ====================
@router.get("/")
def get_stats(db: Session = Depends(get_db)):
    """Retourne les statistiques globales : totals, ELO moyen, meilleur anime."""
    total_animes = db.query(Anime).count()
    total_seasons = db.query(Season).count()
    total_episodes = db.query(Episode).count()

    avg_elo_values = db.query(Anime.elo).all()
    avg_elo = (
        round(sum(e[0] for e in avg_elo_values) / len(avg_elo_values), 2)
        if avg_elo_values else 0
    )

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


# ==================== ELO — Calcul duel ====================
def expected_score(rating_a: float, rating_b: float) -> float:
    """Calcule le score attendu selon la formule ELO standard."""
    return 1 / (1 + 10 ** ((rating_b - rating_a) / 400))


def update_elo(anime1: Anime, anime2: Anime, winner: int, k: int = 32) -> None:
    """
    Met à jour les scores ELO de deux animés après un duel.
    
    Args:
        anime1: Premier anime du duel.
        anime2: Deuxième anime du duel.
        winner: ID de l'anime gagnant.
        k: Facteur de variation ELO (défaut: 32).
    """
    R1, R2 = anime1.elo, anime2.elo
    E1, E2 = expected_score(R1, R2), expected_score(R2, R1)
    S1, S2 = (1, 0) if winner == anime1.id else (0, 1)
    anime1.elo = round(R1 + k * (S1 - E1))
    anime2.elo = round(R2 + k * (S2 - E2))


@router.post("/duel")
def duel(
    anime1_id: int = Body(...),
    anime2_id: int = Body(...),
    winner_id: int = Body(...),
    db: Session = Depends(get_db)
):
    """
    Enregistre le résultat d'un duel entre deux animés et met à jour leurs ELO.
    
    Retourne le classement top 10 après mise à jour.
    """
    anime1 = db.query(Anime).filter_by(id=anime1_id).first()
    anime2 = db.query(Anime).filter_by(id=anime2_id).first()

    if not anime1 or not anime2 or winner_id not in [anime1_id, anime2_id]:
        return {"error": "Animés invalides"}

    update_elo(anime1, anime2, winner=winner_id)
    db.commit()

    classement = db.query(Anime).order_by(Anime.elo.desc()).limit(10).all()
    return {
        "message": "Elo mis à jour",
        "classement": [{"id": a.id, "name": a.name, "elo": a.elo} for a in classement]
    }


@router.get("/classement")
def get_top_elo(db: Session = Depends(get_db)):
    """Retourne le classement ELO des 10 meilleurs animés."""
    classement = db.query(Anime).order_by(Anime.elo.desc()).limit(10).all()
    return [{"id": a.id, "name": a.name, "elo": a.elo} for a in classement]
