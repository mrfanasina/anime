from sqlalchemy import Column, Boolean, Integer, ForeignKey
from app.db.base import Base
from sqlalchemy.orm import relationship

class SeasonalPeriod(Base):
    __tablename__ = "seasonal_periods"

    id = Column(Integer, primary_key=True)
    calendar_season_id = Column(
        Integer,
        ForeignKey("calendar_seasons.id"),
        nullable=False
    )
    year = Column(Integer, nullable=False)

    is_current = Column(Boolean, default=False)

    calendar_season = relationship("CalendarSeason")
    seasonal_animes = relationship(
        "SeasonalAnime",
        back_populates="seasonal_period",
        cascade="all, delete"
    )
