import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import Loader from "../../utils/Loader.jsx";
import TopBar from "../../components/TopBar.jsx";
import {
  deleteAnime,
  getAnimeById,
  getFolders,
  moveAnime,
  playAnime,
  updateAnimeInfo,
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
  updateWatchEpisode,
} from "../../controllers/watch.js";
import { showConfirm, showConfirmInf, showToast } from "../../utils/alerts.js";
import {
  downloadEpisode,
  getMissingEpisodes,
  searchDownloadableAnime,
} from "../../controllers/download.js";
import {
  Download, PlayCircle, Eye, CheckCircle2, Plus, ListChecks, ListMusic,
  Play, X, Check, Trash, CheckSquare, EyeOff, AlertCircle, Monitor,
  Loader2, RefreshCw, List, Calendar, Timer, Clock, Plane, Flower,
  Calendar1, CalendarClock, CalendarX, CalendarDays, GripVertical,
  ChevronDown, ChevronUp, Shuffle, SkipForward, ArrowUpDown, Layers,
  Copy, Link, Merge, FolderOpen, Star, Info, Film,
  Trash2
} from "lucide-react";
import PlayEpisodeModal from "../../components/PlayEpisodeModal.jsx";
import DownloadModal from "../../components/DownloadModal.jsx";
import MoveAnimeModal from "../../components/MoveAnimeModal.jsx";
import CopyAnimeModal from "../../components/CopyAnimeModal.jsx";


// ─── Composant: Badge de langue compact ───────────────────────────────────────
const LangBadge = ({ label, style }) => (
  <span
    className="text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide"
    style={style}
  >
    {label}
  </span>
);

// ─── Composant: Barre de progression circulaire ───────────────────────────────
const CircularProgress = ({ value, size = 40, color, bg }) => {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={bg} strokeWidth={3} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
};

