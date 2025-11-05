import os

dbUser = "animeUser"
password = "otaku123"
db = "anime"

DATABASE_URL = os.getenv("DATABASE_URL", f"mysql+pymysql://{dbUser}:{password}@localhost/{db}")
FOLDER_TO_WATCH = "/media/HDD/ANIME"
    