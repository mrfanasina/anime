import os
import socket

dbUser = "animeUser"
password = "otaku123"
db = "anime"

DATABASE_URL = os.getenv("DATABASE_URL", f"mysql+pymysql://{dbUser}:{password}@localhost/{db}")
FOLDER_TO_WATCH = "/media/HDD/ANIME"

import socket

def get_local_ip():
    hostname = socket.gethostname()
    ips = socket.gethostbyname_ex(hostname)[2]
    for ip in ips:
        if not ip.startswith("127."):
            return ip
    return "127.0.0.1"

LOCAL_IP = get_local_ip()
BACK_URL = f"http://{LOCAL_IP}:8000"
