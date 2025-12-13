import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useSelector } from "react-redux";
import { showToast } from "../utils/alerts";
import { playAnime } from "../controllers/anime";

const PlayEpisodeModal = ({ 
    isOpen, 
    onClose, 
    userId, 
    selectedEpisodes = [],  // ← LISTE D'ÉPISODES
    onProgress 
}) => {

    const [currentIndex, setCurrentIndex] = useState(0);     // quel épisode joue ?
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [ended, setEnded] = useState(false);
    const [source, setSource] = useState(null);

    const currentEpisode = selectedEpisodes[currentIndex];
    const { primaryColors } = useSelector((state) => state.theme);
    const mainColor = primaryColors.main;

    /* ────────────────────────────────────────────────────────────────
       1) Lancer la lecture SSE quand l'épisode change
    ───────────────────────────────────────────────────────────────── */
    useEffect(() => {
        if (!isOpen || !currentEpisode?.id) return;

        const sse = playAnime(currentEpisode.id, (data) => {
            if (data.ended) {
                setEnded(true);
                setPosition(data.position || 0);
                setDuration(data.duration || 0);

                // notifier parent
                onProgress &&
                    onProgress(currentEpisode, {
                        position: data.position || 0,
                        duration: data.duration || 0,
                        ended: true,
                    }, true);

                showToast(`Épisode "${currentEpisode.name}" terminé !`);

                // PASSER À L’ÉPISODE SUIVANT AUTOMATIQUEMENT
                setTimeout(() => handleNextEpisode(), 800);
            } else {
                setPosition(data.position || 0);
                setDuration(data.duration || 0);
                
                onProgress &&
                    onProgress(currentEpisode, {
                        position: data.position || 0,
                        duration: data.duration || 0,
                        ended: false,
                    }, false);
            }
        }, userId);

        setSource(sse);

        return () => {
            try { sse && sse.close(); } catch (e) {}
        };
    }, [isOpen, currentEpisode?.id, userId]);

    /* ────────────────────────────────────────────────────────────────
       2) Passer à l'épisode suivant
    ───────────────────────────────────────────────────────────────── */
    const handleNextEpisode = () => {
        setEnded(false);
        setPosition(0);

        if (currentIndex + 1 < selectedEpisodes.length) {
            setCurrentIndex((i) => i + 1);
        } else {
            showToast("Tous les épisodes de la playlist sont terminés !");
            onClose();
        }
    };

    /* ──────────────────────────────────────────────────────────────── */

    const percent = duration > 0 ? (position / duration) * 100 : 0;

    if (!isOpen || selectedEpisodes.length === 0) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
            <div className="relative bg-white/10 border border-white/20 rounded-2xl p-6 w-[450px] shadow-2xl backdrop-blur-xl text-white">

                {/* Bouton fermer */}
                <button
                    onClick={() => {
                        onProgress &&
                            onProgress(currentEpisode, { position, duration, ended: false }, true);
                        onClose();
                    }}
                    className="absolute top-3 right-3 text-white/70 hover:text-white transition"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Titre */}
                <h2 className="text-2xl font-semibold mb-1 text-center">
                    Lecture – {currentEpisode.name}
                </h2>

                {/* Progression */}
                <div className="w-full h-4 bg-white/20 rounded-full overflow-hidden mb-2 mt-3">
                    <div
                        className="h-full rounded-full transition-all duration-200"
                        style={{ width: `${percent}%`, backgroundColor: mainColor }}
                    />
                </div>

                <div className="flex justify-between text-sm mb-2">
                    <span>{formatTime(position)}</span>
                    <span>{formatTime(duration)}</span>
                </div>

                {/* Status */}
                {!ended ? (
                    <p className="text-center text-sm mb-4 text-white/80">
                        Lecture en cours…
                    </p>
                ) : (
                    <p className="text-center text-green-400 font-medium mt-2">
                        Épisode terminé ! Lecture du suivant…
                    </p>
                )}

                {/* ────────────────────────────────────────────────
                    PLAYLIST : liste des épisodes sélectionnés
                ──────────────────────────────────────────────── */}
                <h3 className="text-lg font-semibold mt-4 mb-2">Playlist :</h3>

                <div className="max-h-40 overflow-y-auto border border-white/20 rounded-lg p-3 bg-white/5">
                    {selectedEpisodes.map((ep, index) => (
                        <div
                            key={ep.id}
                            className={`p-2 rounded-md mb-1 ${
                                index === currentIndex
                                    ? "bg-green-600/40"
                                    : "bg-white/10"
                            }`}
                        >
                            Épisode {ep.episode_number} – {ep.name}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

/* ────────────────────────────────────────────────────────────────
   Formatage du temps
────────────────────────────────────────────────────────────────── */
function formatTime(sec) {
    const minutes = Math.floor(sec / 60) || 0;
    const seconds = Math.floor(sec % 60) || 0;
    const hours = Math.floor(sec / 3600) || 0;

    if (hours > 0) {
        return `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
}

export default PlayEpisodeModal;
