import { useState, useMemo } from "react";
import { X, CheckCircle2, ChevronRight, ChevronLeft, Play, ListChecks } from "lucide-react";
import { useSelector } from "react-redux";

const SelectModal = ({ isOpen, anime, onSelect, onClose }) => {
  const [currentSeasonId, setCurrentSeasonId] = useState(null);
  const [selectedEpisodes, setSelectedEpisodes] = useState([]);
  const { mode, primaryColors } = useSelector((state) => state.theme);

  const isDark = mode === "dark";
  const theme = {
    bg: isDark ? "#0F0F0F" : "#ffffff",
    cardBg: isDark ? "#1A1A1A" : "#F9FAFB",
    cardHover: isDark ? "#242424" : "#F3F4F6",
    text: isDark ? "#FFFFFF" : "#111827",
    textMuted: isDark ? "#9CA3AF" : "#6B7280",
    border: isDark ? "#262626" : "#E5E7EB",
    accentAlpha: primaryColors.main + "15",
  };

  const currentSeason = useMemo(
    () => anime.seasons.find((s) => s.id === currentSeasonId),
    [currentSeasonId, anime.seasons]
  );

  const toggleEpisode = (epId) => {
    setSelectedEpisodes((prev) =>
      prev.includes(epId) ? prev.filter((id) => id !== epId) : [...prev, epId]
    );
  };

  const toggleAllInSeason = (e, season) => {
    e.stopPropagation(); // Évite d'entrer dans la saison si on clique sur le bouton
    if (!season) return;
    const epIds = season.episodes.map((e) => e.id);
    const allSelected = epIds.every((id) => selectedEpisodes.includes(id));
    setSelectedEpisodes(prev => allSelected 
      ? prev.filter(id => !epIds.includes(id)) 
      : [...new Set([...prev, ...epIds])]
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop avec flou progressif */}
      <div className="fixed inset-0 z-[60] backdrop-blur-sm bg-black/60 transition-all" onClick={onClose} />

      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
        <div
          className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-[2rem] shadow-3xl pointer-events-auto overflow-hidden border animate-modal-entry"
          style={{ backgroundColor: theme.bg, borderColor: theme.border }}
        >
          {/* Header Dynamique */}
          <div className="relative p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentSeasonId && (
                <button 
                  onClick={() => setCurrentSeasonId(null)}
                  className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <ChevronLeft style={{ color: theme.text }} />
                </button>
              )}
              <div>
                <h2 className="text-xl font-black" style={{ color: theme.text }}>
                  {currentSeasonId ? currentSeason?.name : "Choisir Saisons"}
                </h2>
                <p className="text-sm font-medium opacity-60" style={{ color: theme.textMuted }}>
                  {selectedEpisodes.length > 0 ? `${selectedEpisodes.length} sélectionnés` : anime.title}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all">
              <X className="w-5 h-5" style={{ color: theme.text }} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
            <div className="grid grid-cols-1 gap-3">
              {!currentSeasonId ? (
                // --- VUE SAISONS ---
                anime.seasons.map((season) => {
                  const selCount = season.episodes.filter(ep => selectedEpisodes.includes(ep.id)).length;
                  const isFull = selCount === season.episodes.length;

                  return (
                    <div
                      key={season.id}
                      onClick={() => setCurrentSeasonId(season.id)}
                      className="group relative flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border-2 active:scale-[0.98]"
                      style={{ 
                        backgroundColor: theme.cardBg,
                        borderColor: selCount > 0 ? primaryColors.main : "transparent"
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selCount > 0 ? 'bg-primary' : 'bg-black/20'}`}
                             style={{ backgroundColor: selCount > 0 ? primaryColors.main : '' }}>
                          <ListChecks className={selCount > 0 ? "text-white" : "text-gray-500"} />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg" style={{ color: theme.text }}>{season.name}</h3>
                          <p className="text-xs font-semibold opacity-50" style={{ color: theme.text }}>
                            {selCount} / {season.episodes.length} Épisodes
                          </p>
                        </div>
                      </div>
                      
                      <button
                        onClick={(e) => toggleAllInSeason(e, season)}
                        className="relative z-10 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-tighter transition-all"
                        style={{ 
                          backgroundColor: isFull ? primaryColors.main : theme.border,
                          color: isFull ? 'white' : theme.text
                        }}
                      >
                        {isFull ? "Prêt" : "Tout cocher"}
                      </button>
                    </div>
                  );
                })
              ) : (
                // --- VUE ÉPISODES (Grid 2 colonnes) ---
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentSeason.episodes.map((ep) => {
                    const isSelected = selectedEpisodes.includes(ep.id);
                    return (
                      <button
                        key={ep.id}
                        onClick={() => toggleEpisode(ep.id)}
                        className="flex items-center gap-3 p-3 rounded-2xl border-2 transition-all active:scale-95 text-left"
                        style={{
                          borderColor: isSelected ? primaryColors.main : "transparent",
                          backgroundColor: isSelected ? theme.accentAlpha : theme.cardBg,
                        }}
                      >
                        <div className="relative shrink-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isSelected ? 'scale-110' : ''}`}
                               style={{ backgroundColor: isSelected ? primaryColors.main : theme.bg }}>
                            {isSelected ? <CheckCircle2 className="w-5 h-5 text-white" /> : <Play className="w-4 h-4 opacity-30" style={{ color: theme.text }} />}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase opacity-40" style={{ color: theme.text }}>EP {ep.episode_number}</p>
                          <p className="text-sm font-bold truncate" style={{ color: theme.text }}>{ep.name}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer Flottant */}
          <div className="p-6 mt-auto" style={{ borderTop: `1px solid ${theme.border}` }}>
            <div className="flex items-center gap-4">
              <button
                disabled={selectedEpisodes.length === 0}
                onClick={() => {
                  onSelect({ type: "episodes", episodeIds: selectedEpisodes });
                  onClose();
                }}
                className="flex-1 py-4 rounded-2xl font-black text-lg transition-all shadow-xl disabled:opacity-20 disabled:grayscale hover:brightness-110 active:scale-[0.97]"
                style={{ backgroundColor: primaryColors.main, color: "#fff" }}
              >
                Confirmer ({selectedEpisodes.length})
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 10px; }
        @keyframes modal-in {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-modal-entry { animation: modal-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </>
  );
};

export default SelectModal;