import subprocess
import json
import datetime
import os

def ffprobe_info(filepath):
    """Retourne les infos FFprobe d'un fichier vidéo."""
    try:
        cmd = [
            "ffprobe",
            "-v", "quiet",
            "-print_format", "json",
            "-show_streams",
            filepath
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        return json.loads(result.stdout)
    except Exception:
        return None


def extract_languages_and_subtitles(filepath):
    """Retourne une liste de langues audio et sous-titres trouvés dans le fichier."""
    info = ffprobe_info(filepath)
    if not info:
        return [], []

    audio_langs = set()
    subs_langs = set()

    for stream in info.get("streams", []):
        if stream.get("codec_type") == "audio":
            lang = stream.get("tags", {}).get("language")
            if lang:
                audio_langs.add(lang)

        if stream.get("codec_type") == "subtitle":
            lang = stream.get("tags", {}).get("language")
            if lang:
                subs_langs.add(lang)

    return list(audio_langs), list(subs_langs)

