import re
from collections import Counter

# ---------------- Extraction d'un numéro d'épisode ----------------
def extract_episode_number(episode_name):
    """
    Extrait le numéro d'épisode depuis un nom de fichier d'anime.
    Gère les formats Ep12, S01E05, Episode 23, 162 720p, etc.
    Ignore les résolutions et tags comme 720p, HD, Saison 2, etc.
    """
    name = re.sub(r'\.\w{1,4}$', '', episode_name)
    name = name.replace('.', ' ').replace('_', ' ').replace('-', ' ')
    name = re.sub(r'\s+', ' ', name).strip()
    name = re.sub(r'\b(480|720|1080|2160)[pP]\b', '', name)
    name = re.sub(r'\b([Hh][Dd]|[Ff][Uu][Ll][Ll][Hh][Dd]|[Bb][Rr][Rr]?[Ii]?[Pp]?)\b', '', name)

    # Patterns explicites
    patterns = [
        r'(?i)\bS\d+\s*E(\d{1,4})(?:v\d+)?\b',
        r'(?i)\bEP?\s*(\d{1,4})(?:v\d+)?\b',
        r'(?i)\bEpisode\s*(\d{1,4})(?:v\d+)?\b',
    ]
    for pattern in patterns:
        match = re.search(pattern, name)
        if match:
            return int(match.group(1))

    # Chercher tous les nombres filtrés
    all_numbers = [int(n) for n in re.findall(r'\b\d{1,4}\b', name)]
    if all_numbers:
        filtered = []
        tokens = name.split()
        for i, token in enumerate(tokens):
            if re.fullmatch(r'\d{1,4}', token):
                prev = tokens[i - 1].lower() if i > 0 else ""
                nxt = tokens[i + 1].lower() if i < len(tokens) - 1 else ""
                if prev not in {"saison", "season", "s"} and nxt not in {"saison", "season", "s"}:
                    filtered.append(int(token))
        if filtered:
            return filtered[-1]  # dernier nombre filtré → généralement vrai épisode
        return all_numbers[-1]

    return 1

# ---------------- Estimation des épisodes d'une série ----------------
def extract_numbers(title):
    """Retourne tous les nombres valides d'un titre après nettoyage."""
    name = re.sub(r'\.\w{1,4}$', '', title)
    name = name.replace('.', ' ').replace('_', ' ').replace('-', ' ')
    name = re.sub(r'\s+', ' ', name).strip()
    name = re.sub(r'\b(480|720|1080|2160)[pP]\b', '', name)
    name = re.sub(r'\b([Hh][Dd]|[Ff][Uu][Ll][Ll][Hh][Dd]|[Bb][Rr][Rr]?[Ii]?[Pp]?)\b', '', name)
    return [int(n) for n in re.findall(r'\b\d{1,4}\b', name)]

def estimate_episode_numbers_from_series(titles):
    """
    Retourne un mapping titre -> episode_number pour une série.
    Analyse les nombres dans chaque titre et choisit le nombre qui change le plus.
    """
    if not titles:
        return []

    numbers_per_title = [extract_numbers(t) for t in titles]

    # Construire un compteur global de tous les nombres
    all_numbers = [n for nums in numbers_per_title for n in nums]
    counter = Counter(all_numbers)

    estimated = []
    for nums in numbers_per_title:
        if not nums:
            estimated.append(1)
            continue
        # Choisir le nombre le moins fréquent globalement → probablement l'épisode
        freq = [(n, counter[n]) for n in nums]
        freq_sorted = sorted(freq, key=lambda x: (x[1], x[0]))  # moins fréquent -> plus probable
        estimated.append(freq_sorted[0][0])

    # Retourner mapping titre -> ep_number
    return [{title: epn} for title, epn in zip(titles, estimated)]

