/**
 * Contrôleur Watch — Fonctions d'appel API pour la watchlist utilisateur.
 */
import api from '../services/api';

/**
 * Récupère la watch list complète d'un utilisateur.
 * @param {number} userId - ID de l'utilisateur.
 * @returns {Promise<Array>} Liste des watches avec saisons et épisodes.
 */
export async function getWatchList(userId) {
  const res = await api.get(`/watch/user/${userId}`);
  if (res.status !== 200) {
    const error = new Error(res.data.message || 'Erreur lors de la récupération de la watch list');
    throw error;
  }
  return res.data;
}

/**
 * Récupère les épisodes vus pour une saison donnée.
 * @param {number} season_id - ID de la saison.
 * @returns {Promise<Array>} Liste des épisodes de la saison.
 */
export async function getDejaVuEp(season_id) {
  const res = await api.get(`watch/episode/${season_id}`);
  if (res.status !== 200) {
    const error = new Error(res.data.message || 'Erreur lors de la récupération des épisodes');
    throw error;
  }
  return res.data;
}

/**
 * Toggle le statut 'watched' d'un épisode.
 * @param {number} watchEpisodeId - ID du WatchEpisode.
 * @param {boolean} watched - Nouveau statut.
 * @returns {Promise<Object>} WatchEpisode mis à jour.
 */
export async function toggleEpisode(watchEpisodeId, watched) {
  const res = await api.patch(`/watch/episode/${watchEpisodeId}`, { watched });
  if (res.status !== 200) {
    const error = new Error(res.data.message || 'Erreur lors de la mise à jour de l\'épisode');
    throw error;
  }
  return res.data;
}

/**
 * Toggle le statut 'completed' d'une saison.
 * @param {number} watchSeasonId - ID du WatchSeason.
 * @param {boolean} completed - Nouveau statut.
 * @returns {Promise<Object>} WatchSeason mis à jour.
 */
export async function toggleSeason(watchSeasonId, completed) {
  const res = await api.patch(`/watch/season/${watchSeasonId}`, { completed });
  if (res.status !== 200) {
    const error = new Error(res.data.message || 'Erreur lors de la mise à jour de la saison');
    throw error;
  }
  return res.data;
}

/**
 * Ajoute un anime à la watch list d'un utilisateur.
 * @param {number} userId - ID de l'utilisateur.
 * @param {Object} payload - Données de la watch (anime_id, status, etc.).
 * @returns {Promise<Object>} Watch créée.
 */
export async function addWatch(userId, payload) {
  const res = await api.post(`/watch/`, { ...payload, user_id: userId });
  if (res.status !== 200) {
    const error = new Error(res.data.message || 'Erreur lors de l\'ajout à la watch list');
    throw error;
  }
  return res.data;
}

/**
 * Ajoute une saison à une watch existante.
 * @param {number} watchId - ID de la watch.
 * @param {Object} payload - Données de la saison (season_id, completed, etc.).
 * @returns {Promise<Object>} WatchSeason créée.
 */
export async function addSeason(watchId, payload) {
  const res = await api.post(`/watch/${watchId}/season`, payload);
  if (res.status !== 200) {
    const error = new Error(res.data.message || 'Erreur lors de l\'ajout de la saison');
    throw error;
  }
  return res.data;
}

/**
 * Ajoute ou met à jour un épisode dans une WatchSeason.
 * @param {Object} payload - Données de l'épisode.
 * @returns {Promise<Object>} WatchEpisode créé ou mis à jour.
 */
export const addOrUpdateEpisode = async ({ user_id, anime_id, season_id, episode_id, watched, watched_at }) => {
  const res = await api.post("/watch/episode", { user_id, anime_id, season_id, episode_id, watched, watched_at });
  if (!res.ok) throw new Error("Impossible d'ajouter l'épisode");
  return await res.json();
};

/**
 * Supprime une watch de la watch list.
 * @param {number} watchId - ID de la watch.
 * @returns {Promise<Object>} Résultat de la suppression.
 */
