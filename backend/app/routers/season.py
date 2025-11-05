from fastapi import APIRouter
from app.db.session import SessionLocal
from app.db.models.season import Season

router = APIRouter()

@router.get("/")
def list_seasons():
    db = SessionLocal()
    seasons = db.query(Season).all()
    db.close()
    return [{"id": s.id, "name": s.name, "anime_id": s.anime_id} for s in seasons]
