import subprocess
import json

def get_active_disks():
    result = subprocess.run(
        ["lsblk", "-J", "-o", "NAME,MOUNTPOINT,FSTYPE,SIZE"],
        capture_output=True,
        text=True,
        check=True
    )

    data = json.loads(result.stdout)
    active_disks = []

    for dev in data.get("blockdevices", []):
        name = dev["name"]

        # ignorer loop, cdrom, etc.
        if name.startswith(("loop", "sr")):
            continue

        # vérifier les partitions montées
        children = dev.get("children", [])
        mounted_children = [
            c for c in children if c.get("mountpoint")
        ]

        if mounted_children:
            active_disks.append({
                "disk": name,
                "size": dev["size"],
                "partitions": mounted_children
            })

    return active_disks


if __name__ == "__main__":
    print(json.dumps(get_active_disks(), indent=2))
