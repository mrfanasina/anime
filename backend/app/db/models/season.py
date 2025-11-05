from sqlalchemy import Column, Integer, String, ForeignKey
from ..base import Base
from sqlalchemy.orm import relationship

class Season(Base):
    __tablename__ = "seasons"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(length=255), nullable=False)
    anime_id = Column(Integer, ForeignKey("animes.id"), nullable=False)
    episodes = relationship("Episode", back_populates="season", cascade="all, delete")
    season_number = Column(Integer, nullable=False)
    anime = relationship("Anime", back_populates="seasons")
