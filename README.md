# 🎬 Anime Manager

Application complète pour gérer, organiser et synchroniser vos animés entre plusieurs plateformes : **PC (FastAPI + MySQL)**, **Android (Kotlin/Java)** et **Web (React)**.

Le projet fonctionne **en local** et **en ligne**, avec un système intelligent de détection des animés, de synchronisation, et de gestion des titres alternatifs.

## 🚀 Fonctionnalités principales

| Fonctionnalité | Description |
|---|---|
| **Détection locale** | Scan automatique des dossiers d'animes (PC et Android) |
| **Synchronisation** | Sync automatique PC ↔ Android via FastAPI |
| **Base de données** | MySQL avec gestion des genres (relation plusieurs-à-plusieurs) |
| **Titres alternatifs** | Récupération depuis MyAnimeList/AniList |
| **Web (React)** | Interface de consultation et gestion via navigateur |
| **Transfert local** | Transfert de fichiers d'animes sur le même réseau |
| **Notifications** | Alertes pour les animés à télécharger ou disponibles |
| **Hors-ligne** | Support complet sans connexion internet |

## 🏗️ Architecture

```
Anime/
├── backend/          # API FastAPI (Python)
│   ├── main.py       # Point d'entrée principal
│   ├── app/
│   │   ├── config.py         # Configuration (DB, IP, dossiers)
│   │   ├── sync.py           # Logique de synchronisation disque
│   │   ├── routers/          # Routes API (anime, auth, player, etc.)
│   │   ├── crud/             # Opérations CRUD (anime, watch, seasonal)
│   │   ├── schemas/          # Schémas Pydantic (validation)
│   │   ├── utils/            # Utilitaires (info anime, sécurité, etc.)
│   │   └── db/               # Modèles SQLAlchemy et session DB
│   └── requirements.txt
├── web/              # Application React (Vite + Tailwind)
│   ├── src/
│   │   ├── App.jsx           # Routeur principal
│   │   ├── services/api.js   # Client HTTP (axios)
│   │   ├── controllers/      # Fonctions d'appel API
│   │   ├── components/       # Composants réutilisables
│   │   ├── pages/            # Pages (home, anime, login, etc.)
│   │   ├── context/          # Contexte React (theme)
│   │   └── redux/            # Store Redux (theme, state)
│   └── package.json
├── mobile/           # Application Android (Kotlin)
│   └── app/
└── backend/app/      # Screenshots et assets
```

## 📦 Installation

### Prérequis

- Python 3.10+
- MySQL
- Node.js 18+ (pour le frontend)
- Android Studio (pour l'app mobile)
- MPV Player (pour la lecture vidéo)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Lancement du serveur
uvicorn main:app --reload

# Lancement avec options
python main.py --sync --mount          # Synchroniser + monter les disques
python main.py --seasonal-sync         # Sync saisonnière uniquement
python main.py --headless --sync       # Mode headless (sans serveur)
python main.py --get-info              # Récupérer les infos MAL/AniList
```

### Frontend Web

```bash
cd web
npm install
npm run dev
```

## 🔗 Communication locale PC ↔ Android

1. Les deux appareils doivent être sur le **même réseau WiFi**
2. FastAPI expose une API locale sur le port 8000
3. L'application Android consomme cette API
4. Les transferts de fichiers se font via `multipart/form-data`

## 🎯 Roadmap

- [ ] Détection automatique d'animes dupliqués
- [ ] Compression lors du transfert Android → PC
- [ ] Historique des téléchargements
- [ ] Interface plus avancée côté mobile
- [ ] Système de notifications push

## 📄 Licence

Projet personnel — usage libre.

## 🧑‍💻 Auteur

Développé par Fa — passionné d'animés, d'ingénierie logicielle et de solutions élégantes.
