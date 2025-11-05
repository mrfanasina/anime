from sqlalchemy import Column, Integer, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship
from ..base import Base

class WatchEpisode(Base):
    __tablename__ = "watch_episodes"

    id = Column(Integer, primary_key=True, index=True)
    season_id = Column(Integer, ForeignKey("watch_seasons.id", ondelete="CASCADE"), nullable=False)
    episode_id = Column(Integer, ForeignKey("episodes.id", ondelete="CASCADE"), nullable=False)
    watched = Column(Boolean, default=False)
    watched_at = Column(DateTime)
    
    season = relationship("WatchSeason", back_populates="episodes")
    episode = relationship("Episode", lazy="joined")
