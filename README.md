# Anime Manager

Anime Manager est une application complète permettant de gérer, organiser et synchroniser vos animés entre plusieurs plateformes : **PC (FastAPI + MySQL)**, **Android (Kotlin/Java)** et **Web (React)**. Le projet est pensé pour fonctionner **en local** et **en ligne**, avec un système intelligent de détection des animés, de synchronisation, et de watchlist.

## 🚀 Fonctionnalités principales

* **Détection locale des animés** (PC et Android)
* **Synchronisation automatique** PC ↔ Android via FastAPI
* **Base de données MySQL robuste** avec gestion des genres (relation plusieurs-à-plusieurs)
* **Gestion des titres alternatifs / acronymes** (via API en ligne)
* **Version Web (React)** pour consultation et gestion via PC
* **Transfert de fichiers d'animés en local** (même réseau)
* **Système de notifications** pour les animés à télécharger ou disponibles
* **Support hors-ligne complet**

## 🏗️ Architecture du projet

### Backend FastAPI (PC)

* Scan des dossiers locaux
* Détection d'animés présents/manquants
* Synchronisation avec MySQL
* API locale pour communication avec Android

### Base de données (MySQL)

* Tables principales : `anime`, `genre`, `anime_genres`
* Gestion multi-titres/multi-acronymes

### Frontend Web (React)

* Consultation et gestion
* UI moderne

### Application Android (Kotlin/Java)

* Scan des fichiers locaux du téléphone
* Listing des animés
* Upload de fichiers vers FastAPI
* Affichage des animés locaux et distants (PC)

## 📦 Installation

### Prérequis

* Python 3.10+
* MySQL
* Node.js (pour le frontend)
* Android Studio (pour l'app mobile)

### Installation Backend

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

### Installation Frontend

```bash
npm install
npm run dev
```

## 🔗 Communication locale PC ↔ Android

* Les deux appareils doivent être sur le **même réseau WiFi**.
* FastAPI expose une API consommée par l'application Android.
* Les transferts de fichiers se font via `multipart/form-data`.

## 🎯 Roadmap

* Ajout de la détection automatique d'animes dupliqués
* Compression lors du transfert Android → PC
* Historique des téléchargements
* Interface plus avancée côté mobile
* Watchlist sur Mobile
## 📄 Licence

Projet personnel — usage libre.

## 🧑‍💻 Auteur

Développé par Fa — passionné d'animés, d'ingénierie logicielle et de solutions élégantes.
