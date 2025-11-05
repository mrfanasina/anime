# Anime Media Server Backend

Ce projet est le backend d'un serveur de gestion et de lecture d'animés, développé avec FastAPI et une base de données MySQL.

## Fonctionnalités principales
- Liste tous les fichiers d'animés présents dans la base de données
- Lance la lecture d'un animé sur le serveur via mpv
- API REST simple pour interaction avec un frontend React, et une app mobile

## Installation

1. **Cloner le dépôt**
2. Installer les dépendances Python :
   ```bash
   pip install -r requirments.txt
   ```
3. Configurer la base de données si besoin (voir `app/db.py`)
4. Lancer le serveur :
   ```bash
   uvicorn main:app --reload
   ```

## Endpoints principaux

- `GET /files` : Retourne la liste des animés (id, nom, chemin, date de modification)
- `POST /play` : Lance la lecture d'un fichier animé (body: `{ "path": "chemin/du/fichier" }`)

## Exemple d'appel API

```bash
curl -X POST http://localhost:8000/play -H "Content-Type: application/json" -d '{"path": "/media/HDD/ANIME/nom_du_fichier.mp4"}'
```

## Notes
- Le serveur doit avoir mpv installé et accessible dans le PATH.
- La lecture se fait côté serveur (machine hébergeant le backend).

## Structure du dossier
- `main.py` : Point d'entrée FastAPI
- `app/` : Code principal (API, DB, utilitaires)

## Auteur
- Projet personnel pour gestion locale d'animés
