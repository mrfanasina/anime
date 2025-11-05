from sqlalchemy import Column, Integer, ForeignKey, DateTime, func, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from ..base import Base

class Watch(Base):
    __tablename__ = "watch_list"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    anime_id = Column(Integer, ForeignKey("animes.id", ondelete="CASCADE"), nullable=False)
    added_at = Column(DateTime(timezone=True), server_default=func.now())
    completed = Column(Boolean, default=False)

    __table_args__ = (
        UniqueConstraint("user_id", "anime_id", name="unique_user_anime_watch"),
    )

    user = relationship("User", back_populates="watch_list")
    anime = relationship("Anime", back_populates="watchers")
    seasons = relationship("WatchSeason", back_populates="watch", cascade="all, delete")
