import api from "../services/api";
const API_URL = import.meta.env.VITE_API_URL;

export const playAnime = (episodeId, onData, userId=null) => {
  
  const url = userId ? `${API_URL}player/play/${episodeId}?userId=${userId}`: `${API_URL}player/play/${episodeId}`;
  
  const evt = new EventSource(url);

  evt.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onData(data); // callback vers la UI
  };

  evt.onerror = (err) => {
    console.error("SSE error:", err);
    evt.close();
  };

  return evt; // si tu veux le fermer plus tard
};

export const streamAnime = (episodeId) => {
  return `${API_URL}player/stream/${episodeId}`;
}
export const addAnime = async (name, selectedFolder) => {
  const response = await api.post('/anime/add', {
    "name": name,
    "path": selectedFolder
  });
  return response.data;
};

export const getAnimeById = async (id, userId) => {
  const response = await api.get(`/anime/with-progress/${id}`, {
    params: { userId }
  });
  console.log(userId);
  
  return response.data;
}

export const listAnimes = async () => {
  const response = await api.get('/anime/all');
  return response.data;
}

export const getSeasonal = async () => {
  const response = await api.get('/anime/seasonal/with-season-name');
  return response.data;
}

export const getFolders = async () => {
  const response = await api.get('/anime/folders/all');
  return response

}