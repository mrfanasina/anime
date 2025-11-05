# routers/episode.py
from fastapi import APIRouter
from app.db.session import SessionLocal
from app.db.models.episode import Episode

router = APIRouter()

@router.get("/")
def list_episodes():
    db = SessionLocal()
    episodes = db.query(Episode).all()
    db.close()
    return [{"id": e.id, "name": e.name, "path": e.path, "season_id": e.season_id} for e in episodes]

