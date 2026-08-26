/**
 * Contrôleur Download — Fonctions de recherche et téléchargement d'animes via Nyaa.
 */
import Swal from "sweetalert2";
import api from "../services/api";

const API_URL = import.meta.env.VITE_API_URL;

/**
 * Recherche simple sur Nyaa pour un terme donné.
 * @param {string} query - Terme de recherche.
 * @returns {Promise<Object>} Résultats de la recherche.
 */
export const searchNyaa = async (query) => {
  try {
    const response = await api.get("/download/nyaa-search", {
      params: { query },
    });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la recherche sur Nyaa:", error);
    throw error;
  }
};

/**
 * Recherche les torrents disponibles pour un anime sur Nyaa.
 * @param {number} animeId - ID de l'anime.
 * @param {string} mode - Mode de recherche ("next" ou "all").
 * @returns {Promise<Object>} Résultats avec les torrents correspondants.
 */
export const searchDownloadableAnime = async (animeId, mode = "next") => {
  try {
    const response = await api.get(`/download/search-downloadable-anime/${animeId}`, {
      params: { mode },
    });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la recherche d'anime téléchargeable:", error);
    throw error;
  }
};

/**
 * Récupère les numéros d'épisodes manquants pour une saison.
 * @param {number} seasonId - ID de la saison.
 * @returns {Promise<number[]>} Liste des numéros d'épisodes manquants.
 */
export const getMissingEpisodes = async (seasonId) => {
  try {
    const response = await api.get(`/episode/miss/${seasonId}`);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des épisodes manquants:", error);
    throw error;
  }
};

/**
 * Télécharge un épisode via lien magnet avec suivi de progression en temps réel.
 * Affiche une SweetAlert2 avec barre de progression.
 * 
 * @param {string} magnetUrl - Lien magnet du torrent.
 * @param {number} seasonId - ID de la saison cible.
 */
export const downloadEpisode = (magnetUrl, seasonId) => {
  const ws = new WebSocket(
    `${API_URL.replace('http', 'ws')}download/download-anime/${seasonId}?magnet=${encodeURIComponent(magnetUrl)}`
  );

  let progress = 0;
  let closed = false;

  Swal.fire({
    title: "Téléchargement en cours...",
    html: `
      <div style="margin-top:10px;">
        <div id="progressBarContainer" style="width:100%; background:#ccc; border-radius:5px; height:10px;">
          <div id="progressBar" style="width:0%; height:10px; background:#4caf50; border-radius:5px;"></div>
        </div>
        <p style="margin-top:8px;"><b id="progressText">0%</b></p>
      </div>
    `,
    allowOutsideClick: false,
    showConfirmButton: false,
    didOpen: () => {
      const progressBar = Swal.getHtmlContainer().querySelector("#progressBar");
      const progressText = Swal.getHtmlContainer().querySelector("#progressText");

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.error || data.state === "error") {
          Swal.update({
            title: "Erreur lors du téléchargement",
            icon: "error",
            html: `<p>${data.message || "Une erreur est survenue."}</p>`,
            showConfirmButton: true,
          });
          ws.close();
          return;
        }

        if (data.progress !== undefined) {
          progress = data.progress;
          progressBar.style.width = `${progress}%`;
          progressText.textContent = `${progress.toFixed(1)}% — ${data.state || ""}`;
        }

        // Téléchargement terminé
        if (data.state === "seeding" || data.progress >= 100) {
          progressBar.style.width = "100%";
          progressText.textContent = "100% — Terminé !";
          closed = true;

          Swal.fire({
            title: "Téléchargement terminé ✅",
            icon: "success",
            timer: 2500,
            timerProgressBar: true,
            showConfirmButton: false,
          });

          ws.close();
        }
      };

      ws.onerror = (err) => {
        console.error("Erreur WebSocket:", err);
        Swal.fire({
          title: "Erreur de connexion",
          text: "Impossible de communiquer avec le serveur.",
          icon: "error",
          confirmButtonText: "Fermer",
        });
      };

      ws.onclose = () => {
        if (!closed) {
          Swal.fire({
            title: "Connexion perdue",
            text: "Le téléchargement a été interrompu.",
            icon: "warning",
            confirmButtonText: "Fermer",
          });
        }
      };
    },
  });
};
