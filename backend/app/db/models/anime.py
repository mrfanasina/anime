from sqlalchemy import Boolean, Column, Integer, String
from app.db.models.anime_links import anime_links
from ..base import Base
from sqlalchemy.orm import relationship

class Anime(Base):
    __tablename__ = "animes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(length=255), nullable=False) # Nom de l'animé dans le système
    title_nihon = Column(String(length=255)) # Titre en japonais
    title_english = Column(String(length=255)) # Titre en anglais
    title_romaji = Column(String(length=255)) # Titre en romaji
    path = Column(String(length=255), nullable=False)
    elo = Column(Integer, nullable=False)
    image_url = Column(String(500))
    description = Column(String(2000)) # description de longue l'animé
    synopsis = Column(String(2000)) # Synopsis court
    note = Column(Integer) # Note sur 10
    status = Column(String(50))
    type = Column(String(50)) # OVA, movie, tv...
    rank = Column(Integer) # Classement global 
    created_at = Column(String(50)) # Date de création de l'animé (mois et année)
    studio = Column(String(255)) # Studio de production
    seasons_count = Column(Integer, default=0) # Nombre de saisons
    seasons_diff = Column(String(255)) # winter, spring, summer, fall 
    fromPc = Column(Boolean, default=True, nullable=False) # Indique si l'animé provient du PC ou d'une source externe
    status_on_disk = Column(String(50)) # Indiquer si l'anime est complet, incomplet, ou vide
    
    
    # Relation
    watchers = relationship("Watch", back_populates="anime", cascade="all, delete")
    seasons = relationship("Season", back_populates="anime", cascade="all, delete")
    genres = relationship("Genre", secondary="anime_genres", back_populates="animes")
    related_animes = relationship(
        "Anime",
        secondary=anime_links,
        primaryjoin=id == anime_links.c.anime_id,
        secondaryjoin=id == anime_links.c.related_id,
        backref="related_to"
    )
    locations = relationship("AnimeLocation", back_populates="anime", cascade="all, delete")