from sqlalchemy import Table, ForeignKey
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from ..base import Base

anime_links = Table(
    "anime_links",
    Base.metadata,
    Column("anime_id", Integer, ForeignKey("animes.id"), primary_key=True),
    Column("related_id", Integer, ForeignKey("animes.id"), primary_key=True),
    Column("relation_type", String(50))  # sequel, prequel, duplicate, etc.
)