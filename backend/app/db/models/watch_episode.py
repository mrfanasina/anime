from sqlalchemy import Column, Integer, ForeignKey, Boolean, DateTime, Float
from sqlalchemy.orm import relationship
from ..base import Base

class WatchEpisode(Base):
    __tablename__ = "watch_episodes"

    id = Column(Integer, primary_key=True, index=True)
    season_id = Column(Integer, ForeignKey("watch_seasons.id", ondelete="CASCADE"), nullable=False)
    episode_id = Column(Integer, ForeignKey("episodes.id", ondelete="CASCADE"), nullable=False)
    
    watched = Column(Boolean, default=False)
    watched_at = Column(DateTime)

    position = Column(Float, default=0.0)      # Progression en secondes
    duration = Column(Float, default=0.0)      # Durée totale
    finished = Column(Boolean, default=False)  # Épisode terminé

    season = relationship("WatchSeason", back_populates="episodes")
    episode = relationship("Episode", lazy="joined")
