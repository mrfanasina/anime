from fastapi import APIRouter
import socket
import fcntl
import struct
import os

router = APIRouter()

def get_local_ip():
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
        except:
            pass
    return "127.0.0.1"

@router.get("/backUrl")
def get_back_url():
    local_ip = get_local_ip()
    back_url = f"http://{local_ip}:8000"
    return {"backUrl": back_url}
