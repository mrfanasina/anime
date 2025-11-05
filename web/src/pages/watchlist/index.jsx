import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { getCurrentUser } from "../../controllers/auth.js";
import {
  addWatched,
  removeFromWatchList,
  getWatchList,
  toggleEpisode,
  toggleSeason,
} from "../../controllers/watch.js";
import { getAnimeById } from "../../controllers/anime.js";
import TopBar from "../../components/TopBar.jsx";
import { useNavigate } from "react-router-dom";
import noImage from "../../assets/no-image-dark.png";
import {
  Play,
  Info,
  Check,
  X,
  Bookmark,
  Trash2,
  Loader2,
} from "lucide-react";
import { showToast, showConfirm } from "../../utils/alerts";

const WatchListPage = () => {
  const [user, setUser] = useState(null);
  const [watchList, setWatchList] = useState([]);
  const [expandedAnime, setExpandedAnime] = useState(null);
  const [animeDetails, setAnimeDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const { mode } = useSelector((state) => state.theme);
  const textColor = mode === "dark" ? "#fff" : "#000";
  const bgColor = mode === "dark" ? "#0f0f0f" : "#f9f9f9";
  const cardBg = mode === "dark" ? "#1e1e1e" : "#fff";
  const borderColor = mode === "dark" ? "#2e2e2e" : "#ddd";

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getWatchList(user.id)
      .then(async (list) => {
        const details = {};
        for (const w of list) {
          try {
            const anime = await getAnimeById(w.anime_id);
            details[w.id] = anime;
          } catch (err) {
            console.error("Erreur getAnimeById:", err);
          }
        }
        setAnimeDetails(details);
        setWatchList(list);
      })
      .catch(() => showToast("Erreur chargement watch-list", "error"))
      .finally(() => setLoading(false));
  }, [user]);

  const toggleAnimeExpansion = (animeId) => {
    setExpandedAnime(expandedAnime === animeId ? null : animeId);
  };

  const handleEpisodeToggle = async (episode, seasonId, animeId) => {
    try {
      const updated = await toggleEpisode(episode.id, !episode.watched);
      setWatchList((prev) =>
        prev.map((a) =>
          a.id === animeId
            ? {
                ...a,
                seasons: a.seasons?.map((s) =>
                  s.id === seasonId
                    ? {
                        ...s,
                        episodes: s.episodes.map((e) =>
                          e.id === updated.id ? updated : e
                        ),id
                      }
                    : s
                ),
              }
            : a
        )
      );
    } catch {
      showToast("Erreur de mise à jour épisode", "error");
    }
  };

  const handleSeasonToggle = async (season, animeId) => {
    try {
      const updated = await toggleSeason(season.id, !season.completed);
      setWatchList((prev) =>
        prev.map((a) =>
          a.id === animeId
            ? {
                ...a,
                seasons: a.seasons?.map((s) =>
                  s.id === updated.id
                    ? {
                        ...s,
                        completed: updated.completed,
                        episodes: s.episodes.map((e) => ({
                          ...e,
                          watched: updated.completed,
                        })),
                      }
                    : s
                ),
              }
            : a
        )
      );
    } catch {
      showToast("Erreur de mise à jour saison", "error");
    }
  };

  const handleToggleWatched = async (anime) => {
    try {
      const updated = await addWatched(anime.id);
      setWatchList((prev) =>
        prev.map((a) =>
          a.id === anime.id ? { ...a, completed: !a.completed } : a
        )
      );
      showToast(
        updated.completed
          ? `${animeDetails[anime.id]?.name || "Anime"} marqué comme vu`
          : "Marquage retiré",
        "success"
      );
    } catch {
      showToast("Erreur lors du marquage", "error");
    }
  };

  const handleDelete = async (anime) => {
    const confirmDelete = await showConfirm(`Supprimer "${animeDetails[anime.id]?.name || "cet anime"}" de ta watch-list ?`)
    if (!confirmDelete) return;

    try {
      await removeFromWatchList(anime.id);
      setWatchList((prev) => prev.filter((a) => a.id !== anime.id));
      showToast("Anime supprimé de la liste", "success");
    } catch {
      showToast("Erreur lors de la suppression", "error");
    }
  };

  // 🔹 TRI : Les non-vus en haut, les vus en bas
  const sortedWatchList = [...watchList].sort(
    (a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1)
  );

  return (
    <div
      className="min-h-screen transition-colors duration-500"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <TopBar />
      <div className="pt-24 px-4 max-w-6xl mx-auto space-y-6">
        {!user && (
          <p className="text-red-500 text-lg text-center">
            Connecte-toi pour voir ta watch-list.
          </p>
        )}

        {user && loading && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="animate-spin text-gray-500" size={32} />
          </div>
        )}

        {user && !loading && watchList.length === 0 && (
          <p className="text-gray-500 text-center text-lg">
            Ta watch-list est encore vide 💤
          </p>
        )}

        {user &&
          sortedWatchList.map((anime) => {
            const details = animeDetails[anime.id] || {};
            const hasImage = details.image_url;

            return (
              <div
                key={anime.id}
                className="rounded-2xl shadow-md overflow-hidden border transition-all hover:shadow-xl"
                style={{ backgroundColor: cardBg, borderColor }}
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Image */}
                  <div className="sm:w-[160px] w-full h-[230px] sm:h-auto overflow-hidden cursor-pointer group relative">
                    <img
                      src={hasImage ? details.image_url : noImage}
                      alt={details.name || `Anime ${anime.anime_id}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onClick={() => toggleAnimeExpansion(anime.id)}
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex justify-center items-center transition">
                      <Info size={32} color="#fff" />
                    </div>
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 p-4 space-y-3 relative">
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-semibold">
                        {details.name || `Anime ${anime.anime_id}`}
                      </h3>

                      <div
                        className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                          anime.completed
                            ? "bg-green-600 text-white"
                            : "bg-gray-500 text-white"
                        }`}
                      >
                        {anime.completed ? (
                          <>
                            <Check size={16} /> Vu
                          </>
                        ) : (
                          <>
                            <X size={16} /> Pas vu
                          </>
                        )}
                      </div>
                    </div>

                    <p className="text-sm opacity-80 line-clamp-3">
                      {details.description || "Pas de description disponible."}
                    </p>

                    <div className="flex flex-wrap gap-3 pt-2">
                      <button
                        onClick={() => navigate(`/details/${anime.anime_id}`)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-full text-sm shadow-md transition"
                      >
                        <Play size={16} /> Regarder
                      </button>

                      <button
                        onClick={() => handleToggleWatched(anime)}
                        className={`flex items-center gap-2 ${
                          anime.completed
                            ? "bg-gray-600 hover:bg-gray-700"
                            : "bg-emerald-600 hover:bg-emerald-700"
                        } text-white px-4 py-1.5 rounded-full text-sm shadow-md transition`}
                      >
                        <Bookmark size={16} />{" "}
                        {anime.completed ? "Démarquer" : "Marquer vu"}
                      </button>

                      <button
                        onClick={() => handleDelete(anime)}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-full text-sm shadow-md transition"
                      >
                        <Trash2 size={16} /> Supprimer
                      </button>
                    </div>

                    {/* Expansion */}
                    {expandedAnime === anime.id && (
                      <div className="mt-4 border-t pt-3 space-y-3">
                        {(anime.seasons || []).map((season) => (
                          <div key={season.id} className="border-b pb-2">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-semibold text-sm">
                                Saison {season.season_id}
                              </span>
                              <button
                                className={`px-2 py-1 rounded ${
                                  season.completed
                                    ? "bg-green-500"
                                    : "bg-gray-400"
                                } text-white text-sm transition`}
                                onClick={() =>
                                  handleSeasonToggle(season, anime.id)
                                }
                              >
                                {season.completed
                                  ? "Terminée"
                                  : "Non terminée"}
                              </button>
                            </div>
                            <div className="ml-4 space-y-1">
                              {(season.episodes || []).map((ep) => (
                                <label
                                  key={ep.id}
                                  className="flex items-center gap-2 text-sm cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={ep.watched}
                                    onChange={() =>
                                      handleEpisodeToggle(
                                        ep,
                                        season.id,
                                        anime.id
                                      )
                                    }
                                  />
                                  Épisode {ep.episode_id}
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default WatchListPage;
