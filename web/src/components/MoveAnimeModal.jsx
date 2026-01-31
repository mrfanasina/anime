import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useSelector } from "react-redux";
import api from "../services/api";
import { getFolders } from "../controllers/anime";
import { showToast } from "../utils/alerts";

const MoveAnimeModal = ({
  isOpen,
  onClose,
  animeId,
  animeName,
  onSuccess,
}) => {
  const [folders, setFolders] = useState([]);
  const [basePath, setBasePath] = useState("");
  const [category, setCategory] = useState("ANIME"); // ANIME | MOVIE
  const [animeType, setAnimeType] = useState("anime"); // anime | seasonal | film
  const [loading, setLoading] = useState(false);

  const { primaryColors, secondaryColors } = useSelector(
    (state) => state.theme
  );

  const mainColor = primaryColors.main;
  const hoverColor = primaryColors.accent;

  useEffect(() => {
    if (!isOpen) return;

    const fetchFolders = async () => {
      const res = await getFolders();
      setFolders(res.data || []);

      if (res.data?.length) {
        setBasePath(res.data[0].path);
        setCategory(res.data[0].folder[0]);
      }
    };

    fetchFolders();
  }, [isOpen]);

  const buildFinalPath = () => {
    if (!basePath || !category) return "";

    if (animeType === "seasonal") {
      return `${basePath}/${category}/#saisonier`;
    }

    return `${basePath}/${category}`;
  };

  const handleMove = async () => {
    const finalPath = buildFinalPath();
    if (!finalPath) return;

    try {
      setLoading(true);

      await api.post(`/anime/move/${animeId}`, {
        path: finalPath,
      });

      showToast(`Anime déplacé vers ${finalPath}`);
      onSuccess?.();
      onClose();
    } catch (err) {
      showToast("Erreur lors du déplacement", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
      <div className="relative bg-white/10 border border-white/20 rounded-2xl p-6 w-96 shadow-2xl backdrop-blur-xl text-white">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-white/70 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-semibold mb-1 text-center">
          Déplacer l’anime
        </h2>
        <p className="text-sm text-center opacity-70 mb-4">{animeName}</p>

        {/* Disk */}
        <div className="mb-3">
          <label className="block text-sm mb-1">Disque</label>
          <select
            value={basePath}
            onChange={(e) => {
              const selected = folders.find(f => f.path === e.target.value);
              setBasePath(e.target.value);
              setCategory(selected.folder[0]);
            }}
            className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-md"
          >
            {folders.map((f) => (
              <option key={f.path} value={f.path}>
                {f.path}
              </option>
            ))}
          </select>
        </div>

        {/* Anime Type */}
        <div className="flex justify-around mb-4">
          {[
            { id: "anime", label: "Anime" },
            { id: "seasonal", label: "Saisonnier" },
            { id: "film", label: "Film" },
          ].map((t) => (
            <label key={t.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="type"
                checked={animeType === t.id}
                onChange={() => {
                  setAnimeType(t.id);
                  if (t.id === "film") setCategory("MOVIE");
                  else setCategory("ANIME");
                }}
              />
              {t.label}
            </label>
          ))}
        </div>

        {/* Preview */}
        <div className="text-xs opacity-70 mb-4 text-center">
          📂 {buildFinalPath()}
        </div>

        {/* Action */}
        <button
          onClick={handleMove}
          disabled={loading}
          style={{ backgroundColor: mainColor }}
          className="w-full py-2 rounded-md font-medium transition transform hover:scale-[1.02]"
          onMouseOver={(e) =>
            (e.currentTarget.style.backgroundColor = hoverColor)
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.backgroundColor = mainColor)
          }
        >
          {loading ? "Déplacement…" : "Déplacer"}
        </button>
      </div>
    </div>
  );
};

export default MoveAnimeModal;
