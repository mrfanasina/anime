from sqlalchemy import Column, Integer, String
from ..base import Base
from sqlalchemy.orm import relationship

class Anime(Base):
    __tablename__ = "animes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(length=255), nullable=False)
    path = Column(String(length=255), nullable=False)
    elo = Column(Integer, nullable=False)
    image_url = Column(String(500))
    description = Column(String(1000))
    note = Column(Integer) # Note sur 10
    status = Column(String(50))
    type = Column(String(50))
    rank = Column(Integer) # Classement global 
    created_at = Column(String(50)) # Date de création de l'animé (année)
    studio = Column(String(100)) # Studio de production
    
    # Relation
    watchers = relationship("Watch", back_populates="anime", cascade="all, delete")
    seasons = relationship("Season", back_populates="anime", cascade="all, delete")