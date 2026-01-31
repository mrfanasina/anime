from app.db.models.calendar_seasons import CalendarSeason
from app.db.session import SessionLocal

DEFAULT_CALENDAR_SEASONS = [
    {
        "code": "WINTER",
        "name": "Winter",
        "start_month": 12,
        "end_month": 2,
    },
    {
        "code": "SPRING",
        "name": "Spring",
        "start_month": 3,
        "end_month": 5,
    },
    {
        "code": "SUMMER",
        "name": "Summer",
        "start_month": 6,
        "end_month": 8,
    },
    {
        "code": "FALL",
        "name": "Fall",
        "start_month": 9,
        "end_month": 11,
    },
]


def seed_initial_data():
    db = SessionLocal()
    try:
        exists = db.query(CalendarSeason).first()
        if exists:
            return

        db.add_all([
            CalendarSeason(code="WINTER", name="Winter", start_month=12, end_month=2),
            CalendarSeason(code="SPRING", name="Spring", start_month=3, end_month=5),
            CalendarSeason(code="SUMMER", name="Summer", start_month=6, end_month=8),
            CalendarSeason(code="FALL",   name="Fall",   start_month=9, end_month=11),
        ])
        db.commit()
        print("✅ Calendar seasons seeded")
    finally:
        db.close()
