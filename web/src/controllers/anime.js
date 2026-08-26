/**
 * Contrôleur Anime — Fonctions d'appel API pour la gestion des animés.
 */
import api from "../services/api";

const API_URL = import.meta.env.VITE_API_URL;

/**
 * Lance la lecture d'un épisode via MPV et renvoie un EventSource SSE.
 * @param {number} episodeId - ID de l'épisode à lire.
 * @param {Function} onData - Callback appelé à chaque événement SSE.
 * @param {number|null} userId - ID de l'utilisateur (optionnel).
 * @returns {EventSource} Instance SSE pour écouter les événements.
 */
export const playAnime = (episodeId, onData, userId = null) => {
  const url = userId
    ? `${API_URL}player/play/${episodeId}?userId=${userId}`
    : `${API_URL}player/play/${episodeId}`;

  const evt = new EventSource(url);
  evt.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onData(data);
  };
  evt.onerror = (err) => {
    console.error("SSE error:", err);
    evt.close();
  };
  return evt;
};

/**
 * Retourne l'URL de streaming pour un épisode.
 * @param {number} episodeId - ID de l'épisode.
 * @returns {string} URL du stream vidéo.
 */
export const streamAnime = (episodeId) => {
  return `${API_URL}player/stream/${episodeId}`;
};

/**
 * Ajoute un nouvel anime en créant son dossier.
 * @param {string} name - Nom de l'anime.
 * @param {string} selectedFolder - Chemin du dossier parent.
 * @returns {Promise<Object>} Données de l'anime créé.
 */
export const addAnime = async (name, selectedFolder) => {
  const response = await api.post('/anime/add', { name, path: selectedFolder });
  return response.data;
};

/**
 * Récupère un anime par son ID avec la progression utilisateur.
 * @param {number} id - ID de l'anime.
 * @param {number} userId - ID de l'utilisateur.
 * @returns {Promise<Object>} Détails de l'anime avec progression.
 */
export const getAnimeById = async (id, userId) => {
  const response = await api.get(`/anime/with-progress/${id}`, {
    params: { userId }
  });
  return response.data;
};

/**
 * Récupère la liste complète des animés (avec saisons et épisodes).
 * @returns {Promise<Array>} Liste des animés.
 */
export const listAnimes = async () => {
  const response = await api.get('/anime/all');
  return response.data;
};

/**
 * Récupère la liste basique de tous les animés.
 * @returns {Promise<Array>} Liste des animés (format simplifié).
 */
export const getAllAnimes = async () => {
  const response = await api.get('/anime/');
  return response.data;
};

/**
 * Récupère les animés saisonniers.
 * @returns {Promise<Array>} Liste des animés saisonniers groupés par saison.
 */
export const getSeasonal = async () => {
  const response = await api.get('/anime/seasonal');
  return response.data;
};

/**
 * Récupère les dossiers médias disponibles.
 * @returns {Promise<Object>} Dossiers médias montés.
 */
export const getFolders = async () => {
  const response = await api.get('/anime/folders/all');
  return response;
};

/**
 * Lance une playlist d'épisodes via MPV et renvoie un EventSource SSE.
 * @param {number[]} episodeIds - IDs des épisodes à lire.
 * @param {number} userId - ID de l'utilisateur.
 * @param {Function} onEvent - Callback appelé à chaque événement SSE.
 * @returns {Promise<EventSource>} Instance SSE.
 */
export const playAnimePlaylist = async (episodeIds, userId, onEvent) => {
  const res = await fetch(
    `${API_URL}player/play-playlist?userId=${userId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ episode_ids: episodeIds })
    }
  );

  if (!res.ok) {
    throw new Error("Failed to start playlist");
  }

  const sse = new EventSource(
    `${API_URL}player/play-playlist/stream?userId=${userId}`,
    { withCredentials: true }
  );

  sse.onmessage = (e) => {
    if (!e.data) return;
    try {
      onEvent(JSON.parse(e.data));
    } catch { /* Ignore les erreurs de parsing */ }
  };

  return sse;
};

/**
 * Récupère un épisode par son ID.
 * @param {number} epId - ID de l'épisode.
 * @returns {Promise<Object>} Données de l'épisode.
 */
export const getEpisodeById = async (epId) => {
  const response = await api.get(`/episode/${epId}`);
  return response.data;
};

/**
 * Récupère l'anime associé à un épisode.
 * @param {number} epId - ID de l'épisode.
 * @returns {Promise<Object>} Anime et saison de l'épisode.
 */
export const getAnimeByEpId = async (epId) => {
  const response = await api.get(`/anime/episode/${epId}`);
  return response.data;
};

/**
 * Récupère l'URL du backend local.
 * @returns {Promise<Object>} Objet contenant backUrl.
 */
export const getBackUrl = async () => {
  const response = await api.get('/system/backUrl');
  return response.data;
};

/**
 * Déplace un anime vers un nouveau dossier.
 * @param {number} animeId - ID de l'anime.
 * @param {string} newPath - Nouveau chemin du dossier parent.
 * @returns {Promise<Object>} Résultat du déplacement.
 */
export const moveAnime = async (animeId, newPath) => {
  const response = await api.post(`/anime/move/${animeId}`, { path: newPath });
  return response.data;
};

/**
 * Met à jour les infos d'un anime depuis MyAnimeList/AniList.
 * @param {number} animeId - ID de l'anime.
 * @returns {Promise<Object>} Résultat de la mise à jour.
 */
export const updateAnimeInfo = async (animeId) => {
  const response = await api.post(`/anime/update-info/${animeId}`);
  return response.data;
};

/**
 * Met à jour les infos de tous les animés.
 * @returns {Promise<Object>} Résultat de la mise à jour globale.
 */
export const updateAllAnimeInfo = async () => {
  const response = await api.get(`/anime/update-info/all`);
  return response.data;
};

/**
 * Récupère la hiérarchie des disques du système.
 * @returns {Promise<Object>} Données des disques.
 */
export const fetchDisks = async () => {
  const res = await api.get("/anime/manager/disk");
  return res.data;
};

/**
 * Récupère les sous-dossiers d'un chemin donné.
 * @param {string} path - Chemin du dossier parent.
 * @returns {Promise<string[]>} Liste des sous-dossiers.
 */
export const getNextFolder = async (path) => {
  const res = await api.post("/anime/next-folder/", { path });
  return res.data.next_folder;
};

/**
 * Copie les fichiers d'un anime vers un dossier cible.
 * @param {Object} payload - Paramètres de copie (animeId, selection, targetPath).
 * @returns {Promise<Object>} Résultat de la copie.
 */
export const copyFile = async (payload) => {
  const res = await api.post("/anime/copy", payload);
  return res;
};

/**
 * Supprime un anime de la base de données.
 * @param {number} animeId - ID de l'anime.
 * @returns {Promise<Object>} Résultat de la suppression.
 */
export const deleteAnime = async (animeId) => {
  const res = await api.delete(`/anime/remove-anime/${animeId}`);
  return res;
};
