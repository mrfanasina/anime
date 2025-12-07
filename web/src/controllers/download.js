import Swal from "sweetalert2";
import api from "../services/api";

// Recherche simple sur Nyaa
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

// Recherche d'anime téléchargeable avec mode
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

//Recuperation des episodes manquants
export const getMissingEpisodes = async (seasonId) => {
  try {
    const response = await api.get(`/episode/miss/${seasonId}`);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des épisodes manquants:", error);
    throw error;
  }
};

// Téléchargement d’un épisode avec suivi en temps réel
export const downloadEpisode = (magnetUrl, seasonId) => {
  const ws = new WebSocket(
    `ws://localhost:8000/download/download-anime/${seasonId}?magnet=${encodeURIComponent(magnetUrl)}`
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
        console.log("📡 WebSocket:", data);

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

        // Quand c’est fini
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
        console.error("❌ Erreur WebSocket:", err);
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
