from sqlalchemy import Column, Integer, ForeignKey
from ..base import Base

class AnimeGenre(Base):
    __tablename__ = "anime_genres"

    anime_id = Column(Integer, ForeignKey("animes.id"), primary_key=True)
    genre_id = Column(Integer, ForeignKey("genres.id"), primary_key=True)
