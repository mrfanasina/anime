import os
import random
import math

class Anime:
    def __init__(self, id, name, path="", seasons=""):
        self.id = id
        self.name = name
        self.path = path
        self.seasons = seasons
        self.__elo = 1000  # score initial
    
    def set_elo(self, elo):
        self.__elo = elo
        
    def get_elo(self):
        return self.__elo
    
    def __str__(self):
        return f"{self.name} (Elo: {self.__elo})"

def expected_score(rating_a, rating_b):
    return 1 / (1 + 10 ** ((rating_b - rating_a) / 400))

def update_elo(anime1, anime2, winner, k=32):
    R1, R2 = anime1.get_elo(), anime2.get_elo()
    E1, E2 = expected_score(R1, R2), expected_score(R2, R1)

    S1, S2 = (1, 0) if winner == 1 else (0, 1)

    new_R1 = R1 + k * (S1 - E1)
    new_R2 = R2 + k * (S2 - E2)

    anime1.set_elo(round(new_R1))
    anime2.set_elo(round(new_R2))

def scan_animes(folder_path):
    all_animes = []
    i = 1
    for root, dirs, files in os.walk(folder_path):
        for d in dirs:
            if len(d) >= 3:  # filtre simple
                all_animes.append(Anime(i, d, os.path.join(root, d)))
                i += 1
    return all_animes

if __name__ == "__main__":
    # Mets ici ton dossier d'animes
    folder = "/media/HDD/ANIME"
    animes = scan_animes(folder)

    if len(animes) < 2:
        print("Pas assez d'animés trouvés pour un duel.")
        exit()

    print(f"{len(animes)} animés trouvés 🎉")
    
    while True:
        # Choisir 2 animés différents
        anime1, anime2 = random.sample(animes, 2)

        print("\n--- NOUVEAU DUEL ---")
        print(f"1️⃣ {anime1.name} (Elo {anime1.get_elo()})")
        print(f"2️⃣ {anime2.name} (Elo {anime2.get_elo()})")

        choix = input("Qui gagne ? (1/2 ou q pour quitter) : ")

        if choix.lower() == "q":
            break
        elif choix == "1":
            update_elo(anime1, anime2, winner=1)
            print(f"🏆 {anime1.name} gagne !")
        elif choix == "2":
            update_elo(anime1, anime2, winner=2)
            print(f"🏆 {anime2.name} gagne !")
        else:
            print("Choix invalide, duel ignoré.")
            continue

        # Afficher classement
        classement = sorted(animes, key=lambda a: a.get_elo(), reverse=True)
        print("\n📊 Classement actuel :")
        for a in classement[:10]:  # top 10
            print(a)