// ─── Composant: Carte d'épisode ───────────────────────────────────────────────
const EpisodeCard = ({
  episode, season, isViewed, isInPlaylist, selectMode,
  onPlay, onTogglePlaylist, primaryColors, textColor, cardBg,
  langTag, getEpProgress, formatDuration, notInBack
}) => {
  const progress = getEpProgress(episode);
  const isSelected = isInPlaylist;

  const cardStyle = {
    backgroundColor: isSelected && !episode.finished
      ? primaryColors.main + "25"
      : episode.finished
      ? primaryColors.accent + "15"
      : cardBg,
    borderColor: isSelected
      ? primaryColors.main + "80"
      : episode.finished
      ? primaryColors.accent + "40"
      : "transparent",
    borderWidth: "1px",
    borderStyle: "solid",
    opacity: notInBack ? 0.4 : 1,
    cursor: notInBack ? "not-allowed" : "pointer",
  };

  return (
    <div
      className="relative rounded-xl p-3.5 transition-all duration-200 group select-none"
      style={cardStyle}
      onClick={() => {
        if (notInBack) return;
        if (selectMode) onTogglePlaylist(episode, season);
        else onPlay(episode, season);
      }}
    >
      {/* Coin: indicateur de statut */}
      <div className="flex items-start justify-between mb-2">
        <span
          className="text-[10px] font-black tracking-widest uppercase"
          style={{ color: primaryColors.accent + "bb" }}
        >
          Ép. {episode.episode_number}
        </span>
        <div className="flex items-center gap-1.5">
          {langTag && (
            <LangBadge
              label={langTag.label}
              style={{ backgroundColor: primaryColors.accent + "25", color: primaryColors.accent }}
            />
          )}
          {episode.finished && (
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-400">
              <Check size={10} /> VU
            </span>
          )}
        </div>
      </div>

      <h4 className="font-semibold text-sm leading-snug line-clamp-2 min-h-[2.5rem] mb-2" style={{ color: textColor }}>
        {episode.name || `Épisode ${episode.episode_number}`}
      </h4>

      {/* Barre de progression ou état */}
      {episode.duration > 0 ? (
        <div className="mt-auto">
          <div className="flex justify-between text-[10px] opacity-50 mb-1">
            <span>{formatDuration(episode.position)}</span>
            <span>{formatDuration(episode.duration)}</span>
          </div>
          <div className="w-full rounded-full overflow-hidden" style={{ height: "3px", backgroundColor: primaryColors.main + "25" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, backgroundColor: progress > 85 ? "#34d399" : primaryColors.accent }}
            />
          </div>
        </div>
      ) : notInBack ? (
        <p className="text-[10px] text-red-400 font-semibold mt-auto">Introuvable</p>
      ) : null}

      {/* Overlay de sélection */}
      {selectMode && !notInBack && (
        <div
          className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${
            isSelected ? "scale-100 opacity-100" : "scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100"
          }`}
          style={{ backgroundColor: isSelected ? primaryColors.main : primaryColors.main + "50" }}
        >
          {isSelected ? <Check size={11} color="#fff" /> : <Plus size={11} color="#fff" />}
        </div>
      )}

      {/* Hover: bouton play rapide (hors mode sélection) */}
      {!selectMode && !notInBack && (
        <div className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ backgroundColor: primaryColors.main + "15" }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: primaryColors.main }}>
            <Play size={14} fill="#fff" color="#fff" />
          </div>
        </div>
      )}
    </div>
  );
};


// ─── Composant: Panneau Playlist amélioré ─────────────────────────────────────
const PlaylistPanel = ({
  playlist, setPlaylist, onPlay, onRemoveAll,
  primaryColors, textColor, cardBg, isDark
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const handleDragStart = (i) => setDragIdx(i);
  const handleDragOver = (e, i) => { e.preventDefault(); setDragOverIdx(i); };
  const handleDrop = (i) => {
    if (dragIdx === null || dragIdx === i) { setDragIdx(null); setDragOverIdx(null); return; }
    const next = [...playlist];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(i, 0, moved);
    setPlaylist(next);
    setDragIdx(null); setDragOverIdx(null);
  };

  const shufflePlaylist = () => {
    const shuffled = [...playlist].sort(() => Math.random() - 0.5);
    setPlaylist(shuffled);
    showToast("Playlist mélangée !");
  };

  return (
    <div
      className="mt-6 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300"
      style={{
        backgroundColor: cardBg,
        border: `1px solid ${primaryColors.accent}30`,
        boxShadow: `0 8px 32px ${primaryColors.main}15`
      }}
    >
      {/* En-tête de la playlist */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
        style={{ borderBottom: isCollapsed ? "none" : `1px solid ${primaryColors.main}15` }}
        onClick={() => setIsCollapsed(v => !v)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: primaryColors.accent + "20" }}>
            <ListMusic size={16} style={{ color: primaryColors.accent }} />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: textColor }}>File de lecture</p>
            <p className="text-xs opacity-50">{playlist.length} épisode{playlist.length > 1 ? "s" : ""} · Glisser pour réordonner</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Actions rapides */}
          <button
            onClick={(e) => { e.stopPropagation(); shufflePlaylist(); }}
            className="p-2 rounded-lg transition-all hover:scale-110"
            style={{ backgroundColor: primaryColors.main + "20" }}
            title="Mélanger"
          >
            <Shuffle size={14} style={{ color: primaryColors.main }} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onPlay(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
            style={{ backgroundColor: primaryColors.main, color: "#fff" }}
          >
            <Play size={12} fill="#fff" /> Lancer
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRemoveAll(); }}
            className="p-2 rounded-lg transition-all hover:scale-110"
            style={{ backgroundColor: "#ef444420" }}
            title="Vider la playlist"
          >
            <Trash size={14} className="text-red-400" />
          </button>
          <div className="w-px h-5 opacity-20" style={{ backgroundColor: textColor }} />
          <div className="p-1 opacity-50">
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </div>
        </div>
      </div>

      {/* Liste d'épisodes (drag & drop) */}
      {!isCollapsed && (
        <div className="max-h-72 overflow-y-auto py-2">
          {playlist.map((ep, i) => (
            <div
              key={ep.id}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDrop={() => handleDrop(i)}
              className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl mb-1 group transition-all duration-150 ${dragOverIdx === i ? "scale-[1.01]" : ""}`}
              style={{
                backgroundColor: dragOverIdx === i ? primaryColors.main + "20" : isDark ? "#ffffff08" : "#00000005",
                cursor: "grab",
                border: dragOverIdx === i ? `1px dashed ${primaryColors.main}60` : "1px solid transparent"
              }}
            >
              {/* Poignée drag */}
              <GripVertical size={14} className="opacity-30 group-hover:opacity-60 flex-shrink-0 transition-opacity" />
              
              {/* Numéro */}
              <span
                className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black flex-shrink-0"
                style={{ backgroundColor: primaryColors.accent + "25", color: primaryColors.accent }}
              >
                {i + 1}
              </span>

              {/* Info épisode */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: textColor }}>
                  {ep.name || `Épisode ${ep.episode_number}`}
                </p>
                <p className="text-[10px] opacity-40">
                  {ep.season?.name || ""} · Ép. {ep.episode_number}
                </p>
              </div>

              {/* Bouton retirer */}
              <button
                onClick={() => setPlaylist(prev => prev.filter(p => p.id !== ep.id))}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all hover:scale-110"
                style={{ backgroundColor: "#ef444415" }}
              >
                <X size={12} className="text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


// ─── Composant Principal ───────────────────────────────────────────────────────
const AnimeDetails = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const playEpId = searchParams.get("play");
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
  const bgColor = isDark ? "#0d0d0d" : "#f0f0f0";
  const cardBg = isDark ? "#161616" : "#ffffff";
  const surfaceBg = isDark ? "#1c1c1c" : "#f8f8f8";
  const [viewedMap, setViewedMap] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentEpisode, setCurrentEpisode] = useState(0);
  const [optionLecture, setOptionLecture] = useState("Sur MPV");
  const navigate = useNavigate();
  const [globalProgress, setGlobalProgress] = useState(0);
  const [seasonProgress, setSeasonProgress] = useState({});
  const [playlist, setPlaylist] = useState([]);
  const [selectMode, setSelectMode] = useState(false);
  const [showNotFound, setShowNotFound] = useState(false);
  const [folders, setFolders] = useState([]);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [magnetUrl, setMagnetUrl] = useState("");
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("episodes"); // "episodes" | "downloads" | "info"
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // ─── Calcul progression ───
  useEffect(() => {
    if (!anime) return;
    const seasonProg = {};
    anime.seasons.forEach(season => {
      const totalEps = season.episodes.length;
      if (totalEps === 0) { seasonProg[season.id] = 0; return; }
      const totalProgress = season.episodes.reduce((acc, ep) => {
        if (ep.finished) return acc + 100;
        if (ep.duration > 0) return acc + Math.min(100, (ep.position / ep.duration) * 100);
        return acc;
      }, 0);
      seasonProg[season.id] = Math.floor(totalProgress / totalEps);
    });
    setSeasonProgress(seasonProg);

    let allEps = 0, allProgress = 0;
    anime.seasons.forEach(season => {
      allEps += season.episodes.length;
      allProgress += (seasonProg[season.id] || 0) * season.episodes.length;
    });
    setGlobalProgress(allEps === 0 ? 0 : Math.floor(allProgress / allEps));
    getAFolders();
  }, [anime, progressData]);

  useEffect(() => { getCurrentUser().then(setUser); }, []);

  const getAFolders = async () => {
    try { const data = await getFolders(); setFolders(data.data); } catch {}
  };

  const fetchAnime = async () => {
    try {
      const data = await getAnimeById(id, user?.id);
      setAnime(data);
      if (data.seasons?.length > 0) setSelectedSeasonId(data.seasons[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnime(); }, [id, user, isPlaying]);

  // ─── Fetch épisodes téléchargeables ───
  useEffect(() => {
    const fetchDownloadableEpisodes = async () => {
      setLoadingDownloads(true);
      setAllEpisodesLoaded(false);
      try {
        let missingEps = [];
        if (selectedSeasonId) missingEps = await getMissingEpisodes(selectedSeasonId) || [];
        setMissingEpisodes(missingEps);
        const missingSet = new Set(missingEps.map(ep => ep.episode_number));
        setMissingNumbers(missingSet);

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

        const knownUploaders = ["Judas", "T3KASHI", "DKB", "Trix"];
        episodes.sort((a, b) => {
          const aUploader = a.title.split("]")[0].split("[")[1];
          const bUploader = b.title.split("]")[0].split("[")[1];
          if (knownUploaders.includes(aUploader) && !knownUploaders.includes(bUploader)) return -1;
          if (!knownUploaders.includes(aUploader) && knownUploaders.includes(bUploader)) return 1;
          if (missingSet.has(a.episode_number) && !missingSet.has(b.episode_number)) return -1;
          if (!missingSet.has(a.episode_number) && missingSet.has(b.episode_number)) return 1;
          return getLanguagePriority(a.title) - getLanguagePriority(b.title);
        });

        setNextEpisodes(episodes.slice(0, 6));
        setDownloadableEpisodes(episodes.slice(0, 6));

        searchDownloadableAnime(id, "all").then((allResult) => {
          const allEpisodes = allResult.results || [];
          allEpisodes.sort((a, b) => {
            if (missingSet.has(a.episode_number) && !missingSet.has(b.episode_number)) return -1;
            if (!missingSet.has(a.episode_number) && missingSet.has(b.episode_number)) return 1;
            return getLanguagePriority(a.title) - getLanguagePriority(b.title);
          });
          setDownloadableEpisodes(allEpisodes);
          setAllEpisodesLoaded(true);
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingDownloads(false);
      }
    };
    if (anime) fetchDownloadableEpisodes();
  }, [id, selectedSeasonId, anime]);

  useEffect(() => {
    if (user && anime) {
      getProgress(anime.id, user.id).then(data => { if (data) setProgressData(data); });
    }
  }, [user, anime]);

  useEffect(() => {
    if (!progressData || !anime) return;
    const watchedEps = [];
    progressData.seasons.forEach(sp => {
      const season = anime.seasons.find(s => s.id === sp.season_id);
      if (!season) return;
      sp.watching_eps.forEach(epId => {
        const episode = season.episodes.find(e => e.id === epId);
        if (episode) watchedEps.push({ ...episode, season });
      });
    });
    setPlaylist(watchedEps);
  }, [progressData, anime]);

  useEffect(() => {
    if (!progressData) return;
    const map = {};
    progressData.seasons.forEach(s => { map[s.season_id] = new Set(s.watching_eps); });
    setViewedMap(map);
  }, [progressData]);

  if (loading) return <Loader />;
  if (!anime) return (
    <div style={{ backgroundColor: bgColor, minHeight: "100vh", color: textColor }}>
      <TopBar />
      <div className="text-center mt-20 text-red-500 text-xl">Anime introuvable</div>
    </div>
  );

  // ─── Helpers ───
  const markEpisodeAsViewed = (seasonId, episodeId) => {
    setViewedMap(prev => {
      const newMap = { ...prev };
      const s = new Set(prev[seasonId] || []);
      s.add(episodeId);
      newMap[seasonId] = s;
      return newMap;
    });
  };

  const handlePlayEpisode = async (episode, season) => {
    if (episode.not_found || anime.isInMountedFolder === false) return;
    if (optionLecture === "Sur MPV") {
      markEpisodeAsViewed(season.id, episode.id);
      setCurrentEpisode(episode);
      setPlaylist([{ ...episode, season }]);
      setIsPlaying(true);
    } else {
      navigate(`/play/${episode.id}`);
    }
  };

  const handleTogglePlaylist = (episode, season) => {
    if (episode.not_found) return;
    const isIn = playlist.some(p => p.id === episode.id);
    if (isIn) {
      if (user) addWatchEpisode(user.id, episode.id, false).catch(console.error);
      setPlaylist(prev => prev.filter(p => p.id !== episode.id));
    } else {
      if (user) addWatchEpisode(user.id, episode.id, true).catch(console.error);
      setPlaylist(prev => [...prev, { ...episode, season }]);
    }
  };

  const handleMarkSeasonWatched = async () => {
    if (!user || !selectedSeasonId) return;
    await markSeasonWatched(selectedSeasonId);
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
    if (!user) { showToast("Connectez-vous pour ajouter à la watch-list", "error"); return; }
    addWatch(user.id, { anime_id: anime.id, status: "watching" })
      .then(() => showToast(anime.name + " ajouté à la watch-list", "success"))
      .catch(err => showToast(err.message || "Erreur", "error"));
    const refreshed = await getProgress(anime.id, user.id);
    if (refreshed) setProgressData(refreshed);
  };

  const handleDownloadEpisode = (episode) => { setMagnetUrl(episode.magnet); setDownloadOpen(true); };

  const removeAllPlaylist = () => {
    playlist.forEach(ep => updateWatchEpisode(ep.id, false));
    showToast("File de lecture vidée");
    setPlaylist([]);
  };

  const selectAllSeason = () => {
    const season = anime.seasons.find(s => s.id === selectedSeasonId);
    if (!season) return;
    const validEps = season.episodes.filter(e => !e.not_found && anime.isInMountedFolder !== false);
    validEps.forEach(ep => {
      if (!playlist.some(p => p.id === ep.id) && user) {
        addWatchEpisode(user.id, ep.id, true).catch(console.error);
      }
    });
    setPlaylist(validEps.map(ep => ({ ...ep, season })));
    showToast(`${validEps.length} épisodes ajoutés à la file`);
  };

  const getSeasonProgress = (sId) => {
    const season = anime?.seasons?.find(s => s.id === sId);
    if (!season?.episodes?.length) return 0;
    const total = season.episodes.reduce((acc, ep) => {
      if (ep.finished) return acc + 100;
      if (ep.duration > 0) return acc + Math.min(100, (ep.position / ep.duration) * 100);
      return acc;
    }, 0);
    return Math.floor(total / season.episodes.length);
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

  const formatDuration = (seconds) => {
    const total = Math.floor(seconds);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const onDeleteAnime = () => {
    showConfirm("Supprimer cet anime ?")
      .then(async (confirmed) => {
        if (confirmed) {
          try {
            await deleteAnime(anime.id);
            showToast("Anime supprimé", "success");
            navigate("/animes");
          } catch (err) {
            showToast(err.message || "Erreur lors de la suppression", "error");
          }
        }
      });
  };
  const getEpProgress = (ep) => ep.duration > 0 ? (ep.position / ep.duration) * 100 : 0;

  const getCompactLangTag = (episode, preferredLang = "fr") => {
    const normalize = s => s?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const split = s => s ? s.split(",").map(normalize) : [];
    const langs = split(episode.audio_languages);
    const subs = split(episode.subtitles);
    const ALIASES = { fr: ["fr","fre","fra","french","francais","français"], en: ["en","eng","english"], ja: ["ja","jpn","japanese","japonais"] };
    const aliases = ALIASES[preferredLang] ?? [preferredLang];
    const isPreferred = l => aliases.includes(l);
    const hasPrefAudio = langs.some(isPreferred);
    const hasPrefSubs = subs.some(isPreferred);
    const otherAudios = langs.filter(l => !isPreferred(l));
    const otherSubs = subs.filter(s => !isPreferred(s));
    if (hasPrefAudio) return { label: preferredLang === "fr" ? (otherAudios.length > 0 || subs.length > 0 ? "VF+" : "VF") : (otherAudios.length > 0 ? preferredLang.toUpperCase() + "+" : preferredLang.toUpperCase()), hasMore: otherAudios.length > 0 || subs.length > 0, otherSubs, otherAudios };
    if (hasPrefSubs) return { label: preferredLang === "fr" ? (otherSubs.length > 0 || langs.length > 1 ? "VOSTFR+" : "VOSTFR") : (otherSubs.length > 0 || langs.length > 1 ? `VOST${preferredLang.toUpperCase()}+` : `VOST${preferredLang.toUpperCase()}`), hasMore: otherSubs.length > 0 || langs.length > 1, otherSubs, otherAudios };
    return null;
  };

  const isNotAvailable = anime.isInMountedFolder === false;
  const selectedSeason = anime.seasons?.find(s => s.id === selectedSeasonId);
  const visibleEpisodes = selectedSeason?.episodes
    ?.slice()
    .sort((a, b) => a.episode_number - b.episode_number)
    .filter(ep => showNotFound || !ep.not_found) || [];

  const SkeletonCard = () => (
    <div className="p-4 rounded-xl animate-pulse" style={{ backgroundColor: cardBg }}>
      <div className="h-3 rounded w-1/3 mb-3" style={{ backgroundColor: isDark ? "#2a2a2a" : "#e5e5e5" }} />
      <div className="h-4 rounded w-full mb-2" style={{ backgroundColor: isDark ? "#2a2a2a" : "#e5e5e5" }} />
      <div className="h-3 rounded w-2/3 mb-4" style={{ backgroundColor: isDark ? "#2a2a2a" : "#e5e5e5" }} />
      <div className="h-8 rounded-lg w-full" style={{ backgroundColor: isDark ? "#2a2a2a" : "#e5e5e5" }} />
    </div>
  );

  // ─── Rendu ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ backgroundColor: bgColor, minHeight: "100vh", color: textColor }}>
      <TopBar />

      <PlayEpisodeModal
        userId={user?.id}
        selectedEpisodes={playlist}
        isOpen={isPlaying}
        seriesName={anime.name}
        onClose={() => setIsPlaying(false)}
      />
      <DownloadModal isOpen={downloadOpen} onClose={() => setDownloadOpen(false)} magnetUrl={magnetUrl} seasonId={selectedSeasonId} />
      <MoveAnimeModal isOpen={showMoveModal} onClose={() => setShowMoveModal(false)} animeId={anime.id} animeName={anime.name} onSuccess={fetchAnime} />
      <CopyAnimeModal isOpen={showCopyModal} onClose={() => setShowCopyModal(false)} anime={anime} animeName={anime.name} onSuccess={fetchAnime} />

      {/* ── Floating Play Button ── */}
      {playlist.length > 0 && (
        <button
          onClick={() => setIsPlaying(true)}
          className="fixed right-6 bottom-6 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-2xl font-bold text-sm shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95"
          style={{
            backgroundColor: primaryColors.main,
            color: "#fff",
            boxShadow: `0 8px 32px ${primaryColors.main}60`
          }}
        >
          <Play size={16} fill="#fff" />
          Lancer ({playlist.length})
        </button>
      )}

      <div className="pt-16 pb-20 max-w-7xl mx-auto px-4">

        {/* ════════════════════════════════════════
            SECTION HERO: Image + Infos
        ════════════════════════════════════════ */}
        <div className="relative flex flex-col md:flex-row gap-8 mt-6 rounded-2xl overflow-hidden" style={{ backgroundColor: cardBg }}>

          {/* Badge disque non connecté */}
          {isNotAvailable && (
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold text-white animate-pulse" style={{ backgroundColor: "#ef4444" }}>
              <AlertCircle size={12} /> DISQUE NON CONNECTÉ
            </div>
          )}

          {/* Image */}
          <div className={`flex-shrink-0 p-6 ${isNotAvailable ? "grayscale opacity-60" : ""}`}>
            <img
              src={anime.image_url || "/default-image.jpg"}
              alt={anime.name}
              className="w-52 h-80 object-cover rounded-xl shadow-2xl"
              style={{ boxShadow: `0 16px 48px ${primaryColors.main}30` }}
            />
            <div>
              <div className="flex flex-wrap gap-3 mt-3 mb-5">
                
                {anime.type && (
                  <span className="flex items-center gap-1 px-3 rounded-lg text-xs font-bold"
                    style={{ backgroundColor: secondaryColors.accent + "15", color: secondaryColors.accent, border: `1px solid ${secondaryColors.accent}25` }}>
                    <Monitor size={11} /> {anime.type}
                  </span>
                )}
                {anime.status && (
                  <span className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide"
                    style={{ backgroundColor: secondaryColors.main + "20", color: secondaryColors.main, border: `1px solid ${secondaryColors.main}30` }}>
                    {anime.status}
                  </span>
                )}
                
                {anime.note && (
                  <div className="flex items-center gap-1.5 justify-center">
                    <Star size={14} className="text-yellow-400" fill="#facc15" />
                    <span className="font-black text-sm" style={{ color: secondaryColors.main }}>
                      {anime.note <= 10 ? anime.note : (anime.note / 10).toFixed(1)}
                    </span>
                  </div>
                )}

              </div>


            </div>

          </div>

          {/* Contenu */}
          <div className="flex flex-col justify-between flex-1 py-6 pr-6">
            <div>
              {/* Titre */}
              <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight mb-1" style={{ color: primaryColors.main }}>
                {anime.title_english || anime.name} 
              </h1>
              {anime.title_romaji && (
                <p className="text-sm opacity-40 mb-4 font-medium">{anime.title_romaji} {anime.title_nihon && `· ${anime.title_nihon}`}</p>
              )}
              <p className="text-xs opacity-30 mb-5 font-mono truncate">{anime.path}</p>

              {/* Badges d'info */}
              <div className="flex flex-wrap gap-2 mb-5">
                
                {anime.season_name && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{ backgroundColor: primaryColors.accent + "15", color: primaryColors.accent, border: `1px solid ${primaryColors.accent}25` }}>
                    <Flower size={11} /> {anime.season_name} {anime.year}
                  </span>
                )}
                {anime.diffuse_day && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{ backgroundColor: secondaryColors.accent + "15", color: secondaryColors.accent, border: `1px solid ${secondaryColors.accent}25` }}>
                    <CalendarDays size={11} /> {anime.diffuse_day}
                  </span>
                )}
                {anime.diffuse_time && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{ backgroundColor: primaryColors.main + "15", color: primaryColors.main, border: `1px solid ${primaryColors.main}25` }}>
                    <Clock size={11} /> {anime.diffuse_time}
                  </span>
                )}
                {anime.episode_count && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{ backgroundColor: primaryColors.main + "15", color: primaryColors.main, border: `1px solid ${primaryColors.main}25` }}>
                    <List size={11} /> {anime.episode_count} ép.
                  </span>
                )}
              </div>

              {/* Genres */}
              <div className="flex flex-wrap gap-1.5 mb-5">
                {anime.genres?.map(g => (
                  <span key={g} className="px-2.5 py-1 rounded-md text-xs font-medium"
                    style={{ backgroundColor: secondaryColors.accent + "12", color: secondaryColors.accent, border: `1px solid ${secondaryColors.accent}20` }}>
                    {g}
                  </span>
                ))}
                {anime.studio && (
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase"
                    style={{ backgroundColor: primaryColors.accent + "15", color: primaryColors.accent, border: `1px solid ${primaryColors.accent}25` }}>
                    {anime.studio}
                  </span>
                )}
              </div>

              {/* Synopsis */}
              <p className="text-sm leading-relaxed opacity-75 max-w-2xl line-clamp-4"
                dangerouslySetInnerHTML={{ __html: anime.description || anime.synopsis }} />
            </div>

            {/* Progression + Actions */}
            <div className="mt-6">
              {/* Barre de progression */}
              <div className="mb-5">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs font-bold uppercase tracking-widest opacity-40">Progression</p>
                  <span className="text-sm font-black" style={{ color: secondaryColors.main }}>{globalProgress}%</span>
                </div>
                <div className="w-full rounded-full overflow-hidden" style={{ height: "6px", backgroundColor: secondaryColors.main + "20" }}>
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${globalProgress}%`, backgroundColor: secondaryColors.main }}
                  />
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex flex-wrap gap-2.5">
                {/* Action principale */}
                {progressData ? (
                  <button onClick={handleMarkAnimeWatched}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-md"
                    style={{ backgroundColor: primaryColors.main + "25", color: primaryColors.main, border: `1px solid ${primaryColors.main}40` }}>
                    <CheckCircle2 size={15} /> Tout marquer vu
                  </button>
                ) : (
                  <button onClick={handleAddWatchList}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-md"
                    style={{ backgroundColor: primaryColors.main + 30  }}>
                    <Plus size={15} /> Ajouter à ma liste
                  </button>
                )}

                {/* Mise à jour */}
                <button onClick={() => { setUpdateLoading(true); updateAnimeInfo(anime.id).then(fetchAnime).finally(() => setUpdateLoading(false)); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95"
                  style={{ backgroundColor: secondaryColors.accent + "20", color: secondaryColors.accent, border: `1px solid ${secondaryColors.accent}30` }}>
                  {updateLoading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                  Mettre à jour
                </button>

                {/* Menu actions secondaires */}
                <div className="relative">
                  <button onClick={() => setShowActionsMenu(v => !v)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
                    style={{ backgroundColor: isDark ? "#2a2a2a" : "#eeeeee", color: textColor }}>
                    <FolderOpen size={15} /> Actions <ChevronDown size={13} />
                  </button>
                  {showActionsMenu && (
                    <div
                      className="absolute w-48 rounded-xl overflow-hidden shadow-2xl z-30"
                      style={{ backgroundColor: cardBg, border: `1px solid ${primaryColors.main}20` }}
                    >
                      {[
                        { label: "Déplacer", icon: <FolderOpen size={14} />, action: () => { setShowMoveModal(true); setShowActionsMenu(false); } },
                        { label: "Copier", icon: <Copy size={14} />, action: () => { setShowCopyModal(true); setShowActionsMenu(false); } },
                        { label: "Lier à un anime", icon: <Link size={14} />, action: () => { setShowCopyModal(true); setShowActionsMenu(false); } },
                        { label: "Combiner", icon: <Merge size={14} />, action: () => { setShowCopyModal(true); setShowActionsMenu(false); } },
                      ].map(item => (
                        <button key={item.label} onClick={item.action}
                          className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium transition-colors hover:opacity-80"
                          style={{ color: textColor, borderBottom: `1px solid ${primaryColors.main}10` }}>
                          <span style={{ color: primaryColors.main + "aa" }}>{item.icon}</span>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>


                {/* Supprimer */}
                <button onClick={() => { onDeleteAnime(anime.id) }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95"
                  style={{ backgroundColor: "#ef4444" + "20", color: "#ef4444" }}>
                  <Trash2 size={15} />  
                  Supprimer
                </button>

              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════
            PLAYLIST PANEL
        ════════════════════════════════════════ */}
        {playlist.length > 0 && (
          <PlaylistPanel
            playlist={playlist}
            setPlaylist={setPlaylist}
            onPlay={() => setIsPlaying(true)}
            onRemoveAll={removeAllPlaylist}
            primaryColors={primaryColors}
            textColor={textColor}
            cardBg={cardBg}
            isDark={isDark}
          />
        )}

        {/* ════════════════════════════════════════
            NAVIGATION PAR ONGLETS
        ════════════════════════════════════════ */}
        <div className="mt-8 flex gap-1 p-1 rounded-xl w-fit" style={{ backgroundColor: isDark ? "#1a1a1a" : "#e8e8e8" }}>
          {[
            { key: "episodes", label: "Épisodes", icon: <Film size={14} /> },
            { key: "downloads", label: "Téléchargements", icon: <Download size={14} /> },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
              style={{
                backgroundColor: activeTab === tab.key ? cardBg : "transparent",
                color: activeTab === tab.key ? primaryColors.main : textColor + "80",
                boxShadow: activeTab === tab.key ? "0 2px 8px rgba(0,0,0,0.15)" : "none"
              }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════
            ONGLET ÉPISODES
        ════════════════════════════════════════ */}
        {activeTab === "episodes" && (
          <div className="mt-6">
            {/* Sélecteur de saisons */}
            {anime.seasons?.length > 1 && (
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest opacity-40 mb-3">Saisons</p>
                <div className="flex flex-wrap gap-2">
                  {anime.seasons.map(season => {
                    const prog = getSeasonProgress(season.id);
                    const isActive = selectedSeasonId === season.id;
                    return (
                      <button key={season.id} onClick={() => setSelectedSeasonId(season.id)}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                        style={{
                          backgroundColor: isActive ? primaryColors.main + "25" : cardBg,
                          color: isActive ? primaryColors.main : textColor,
                          border: `1px solid ${isActive ? primaryColors.main + "50" : primaryColors.main + "15"}`
                        }}>
                        {/* Mini progress circle */}
                        <div className="relative w-8 h-8 flex items-center justify-center">
                          <CircularProgress value={prog} size={28} color={primaryColors.main} bg={primaryColors.main + "20"} />
                          <span className="absolute text-[8px] font-black" style={{ color: primaryColors.main }}>{prog}</span>
                        </div>
                        {season.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Barre d'outils épisodes */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5 p-3 rounded-xl" style={{ backgroundColor: isDark ? "#1a1a1a" : "#ebebeb" }}>
              <div className="flex items-center gap-2">
                {/* Option de lecture */}
                <select value={optionLecture} onChange={e => setOptionLecture(e.target.value)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold border transition-all"
                  style={{ backgroundColor: cardBg, color: textColor, borderColor: primaryColors.main + "30" }}>
                  <option>Sur MPV</option>
                  <option>Dans le navigateur</option>
                </select>

                {/* Toggle introuvables */}
                <button onClick={() => setShowNotFound(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: showNotFound ? primaryColors.accent + "20" : cardBg,
                    color: showNotFound ? primaryColors.accent : textColor + "80",
                    border: `1px solid ${showNotFound ? primaryColors.accent + "40" : "transparent"}`
                  }}>
                  {showNotFound ? <EyeOff size={13} /> : <Eye size={13} />}
                  {showNotFound ? "Masquer introuvables" : "Afficher introuvables"}
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Marquer saison vue */}
                {progressData && (
                  <button onClick={handleMarkSeasonWatched}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                    style={{ backgroundColor: primaryColors.accent + "15", color: primaryColors.accent, border: `1px solid ${primaryColors.accent}30` }}>
                    <CheckCircle2 size={13} /> Marquer saison vue
                  </button>
                )}

                {/* Tout sélectionner (mode sélection) */}
                {selectMode && (
                  <button onClick={selectAllSeason}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                    style={{ backgroundColor: primaryColors.main + "20", color: primaryColors.main, border: `1px solid ${primaryColors.main}35` }}>
                    <CheckSquare size={13} /> Tout sélectionner
                  </button>
                )}

                {/* Mode sélection */}
                <button onClick={() => setSelectMode(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                  style={{
                    backgroundColor: selectMode ? primaryColors.main + "30" : cardBg,
                    color: selectMode ? primaryColors.main : textColor,
                    border: `1px solid ${primaryColors.main}30`
                  }}>
                  {selectMode ? <X size={13} /> : <ListChecks size={13} />}
                  {selectMode ? "Désactiver sélection" : "Sélection multiple"}
                </button>
              </div>
            </div>

            {/* Grille d'épisodes */}
            {selectedSeason && (
              <>
                {/* Info de contexte */}
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs opacity-40 font-medium">
                    {visibleEpisodes.length} épisode{visibleEpisodes.length > 1 ? "s" : ""}
                    {selectMode && playlist.length > 0 && ` · ${playlist.length} sélectionné${playlist.length > 1 ? "s" : ""}`}
                  </p>
                  {selectMode && playlist.length > 0 && (
                    <button onClick={() => setIsPlaying(true)}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:scale-105"
                      style={{ backgroundColor: primaryColors.main, color: "#fff" }}>
                      <Play size={11} fill="#fff" /> Lancer la sélection
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                  {visibleEpisodes.map(episode => (
                    <EpisodeCard
                      key={episode.id}
                      episode={episode}
                      season={selectedSeason}
                      isViewed={viewedMap[selectedSeason.id]?.has(episode.id)}
                      isInPlaylist={playlist.some(p => p.id === episode.id)}
                      selectMode={selectMode}
                      onPlay={handlePlayEpisode}
                      onTogglePlaylist={handleTogglePlaylist}
                      primaryColors={primaryColors}
                      textColor={textColor}
                      cardBg={cardBg}
                      langTag={getCompactLangTag(episode)}
                      getEpProgress={getEpProgress}
                      formatDuration={formatDuration}
                      notInBack={episode.not_found || isNotAvailable}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════
            ONGLET TÉLÉCHARGEMENTS
        ════════════════════════════════════════ */}
        {activeTab === "downloads" && (
          <div className="mt-6">
            {/* Sous-onglets */}
            <div className="flex gap-3 mb-6 border-b" style={{ borderColor: primaryColors.main + "20" }}>
              {[{ key: "next", label: "Prochains à voir" }, { key: "all", label: "Tous les épisodes" }].map(m => (
                <button key={m.key} onClick={() => setDownloadMode(m.key)}
                  className="px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px"
                  style={{
                    borderColor: downloadMode === m.key ? primaryColors.main : "transparent",
                    color: downloadMode === m.key ? primaryColors.main : textColor + "60"
                  }}>
                  {m.label}
                </button>
              ))}
            </div>

            {loadingDownloads ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : downloadableEpisodes.length === 0 ? (
              <div className="text-center py-16 opacity-40">
                <Download size={40} className="mx-auto mb-3" />
                <p className="font-semibold">Aucun épisode téléchargeable trouvé</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {(!allEpisodesLoaded && downloadMode === "next" ? nextEpisodes : downloadableEpisodes).map((ep) => {
                    const tags = getLanguageTags(ep.title);
                    const isMissing = missingNumbers.has(ep.episode_number);
                    const uid = `${ep.title}-${ep.episode_number}-${Math.random().toString(36).substr(2, 9)}`;
                    return (
                      <div key={uid}
                        className="relative flex flex-col rounded-xl overflow-hidden transition-all hover:scale-[1.01]"
                        style={{
                          backgroundColor: cardBg,
                          border: isMissing ? `2px solid #ef4444` : `1px solid ${primaryColors.main}15`,
                          boxShadow: isMissing ? "0 0 20px #ef444430" : "none"
                        }}>
                        {isMissing && (
                          <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] px-2.5 py-1 font-bold rounded-bl-lg rounded-tr-lg z-10">
                            MANQUANT
                          </div>
                        )}

                        <div className="p-4 flex-1">
                          <div className="flex gap-1.5 text-[10px] font-bold opacity-50 mb-2">
                            <span>S{ep.season_number}</span>
                            <span>·</span>
                            <span>Ép. {ep.episode_number}</span>
                          </div>
                          <a href={ep.magnet} target="_blank" rel="noopener noreferrer"
                            className="font-semibold text-sm line-clamp-2 leading-snug hover:underline transition-colors"
                            style={{ color: primaryColors.accent }}
                            onClick={e => e.stopPropagation()}>
                            {ep.title}
                          </a>
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {tags.map((t, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                                style={{ backgroundColor: t.color }}>
                                {t.label}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: `1px solid ${primaryColors.main}10` }}>
                          <span className="text-xs opacity-50 font-medium">{ep.size || "?"}</span>
                          <button onClick={() => handleDownloadEpisode(ep)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
                            style={{ backgroundColor: primaryColors.main + "20", color: primaryColors.main }}>
                            <Download size={12} /> Télécharger
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {!allEpisodesLoaded && (
                  <div className="mt-6 flex items-center justify-center gap-2 text-xs opacity-40">
                    <Loader2 size={14} className="animate-spin" /> Chargement en cours...
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default AnimeDetails;