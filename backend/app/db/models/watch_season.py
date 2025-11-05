from sqlalchemy import Column, Integer, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from ..base import Base

class WatchSeason(Base):
    __tablename__ = "watch_seasons"

    id = Column(Integer, primary_key=True, index=True)
    watch_id = Column(Integer, ForeignKey("watch_list.id", ondelete="CASCADE"))
    season_id = Column(Integer, ForeignKey("seasons.id", ondelete="CASCADE"))  # si tu as une table Season
    completed = Column(Boolean, default=False)

    # Relations
    watch = relationship("Watch", back_populates="seasons")
    episodes = relationship("WatchEpisode", back_populates="season", cascade="all, delete")
    