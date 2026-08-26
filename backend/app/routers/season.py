"""
Routeur Season — Endpoints pour la gestion des saisons.

Fournit la liste de toutes les saisons enregistrées en base.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models.season import Season

router = APIRouter()


@router.get("/")
def list_seasons(db: Session = Depends(get_db)):
    """Retourne la liste de toutes les saisons (id, nom, anime associé)."""
    seasons = db.query(Season).all()
    return [{"id": s.id, "name": s.name, "anime_id": s.anime_id} for s in seasons]
