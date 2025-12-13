from sqlalchemy.orm import Session
from app.db.models.anime import Anime
from app.db.models.seasonal import SeasonalAnime
import re

#Recuperer tous les saisonniers avec les noms de saison
def get_all_seasonal(db: Session):
    return db.query(SeasonalAnime).all()

def get_or_create_seasonal(db: Session, anime: Anime, season_name: str, force_update=False) -> SeasonalAnime:
    # Extrait season_type et year
    season_type, year = parse_season_name(season_name)

    seasonal = db.query(SeasonalAnime).filter_by(anime_id=anime.id, season_name=season_name).first()
    if not seasonal:
        seasonal = SeasonalAnime(
            anime_id=anime.id,
            season_name=season_name,
            season_type=season_type,
            year=year
        )
        db.add(seasonal)
        db.commit()        # 🔹 commit indispensable pour que ça apparaisse
    elif force_update:
        seasonal.season_type = season_type
        seasonal.year = year
        db.commit()
    return seasonal

def parse_season_name(season_name: str):
    match = re.match(r"(Winter|Spring|Summer|Fall|Autumn)\s*(\d{4})", season_name, re.I)
    if match:
        return match.group(1).capitalize(), int(match.group(2))
    return None, None