def extract_season_number(season_name):
    """
    Extrait le numéro de saison depuis un nom de saison.
    Gère les formats Saison 1, Season 2, S03, etc.
    """
    name = re.sub(r'\.\w{1,4}$', '', season_name)
    name = name.replace('.', ' ').replace('_', ' ').replace('-', ' ')
    name = re.sub(r'\s+', ' ', name).strip()

    patterns = [
        r'(?i)\bSaison\s*(\d{1,2})\b',
        r'(?i)\bSeason\s*(\d{1,2})\b',
        r'(?i)\bS(\d{1,2})\b',
    ]
    for pattern in patterns:
        match = re.search(pattern, name)
        if match:
            return int(match.group(1))

    return 1

# ---------------- Tests ----------------
def test():
    print("=== Testing extract_episode_number ===")
    test_cases_single = {
        "Naruto Ep12 720p.mp4": 12,
        "OnePiece_S01E05_HD.mkv": 5,
        "Bleach - 23.mp4": 23,
        "Attack.on.Titan.1080p.EP_45.mkv": 45,
        "My.Hero.Academia.EP07.480p.mp4": 7,
        "Demon Slayer 15.mp4": 15,
        "Dragon Ball Z Episode 3.mkv": 3,
        "Fullmetal Alchemist S02E10.mp4": 10,
        "Death Note - E25.mp4": 25,
        "Cowboy Bebop 720p.mp4": 1,
        "Naruto 162 720p.mp4": 162,
        "OnePiece_1000_HD.mkv": 1000,
        "Bleach_S3E20v2_1080p.mkv": 20,
        "Attack_on_Titan_S04_E75_Final.mkv": 75,
        "86 eiqhty-six Ep5.mp4": 5,
        "86 eiqhty-six 5.mp4": 5,
        "kjkjksfdjh": 1,
        "7.mp4": 7,
        "7DS 1": 1,
        "86 Eighty Six - Saison 1 - Anime-Sama - Streaming et catalogage d'animes et scans._4.ts": 4,
    }

    for name, expected in test_cases_single.items():
        result = extract_episode_number(name)
        print(f"{name} -> {result}")
        assert result == expected, f"❌ Failed for '{name}': expected {expected}, got {result}"
    print("✅ All single episode tests passed\n")

    print("=== Testing estimate_episode_numbers_from_series ===")
    series_titles_86 = [
        "86 Eighty Six - Saison 1 - Anime-Sama - Streaming et catalogage d'animes et scans._4.ts",
        "86 Eighty Six - Saison 1 - Anime-Sama - Streaming et catalogage d'animes et scans._5.ts",
        "86 Eighty Six - Saison 1 - Anime-Sama - Streaming et catalogage d'animes et scans._6.ts",
        "86 Eighty Six - Saison 1 - Anime-Sama - Streaming et catalogage d'animes et scans._7.ts",
    ]

    series_titles_sh = [
        "Shadows House - Shadows House - 01 VOSTFR - 01 - Voiranime.mp4",
        "Shadows House - Shadows House - 02 VOSTFR - 02 - Voiranime.mp4",
        "Shadows House - Shadows House - 03 VOSTFR - 03 - Voiranime.mp4",
        "Shadows House - Shadows House - 04 VOSTFR - 04 - Voiranime.mp4",
        "Shadows House - Shadows House - 05 VOSTFR - 05 - Voiranime.mp4",
    ]

    print("86 Eighty Six Series:")
    print(estimate_episode_numbers_from_series(series_titles_86))

    print("\nShadows House Series:")
    print(estimate_episode_numbers_from_series(series_titles_sh))

def test_mixed_series():
    series_titles_mixed = [
        "86 Eighty Six - Saison 1 - Anime-Sama - Streaming et catalogage d'animes et scans._4.ts",
        "86 Eighty Six - Saison 1 - Anime-Sama - Streaming et catalogage d'animes et scans._5.ts",
        "4.mp4",  # titre générique, mais pourrait appartenir à la série
        "86 Eighty Six - Saison 1 - Anime-Sama - Streaming et catalogage d'animes et scans._6.ts",
        "Some random video.mp4"  # pas du tout de la série
    ]

    print("Mixed Series Test:")
    result = estimate_episode_numbers_from_series(series_titles_mixed)
    for item in result:
        print(item)
        
if __name__ == "__main__":
    test_mixed_series()
