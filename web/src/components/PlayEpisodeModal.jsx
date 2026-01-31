import React, { useEffect, useRef, useState } from "react";
import { X, List, PlayCircle, Loader } from "lucide-react";
import { useSelector } from "react-redux";
import { showToast } from "../utils/alerts";
import { playAnimePlaylist } from "../controllers/anime";

/**
 * Props:
 * - isOpen
 * - onClose
 * - userId
 * - seriesName
 * - selectedEpisodes (ARRAY ORDERED)
 * - onProgress(episode, progress, silent)
 */
const PlayEpisodeModal = ({
  seriesName = "Série inconnue",
  isOpen,
  onClose,
  userId,
  selectedEpisodes = [],
  onProgress,
}) => {
  const [currentEpisodeId, setCurrentEpisodeId] = useState(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const currentEpisodeRef = useRef(null);
  const sseRef = useRef(null);
  const startedRef = useRef(false);

  const { primaryColors } = useSelector((state) => state.theme);
  const mainColor = primaryColors.main;

  /* ---------------------------------------------------
   * Sync current episode reference
   * --------------------------------------------------- */
  useEffect(() => {
    currentEpisodeRef.current =
      selectedEpisodes.find((e) => e.id === currentEpisodeId) || null;
  }, [currentEpisodeId, selectedEpisodes]);

  /* ---------------------------------------------------
   * Start playlist (SSE) once per modal open
   * --------------------------------------------------- */
  useEffect(() => {
    if (!isOpen || selectedEpisodes.length === 0) return;
    if (startedRef.current) return;

    startedRef.current = true;

    const episodeIds = selectedEpisodes.map((e) => e.id);

    const sse = playAnimePlaylist(episodeIds, userId, (data) => {
      switch (data.type) {
        case "episode-change":
          setCurrentEpisodeId(data.episodeId);
          setPosition(0);
          setDuration(0);
          break;

        case "progress": {
          const ep = currentEpisodeRef.current;
          const pos = data.position || 0;
          const dur = data.duration || 0;

          setPosition(pos);
          setDuration(dur);

          ep &&
            onProgress?.(
              ep,
              { position: pos, duration: dur, ended: false },
              false
            );
          break;
        }

        case "episode-ended": {
          const ep = currentEpisodeRef.current;

          ep && showToast(`Épisode ${ep.episode_number} terminé`);

          ep &&
            onProgress?.(
              ep,
              { position: duration, duration, ended: true },
              !data.isLastEpisode
            );

          if (data.isLastEpisode) {
            showToast("Tous les épisodes de la playlist sont terminés !");
          }

          handleClose();
          break;
        }

        case "playlist-ended":
          showToast("Playlist terminée !");
          handleClose();
          break;

        case "playlist-error":
          showToast("Erreur lors de la lecture de la playlist.");
          handleClose();
          break;

        default:
          break;
      }
    });

    sseRef.current = sse;

    return cleanup;
  }, [isOpen, userId]);

  /* ---------------------------------------------------
   * Cleanup SSE
   * --------------------------------------------------- */
  const cleanup = () => {
    try {
      sseRef.current?.close();
    } catch {}
    sseRef.current = null;
    startedRef.current = false;
  };

  const handleClose = () => {
    cleanup();
    onClose();
  };

  if (!isOpen || selectedEpisodes.length === 0) return null;

  const percent =
    duration > 0 ? Math.min((position / duration) * 100, 100) : 0;

  const currentEp = currentEpisodeRef.current;

  /* ---------------------------------------------------
   * Render
   * --------------------------------------------------- */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xl">
      <div className="relative w-[480px] rounded-2xl border border-white/10 bg-gray-800/80 p-7 text-white shadow-2xl backdrop-blur-xl">
        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-full p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
          aria-label="Fermer"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Header */}
        <div className="text-center">
          <p className="mb-1 text-sm font-medium text-white/60">
            {seriesName}
          </p>
          <h2 className="text-3xl font-bold leading-tight">
            {currentEp?.name || "Chargement de l'épisode..."}
          </h2>
        </div>

        {/* Progress */}
        <div className="my-6">
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${percent}%`,
                backgroundColor: mainColor,
              }}
            />
          </div>

          <div className="mt-2 flex justify-between text-sm font-mono text-white/80">
            <span>{formatTime(position)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          <div className="mt-3 flex items-center justify-center text-sm font-medium text-white/80">
            <Loader className="mr-2 h-4 w-4 animate-spin text-white/50" />
            Lecture de l'épisode {currentEp?.episode_number}
          </div>
        </div>

        {/* Playlist */}
        <h3 className="mb-3 mt-5 flex items-center text-lg font-semibold">
          <List className="mr-2 h-5 w-5" />
          Playlist
        </h3>

        <div className="max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-2 shadow-inner">
          {selectedEpisodes.map((ep) => {
            const isActive = ep.id === currentEpisodeId;

            return (
              <div
                key={ep.id}
                className={`mb-1 flex items-center justify-between rounded-lg p-3 transition-all ${
                  isActive
                    ? "scale-[1.01] font-semibold text-white shadow-lg"
                    : "text-white/80 hover:bg-white/10"
                }`}
                style={
                  isActive
                    ? {
                        backgroundColor: mainColor,
                        boxShadow: `0 0 10px ${mainColor}40`,
                      }
                    : {}
                }
              >
                <div className="flex-1 overflow-hidden">
                  <span className="block text-sm truncate">
                    Épisode {ep.episode_number}
                  </span>
                  <span className="block text-lg truncate">{ep.name}</span>
                </div>
                {isActive && (
                  <PlayCircle className="ml-3 h-6 w-6 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ---------------------------------------------------
 * Utils
 * --------------------------------------------------- */
function formatTime(sec = 0) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);

  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  return `${m.toString().padStart(2, "0")}:${s
    .toString()
    .padStart(2, "0")}`;
}

export default PlayEpisodeModal;
