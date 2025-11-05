from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from app.db.base import Base
from sqlalchemy.orm import relationship

class Episode(Base):
    __tablename__ = "episodes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(length=255), nullable=False)
    season_id = Column(Integer, ForeignKey("seasons.id"), nullable=False)
    episode_number = Column(Integer, nullable=False)
    path = Column(String(500), nullable=False)  # <-- Ajoute cette ligne
    modified_time = Column(DateTime)
    season = relationship("Season", back_populates="episodes")
