import os
import socket

# ==================== Configuration de la base de données ====================
# Les credentials sont lus depuis les variables d'environnement,
# avec des valeurs par défaut pour le développement local.
dbUser = os.getenv("DB_USER", "animeUser")
password = os.getenv("DB_PASSWORD", "otaku123")
db = os.getenv("DB_NAME", "anime")

DATABASE_URL = os.getenv("DATABASE_URL", f"mysql+pymysql://{dbUser}:{password}@localhost/{db}")

# ==================== Dossier de surveillance des médias ====================
FOLDER_TO_WATCH = os.getenv("FOLDER_TO_WATCH", "/media/HDD/ANIME")

# ==================== Adresse IP locale ====================
def get_local_ip() -> str:
    """Récupère l'adresse IP locale de la machine (hors loopback)."""
    hostname = socket.gethostname()
    ips = socket.gethostbyname_ex(hostname)[2]
    for ip in ips:
        if not ip.startswith("127."):
            return ip
    return "127.0.0.1"

LOCAL_IP = get_local_ip()
BACK_URL = f"http://{LOCAL_IP}:8000"
