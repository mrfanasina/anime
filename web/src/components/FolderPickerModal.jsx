import { useEffect, useState, useMemo } from "react";
import { ArrowLeft, Folder, HardDrive, ChevronRight, CheckCircle2, X } from "lucide-react";
import { useSelector } from "react-redux";
import { fetchDisks, getNextFolder } from "../controllers/anime";

const FolderPickerModal = ({ isOpen, onSelect, onClose }) => {
  const [currentPath, setCurrentPath] = useState(null);
  const [folders, setFolders] = useState([]);
  const [allDisk, setAllDisk] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPath, setSelectedPath] = useState(null);

  const { mode, primaryColors, secondaryColors } = useSelector((state) => state.theme);

  // Thème dynamique
  const theme = {
    bg: mode === "dark" ? "#1e1e1e" : "#ffffff",
    cardBg: mode === "dark" ? "#2a2a2a" : "#f9fafb",
    text: mode === "dark" ? "#f3f4f6" : "#1f2937",
    textMuted: mode === "dark" ? "#9ca3af" : "#6b7280",
    border: mode === "dark" ? "#3f3f46" : "#e5e7eb",
  };

  useEffect(() => {
    if (!isOpen) return;
    setCurrentPath(null);
    setFolders([]);
    setSelectedPath(null);
    setLoading(true);

    fetchDisks()
      .then((res) => setAllDisk(res || []))
      .catch((err) => console.error("Failed to fetch disks:", err))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const loadFolders = async (path) => {
    setLoading(true);
    setSelectedPath(path); // On sélectionne le dossier dès qu'on clique
    try {
      const res = await getNextFolder(path);
      setCurrentPath(path);
      setFolders(res || []);
    } catch (err) {
      console.error("Failed to load folders:", err);
      setFolders([]);
    } finally {
      setLoading(false);
    }
  };

  // Génère les morceaux du chemin pour le fil d'Ariane
  const breadcrumbs = useMemo(() => {
    if (!currentPath) return [];
    const parts = currentPath.split("/").filter(Boolean);
    let pathAcc = "";
    return parts.map((part) => {
      pathAcc += `/${part}`;
      return { name: part, path: pathAcc };
    });
  }, [currentPath]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[60] backdrop-blur-sm transition-opacity"
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl pointer-events-auto overflow-hidden border"
          style={{ backgroundColor: theme.bg, borderColor: theme.border }}
        >
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: theme.border }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: primaryColors.main + "20" }}>
                <Folder className="w-5 h-5" style={{ color: primaryColors.main }} />
              </div>
              <h2 className="text-lg font-bold" style={{ color: theme.text }}>Choisir un dossier de destination</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-black/10 rounded-full transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Breadcrumbs Navigation */}
          <div className="px-4 py-2 border-b flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide" 
               style={{ borderColor: theme.border, backgroundColor: theme.cardBg }}>
            <button 
              onClick={() => { setCurrentPath(null); setSelectedPath(null); }}
              className="text-sm hover:underline flex items-center"
              style={{ color: primaryColors.main }}
            >
              Ordinateur
            </button>
            {breadcrumbs.map((bc, idx) => (
              <div key={bc.path} className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4 opacity-40" />
                <button 
                  onClick={() => loadFolders(bc.path)}
                  className="text-sm hover:underline max-w-[120px] truncate"
                  style={{ color: idx === breadcrumbs.length - 1 ? theme.text : primaryColors.main }}
                >
                  {bc.name}
                </button>
              </div>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderBottomColor: primaryColors.main }}></div>
                <span className="text-sm opacity-60">Analyse du répertoire...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Mode Disques */}
                {!currentPath && allDisk.flatMap(disk => disk.partitions).map((p) => (
                  <button
                    key={p.mountpoint}
                    onClick={() => loadFolders(p.mountpoint)}
                    className="flex items-center p-4 rounded-xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98] group"
                    style={{
                      borderColor: selectedPath === p.mountpoint ? primaryColors.main : theme.border,
                      backgroundColor: selectedPath === p.mountpoint ? primaryColors.main + "10" : theme.cardBg,
                    }}
                  >
                    <HardDrive className="w-8 h-8 mr-4" style={{ color: primaryColors.main }} />
                    <div className="text-left overflow-hidden">
                      <div className="font-bold text-sm truncate" style={{ color: theme.text }}>Disque Local</div>
                      <div className="text-xs truncate" style={{ color: theme.textMuted }}>{p.mountpoint}</div>
                      <div className="text-[10px] mt-1 font-mono uppercase opacity-60">{p.size}</div>
                    </div>
                  </button>
                ))}

                {/* Mode Dossiers */}
                {currentPath && folders.map((folder) => {
                  const fullPath = `${currentPath}/${folder}`.replace(/\/+/g, '/');
                  const isSelected = selectedPath === fullPath;
                  return (
                    <button
                      key={fullPath}
                      onClick={() => setSelectedPath(fullPath)}
                      onDoubleClick={() => loadFolders(fullPath)}
                      className="flex items-center justify-between p-3 rounded-xl border transition-all group"
                      style={{
                        borderColor: isSelected ? primaryColors.main : theme.border,
                        backgroundColor: isSelected ? primaryColors.main + "15" : "transparent",
                      }}
                    >
                      <div className="flex items-center overflow-hidden mr-2">
                        <Folder className="w-5 h-5 mr-3 shrink-0" 
                          style={{ color: isSelected ? primaryColors.main : secondaryColors.accent }} 
                        />
                        <span className="truncate text-sm font-medium" style={{ color: theme.text }}>{folder}</span>
                      </div>
                      {isSelected ? (
                         <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: primaryColors.main }} />
                      ) : (
                        <ChevronRight 
                          className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" 
                          onClick={(e) => { e.stopPropagation(); loadFolders(fullPath); }}
                        />
                      )}
                    </button>
                  );
                })}

                {currentPath && folders.length === 0 && (
                  <div className="col-span-2 text-center py-10 text-sm italic opacity-50">
                    Ce dossier est vide
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t flex items-center justify-between gap-4" style={{ borderColor: theme.border }}>
            <div className="hidden sm:block overflow-hidden">
               <p className="text-[10px] uppercase font-bold opacity-50 mb-0.5">Sélection :</p>
               <p className="text-xs truncate font-mono" style={{ color: primaryColors.main }}>
                {selectedPath || "Aucun dossier sélectionné"}
               </p>
            </div>
            <div className="flex gap-3 shrink-0 ml-auto w-full sm:w-auto">
              <button
                onClick={onClose}
                className="flex-1 sm:flex-none px-6 py-2 rounded-lg font-medium transition hover:bg-black/5"
                style={{ color: theme.textMuted }}
              >
                Annuler
              </button>
              <button
                disabled={!selectedPath}
                onClick={() => {
                  onSelect(selectedPath);
                  onClose();
                }}
                className="flex-1 sm:flex-none px-8 py-2 rounded-lg font-bold transition-all shadow-lg disabled:opacity-50 disabled:shadow-none hover:brightness-110 active:scale-95"
                style={{
                  backgroundColor: primaryColors.main,
                  color: "#fff",
                }}
              >
                Choisir
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: ${primaryColors.main}40; 
          border-radius: 10px; 
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </>
  );
};

export default FolderPickerModal;