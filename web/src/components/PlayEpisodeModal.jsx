import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useSelector } from "react-redux";
import { showToast } from "../utils/alerts";
import { playAnime } from "../controllers/anime"; 

const PlayEpisodeModal = ({ episode, isOpen, onClose, userId, onProgress }) => {
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [ended, setEnded] = useState(false);
  const [source, setSource] = useState(null);
  const { primaryColors } = useSelector((state) => state.theme);
  const mainColor = primaryColors.main;

useEffect(() => {
    if (!isOpen || !episode?.id) return;

    const sse = playAnime(episode.id, (data) => {
      if (data.ended) {
        setEnded(true);
        setPosition(data.position || 0);
        setDuration(data.duration || 0);
        // notify parent (final)
        onProgress && onProgress(episode, { position: data.position || 0, duration: data.duration || 0, ended: true }, true);
        showToast(`Épisode "${episode.name}" terminé !`);
        onClose();
      } else {
        setPosition(data.position || 0);
        setDuration(data.duration || 0);
        // notify parent with intermediate update
        onProgress && onProgress(episode, { position: data.position || 0, duration: data.duration || 0, ended: false }, false);
      }
    }, userId);

    setSource(sse);

    return () => {
      try { sse && sse.close(); } catch (e) {}
      // send a final update to parent when modal unmounts (not ended)
      onProgress && onProgress(episode, { position, duration, ended }, true);
    };
}, [isOpen, episode?.id, userId]);

  const percent = duration > 0 ? (position / duration) * 100 : 0;

  if (!isOpen || !episode) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
      <div className="relative bg-white/10 border border-white/20 rounded-2xl p-6 w-96 shadow-2xl backdrop-blur-xl text-white">
        {/* Close */}
        <button
          onClick={() => {
            // send final update on manual close
            onProgress && onProgress(episode, { position, duration, ended: false }, true);
            onClose();
          }}
          className="absolute top-3 right-3 text-white/70 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Titre avec numéro d’épisode */}
        <h2 className="text-2xl font-semibold mb-1 text-center">
          Épisode {episode.episode_number} – {episode.name}
        </h2>

        {/* Petit texte “Lecture en cours” */}
        {!ended && (
          <p className="text-center text-sm mb-4 text-white/80">
            Lecture en cours…
          </p>
        )}

        {/* Barre de progression */}
        <div className="w-full h-4 bg-white/20 rounded-full overflow-hidden mb-2">
          <div
            className="h-full rounded-full transition-all duration-200"
            style={{ width: `${percent}%`, backgroundColor: mainColor }}
          />
        </div>

        {/* Affichage temps */}
        <div className="flex justify-between text-sm mb-2">
          <span>{formatTime(position)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Message fin de lecture */}
        {ended && (
          <p className="text-center text-green-400 font-medium mt-2">
            Épisode terminé !
          </p>
        )}
      </div>
    </div>
  );
};

// Helper : convertir secondes -> mm:ss
function formatTime(sec) {
  const minutes = Math.floor(sec / 60) || 0;
  const seconds = Math.floor(sec % 60) || 0;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

export default PlayEpisodeModal;