from app.db.base import Base
from app.db.session import engine
from app.db.models.anime import Anime
from app.db.models.season import Season
from app.db.models.episode import Episode
from app.db.seed_calendar_seasons import seed_initial_data

def init_db():
    Base.metadata.create_all(bind=engine)
    seed_initial_data()
    
