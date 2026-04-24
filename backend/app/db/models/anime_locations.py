
from sqlalchemy import Column, Integer, String, ForeignKey
from ..base import Base
from sqlalchemy.orm import relationship

class AnimeLocation(Base):
    __tablename__ = "anime_locations"

    id = Column(Integer, primary_key=True)
    anime_id = Column(Integer, ForeignKey("animes.id"))
    path = Column(String(255), nullable=False)
    source = Column(String(50))  # PC, NAS, Cloud, etc.

    anime = relationship("Anime", back_populates="locations")