export async function removeWatch(watchId) {
  const res = await api.delete(`/watch/${watchId}`);
  if (res.status !== 200) {
    const error = new Error(res.data.message || 'Erreur lors de la suppression de la watch');
    throw error;
  }
  return res.data;
}

/**
 * Récupère la progression de visionnage d'un anime pour un utilisateur.
 * @param {number} anime_id - ID de l'anime.
 * @param {number} user_id - ID de l'utilisateur.
 * @returns {Promise<Object|null>} Objet de progression ou null en cas d'erreur.
 */
export async function getProgress(anime_id, user_id) {
  try {
    const { data } = await api.post("/watch/progress", { anime_id, user_id });
    return data;
  } catch (err) {
    console.error("Erreur lors de la récupération de la progression :", err);
    return null;
  }
}

/**
 * Marque une watch comme terminée.
 * @param {number} watch_id - ID de la watch.
 * @returns {Promise<Object>} Watch mise à jour.
 */
export async function addWatched(watch_id) {
  const res = await api.patch(`/watch/${watch_id}`, { completed: true });
  return res;
}

/**
 * Retire un anime de la watch list.
 * @param {number} watch_id - ID de la watch.
 * @returns {Promise<Object>} Résultat de la suppression.
 */
export async function removeFromWatchList(watch_id) {
  const res = await api.delete(`/watch/${watch_id}`);
  return res;
}

/**
 * Marque une saison entière comme vue.
 * @param {number} season_id - ID de la saison.
 * @returns {Promise<Object>} WatchSeason mise à jour.
 */
export const markSeasonWatched = (season_id) =>
  api.post(`/watch/season/${season_id}/complete`);

/**
 * Marque tout un anime comme vu.
 * @param {number} userId - ID de l'utilisateur.
 * @param {number} animeId - ID de l'anime.
 * @returns {Promise<Object>} Watch mise à jour.
 */
export const markAnimeWatched = async (userId, animeId) => {
  const res = await api.post(`/watch/complete/anime`, {
    user_id: userId,
    anime_id: animeId
  });
  return res;
};

/**
 * Ajoute un épisode à la watchlist d'un utilisateur.
 * @param {number} userId - ID de l'utilisateur.
 * @param {number} episode_id - ID de l'épisode.
 * @param {boolean} watched - Statut de visionnage.
 * @returns {Promise<Object>} WatchEpisode créé.
 */
export const addWatchEpisode = async (userId, episode_id, watched = false) => {
  const res = await api.post(`/watch/episode`, {
    user_id: userId,
    episode_id: episode_id,
    watched: watched,
  });
  return res;
};

/**
 * Met à jour un WatchEpisode via PUT.
 * @param {number} watchEpisodeId - ID du WatchEpisode.
 * @param {boolean} watched - Nouveau statut.
 * @returns {Promise<Object>} WatchEpisode mis à jour.
 */
export const putWatchEpisode = async (watchEpisodeId, watched) => {
  const res = await api.put(`/watch/episode/${watchEpisodeId}`, { watched });
  return res;
};

/**
 * Met à jour un WatchEpisode avec position et durée.
 * @param {number} watchEpisodeId - ID du WatchEpisode.
 * @param {boolean} watched - Statut de visionnage.
 * @param {number} position - Position actuelle en secondes.
 * @param {number} duration - Durée totale en secondes.
 * @param {boolean} finished - Statut de fin.
 * @returns {Promise<Object>} WatchEpisode mis à jour.
 */
export const updateWatchEpisode = async (watchEpisodeId, watched, position, duration, finished) => {
  const res = await api.patch(`/watch/episode/${watchEpisodeId}`, { watched, position, duration, finished });
  return res;
};

/**
 * Supprime un WatchEpisode.
 * @param {number} watchEpisodeId - ID du WatchEpisode.
 * @returns {Promise<Object>} Résultat de la suppression.
 */
export const removeWatchEpisode = async (watchEpisodeId) => {
  const res = await api.delete(`/watch/episode/${watchEpisodeId}`);
  return res;
};
