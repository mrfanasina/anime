import api from "../services/api";

export const playAnime = async (path) => {
  const response = await api.post('/player/play', { path });
  return response.data;
};

export const getAnimeById = async (id) => {
  const response = await api.get(`/anime/${id}`);
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

