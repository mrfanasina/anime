import subprocess
import os
import json


def mount_hdd():
    """
    Monte le disque LDM principal (/dev/dm-0) sur /media/HDD.
    Nécessite sudo.
    """
    try:
        # Crée les volumes logiques
        subprocess.run(["sudo", "ldmtool", "create", "all"], check=True)
        os.makedirs("/media/HDD", exist_ok=True)
        # Monte le disque principal
        subprocess.run(["sudo", "mount", "/dev/dm-0", "/media/HDD"], check=True)
        print("✅ Disque principal (LDM) monté sur /media/HDD")
    except subprocess.CalledProcessError as e:
        print(f"⚠️ Erreur lors du montage du disque principal LDM : {e}")


def detect_disques_non_montes():
    """
    Utilise lsblk pour lister les disques non montés (hors /dev/dm-*).
    """
    result = subprocess.run(
        ["lsblk", "-J", "-o", "NAME,MOUNTPOINT,TYPE"],
        capture_output=True,
        text=True
    )
    data = json.loads(result.stdout)
    disques = []

    def explorer(device):
        if device["type"] == "part" and not device["mountpoint"]:
            path = "/dev/" + device["name"]
            if not path.startswith("/dev/dm-"):  # on exclut les volumes LDM
                disques.append(path)
        if "children" in device:
            for child in device["children"]:
                explorer(child)

    for dev in data["blockdevices"]:
        explorer(dev)

    return disques


def mount_other_disks():
    """
    Monte tous les disques détectés sauf ceux gérés par LDM.
    """
    disques = detect_disques_non_montes()
    if not disques:
        print("ℹ️ Aucun autre disque non monté trouvé.")
        return

    for i, disque in enumerate(disques):
        mount_point = f"/media/DISK_{i}"
        os.makedirs(mount_point, exist_ok=True)
        try:
            subprocess.run(["sudo", "mount", disque, mount_point], check=True)
            print(f"✅ {disque} monté sur {mount_point}")
        except subprocess.CalledProcessError:
            print(f"⚠️ Impossible de monter {disque}")



def main():

    print("\n💽 Recherche et montage des autres disques...")
    mount_other_disks()
    
    print("🔧 Montage du disque principal (LDM)...")
    mount_hdd()


if __name__ == "__main__":
    main()