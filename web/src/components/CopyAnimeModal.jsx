import React, { useEffect, useState, useMemo } from "react";
import { X, Folder, Layers, ClipboardCopy, Loader2, ChevronRight, CheckCircle2 } from "lucide-react";
import { useSelector } from "react-redux";
import { copyFile, getFolders } from "../controllers/anime";
import FolderPickerModal from "./FolderPickerModal";
import SelectModal from "./SelectModal";
import { showToast, showToastErr } from "../utils/alerts";

// Fonction utilitaire pour gérer l'opacité des couleurs hexadécimales du store
const hexToRgba = (hex, opacity) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const CopyAnimeModal = ({ isOpen, onClose, anime, animeName, onSuccess }) => {
  const [folders, setFolders] = useState([]);
  const [basePath, setBasePath] = useState("");
  const [loading, setLoading] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [finalPath, setFinalPath] = useState("");
  const [selection, setSelection] = useState({ type: "all", episodeIds: [] });

  // Extraction des couleurs du thème Redux
  const { primaryColors, secondaryColors, mode } = useSelector((state) => state.theme);
  const pColor = primaryColors?.main || "#3b82f6";
  const sColor = secondaryColors?.main || "#a878e0";
  const isDark = mode === "dark";

  useEffect(() => {
    if (!isOpen) return;  
    const fetchFolders = async () => {
      try {
        const res = await getFolders();
        if (res.data?.length) {
          setFolders(res.data);
          const defaultFolder = res.data[0];
          setBasePath(defaultFolder.path);
          setFinalPath(`${defaultFolder.path}/${defaultFolder.folder[0] || "ANIME"}`);
        }
      } catch (err) {
        console.error("Erreur dossiers:", err);
      }
    };
    fetchFolders();
  }, [isOpen]);

  const selectionLabel = useMemo(() => {
    if (selection.type === "all") return "Tout l'anime (Saisons & OAV)";
    const count = selection.episodeIds?.length || 0;
    return `${count} épisode${count > 1 ? "s" : ""} sélectionné${count > 1 ? "s" : ""}`;
  }, [selection]);

  const handleMove = async () => {
    if (!finalPath) return;
    setLoading(true);
    try {
      const payload = { animeId: anime.id, targetPath: finalPath, selection };
      console.log("Envoi de la copie:", payload);
      await copyFile(payload)
      onSuccess?.();
      showToast(`${anime.name} copié vers ${targetPath}`)
      onClose();
    } catch (err) {
      showToastErr("Erreur de copie")
      console.error("Erreur copie:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-md z-50 p-4 animate-in fade-in duration-300">
      
      <FolderPickerModal
        isOpen={showFolderPicker}
        startPath={basePath}
        onSelect={(path) => { setFinalPath(path); setShowFolderPicker(false); }}
        onClose={() => setShowFolderPicker(false)}
      />
      <SelectModal
        isOpen={showSelectModal}
        anime={anime}
        onSelect={(data) => { setSelection(data); setShowSelectModal(false); }}
        onClose={() => setShowSelectModal(false)}
      />

      <div className={`relative ${isDark ? 'bg-zinc-950 border-white/10' : 'bg-white border-zinc-200'} border rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl transition-colors duration-300`}>
        
        {/* Header avec Dégradé Dynamique */}
        <div className="p-8 pb-6 relative">
          <button
            onClick={onClose}
            className={`absolute top-6 right-6 p-2 rounded-full transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-black/5 hover:bg-black/10 text-black'}`}
          >
            <X className="w-5 h-5 opacity-60" />
          </button>

          <div className="flex items-center gap-5">
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3"
              style={{ background: `linear-gradient(135deg, ${pColor}, ${sColor})` }}
            >
              <ClipboardCopy className="w-7 h-7 text-white" />
            </div>

            <div className="flex flex-col">
              <h2 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                Copier l’œuvre
              </h2>
              <p className={`text-sm font-medium truncate max-w-[200px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                {animeName}
              </p>
            </div>
          </div>
        </div>

        {/* Corps du Modal */}
        <div className="px-8 py-2 space-y-5">
          
          {/* Section: Destination */}
          <div className=" space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Destination</label>
              {finalPath && <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-in zoom-in" />}
            </div>
            <button
              onClick={() => setShowFolderPicker(true)}
              className={`group w-full flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-[0.97] ${
                isDark ? 'bg-zinc-900/40 border-white/5 hover:border-white/20' : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
              }`}
              style={{ '--hover-border': pColor }}
            >
              <div 
                className="p-3 rounded-xl transition-transform group-hover:scale-110"
                style={{ backgroundColor: hexToRgba(pColor, 0.15) }}
              >
                <Folder className="w-5 h-5" style={{ color: pColor }} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className={`text-sm font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>Emplacement cible</p>
                <p className="text-xs text-zinc-500 truncate mt-0.5 font-medium">{finalPath || "Choisir un dossier..."}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600" />
            </button>
          </div>

          {/* Section: Sélection du contenu */}
          <div className=" space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Contenu</label>
              <span className="text-[10px] font-bold" style={{ color: sColor }}>Personnaliser</span>
            </div>
            <button
              onClick={() => setShowSelectModal(true)}
              className={`group w-full flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-[0.97] ${
                isDark ? 'bg-zinc-900/40 border-white/5 hover:border-white/20' : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <div 
                className="p-3 rounded-xl transition-transform group-hover:scale-110"
                style={{ backgroundColor: hexToRgba(sColor, 0.15) }}
              >
                <Layers className="w-5 h-5" style={{ color: sColor }} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className={`text-sm font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>Saisons & Épisodes</p>
                <p className="text-xs text-zinc-500 mt-0.5 font-medium">{selectionLabel}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600" />
            </button>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-8 mt-2">
          <button
            onClick={handleMove}
            disabled={loading || !finalPath}
            className="group relative w-full overflow-hidden rounded-2xl p-4 font-black transition-all hover:shadow-lg hover:brightness-110 active:scale-95 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
            style={{ 
              backgroundColor: loading ? (isDark ? '#27272a' : '#e4e4e7') : isDark ? pColor + "60" : pColor,
            }}
          >
            <div className="relative z-10 flex items-center justify-center gap-3">
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                  <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>Copie en cours...</span>
                </>
              ) : (
                <>
                  <ClipboardCopy className="w-5 h-5 text-white" />
                  <span className="text-white">Lancer la copie</span>
                </>
              )}
            </div>
            
            {/* Effet de brillance au survol */}
            {!loading && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            )}
          </button>
          
          <div className={`flex items-center justify-center gap-2 mt-5 px-4 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
             <p className="text-[10px] text-center leading-relaxed">
              Le temps de traitement dépend de la vitesse de votre stockage et de la taille des fichiers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CopyAnimeModal;