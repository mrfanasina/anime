from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey
from app.db.base import Base
from sqlalchemy.orm import relationship

class Episode(Base):
    __tablename__ = "episodes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(length=255), nullable=False)
    season_id = Column(Integer, ForeignKey("seasons.id"), nullable=False)
    episode_number = Column(Integer, nullable=False)
    path = Column(String(500), nullable=False) 
    not_found = Column(Boolean, default=False)
    modified_time = Column(DateTime) # Date de la dernière modification du fichier
    audio_languages = Column(String(255))  # ex: "fr,en,jp"
    subtitles = Column(String(255))        # ex: "fr,en"
    upload_date = Column(DateTime)        # Date de l'upload de l'épisode
    
    season = relationship("Season", back_populates="episodes")
    