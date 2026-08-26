"""Opérations CRUD pour les animés saisonniers et les périodes saisonnières."""
import re
import time
import unicodedata
from datetime import datetime
from sqlalchemy.orm import Session

from app.db.models.anime import Anime
from app.db.models.seasonal_animes import SeasonalAnime
from app.db.models.seasonal_period import SeasonalPeriod
from app.db.models.calendar_seasons import CalendarSeason

SEASON_KEYWORDS = {
    "WINTER": ["winter", "hiver", "janvier", "january", "fevrier", "february", "decembre", "december"],
    "SPRING": ["spring", "printemps", "mars", "march", "avril", "april", "mai", "may"],
    "SUMMER": ["summer", "ete", "été", "juin", "june", "juillet", "july", "aout", "août", "august"],
    "FALL":   ["fall", "autumn", "automne", "septembre", "september", "octobre", "october", "novembre", "november"],
}
"""Mots-clés de saison en français et anglais pour la détection automatique."""

def normalize(text: str) -> str:
    """Normalise un texte : minuscules, suppression des accents, nettoyage."""
    text = text.lower()
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = re.sub(r"[^a-z0-9 ]", " ", text)
    return text

def detect_season_and_year(raw: str | None) -> tuple:
    """Détecte le code de saison et l'année à partir d'un texte brut."""
    now = datetime.utcnow()
    year = None
    season_code = None

    if not raw:
        return None, None

    value = normalize(raw)

    # 1️⃣ année explicite
    year_match = re.search(r"(20\d{2})", value)
    if year_match:
        year = int(year_match.group(1))

    # 2️⃣ saison explicite
    for code, keywords in SEASON_KEYWORDS.items():
        for kw in keywords:
            if kw in value:
                season_code = code
                break
        if season_code:
            break

    return season_code, year

def get_or_create_seasonal_period(
    db: Session,
    raw_label: str | None
) -> SeasonalPeriod:
    now = datetime.utcnow()

    season_code, year = detect_season_and_year(raw_label)

    # fallback année
    year = year or now.year

    # fallback saison → saison actuelle
    if not season_code:
        month = now.month
        seasons = db.query(CalendarSeason).all()
        for s in seasons:
            if s.start_month <= s.end_month:
                if s.start_month <= month <= s.end_month:
                    season_code = s.code
                    break
            else:
                if month >= s.start_month or month <= s.end_month:
                    season_code = s.code
                    break

    calendar_season = (
        db.query(CalendarSeason)
        .filter(CalendarSeason.code == season_code)
        .first()
    )

    # sécurité ultime
    if not calendar_season:
        calendar_season = db.query(CalendarSeason).first()

    # chercher période existante
    period = (
        db.query(SeasonalPeriod)
        .filter(
            SeasonalPeriod.calendar_season_id == calendar_season.id,
            SeasonalPeriod.year == year
        )
        .first()
    )

    if period:
        return period

    # créer
    period = SeasonalPeriod(
        calendar_season_id=calendar_season.id,
        year=year,
        is_current=False
    )
    db.add(period)
    db.commit()
    db.refresh(period)

    return period



def get_all_seasonal(db: Session) -> list[SeasonalAnime]:
    """Récupère tous les animés saisonniers."""
    return db.query(SeasonalAnime).all()

def create_seasonal_period(db: Session, calendar_season_id: int, year: int = time.localtime().tm_year, is_current: bool = False) -> SeasonalPeriod:
    """Crée une nouvelle période saisonnière."""
    seasonal_period = SeasonalPeriod(
        calendar_season_id=calendar_season_id,
        year=year,
        is_current=is_current
    )
    db.add(seasonal_period)
    db.commit()
    return seasonal_period

def get_or_create_seasonal(
    db: Session,
    anime: Anime,
    seasonal_period: SeasonalPeriod,
    force_update: bool = False,
) -> SeasonalAnime:
    """Lie un Anime à un SeasonalPeriod via SeasonalAnime. Crée l'entrée si absente."""

    seasonal = (
        db.query(SeasonalAnime)
        .filter(
            SeasonalAnime.anime_id == anime.id,
            SeasonalAnime.seasonal_period_id == seasonal_period.id,
        )
        .first()
    )

    if seasonal:
        if force_update:
            seasonal.seasonal_period_id = seasonal_period.id
        return seasonal

    seasonal = SeasonalAnime(
        anime_id=anime.id,
        seasonal_period_id=seasonal_period.id,
    )

    db.add(seasonal)
    db.flush()  # garantit seasonal.id sans commit global

    return seasonal

def parse_season_name(season_name: str):
    match = re.match(r"(Winter|Spring|Summer|Fall|Autumn)\s*(\d{4})", season_name, re.I)
    if match:
        return match.group(1).capitalize(), int(match.group(2))
    return None, None

def get_seasonal(db: Session, anime: Anime) -> SeasonalAnime:
    return db.query(SeasonalAnime).filter_by(anime_id=anime.id).first()

def is_seasonal_anime(db: Session, anime: Anime) -> bool:
    seasonal = db.query(SeasonalAnime).filter_by(anime_id=anime.id).first()
    return seasonal is not None

def get_season_period(db: Session, seasonal_anime: SeasonalAnime) -> SeasonalPeriod:
    return db.query(SeasonalPeriod).filter_by(id=seasonal_anime.seasonal_period_id).first()

def get_calendar_season(db: Session, seasonal_period: SeasonalPeriod) -> CalendarSeason:
    return db.query(CalendarSeason).filter_by(id=seasonal_period.calendar_season_id).first()