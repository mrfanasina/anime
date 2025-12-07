import api from '../services/api';

// Récupère la watch list d'un utilisateur
export async function getWatchList(userId) {
  const res = await api.get(`/watch/user/${userId}`);
  if (res.status !== 200) {
    const error = new Error(res.data.message || 'Erreur lors de la récupération de la watch list');
    throw error;
  }
  console.log(res.data);
  return res.data;
}
// Récupère la watch ep list d'un watch season
export async function getDejaVuEp(season_id) {
  const res = await api.get(`watch/episode/${season_id}`);
  if (res.status !== 200) {
    const error = new Error(res.data.message || 'Erreur lors de la récupération de la watch list');
    throw error;
  }
  return res.data;
}


// Toggle un épisode regardé
export async function toggleEpisode(watchEpisodeId, watched) {
  const res = await api.patch(`/watch/episode/${watchEpisodeId}`, { watched });
  console.log(res);
  
  if (res.status !== 200) {
    const error = new Error(res.data.message || 'Erreur lors de la mise à jour de l’épisode');
    throw error;
  }
  return res.data;
}

// Toggle une saison complète
export async function toggleSeason(watchSeasonId, completed) {
  const res = await api.patch(`/watch/season/${watchSeasonId}`, { completed });
  if (res.status !== 200) {
    const error = new Error(res.data.message || 'Erreur lors de la mise à jour de la saison');
    throw error;
  }
  return res.data;
}

// Ajouter un anime à la watch list
export async function addWatch(userId, payload) {
  console.log({ ...payload, user_id: userId });

  const res = await api.post(`/watch/`, { ...payload, user_id: userId });
  if (res.status !== 200) {
    const error = new Error(res.data.message || 'Erreur lors de l’ajout à la watch list');
    throw error;
  }
  return res.data;
}

// Ajouter une saison à un anime
export async function addSeason(watchId, payload) {
  const res = await api.post(`/watch/${watchId}/season`, payload);
  if (res.status !== 200) {
    const error = new Error(res.data.message || 'Erreur lors de l’ajout de la saison');
    throw error;
  }
  return res.data;
}

// Ajouter un épisode à une saison
export async function addEpisode(watchSeasonId, payload) {
  const res = await api.post(`/watch/season/${watchSeasonId}/episode`, payload);
  if (res.status !== 200) {
    const error = new Error(res.data.message || 'Erreur lors de l’ajout de l’épisode');
    throw error;
  }
  return res.data;
}

export const addOrUpdateEpisode = async ({ user_id, anime_id, season_id, episode_id, watched, watched_at }) => {
  const res = await api.post("/watch/episode", { user_id, anime_id, season_id, episode_id, watched,watched_at });
  if (!res.ok) throw new Error("Impossible d'ajouter l'épisode");
  return await res.json();
};


export async function removeWatch(watchId) {
  const res = await api.delete(`/watch/${watchId}`);
  if (res.status !== 200) {
    const error = new Error(res.data.message || 'Erreur lors de la suppression de l’anime de la watch list');
    throw error;
  }
  return res.data;
}


export async function getProgress(anime_id, user_id) {
  try {
    const { data } = await api.post("/watch/progress", {
      anime_id,
      user_id,
    });
    return data;
  } catch (err) {
    console.error("Erreur lors de la récupération de la progression :", err);
    return null;
  }
}

export async function addWatched(watch_id) {
  const res = await api.patch(`/watch/${watch_id}`, {completed: true})
  return res
}

export async function removeFromWatchList(watch_id) {
  const res = await api.delete(`/watch/${watch_id}`)
  
}

// 🔹 Marquer une saison entière comme vue
export const markSeasonWatched = (season_id) =>
  api.post(`/watch/season/${season_id}/complete`);

// 🔹 Marquer tout l’anime comme vu
export const markAnimeWatched = (userId, animeId) => {
    api.post(`/watch/complete/anime`, {
      "user_id": userId, 
      "anime_id": animeId}
    );
}
