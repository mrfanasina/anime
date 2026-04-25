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
export const getAllAnimes = async () => {
  const response = await api.get('/anime/');
  return response.data;
}

export const getSeasonal = async () => {
  const response = await api.get('/anime/seasonal');
  return response.data;
}

export const getFolders = async () => {
  const response = await api.get('/anime/folders/all');
  return response
}
export const playAnimePlaylist = async (episodeIds, userId, onEvent) => {
  // 1️⃣ start playlist and WAIT
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

  // 2️⃣ now SSE (MPV is ready or almost ready)
  const sse = new EventSource(
    `${API_URL}player/play-playlist/stream?userId=${userId}`,
    { withCredentials: true }
  );

  sse.onmessage = (e) => {
    if (!e.data) return;
    try {
      onEvent(JSON.parse(e.data));
    } catch {}
  };

  return sse;
};


export const getEpisodeById = async (epId) => {
  const response = await api.get(`/episode/${epId}`);
  return response.data
}

export const getAnimeByEpId = async (epId) => {
  const response = await api.get(`/anime/episode/${epId}`);
  return response.data
}

export const getBackUrl = async () => {
  const response = await api.get('/system/backUrl');
  return response.data;
}

export const moveAnime = async (animeId, newPath) => {
  const response = await api.post(`/anime/move/${animeId}`, { path: newPath });
  return response.data;
}

export const updateAnimeInfo = async (animeId) => {
  const response = await api.post(`/anime/update-info/${animeId}`);
  return response.data;
}

export const updateAllAnimeInfo = async () => {
  const response = await api.get(`/anime/update-info/all`);
  return response.data;
}


export const fetchDisks = async () => {
  
  const res = await api.get("/anime/manager/disk");

  return res.data;
};

export const getNextFolder = async (path) => {
  const res = await api.post("/anime/next-folder/", { path });
  console.log("fetching disk", res.data.next_folder);
  return res.data.next_folder;
}

export const copyFile = async (payload) => {
  const res = await api.post("/anime/copy", payload)
  return res
}  

export const deleteAnime = async (animeId) => {
  const res = await api.delete(`/anime/remove-anime/${animeId}`)
  return res
}