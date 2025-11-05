import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Loader from "../../utils/Loader.jsx";
import TopBar from "../../components/TopBar.jsx";
import { useSelector } from "react-redux";
import {
  getAnimeById,
  playAnime,
} from "../../controllers/anime.js";
import { getCurrentUser } from "../../controllers/auth.js";
import {
  addOrUpdateEpisode,
  getProgress,
  markSeasonWatched,
  markAnimeWatched,
} from "../../controllers/watch.js";
import { showConfirmInf, showToast } from "../../utils/alerts.js";

const AnimeDetails = () => {
  const { id } = useParams();
  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeasonId, setSelectedSeasonId] = useState(null);
  const [user, setUser] = useState(null);
  const [progressData, setProgressData] = useState(null);

  const { mode, primaryColors, secondaryColors } = useSelector(
    (state) => state.theme
  );
  const isDark = mode === "dark";
  const textColor = isDark ? "#fff" : "#000";
  const bgColor = isDark ? "#1a1a1a" : "#f9f9f9";
  const cardBg = isDark ? "#2a2a2a" : "#ffffff";

  // 🔹 Récupération utilisateur
  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  // 🔹 Récupération anime
  useEffect(() => {
    const fetchAnime = async () => {
      try {
        const data = await getAnimeById(id);
        setAnime(data);
        if (data.seasons?.length > 0) setSelectedSeasonId(data.seasons[0].id);
      } catch (err) {
        console.error("Erreur récupération anime :", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnime();
  }, [id]);

  // 🔹 Récupération progression
  useEffect(() => {
    if (user && anime) {
      getProgress(anime.id, user.id).then((data) => {
        if (data) setProgressData(data);
      });
    }
  }, [user, anime]);

  if (loading) return <Loader />;

  if (!anime)
    return (
      <div
        style={{
          backgroundColor: bgColor,
          minHeight: "100vh",
          color: textColor,
        }}
      >
        <TopBar />
        <div className="text-center mt-20 text-red-500 text-xl">
          Anime introuvable
        </div>
      </div>
    );

  // 🔹 Lecture d’un épisode
  const handlePlayEpisode = async (episode, season) => {
    showConfirmInf("Lecture en cours...");

    if (user) {
      try {
        const updatedEpisode = await addOrUpdateEpisode({
          user_id: user.id,
          anime_id: anime.id,
          season_id: season.id,
          episode_id: episode.id,
          watched: true,
        });

        // Mise à jour locale
        setAnime((prev) => ({
          ...prev,
          seasons: prev.seasons.map((s) =>
            s.id === season.id
              ? {
                  ...s,
                  episodes: s.episodes.map((e) =>
                    e.id === updatedEpisode.id ? updatedEpisode : e
                  ),
                }
              : s
          ),
        }));

        // Rafraîchir progression
        const refreshed = await getProgress(anime.id, user.id);
        if (refreshed) setProgressData(refreshed);
      } catch (err) {
        console.error("Erreur watchlist :", err);
      }
    }

    playAnime(episode.path);
  };

  // 🔹 Marquer toute une saison comme vue
  const handleMarkSeasonWatched = async (seasonId) => {
    if (!user) return;
    await markSeasonWatched(seasonId);
    showToast("Saison marquée comme vue !");
    const refreshed = await getProgress(anime.id, user.id);
    if (refreshed) setProgressData(refreshed);
  };

  // 🔹 Marquer tout l’anime comme vu
  const handleMarkAnimeWatched = async () => {
    if (!user) return;
    await markAnimeWatched(user.id, anime.id);
    showToast("Anime complet marqué comme vu !");
    const refreshed = await getProgress(anime.id, user.id);
    if (refreshed) setProgressData(refreshed);
  };

  // 🔹 Helper progression saison
  const getSeasonProgress = (seasonId) => {
    const s = progressData?.seasons?.find((x) => x.season_id === seasonId);
    return s ? s.progress : 0;
  };

  const globalProgress = progressData?.progress || 0;

  // ---- UI ----
  return (
    <div style={{ backgroundColor: bgColor, minHeight: "100vh", color: textColor }}>
      <TopBar />

      <div className="pt-18 md:px-12 pb-10">
        {/* HEADER */}
        <div
          className="flex flex-col md:flex-row gap-8 p-6 rounded-xl shadow-md"
          style={{ backgroundColor: cardBg }}
        >
          <div className="flex-shrink-0 self-center md:self-start">
            <img
              src={anime.image_url || "/default-image.jpg"}
              alt={anime.name}
              className="w-[225px] h-[338px] object-cover rounded-lg shadow-md"
            />
          </div>

          <div className="flex flex-col justify-between flex-1">
            <div>
              <h1
                className="text-3xl md:text-4xl font-bold"
                style={{ color: primaryColors.main }}
              >
                {anime.name}
              </h1>
              <p className="mt-2 text-lg">
                <span className="font-semibold">Note :</span> {anime.note || "N/A"}
                <br />
                <span className="font-semibold">Statut :</span> {anime.status || "Inconnu"}
                <br />
                {anime.studio && (
                  <>
                    <span className="font-semibold">Studio :</span> {anime.studio}
                  </>
                )}
              </p>

              <div className="mt-3">{anime.description}</div>

              {/* Progression globale */}
              <div className="mt-6">
                <span className="font-semibold">Progression globale :</span>
                <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-3 mt-1">
                  <div
                    className="h-3 rounded-full transition-all"
                    style={{
                      width: `${globalProgress}%`,
                      backgroundColor: secondaryColors.main,
                    }}
                  />
                </div>
                <span>{globalProgress}%</span>
              </div>

              {/* Bouton marquer tout vu */}
              <button
                onClick={handleMarkAnimeWatched}
                className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
              >
                ✅ Marquer tout l’anime comme vu
              </button>
            </div>
          </div>
        </div>

        {/* SAISONS */}
        {anime.seasons?.length > 0 && (
          <div className="mt-10">
            <h2
              className="text-2xl font-semibold mb-4"
              style={{ color: secondaryColors.accent }}
            >
              Saisons
            </h2>
            <div className="flex flex-wrap gap-4">
              {anime.seasons.map((season) => (
                <button
                  key={season.id}
                  onClick={() => setSelectedSeasonId(season.id)}
                  className="px-4 py-2 cursor-pointer font-medium rounded-lg transition relative"
                  style={{
                    backgroundColor:
                      selectedSeasonId === season.id
                        ? secondaryColors.main
                        : primaryColors.main + "20",
                    color: selectedSeasonId === season.id ? "#fff" : textColor,
                  }}
                >
                  {season.name} - {getSeasonProgress(season.id)}%
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkSeasonWatched(season.id);
                    }}
                    className="absolute top-1 right-1 text-xs bg-green-500 text-white rounded-full px-2 py-1"
                  >
                    Tout vu
                  </button>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ÉPISODES */}
        {selectedSeasonId && (
          <div className="mt-10">
            <h2
              className="text-2xl font-semibold mb-4"
              style={{ color: secondaryColors.accent }}
            >
              Épisodes
            </h2>
            {anime.seasons
              .filter((season) => season.id === selectedSeasonId)
              .map((season) => (
                <div key={season.id} className="mb-8">
                  <h3 className="text-xl font-semibold mb-3">{season.name}</h3>
                  {season.episodes.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {season.episodes.map((episode) => (
                        <div
                          key={episode.id}
                          onClick={() => handlePlayEpisode(episode, season)}
                          className="p-4 rounded-lg shadow hover:shadow-xl transition-transform transform hover:scale-[1.03] cursor-pointer flex flex-col justify-between group relative"
                          style={{ backgroundColor: cardBg }}
                        >
                          <div>
                            <h4 className="font-semibold group-hover:text-blue-600 transition">
                              {episode.name}
                            </h4>
                          </div>

                          {episode.watched && (
                            <span className="absolute top-2 right-2 text-xs font-bold text-white bg-green-500 px-2 py-1 rounded-full">
                              ✓ Vu
                            </span>
                          )}

                          <div className="mt-3 text-sm text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            ▶ Cliquez pour lire
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">
                      Aucun épisode disponible pour cette saison.
                    </p>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnimeDetails;
