import requests


def check_icon(anime_name):
    url = f"https://api.jikan.moe/v4/anime?q={anime_name}&limit=1"
    try:
        resp = requests.get(url)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("data"):
                return data["data"][0]["images"]["jpg"]["large_image_url"]
        return None
    except:
        return None
 