from sqlalchemy import Column, Integer, String
from app.db.base import Base


class CalendarSeason(Base):
    __tablename__ = "calendar_seasons"

    id = Column(Integer, primary_key=True)
    code = Column(String(10), unique=True, nullable=False)   # WINTER
    name = Column(String(20), nullable=False)                # Winter
    start_month = Column(Integer, nullable=False)
    end_month = Column(Integer, nullable=False)
