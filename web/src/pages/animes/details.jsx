import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import Loader from "../../utils/Loader.jsx";
import TopBar from "../../components/TopBar.jsx";
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
  getDejaVuEp,
} from "../../controllers/watch.js";
import { showConfirmInf, showToast } from "../../utils/alerts.js";
import {
  downloadEpisode,
  getMissingEpisodes,
  searchDownloadableAnime,
} from "../../controllers/download.js";
import { Download, PlayCircle, Eye, CheckCircle2 } from "lucide-react";
import PlayEpisodeModal from "../../components/PlayEpisodeModal.jsx";

const AnimeDetails = () => {
  const { id } = useParams();
  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeasonId, setSelectedSeasonId] = useState(null);
  const [user, setUser] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [downloadableEpisodes, setDownloadableEpisodes] = useState([]);
  const [nextEpisodes, setNextEpisodes] = useState([]);
  const [downloadMode, setDownloadMode] = useState("next");([]);
  const [seasonId, setSeasonId] = useState(null);
  const [loadingDownloads, setLoadingDownloads] = useState(true);
  const [allEpisodesLoaded, setAllEpisodesLoaded] = useState(false);
  const [missingEpisodes, setMissingEpisodes] = useState([]);
  const [missingNumbers, setMissingNumbers] = useState(new Set());
  const { mode, primaryColors, secondaryColors } = useSelector((state) => state.theme);
  const isDark = mode === "dark";
  const textColor = isDark ? "#f1f1f1" : "#111";
  const bgColor = isDark ? "#121212" : "#f6f6f6";
  const cardBg = isDark ? "#1f1f1f" : "#ffffff";
  const [viewedMap, setViewedMap] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [optionLecture, setOptionLecture] = useState("Sur MPV")
  const navigate = useNavigate();
  // Récuperation de l'user
  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);
  // Récuperation des animes
  useEffect(() => {
    const fetchAnime = async () => {
      try {
        console.log(user);
        
        const data = await getAnimeById(id, user?.id);
        setAnime(data);
        if (data.seasons?.length > 0) setSelectedSeasonId(data.seasons[0].id);
      } catch (err) {
        console.error("Erreur récupération anime :", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnime();
  }, [id, user, isPlaying]);

  // Récuperation des animes téléchargeable
  useEffect(() => {
    const fetchDownloadableEpisodes = async () => {
      setLoadingDownloads(true);
      setAllEpisodesLoaded(false);

      try {
        // If we have a selected season, fetch missing episodes for it.
        // Otherwise treat as no missing episodes (we can still search by anime id).
        let missingEps = [];
        if (selectedSeasonId) {
          missingEps = await getMissingEpisodes(selectedSeasonId) || [];
        }
        setMissingEpisodes(missingEps);
        const missingSet = new Set(missingEps.map(ep => ep.episode_number));
        setMissingNumbers(missingSet);

        // Call backend search using anime id (works even if there's no season)
        const nextResult = await searchDownloadableAnime(id, "next");
        setSeasonId(nextResult.season_id);

        let episodes = nextResult.results || [];

        const getLanguagePriority = (title) => {
          const upper = title.toUpperCase();
          if (/\bVF\b/.test(upper)) return 1;
          if (/\bMULTI\b/.test(upper) && !/(MULTI[-\s]?SUBS?)/.test(upper)) return 2;
          if (/\bVOSTFR\b|\bVOSTF\b/.test(upper)) return 3;
          if (/(MULTI[-\s]?SUBS?)/.test(upper)) return 4;
          return 5;
        };

        // Prioritise missing episodes, then language priority
        episodes.sort((a, b) => {
          const aIsMissing = missingSet.has(a.episode_number);
          const bIsMissing = missingSet.has(b.episode_number);

          if (aIsMissing && !bIsMissing) return -1;
          if (!aIsMissing && bIsMissing) return 1;

          return getLanguagePriority(a.title) - getLanguagePriority(b.title);
        });

        setNextEpisodes(episodes.slice(0, 6));
        setDownloadableEpisodes(episodes.slice(0, 6));

        // Background "all" fetch with same sorting
        searchDownloadableAnime(id, "all").then((allResult) => {
          const allEpisodes = allResult.results || [];
          allEpisodes.sort((a, b) => {
            const aIsMissing = missingSet.has(a.episode_number);
            const bIsMissing = missingSet.has(b.episode_number);

            if (aIsMissing && !bIsMissing) return -1;
            if (!aIsMissing && bIsMissing) return 1;

            return getLanguagePriority(a.title) - getLanguagePriority(b.title);
          });

          setDownloadableEpisodes(allEpisodes);
          setAllEpisodesLoaded(true);
        });
      } catch (err) {
        console.error("Erreur récupération épisodes téléchargeables :", err);
      } finally {
        setLoadingDownloads(false);
      }
    };

    // Run search whenever anime is loaded or selectedSeasonId changes.
    // This allows showing downloadable episodes even if the anime has no seasons.
    if (anime) {
      fetchDownloadableEpisodes();
    }
  }, [id, selectedSeasonId, anime]);
  
  // Récuperation de la progression
  useEffect(() => {
    if (user && anime) {
      getProgress(anime.id, user.id).then((data) => {
        if (data) setProgressData(data);
      });
    }
  }, [user, anime]);

  //Mettre les episodes vu
  useEffect(() => {
    if (!progressData) return;        
    const map = {};
    progressData.seasons.forEach(season => {
      map[season.season_id] = new Set(season.watched_eps);
    });

    setViewedMap(map);
  }, [progressData]);

  if (loading) return <Loader />;

  if (!anime)
    return (
      <div style={{ backgroundColor: bgColor, minHeight: "100vh", color: textColor }}>
        <TopBar />
        <div className="text-center mt-20 text-red-500 text-xl">Anime introuvable</div>
      </div>
  );

  // Mark episodes
  const markEpisodeAsViewed = (seasonId, episodeId) => {
      setViewedMap(prev => {
        const newMap = { ...prev };
        const seasonSet = new Set(prev[seasonId] || []);
        seasonSet.add(episodeId);
        newMap[seasonId] = seasonSet;
        return newMap;
      });
    };

  // Met à jour UI + backend pour un épisode marqué vu
  const markEpisodeWatchedOnBackend = async (episode, season) => {
    // Optimistic UI update (local)
    markEpisodeAsViewed(season.id, episode.id ?? `epnum-${episode.episode_number}`);

    // Update anime state seasons -> episodes (match by id or episode_number)
    setAnime((prev) => {
      if (!prev) return prev;
      const seasons = prev.seasons.map((s) => {
        if (s.id !== season.id) return s;
        return {
          ...s,
          episodes: s.episodes.map((ep) => {
            const match =
              (episode.id && ep.id === episode.id) ||
              (!episode.id && ep.episode_number === episode.episode_number);
            return match ? { ...ep, watched: true } : ep;
          }),
        };
      });
      return { ...prev, seasons };
    });

    // Mark in downloadable lists too
    setDownloadableEpisodes((prev) =>
      prev.map((ep) =>
        ep.episode_number === episode.episode_number ? { ...ep, watched: true } : ep
      )
    );
    setNextEpisodes((prev) =>
      prev.map((ep) =>
        ep.episode_number === episode.episode_number ? { ...ep, watched: true } : ep
      )
    );

    // Persist to backend and refresh progress/state from backend for consistency
    try {
      const payload = {
        user_id: user?.id,
        anime_id: anime?.id,
        season_id: season.id,
        watched: true,
      };
      if (episode.id) payload.episode_id = episode.id;
      else payload.episode_number = episode.episode_number;

      // ensure we await the save
      await addOrUpdateEpisode(payload);

      // Re-fetch progress from backend and update all dependent UI pieces
      if (user && anime) {
        const refreshed = await getProgress(anime.id, user.id);
        if (refreshed) {
          setProgressData(refreshed);

          // Rebuild viewedMap from refreshed progress (guarantees backend truth)
          const newMap = {};
          refreshed.seasons.forEach((s) => {
            newMap[s.season_id] = new Set(s.watched_eps);
          });
          setViewedMap(newMap);

          // Update anime.seasons episodes watched flags based on refreshed progress
          setAnime((prev) => {
            if (!prev) return prev;
            const seasons = prev.seasons.map((s) => {
              const progSeason = refreshed.seasons.find((ps) => ps.season_id === s.id);
              if (!progSeason) return s;
              const watchedSet = new Set(progSeason.watched_eps || []);
              return {
                ...s,
                episodes: s.episodes.map((ep) => ({
                  ...ep,
                  watched: watchedSet.has(ep.id) || watchedSet.has(ep.episode_number),
                })),
              };
            });
            return { ...prev, seasons };
          });
        }
      }
    } catch (err) {
      console.error("Erreur mise à jour watch :", err);
      // Optionnel : rollback optimistic update si besoin
    }
  };

  // Play episode on backend 
  const handlePlayOnBackend = async (episode, season) => {
    // Optimistic UI + lancement de la lecture
    setCurrentEpisode(episode);
    setIsPlaying(true);

    // Await persistence and refresh to ensure UI shows updated progression immediately
    await markEpisodeWatchedOnBackend(episode, season);
  }

  const handlePlayEpisode = async (episode, season) => {
    if (optionLecture === "Sur MPV") {
      handlePlayOnBackend(episode, season);
    } else if (optionLecture === "Dans le navigateur") {
      playInBrowser(episode);
    }
  };

  const handleMarkSeasonWatched = async (seasonId) => {
    if (!user) return;
    await markSeasonWatched(seasonId);
    showToast("Saison marquée comme vue !");
    const refreshed = await getProgress(anime.id, user.id);
    if (refreshed) setProgressData(refreshed);
  };

  const handleMarkAnimeWatched = async () => {
    if (!user) return;
    await markAnimeWatched(user.id, anime.id);
    showToast("Anime complet marqué comme vu !");
    const refreshed = await getProgress(anime.id, user.id);
    if (refreshed) setProgressData(refreshed);
  };

  const handleDownloadEpisode = (episode) => {
    downloadEpisode(episode.magnet, seasonId);
    showToast("Téléchargement lancé !");
  };

  // Handle progress updates coming from PlayEpisodeModal (periodic + final)
  const handlePlaybackProgress = async (episodeObj, data, isFinal) => {
    // Update UI immediately (positions/duration/watched)
    setAnime((prev) => {
      if (!prev) return prev;
      const seasons = prev.seasons.map((s) => {
        return {
          ...s,
          episodes: s.episodes.map((ep) => {
            const match =
              (episodeObj.id && ep.id === episodeObj.id) ||
              (!episodeObj.id && ep.episode_number === episodeObj.episode_number);
            if (!match) return ep;
            return {
              ...ep,
              position: data.position ?? ep.position,
              duration: data.duration ?? ep.duration,
              watched: data.ended ? true : ep.watched,
            };
          }),
        };
      });
      return { ...prev, seasons };
    });

    // Update downloadable lists too
    setDownloadableEpisodes((prev) =>
      prev.map((ep) =>
        ep.episode_number === episodeObj.episode_number
          ? { ...ep, position: data.position ?? ep.position, duration: data.duration ?? ep.duration, watched: data.ended ? true : ep.watched }
          : ep
      )
    );
    setNextEpisodes((prev) =>
      prev.map((ep) =>
        ep.episode_number === episodeObj.episode_number
          ? { ...ep, position: data.position ?? ep.position, duration: data.duration ?? ep.duration, watched: data.ended ? true : ep.watched }
          : ep
      )
    );

    // On final update or finished playback, persist and refresh progress from backend
    if (isFinal || data.ended) {
      try {
        const seasonContaining = anime.seasons?.find((s) =>
          s.episodes.some((ep) =>
            (episodeObj.id && ep.id === episodeObj.id) ||
            (!episodeObj.id && ep.episode_number === episodeObj.episode_number)
          )
        );

        const payload = {
          user_id: user?.id,
          anime_id: anime?.id,
          season_id: seasonContaining?.id ?? selectedSeasonId ?? null,
          position: data.position ?? 0,
          duration: data.duration ?? 0,
          watched: !!data.ended,
        };
        if (episodeObj.id) payload.episode_id = episodeObj.id;
        else payload.episode_number = episodeObj.episode_number;

        await addOrUpdateEpisode(payload);

        // refresh progress to update global and viewed sets
        if (user && anime) {
          const refreshed = await getProgress(anime.id, user.id);
          if (refreshed) {
            setProgressData(refreshed);
            const newMap = {};
            refreshed.seasons.forEach((s) => {
              newMap[s.season_id] = new Set(s.watched_eps);
            });
            setViewedMap(newMap);

            // Update anime.seasons episodes watched flags based on refreshed data
            setAnime((prev) => {
              if (!prev) return prev;
              const seasons = prev.seasons.map((s) => {
                const progSeason = refreshed.seasons.find((ps) => ps.season_id === s.id);
                if (!progSeason) return s;
                const watchedSet = new Set(progSeason.watched_eps || []);
                return {
                  ...s,
                  episodes: s.episodes.map((ep) => ({
                    ...ep,
                    watched: watchedSet.has(ep.id) || watchedSet.has(ep.episode_number),
                  })),
                };
              });
              return { ...prev, seasons };
            });
          }
        }
      } catch (err) {
        console.error("Erreur sauvegarde progression :", err);
      }
    }
  };
  
  const getSeasonProgress = (seasonId) => {
    const s = progressData?.seasons?.find((x) => x.season_id === seasonId);
    return s ? s.progress : 0;
  };

  const globalProgress = progressData?.progress || 0;

  const getLanguageTags = (title) => {
    const tags = [];
    const upper = title.toUpperCase();
    if (/\bVF\b/.test(upper)) tags.push({ label: "VF", color: "#e74c3c" });
    if (/\bVOSTFR\b|\bVOSTF\b/.test(upper)) tags.push({ label: "VOSTFR", color: "#3498db" });
    if (/(MULTI[-\s]?SUBS?)/.test(upper)) tags.push({ label: "MULTISUB", color: "#16a085" });
    else if (/\bMULTI\b/.test(upper)) tags.push({ label: "MULTI", color: "#9b59b6" });
    return tags;
  };

  // 🔹 Skeleton loader pour les épisodes téléchargeables
  const SkeletonCard = () => (
    <div
      className="p-4 rounded-lg shadow-sm animate-pulse flex flex-col justify-between"
      style={{ backgroundColor: cardBg }}
    >
      <div className="space-y-3 flex-1">
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4" />
        <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2" />
        <div className="flex gap-2 mt-2">
          <div className="h-4 w-10 bg-gray-300 dark:bg-gray-700 rounded" />
          <div className="h-4 w-16 bg-gray-300 dark:bg-gray-700 rounded" />
        </div>
      </div>
      <div className="mt-4 h-8 bg-gray-300 dark:bg-gray-700 rounded w-full" />
    </div>
  );
  const formatDuration = (seconds) => {
    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const formatted = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    return formatted

  };
  const getEpProgress = (ep) => {
    if (ep.duration === 0) return 0;
    return ep.position / ep.duration * 100
  }
  const getColorCard = (ep) => {
    const epProgress = getEpProgress(ep)    
    if (epProgress < 10) return "10"
    else if (epProgress < 20) return "15"
    else if (epProgress < 40) return "20"
    else if (epProgress < 60) return "25"
    else if (epProgress < 80) return "30"
    else if (epProgress == 100) return "60"
    else return "40"

  }
  return (
    <div style={{ backgroundColor: bgColor, minHeight: "100vh", color: textColor }}>
      <TopBar />
      <PlayEpisodeModal
        userId={user?.id}
        episode={currentEpisode}
        isOpen={isPlaying}
        onClose={() => setIsPlaying(false)}
        onProgress={handlePlaybackProgress} // <-- pass handler
      />

      <div className="pt-18 md:px-12 pb-10">
        {/* --- HEADER --- */}
        <div
          className="flex flex-col md:flex-row gap-8 p-6 rounded-xl shadow-md"
          style={{ backgroundColor: cardBg }}
        >
          <img
            src={anime.image_url || "/default-image.jpg"}
            alt={anime.name}
            className="w-[225px] h-[338px] object-cover rounded-lg shadow-md mx-auto md:mx-0"
          />
          <div className="flex flex-col justify-between flex-1">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: primaryColors.main }}>
                {anime.name}
              </h1>

              <p className="text-lg leading-relaxed">
                <span className="font-semibold">Note :</span> {anime.note || "N/A"} <br />
                <span className="font-semibold">Statut :</span> {anime.status || "Inconnu"} <br />
                {anime.studio && (
                  <>
                    <span className="font-semibold">Studio :</span> {anime.studio}
                  </>
                )}
              </p>

              <p className="mt-3 text-sm leading-relaxed opacity-90">{anime.description}</p>

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
                <span className="text-sm opacity-80">{globalProgress}%</span>
              </div>

              <button
                onClick={handleMarkAnimeWatched}
                className="mt-4 px-4 py-2 rounded-lg flex items-center gap-2 transition hover:scale-105"
                style={{ backgroundColor: primaryColors.main + "80" }}
              >
                <CheckCircle2 size={18} /> Marquer tout l’anime comme vu
              </button>
            </div>
          </div>
        </div>

        {/* --- SAISONS --- */}
        {anime.seasons?.length > 0 && (
          <div className="mt-10">
            <h2 className="text-2xl font-semibold mb-4" style={{ color: secondaryColors.accent }}>
              Saisons
            </h2>
            {/* Option de lecture */}
            <div className="mb-4">
              <label className="mr-4 font-medium">Option de lecture :</label>
              <select
                value={optionLecture}
                onChange={(e) => setOptionLecture(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600"
                style={{ backgroundColor: cardBg, color: textColor }}
              >
                <option>Sur MPV</option>
                <option>Dans le navigateur</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-4">
              {anime.seasons.map((season) => (
                <div key={season.id} className="relative">
                  <button
                    onClick={() => setSelectedSeasonId(season.id)}
                    className={`px-4 py-2 rounded-lg font-medium transition w-full shadow-sm`}
                    style={{
                      backgroundColor:
                        selectedSeasonId === season.id
                          ? primaryColors.main + "80"
                          : `${primaryColors.main}22`,
                    }}
                  >
                    {season.name} ({getSeasonProgress(season.id)}%)
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- ÉPISODES DE LA SAISON (si présente) --- */}
        {selectedSeasonId && anime.seasons?.length > 0 && (
          <div className="mt-10">
            {anime.seasons
              .filter((season) => season.id === selectedSeasonId)
              .map((season) => {
                return (
                  <div key={season.id}>

                    {/* ---- Liste d’épisodes ---- */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {season.episodes.length > 0 ? (
                        season.episodes
                        .slice()
                        .sort((a, b) => a.episode_number - b.episode_number)
                        .map((episode) => {        
                          const isViewed = viewedMap[season.id]?.has(episode.id);                  
                          return (
                            <div
                              key={episode.id}
                              className="p-4 rounded-lg shadow-md hover:shadow-xl transition-all cursor-pointer group relative"
                              style={{ backgroundColor: isViewed ? primaryColors.accent + getColorCard(episode) : cardBg }}
                              onClick={() => handlePlayEpisode(episode, season)}
                              
                            >
                              <p className="opacity-70 mb-1">Épisode {episode.episode_number}</p>

                              <div className="flex justify-between items-center mb-2">
                                <h4 className="font-semibold group-hover:text-shadow-xl transition">
                                  {episode.name}
                                </h4>
                              </div>
                              {episode.duration !=0 &&
                                <>
                                  {/* Barre de progression */}
                                  <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-1 mt-1">
                                    <div
                                      className="h-1 rounded-full transition-all"
                                      style={{
                                        width: `${getEpProgress(episode)}%`,
                                        backgroundColor: primaryColors.accent,
                                      }}
                                    />
                                  </div>
                                  <p className="text-sm opacity-70 mb-1">{formatDuration(episode.position)} - {formatDuration(episode.duration)}</p>
                                </>
                              }  

                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <PlayCircle size={16} />{optionLecture}
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <p className="text-gray-500">Aucun épisode disponible pour cette saison.</p>
                      )}
                    </div>

                    {/* ---- Épisodes téléchargeables (présent ici si saison sélectionnée) ---- */}
                    <div className="flex gap-2 my-4 ">
                      <button
                        onClick={() => setDownloadMode("next")} 
                        style={{
                          backgroundColor: downloadMode==='next' ? primaryColors.main + "60" : primaryColors.accent + "20"
                        }} 
                        className={`px-3 py-1 rounded`}
                      >Next
                      </button>
                      <button 
                        onClick={() => setDownloadMode("all")} 
                        className={`px-3 py-1 rounded`}
                        style={{
                          backgroundColor: downloadMode==='all' ? primaryColors.main + "60" : primaryColors.accent + "20"
                        }} 
                      >All
                      </button>
                    </div>
                    <div className="mt-12">
                      <h4
                        className="text-xl font-semibold mb-4 flex items-center gap-2"
                        style={{ color: primaryColors.accent }}
                      >
                        <Download size={20} /> Épisodes téléchargeables
                      </h4>

                      {loadingDownloads ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {[...Array(6)].map((_, i) => (
                            <SkeletonCard key={i} />
                          ))}
                        </div>
                      ) : downloadableEpisodes.length === 0 ? (
                        <p className="text-gray-500">Aucun épisode téléchargeable trouvé.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {(!allEpisodesLoaded && downloadMode === 'next' ? nextEpisodes : downloadableEpisodes).map((ep) => {
                            const tags = getLanguageTags(ep.title);
                            const isMissing = missingNumbers.has(ep.episode_number);

                            return (
                              <div
                                key={ep.magnet}
                                className={`p-4 rounded-lg shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${isMissing ? 'ring-2 ring-red-500' : ''}`}
                                style={{ backgroundColor: cardBg }}
                              >
                                {isMissing && (
                                  <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                    Manquant
                                  </div>
                                )}
                                <div className="flex flex-col flex-1">
                                  <a
                                    href={ep.magnet}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-blue-500 hover:underline text-sm font-medium line-clamp-2"
                                  >
                                    {ep.title}
                                  </a>

                                  <div className="text-xs opacity-70 mt-1 flex justify-between">
                                    <span>Épisode {ep.episode_number}</span>
                                    <span>{ep.size || "Taille inconnue"}</span>
                                  </div>

                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {tags.map((t, i) => (
                                      <span
                                        key={i}
                                        className="px-2 py-0.5 rounded text-xs font-semibold text-white"
                                        style={{ backgroundColor: t.color }}
                                      >
                                        {t.label}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                <button
                                  onClick={() => handleDownloadEpisode(ep)}
                                  className="mt-3 flex items-center justify-center shadow gap-1 px-3 py-2 text-sm rounded-md transition hover:scale-105"
                                  style={{ backgroundColor: isDark ? primaryColors.main + "50" : primaryColors.main + "40" }}
                                >
                                  <Download size={15} /> Télécharger
                                </button>
                              </div>
                            );
                          })}
                          {!allEpisodesLoaded && (
                            <div className="mt-4 text-center text-gray-500 italic">
                              Chargement de tous les épisodes téléchargeables...
                            </div>
                          )}

                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        )}

        {/* --- Épisodes téléchargeables quand l'anime n'a PAS de saison --- */}
        {(!anime.seasons || anime.seasons.length === 0) && (
          <div className="mt-10">
            <div className="flex gap-2 mb-4">
              <button onClick={() => setDownloadMode("next")} className={`px-3 py-1 rounded ${downloadMode==='next' ? 'bg-blue-500 text-white' : 'bg-gray-300 dark:bg-gray-700'}`}>Next</button>
              <button onClick={() => setDownloadMode("all")} className={`px-3 py-1 rounded ${downloadMode==='all' ? 'bg-blue-500 text-white' : 'bg-gray-300 dark:bg-gray-700'}`}>All</button>
            </div>

            <h4
              className="text-xl font-semibold mb-4 flex items-center gap-2"
              style={{ color: primaryColors.accent }}
            >
              <Download size={20} /> Épisodes téléchargeables
            </h4>

            {loadingDownloads ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : downloadableEpisodes.length === 0 ? (
              <p className="text-gray-500">Aucun épisode téléchargeable trouvé.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {(!allEpisodesLoaded && downloadMode === 'next' ? nextEpisodes : downloadableEpisodes).map((ep) => {
                  const tags = getLanguageTags(ep.title);
                  const isMissing = missingNumbers.has(ep.episode_number);

                  return (
                    <div
                      key={ep.magnet}
                      className={`p-4 rounded-lg shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${isMissing ? 'ring-2 ring-red-500' : ''}`}
                      style={{ backgroundColor: cardBg }}
                    >
                      {isMissing && (
                        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                          Manquant
                        </div>
                      )}
                      <div className="flex flex-col flex-1">
                        <a
                          href={ep.magnet}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-blue-500 hover:underline text-sm font-medium line-clamp-2"
                        >
                          {ep.title}
                        </a>

                        <div className="text-xs opacity-70 mt-1 flex justify-between">
                          <span>Épisode {ep.episode_number}</span>
                          <span>{ep.size || "Taille inconnue"}</span>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-2">
                          {tags.map((t, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded text-xs font-semibold text-white"
                              style={{ backgroundColor: t.color }}
                            >
                              {t.label}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDownloadEpisode(ep)}
                        className="mt-3 flex items-center justify-center shadow gap-1 px-3 py-2 text-sm rounded-md transition hover:scale-105"
                        style={{ backgroundColor: isDark ? primaryColors.main + "50" : primaryColors.main + "40" }}
                      >
                        <Download size={15} /> Télécharger
                      </button>
                    </div>
                  );
                })}
                {!allEpisodesLoaded && (
                  <div className="mt-4 text-center text-gray-500 italic">
                    Chargement de tous les épisodes téléchargeables...
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnimeDetails;
