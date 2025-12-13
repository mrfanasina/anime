from sqlalchemy import Column, Integer, String
from app.db.base import Base
from sqlalchemy.orm import relationship

class Genre(Base):
    __tablename__ = "genres"

    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True)
    animes = relationship("Anime", secondary="anime_genres", back_populates="genres")
