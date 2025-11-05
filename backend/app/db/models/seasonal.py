from sqlalchemy import Column, Integer, ForeignKey, String
from app.db.base import Base

class SeasonalAnime(Base):
    __tablename__ = "seasonal_animes"
    id = Column(Integer, primary_key=True, index=True)
    anime_id = Column(Integer, ForeignKey("animes.id"), nullable=False)
    season_name = Column(String(50), nullable=False)       # ex: "Winter 2025"
    season_type = Column(String(10), nullable=True)       # ex: "Winter", "Spring"
    year = Column(Integer, nullable=True)                 # ex: 2025
    