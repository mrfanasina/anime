from sqlalchemy.orm import Session
from app.db.models.calendar_seasons import CalendarSeason



def get_all_calendar_seasons(db: Session):
    return db.query(CalendarSeason).all()

def get_calendar_season_by_code(db: Session, code: str):
    """
    Get a calendar season by its code.
    """
    code = code.upper()  # Ensure the code is in uppercase
    # Essayer de trouver le code si le code est un peu similaire ex: spr -> SPRING, fll -> FALL
    
    return db.query(CalendarSeason).filter_by(code=code).first()