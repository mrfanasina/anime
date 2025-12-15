import React, { useEffect, useRef, useState } from "react";
// Remplacer X par une icône plus pertinente pour la lecture/playlist
import { X, List, PlayCircle, Loader } from "lucide-react"; 
import { useSelector } from "react-redux";
import { showToast } from "../utils/alerts";
import { playAnimePlaylist } from "../controllers/anime";

/**
 * Props:
 * - isOpen
 * - onClose
 * - userId
 * - selectedEpisodes (ARRAY ORDERED) // Assumer que chaque épisode a aussi une 'series_name'
 * - onProgress(episode, progress, silent)
 */
const PlayEpisodeModal = ({
  seriesName = "Série Inconnue",
  isOpen,
  onClose,
  userId,
  selectedEpisodes = [],
  onProgress
}) => {
  // ... (Pas de changement dans les états/références)
  const [currentEpisodeId, setCurrentEpisodeId] = useState(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const currentEpisodeRef = useRef(null);
  const sseRef = useRef(null);
  const startedRef = useRef(false);

  const { primaryColors } = useSelector((state) => state.theme);
  const mainColor = primaryColors.main;
  // ... (Logique useEffect pour la synchronisation et la SSE - inchangée)

  // Sync current episode ref
  useEffect(() => {
    currentEpisodeRef.current =
      selectedEpisodes.find((e) => e.id === currentEpisodeId) || null;
  }, [currentEpisodeId, selectedEpisodes]);

  // Start playlist ONCE per open
  useEffect(() => {
    if (!isOpen || selectedEpisodes.length === 0) return;

    if (startedRef.current) return; // prevent multiple SSE
    startedRef.current = true;
    console.log("PlayEpisodeModal opened, starting playlist...", selectedEpisodes);
    const episodeIds = selectedEpisodes.map((e) => e.id);
    console.log("Starting playlist SSE for episodes:", episodeIds);
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
          //fermer la modale si c'était le dernier épisode
          if (data.isLastEpisode) {
            ep &&
              onProgress?.(
                ep,
                { position: duration, duration: duration, ended: true },
                true
              );
            showToast("Tous les épisodes de la playlist sont terminés !");
            handleClose();
          } else {
            ep &&
              onProgress?.(
                ep,
                { position: duration, duration: duration, ended: true },
                false
              );
          }   break;
        }
        //fermer la modale si on ne recoit plus rien du sse
        case "playlist-error":
          showToast("Erreur lors de la lecture de la playlist.");
          handleClose();
          break;

        //fermer la modale si la playlist est terminée
        case "playlist-ended":
          showToast("Playlist terminée !");
          handleClose();
          break;

        default:
          break;
      }
    });

    sseRef.current = sse;

    return () => {
      cleanup();
    };
  }, [isOpen, userId]);

  // Cleanup SSE
  const cleanup = () => {
    try {
      sseRef.current?.close();
    } catch {}
    sseRef.current = null;
    startedRef.current = false;
  };

  // Close modal
  const handleClose = () => {
    cleanup();
    onClose();
  };
  
  if (!isOpen || selectedEpisodes.length === 0) return null;

  const percent =
    duration > 0 ? Math.min((position / duration) * 100, 100) : 0;
  
  const currentEp = currentEpisodeRef.current;

  // Composant amélioré
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xl">
      <div className="relative w-[480px] rounded-2xl border border-white/10 bg-gray-800/80 p-7 text-white shadow-2xl backdrop-blur-xl">
        {/* Close Button - plus visible */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-full p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
          aria-label="Fermer la lecture"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Header/Title */}
        <div className="text-center">
            <p className="text-sm font-medium text-white/60 mb-1">{seriesName}</p>
            <h2 className="text-3xl font-bold leading-tight">
                {currentEp?.name || "Chargement de l'épisode..."}
            </h2>
        </div>

        {/* Progress Section */}
        <div className="my-6">
            {/* Progress Bar - plus haute */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
                <div
                    className="h-full rounded-full transition-all duration-300 ease-out"
                    style={{
                        width: `${percent}%`,
                        backgroundColor: mainColor // Utilise la couleur principale pour le remplissage
                    }}
                />
            </div>

            {/* Time Display */}
            <div className="mt-2 flex justify-between text-sm font-mono text-white/80">
                <span>{formatTime(position)}</span>
                <span>{formatTime(duration)}</span>
            </div>

            {/* Status */}
            <div className="mt-3 flex items-center justify-center text-sm font-medium text-white/80">
                <Loader className="h-4 w-4 mr-2 animate-spin text-white/50" />
                <span>Lecture en cours de l'épisode {currentEp?.episode_number}</span>
            </div>
        </div>

        {/* Playlist Section */}
        <h3 className="mb-3 mt-5 flex items-center text-lg font-semibold text-white">
            <List className="h-5 w-5 mr-2" />
            Playlist Suivante
        </h3>

        <div className="max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-2 shadow-inner">
          {selectedEpisodes.map((ep) => {
            const isActive = ep.id === currentEpisodeId;
            return (
                <div
                key={ep.id}
                className={`flex items-center justify-between rounded-lg p-3 mb-1 transition-all duration-200 ${
                    isActive
                        ? "shadow-lg scale-[1.01] font-semibold text-white"
                        : "text-white/80 hover:bg-white/10"
                }`}
                style={isActive ? { backgroundColor: mainColor, boxShadow: `0 0 10px ${mainColor}40` } : {}}
              >
                <div className="flex-1 overflow-hidden">
                    <span className="text-sm block truncate">
                        Épisode {ep.episode_number}
                    </span>
                    <span className="text-lg leading-tight truncate">
                        {ep.name}
                    </span>
                </div>
                {isActive && <PlayCircle className="h-6 w-6 ml-3 shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Fonction formatTime inchangée
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