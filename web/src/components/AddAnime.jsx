import React, { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { addAnime, getFolders } from "../controllers/anime";
import { useSelector } from "react-redux";
import { showToast } from "../utils/alerts";

const AddAnime = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [animeName, setAnimeName] = useState("");
  const [animeDescription, setAnimeDescription] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("");
  const [folders, setFolders] = useState([]);

  // 🎨 Get colors from Redux theme
  const { primaryColors,  mode, secondaryColors } = useSelector((state) => state.theme);
  const mainColor = primaryColors.main;
  const hoverColor = primaryColors.accent;
  const focusColor = secondaryColors.main
  useEffect(() => {
    const fetchFolders = async () => {
      const data = await getFolders();
      setFolders(data.data);
      if (data.data.length > 0) {
      const first = data.data[0];
      setSelectedFolder(`${first.path}/${first.folder}`);
    }
    };
    fetchFolders();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: animeName,
      path: selectedFolder,
    };

    const res = await addAnime(animeName, selectedFolder)
    console.log("pd" + payload);
    console.log(res);
    const msg = res.message + " " + res.anime.name
    showToast(msg)

    window.location.href = "/details/" + res.anime.id
    // Reset form
    setAnimeName("");
    setAnimeDescription("");
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        style={{ backgroundColor: mainColor }}
        className="fixed bottom-6 right-6 flex items-center justify-center w-16 h-16 text-white rounded-full shadow-lg transition-transform transform hover:scale-110 z-50"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-40">
          <div className="relative bg-white/10 border border-white/20 rounded-2xl p-6 w-96 shadow-2xl backdrop-blur-xl text-white">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-3 right-3 text-white/70 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-2xl font-semibold mb-4 text-center">
              Ajouter un nouvel anime
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Folder Select */}
              <div>
                <label className="block text-sm mb-1">Dossier de l’anime</label>
                <select
                  value={selectedFolder}
                  onChange={(e) => setSelectedFolder(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400 text-white placeholder-white/60"
                >
                  {folders.length === 0 ? (
                    <option disabled>Chargement...</option>
                  ) : (
                    folders.map((f) => (
                      <option key={f.folder} value={`${f.path}/${f.folder}`}>
                        {f.path}/{f.folder}
                      </option>
                    ))
                  )}
                </select>

              </div>

              {/* Anime Name */}
              <div>
                <label className="block text-sm mb-1">Nom de l’anime</label>
                <input
                  type="text"
                  value={animeName}
                  onChange={(e) => setAnimeName(e.target.value)}
                  placeholder="Ex : Demon Slayer"
                  required
                  className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400 text-white placeholder-white/60"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                style={{
                  backgroundColor: mainColor,
                }}
                className="w-full py-2 rounded-md font-medium transition transform hover:scale-[1.02]"
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = hoverColor)}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = mainColor)}
              >
                Ajouter
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AddAnime;
