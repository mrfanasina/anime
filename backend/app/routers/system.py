"""
Routeur System — Endpoints système pour la configuration réseau.

Fournit l'URL du backend pour la communication locale PC ↔ Android.
"""
from fastapi import APIRouter
import socket
import fcntl
import struct
import os

router = APIRouter()


def get_local_ip() -> str:
    """
    Récupère l'adresse IP locale en interrogeant les interfaces réseau.
    
    Exclut les interfaces loopback, Docker et virtuelles.
    Retourne uniquement les adresses IP privées (10.x, 192.168.x, 172.x).
    """
    interfaces = os.listdir('/sys/class/net/')
    for iface in interfaces:
        if iface.startswith(("lo", "docker", "br-", "veth")):
            continue
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            ip = socket.inet_ntoa(
                fcntl.ioctl(
                    s.fileno(),
                    0x8915,  # SIOCGIFADDR
                    struct.pack('256s', iface[:15].encode())
                )[20:24]
            )
            if ip.startswith(("10.", "192.168.", "172.")):
                return ip
        except Exception:
            pass
    return "127.0.0.1"


@router.get("/backUrl")
def get_back_url():
    """Retourne l'URL complète du backend (ex: http://192.168.1.x:8000)."""
    local_ip = get_local_ip()
    back_url = f"http://{local_ip}:8000"
    return {"backUrl": back_url}
