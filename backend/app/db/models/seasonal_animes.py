from sqlalchemy import Column, Date, Integer, ForeignKey, String, Time
from app.db.base import Base
from sqlalchemy.orm import relationship

class SeasonalAnime(Base):
    __tablename__ = "seasonal_animes"

    id = Column(Integer, primary_key=True)
    anime_id = Column(Integer, ForeignKey("animes.id"), nullable=False)
    seasonal_period_id = Column(
        Integer,
        ForeignKey("seasonal_periods.id"),
        nullable=False
    )

    episode_count = Column(Integer)
    diffuse_day = Column(String(10))
    diffuse_time = Column(Time)
    start_date = Column(Date)
    end_date = Column(Date)

    seasonal_period = relationship("SeasonalPeriod", back_populates="seasonal_animes")
