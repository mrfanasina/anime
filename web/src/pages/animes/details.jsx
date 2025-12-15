import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
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
  addWatch,
  addWatchEpisode,
} from "../../controllers/watch.js";
import { showConfirmInf, showToast } from "../../utils/alerts.js";
import {
  downloadEpisode,
  getMissingEpisodes,
  searchDownloadableAnime,
} from "../../controllers/download.js";
import { Download, PlayCircle, Eye, CheckCircle2, Plus, ListChecks, ListMusic, Play, X, Check, Trash, CheckSquare, EyeOff } from "lucide-react";
import PlayEpisodeModal from "../../components/PlayEpisodeModal.jsx";

const AnimeDetails = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams()
  const playEpId = searchParams.get("play")
  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeasonId, setSelectedSeasonId] = useState(null);
  const [user, setUser] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [downloadableEpisodes, setDownloadableEpisodes] = useState([]);
  const [nextEpisodes, setNextEpisodes] = useState([]);
  const [downloadMode, setDownloadMode] = useState("next");
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
  const notFoundBg = isDark ? "#333333" : "#dddddd";
  const [viewedMap, setViewedMap] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentEpisode, setCurrentEpisode] = useState(0);
  const [optionLecture, setOptionLecture] = useState("Sur MPV")
  const navigate = useNavigate();
  const [globalProgress, setGlobalProgress] = useState(0);
  const [seasonProgress, setSeasonProgress] = useState({}); // progression par saison (grace aux episodes)
  const [playlist, setPlaylist] = useState([]);
  const [selectMode, setSelectMode] = useState(false);
  const [showNotFound, setShowNotFound] = useState(false);

  //lire si play contient un id
  // useEffect(() => {
  //   if (playEpId) {
  //     console.log(playEpId);

  //     setCurrentEpisode(currentEpisode);
  //     setIsPlaying(true)
  //   }
  // }, [currentEpisode]);
  //Mettre a jour la progression des saisons grace aux episodes (de leur position / duration)
  
  useEffect(() => {
    if (!anime) return;
    //On recupere toute les episodes de chaque saison
    const seasonProg = {};
    anime.seasons.forEach(season => {
      let totalEps = season.episodes.length;
      let totalProgress = 0;
      season.episodes.forEach(ep => {
        const epProgress =ep.finished ? 100 : ep.duration === 0 ? 0 : (ep.position / ep.duration) * 100;
        totalProgress += epProgress;
      });
      const seasonProgress = totalEps === 0 ? 0 : Math.floor(totalProgress / totalEps);
      seasonProg[season.id] = seasonProgress;
    });
    setSeasonProgress(seasonProg);
    //Calcul de la progression globale
    let allEps = 0;
    let allProgress = 0;
    anime.seasons.forEach(season => {
      allEps += season.episodes.length;
      allProgress += (seasonProgress[season.id] || 0) * season.episodes.length;
    });
    const globalProg = allEps === 0 ? 0 : Math.floor(allProgress / allEps);
    setGlobalProgress(globalProg);
  }, [anime, progressData]);

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

  //Remplir le playlist avec les episode dans le watchlist (episode.watched == true)
  useEffect(() => {
    if (!progressData || !anime) return;
    const watchedEps = [];
    progressData.seasons.forEach(seasonProgress => {
      const season = anime.seasons.find(s => s.id === seasonProgress.season_id);
      if (!season) return;
      seasonProgress.watching_eps.forEach(episodeId => {
        const episode = season.episodes.find(e => e.id === episodeId);
        if (episode) watchedEps.push({ ...episode, season });
      });
    });
    setPlaylist(watchedEps);

  }, [progressData, anime]);
  //Mettre les episodes vu
  useEffect(() => {
    if (!progressData) return;        
    const map = {};
    progressData.seasons.forEach(season => {
      map[season.season_id] = new Set(season.watching_eps);
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

  //Play dans le navigateur
  const playInBrowser = (episode) => {
    navigate(`/play/${episode.id}`);
  }
  
  // Play episode on backend 
  const handlePlayOnBackend = async (episode, season) => {
      // Optimistic update : marque immédiatement l'épisode comme vu
      markEpisodeAsViewed(season.id, episode.id);
      setCurrentEpisode(episode);
      setPlaylist([{ ...episode, season }]); 

      setIsPlaying(true);
  }

  const handlePlayEpisode = async (episode, season) => {
    if (episode.not_found) {
      return;
    }
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


    const handleAddWatchList = async () => {
      if (!user) {
        showToast("Vous devez être connecté pour ajouter à la watch-list", "error");
        return;
      }
  
      const payload = {
        anime_id: anime.id,
        status: "watching", 
      };
  
      addWatch(user.id, payload)
        .then(() => {
          showToast(anime.name + " ajouté à la watch-list", "success");
        })
        .catch((err) => {
          console.error(err);
          showToast(err.message || "Erreur lors de l'ajout à la watch-list", "error");
        });
        const refreshed = await getProgress(anime.id, user.id);
        if (refreshed) setProgressData(refreshed);
    };
  
  const handleDownloadEpisode = (episode) => {
    downloadEpisode(episode.magnet, seasonId);
    showToast("Téléchargement lancé !");
  };

  //Recupérer la progression d'une saison grace aux episodes (position / duration)
    //recuperer les episodes de la saison pour calculer la progression avec leur position / duration
    const getSeasonProgress = (seasonId) => {
      // Calculer la progression d'une saison uniquement à partir des progressions des épisodes (position / duration)
      const season = anime?.seasons?.find((s) => s.id === seasonId);
      if (!season || !season.episodes || season.episodes.length === 0) return 0;

      const totalProgress = season.episodes.reduce((acc, ep) => {
        if (ep.duration && ep.duration > 0) {
          const pct = (ep.position / ep.duration) * 100;
          return acc + Math.max(0, Math.min(100, pct));
        }
        return acc; // episode sans durée compte pour 0%
      }, 0);

      return Math.floor(totalProgress / season.episodes.length);
    };


  const getLanguageTags = (title) => {
    const tags = [];
    const upper = title.toUpperCase();
    if (/\bVF\b/.test(upper)) tags.push({ label: "VF", color: "#e74c3c" });
    if (/\bVOSTFR\b|\bVOSTF\b/.test(upper)) tags.push({ label: "VOSTFR", color: "#3498db" });
    if (/(MULTI[-\s]?SUBS?)/.test(upper)) tags.push({ label: "MULTISUB", color: "#16a085" });
    else if (/\bMULTI\b/.test(upper)) tags.push({ label: "MULTI", color: "#9b59b6" });
    return tags;
  };
  const getLSTags = (episode) => {
    // Retourne selon les langues et sous-titres de l'episode, VF -> langue française, VOSTFR -> sous-titre français, multisub -> sous-titre multi, NOVF -> pas de VF, 
    const tags = [];
    const subs = episode.subtitles.toUpperCase()
    const langs = episode.languages.toUpperCase()

    if (/\bFR\b|\bFRE\b|\bFRENCH\b|\bFRANCAIS\b/.test(langs)) tags.push({ label: "VF", color: "#e74c3c" });
    if (/\bFR\b|\bFRE\b|\bFRENCH\b|\bFRANCAIS\b/.test(subs)) tags.push({ label: "VOSTFR", color: "#3498db" });     
    return tags;
  }

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
    const totalMinutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60;
    const secs = totalSeconds % 60;
    const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;    
    return formatted
  };
  const getEpProgress = (ep) => {
    if (ep.duration === 0) return 0;
    return ep.position / ep.duration * 100
  }
  const getColorCard = (ep) => {
    const epProgress = getEpProgress(ep)    
    if (epProgress < 10) return "15"
    else if (epProgress < 20) return "25"
    else if (epProgress < 40) return "30"
    else if (epProgress < 60) return "35"
    else if (epProgress < 80) return "40"
    else if (epProgress == 100) return "70"
    else return "50"
  }
  const startPlaylist = () => {
    console.log(playlist);
    setIsPlaying(true);
  }
  const getCompactLangTag = (episode, preferredLang = "fr") => {
    const normalize = s =>
      s
        ?.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

    const split = s => (s ? s.split(",").map(normalize) : []);

    const langs = split(episode.audio_languages);
    const subs = split(episode.subtitles);
    
    const LANG_ALIASES = {
      fr: ["fr", "fre", "fra", "french", "francais", "français"],
      en: ["en", "eng", "english"],
      ja: ["ja", "jpn", "japanese", "japonais"],
    };

    const aliases = LANG_ALIASES[preferredLang] ?? [preferredLang];

    const isPreferred = l => aliases.includes(l);

    const hasPrefAudio = langs.some(isPreferred);
    const hasPrefSubs = subs.some(isPreferred);

    const otherAudios = langs.filter(l => !isPreferred(l));
    const otherSubs = subs.filter(s => !isPreferred(s));

    /* =====================
      1️⃣ VF / VF+
      ===================== */
    if (hasPrefAudio) {
      const hasMore = otherAudios.length > 0 || subs.length > 0;
      return {
        label:
          preferredLang === "fr"
            ? hasMore ? "VF+" : "VF"
            : hasMore ? preferredLang.toUpperCase() + "+" : preferredLang.toUpperCase(),
        hasMore,
        otherSubs: otherSubs || undefined,
        otherAudios: otherAudios || undefined
        
      };
    }
    
    /* =====================
      2️⃣ VOST / VOST+
      ===================== */
    if (hasPrefSubs) {
      const hasMore = otherSubs.length > 0 || langs.length > 1;
      
      return {
        label:
          preferredLang === "fr"
            ? hasMore ? "VOSTFR+" : "VOSTFR"
            : hasMore
              ? `VOST${preferredLang.toUpperCase()}+`
              : `VOST${preferredLang.toUpperCase()}`,
        hasMore,
        otherSubs: otherSubs || undefined,
        otherAudios: otherAudios || undefined

      };
    }

    return null;
  };

  // Vider la playlist et marquer watched false dans le backend
  const removeAllPlaylist = () => {
    for (const ep of playlist) {
      // Marquer watched false dans le backend
      addWatchEpisode(user.id, {
        episode_id: ep.id,
        watched: false
      });
    }
    showToast("Playlist vidée");
    setPlaylist([]);
  };

return (
    <div style={{ backgroundColor: bgColor, minHeight: "100vh", color: textColor }}>
      <TopBar />

      {/* MODAL DE LECTURE */}
      <PlayEpisodeModal
          userId={user?.id}
          selectedEpisodes={playlist}       
          isOpen={isPlaying}
          seriesName={anime.name}
          onClose={() => setIsPlaying(false)}
      />
      {/* Floating Button */}
      <button
        onClick={startPlaylist}
        className="mt-5 px-6 py-4 backdrop-blur-2xl fixed right-6 bottom-6 z-50 rounded-xl flex items-center gap-2 font-bold transition duration-300 transform hover:scale-[1.02] shadow-lg"
        style={{ backgroundColor: primaryColors.main + "60", color: textColor }}
      >
        <Play size={18} /> Regarder les épisodes ({playlist.length})
      </button>


      <div className="pt-18 md:px-12 pb-10 max-w-7xl mx-auto"> {/* Ajout de max-w-7xl mx-auto */}
        {/* --- HEADER ANIME AMÉLIORÉ --- */}
        <div
          className="flex flex-col md:flex-row gap-8 p-6 rounded-2xl shadow-2xl overflow-hidden relative"
          style={{ backgroundColor: cardBg }}
        >
          <img
            src={anime.image_url || "/default-image.jpg"}
            alt={anime.name}
            className="object-cover rounded-xl shadow-xl flex-shrink-0 mx-auto md:mx-0"
          />
          <div className="flex flex-col justify-between flex-1">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold mb-3" style={{ color: primaryColors.main }}>
                {anime.name}
              </h1>

              {/* Badges des Titres */}
              <div className="text-sm opacity-80 mb-4">
                {anime.title_romaji && (
                  <p className="italic">Original: {anime.title_romaji} / {anime.title_nihon}</p>
                )}
                {anime.title_english && (
                  <p className="italic">Anglais: {anime.title_english}</p>
                )}
              </div>

              {/* Note & Statut en ligne */}
              <div className="flex flex-wrap items-center gap-4 mb-4 text-lg">
                {/* Note mise en évidence */}
                {anime.note && (
                  <span className="flex items-center font-bold" style={{ color: secondaryColors.main }}>
                    ⭐ {anime.note / 10} / 10
                  </span>
                )}
                <span className="font-medium px-3 py-1 rounded-full text-sm" style={{ backgroundColor: secondaryColors.accent + "30" }}>
                  {anime.status || "Inconnu"}
                </span>
                {anime.rank && (
                  <span className="font-bold text-sm opacity-80">
                    Top #{anime.rank}
                  </span>
                )}
              </div>

              {/* Badges de genres, studio, format (Nécessite le composant Badge) */}
              <div className="flex flex-wrap gap-2 mb-4 text-sm">
                  {anime.studio && <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 font-medium">{anime.studio}</span>}
                  {anime.type && <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-300 font-medium">{anime.type}</span>}
                  {anime.genres && anime.genres.map(g => (
                      <span key={g} className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 font-medium">{g}</span>
                  ))}
              </div>

              {/* Description / Synopsis */}
              <p className="mt-3 text-base leading-relaxed max-w-3xl opacity-90">
                { anime.description || anime.synopsis}
              </p>

              {/* Bar de Progression */}
              <div className="mt-6 w-full max-w-lg">
                <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-sm">Progression globale :</span>
                    <span className="text-sm font-bold" style={{ color: secondaryColors.main }}>{globalProgress}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                        className="h-2 rounded-full transition-all"
                        style={{
                            width: `${globalProgress}%`,
                            backgroundColor: secondaryColors.main,
                        }}
                    />
                </div>
              </div>

              {/* Bouton d'Action */}
              {progressData ? (
                <button
                  onClick={handleMarkAnimeWatched}
                  className="mt-6 px-6 py-3 rounded-xl flex items-center gap-2 font-bold transition duration-300 transform hover:scale-[1.02] shadow-lg"
                  style={{ backgroundColor: primaryColors.main, color: textColor }}
                >
                  <CheckCircle2 size={18} /> Marquer tout comme vu
                </button>
              ) : (
                <button
                  onClick={handleAddWatchList}
                  className="mt-6 px-6 py-3 rounded-xl flex items-center gap-2 font-bold transition duration-300 transform hover:scale-[1.02] shadow-lg"
                  style={{ backgroundColor: primaryColors.main, color: textColor }}
                >
                  <Plus size={18} /> Ajouter aux watch-list
                </button>
              )}
            </div>
          </div>
        </div>


        {/* --- PLAYLIST AMÉLIORÉE --- */}
        {playlist.length > 0 && (
          <div className="mt-8 p-5 rounded-2xl border-l-4 shadow-xl" style={{ backgroundColor: cardBg, borderColor: primaryColors.accent }}>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ color: primaryColors.accent }}>
              <ListMusic size={20} /> Playlist en attente ({playlist.length} épisodes)
            </h3>

            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2">
              {playlist.map((ep) => (
                <div
                  key={ep.id}
                  className="px-3 py-1 bg-white/10 rounded-full flex items-center gap-2 text-sm transition hover:bg-white/20"
                >
                  <span className="font-semibold">Ép. {ep.episode_number}</span> — 
                  <span className="opacity-90 truncate max-w-[150px]">{ep.name}</span>
                  <button
                    onClick={() => setPlaylist((prev) => prev.filter((p) => p.id !== ep.id))}
                    className="text-red-400 hover:text-red-300 ml-1 text-lg leading-none"
                    aria-label={`Retirer l'épisode ${ep.episode_number} de la playlist`}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:gap-4 mt-4">
            <button
              onClick={startPlaylist}
              className="mt-2 px-6 py-2 rounded-xl flex items-center gap-2 font-bold transition duration-300 transform hover:scale-[1.02] shadow-lg"
              style={{ backgroundColor: primaryColors.main, color: textColor }}
            >
              <Play size={18} /> Lancer la lecture ({playlist.length})
            </button>
            {/* Vider la playlist */}
            <button
              onClick={removeAllPlaylist}
              className="mt-2 bg-red-400 px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition duration-300 transform hover:scale-[1.02] shadow-md"
              style={{ color: textColor }}
            >
              <Trash size={18} /> Vider la playlist
            </button>
            </div>

          </div>
        )}

        {/* --- SAISONS AMÉLIORÉES --- */}
        {anime.seasons?.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-5" style={{ color: secondaryColors.accent }}>
              Sélection des Saisons
            </h2>

            <div className="flex flex-wrap gap-3">
              {anime.seasons.map((season) => (
                <button
                  key={season.id}
                  onClick={() => setSelectedSeasonId(season.id)}
                  className={`px-5 py-2 rounded-full font-medium transition duration-200 shadow-md transform hover:scale-[1.02] text-sm flex items-center gap-2`}
                  style={{
                    backgroundColor:
                      selectedSeasonId === season.id
                        ? primaryColors.main
                        : cardBg,
                    color: selectedSeasonId === season.id ? textColor : textColor,
                    border: selectedSeasonId !== season.id ? `1px solid ${primaryColors.main}40` : 'none'
                  }}
                >
                  {season.name} 
                  <span className="font-bold opacity-80">({getSeasonProgress(season.id)}%)</span>
                </button>
              ))}
            </div>
          </div>
        )}
            <h3 className="text-xl font-bold mt-4">Épisodes de la saison sélectionnée:</h3>
            {/* --- BARRE D'OUTILS & OPTIONS --- */}
            <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

              {/* ================= OPTION DE LECTURE ================= */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium opacity-80">
                  Option de lecture
                </label>

                <select
                  value={optionLecture}
                  onChange={(e) => setOptionLecture(e.target.value)}
                  className="px-4 py-2 rounded-xl text-sm border-2 transition-all focus:ring-2 focus:ring-opacity-50"
                  style={{
                    backgroundColor: cardBg,
                    color: textColor,
                    borderColor: primaryColors.main + "40",
                  }}
                >
                  <option>Sur MPV</option>
                  <option>Dans le navigateur</option>
                </select>
                {/* ================= TOGGLE EPISODES INTROUVABLES ================= */}
                <button
                  onClick={() => setShowNotFound((prev) => !prev)}
                  className="flex items-center gap-3 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all duration-300 hover:scale-[1.03]"
                  style={{
                    backgroundColor: showNotFound
                      ? primaryColors.accent + "40"
                      : cardBg,
                    color: textColor,
                    border: `1px solid ${
                      showNotFound ? primaryColors.accent : primaryColors.main
                    }40`,
                  }}
                >
                  {showNotFound ? (
                    <>
                      <EyeOff size={16} />
                      Masquer les épisodes introuvables
                    </>
                  ) : (
                    <>
                      <Eye size={16} />
                      Afficher les épisodes introuvables
                    </>
                  )}
                </button>

              </div>


              {/* ================= ACTIONS DE SÉLECTION ================= */}
              <div className="flex items-center gap-3">

                {/* TOUT SÉLECTIONNER */}
                {selectMode && (
                  <button
                    onClick={() => {
                      const seasonEpisodes = anime.seasons
                        .find((s) => s.id === selectedSeasonId)
                        ?.episodes.map((e) => e.id);

                      if (seasonEpisodes) {
                        setPlaylist(seasonEpisodes);
                      }
                    }}
                    className="px-4 py-2 rounded-xl text-sm font-medium shadow-md transition-all duration-300 hover:scale-[1.02] flex items-center gap-2"
                    style={{
                      backgroundColor: primaryColors.main + "30",
                      border: `1px solid ${primaryColors.main}40`,
                      color: textColor,
                    }}
                  >
                    <CheckSquare size={16} />
                    Tout sélectionner
                  </button>
                )}

                {/* MODE SÉLECTION MULTIPLE */}
                <button
                  onClick={() => setSelectMode((prev) => !prev)}
                  className="px-4 py-2 rounded-xl text-sm font-medium shadow-md transition-all duration-300 hover:scale-[1.02] flex items-center gap-2"
                  style={{
                    backgroundColor: selectMode
                      ? primaryColors.main + "60"
                      : cardBg,
                    border: `1px solid ${primaryColors.main}40`,
                    color: textColor,
                  }}
                >
                  {selectMode ? <X size={16} /> : <ListChecks size={16} />}
                  {selectMode ? "Désactiver la sélection" : "Sélection multiple"}
                </button>

              </div>
            </div>

        {/* --- EPISODES AMÉLIORÉS --- */}
        {selectedSeasonId && (
          <div className="mt-10">

            {anime.seasons
              .filter((s) => s.id === selectedSeasonId)
              .map((season) => (
                <div key={season.id}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">

                    {season.episodes
                      .slice()
                      .sort((a, b) => a.episode_number - b.episode_number)
                      .filter((episode) => showNotFound || !episode.not_found)
                      .map((episode) => {
                        const isViewed = viewedMap[season.id]?.has(episode.id);
                        const isInPlaylist = playlist.some((e) => e.id === episode.id);
                        const langTag = getCompactLangTag(episode);
                        let epCardBg = cardBg;
                        if (isInPlaylist && !episode.finished) epCardBg = primaryColors.main + "30";
                        else if (isViewed) epCardBg = primaryColors.accent + getColorCard(episode);
                        const langs =
                          langTag?.hasMore && langTag.otherAudios
                            ? "Language: " + episode.audio_languages
                            : undefined;

                        const subs =
                          langTag?.hasMore && langTag.otherSubs
                            ? "Sous-titres: " + episode.subtitles
                            : undefined;
                                                                    
                        return (
                          <div
                            key={episode.id}
                            className={`p-4 min-h-30 rounded-lg shadow-md  ${episode.not_found ? "opacity-40 cursor-not-allowed" : "hover:shadow-xl transition-all cursor-pointer group"} relative`}
                            style={{
                                backgroundColor: epCardBg,
                                borderColor: isInPlaylist ? primaryColors.main : 'transparent',
                            }}
                            onClick={() => {
                              if (selectMode) {
                                // sélection multiple
                                if (episode.not_found) {
                                  return
                                }
                                if (isInPlaylist) {
                                  if (user) {
                                    addWatchEpisode(user.id, episode.id, false)
                                      .then(() => {
                                        showToast(`L'épisode ${episode.episode_number} a été retiré de la watch-list`, "success");
                                      })
                                      .catch((err) => {
                                        console.error(err);
                                        showToast("Erreur lors de la mise à jour de la watch-list", "error");
                                      });
                                  }
                                  setPlaylist((prev) => prev.filter((p) => p.id !== episode.id));
                                } else {
                                  console.log(user);
                                  
                                  if (user) {
                                    addWatchEpisode(user.id, episode.id, true)
                                      .then(() => {
                                        showToast(`L'épisode ${episode.episode_number} a été ajouté à la watch-list`, "success");
                                      })
                                      .catch((err) => {
                                        console.error(err);
                                        showToast("Erreur lors de la mise à jour de la watch-list", "error");
                                      });
                                  }
                                  setPlaylist((prev) => [...prev, episode]);
                                }
                              } else {
                                // lecture classique
                                handlePlayEpisode(episode, season);
                              }
                            }}
                          >

                            {/* VUE/PLAYLIST STATUS */}
                            {selectMode && (
                              <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white font-bold transition-all ${isInPlaylist ? 'bg-indigo-500 scale-100' : 'bg-gray-700/50 scale-0 group-hover:scale-100'}`}>
                                {isInPlaylist ? <Check size={14} /> : <Plus size={14} />}
                              </div>
                            )}
                            <div className="flex justify-between">
                              <p className="text-xs font-semibold mb-1" style={{ color: primaryColors.accent }}>
                                ÉPISODE {episode.episode_number}
                              </p>
                              {langTag && (
                                <span
                                  className="text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
                                  style={{
                                    backgroundColor: primaryColors.accent + "30",
                                    color: primaryColors.accent,
                                  }}
                                  title={langs + "\n" + subs}
                                >
                                  {langTag.label}
                                </span>

                              )}
                              {episode.finished && (
                                <span className="text-green-400 text-xs font-bold">VU</span>
                              )}
                            </div>

                            <h4 className="font-bold line-clamp-2 min-h-10">
                              {episode.name}
                            </h4>

                            {/* Barre de progression/Durée */}
                            {episode.duration !== 0 && episode.duration ? (
                              <div className="mt-2">
                                <div className="w-full bg-gray-600 rounded-full h-1.5 mb-1">
                                  <div
                                    className="h-1.5 rounded-full"
                                    style={{
                                      width: `${getEpProgress(episode)}%`,
                                      backgroundColor: primaryColors.accent,
                                    }}
                                  />
                                </div>
                                <p className="text-xs opacity-70">
                                  {formatDuration(episode.position)} / {formatDuration(episode.duration)}
                                </p>
                              </div>
                            ) : episode.not_found && (
                              <>
                                <span className="text-red-500 font-bold">Introuvable</span>
                              </>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* ---- Épisodes téléchargeables AMÉLIORÉS ---- */}
        <div className="mt-12">
            <h4 className="text-2xl font-bold mb-4 flex items-center gap-3" style={{ color: primaryColors.accent }}>
                <Download size={24} /> Épisodes Téléchargeables
            </h4>

            {/* SÉLECTEUR DE MODE DE TÉLÉCHARGEMENT (Onglets) */}
            <div className="flex gap-4 mb-6 border-b border-gray-700">
                <button
                    onClick={() => setDownloadMode("next")} 
                    style={{
                        borderColor: downloadMode==='next' ? primaryColors.main : 'transparent',
                        color: downloadMode==='next' ? primaryColors.main : textColor,
                    }} 
                    className={`px-4 py-2 font-semibold transition duration-200 border-b-2 hover:text-white`}
                >
                    Prochains à voir
                </button>
                <button 
                    onClick={() => setDownloadMode("all")} 
                    className={`px-4 py-2 font-semibold transition duration-200 border-b-2 hover:text-white`}
                    style={{
                        borderColor: downloadMode==='all' ? primaryColors.main : 'transparent',
                        color: downloadMode==='all' ? primaryColors.main : textColor,
                    }} 
                >
                    Tous les épisodes
                </button>
            </div>

            {loadingDownloads ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <SkeletonCard key={i} />
                    ))}
                </div>
            ) : downloadableEpisodes.length === 0 ? (
                <p className="text-gray-500">Aucun épisode téléchargeable trouvé.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {(!allEpisodesLoaded && downloadMode === 'next' ? nextEpisodes : downloadableEpisodes).map((ep) => {
                        const tags = getLanguageTags(ep.title);
                        const isMissing = missingNumbers.has(ep.episode_number);
                        const id = `${ep.title}-${ep.episode_number}-${Math.random().toString(36).substr(2, 9)}`; // Génère un id unique avec des nombre aleatoire pour chaque episode téléchargeable
                        return (
                            <div
                                key={id}
                                className={`p-4 rounded-xl shadow-lg transition-all flex flex-col justify-between relative border ${isMissing ? 'ring-4 ring-red-500/50 border-red-500' : 'border-transparent'}`}
                                style={{ backgroundColor: cardBg }}
                            >
                                {isMissing && (
                                  <div className="absolute top-0 right-0 bg-red-600 text-white text-xs px-3 py-1 rounded-bl-xl rounded-tr-xl font-bold z-10">
                                    Ép. Manquant
                                  </div>
                                )}
                                
                                <div className="flex flex-col flex-1">
                                  <span className="text-xs font-semibold opacity-70 mb-1">
                                    Épisode {ep.episode_number}
                                  </span>
                                  <a
                                    href={ep.magnet}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-blue-400 font-medium line-clamp-2 text-base transition duration-200"
                                    style={{ color: primaryColors.accent }}
                                  >
                                    {ep.title}
                                  </a>

                                  <div className="flex flex-wrap gap-2 mt-3 mb-4">
                                    {tags.map((t, i) => (
                                      <span
                                        key={i}
                                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                                        style={{ backgroundColor: t.color, color: 'white' }}
                                      >
                                        {t.label}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                
                                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-700/50">
                                    <span className="text-sm font-medium opacity-80">{ep.size || "Taille inconnue"}</span>
                                    <button
                                      onClick={() => handleDownloadEpisode(ep)}
                                      className="flex items-center justify-center shadow-lg gap-1 px-4 py-2 text-sm rounded-full font-semibold transition duration-300 hover:opacity-90"
                                      style={{ backgroundColor: primaryColors.main, color: textColor }}
                                    >
                                      <Download size={15} /> Télécharger
                                    </button>
                                </div>
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
    </div>
  );
};

export default AnimeDetails;
