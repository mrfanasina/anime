import React, { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { addAnime, getFolders } from "../controllers/anime";
import { useSelector } from "react-redux";
import { showToast } from "../utils/alerts";

const AddWatch = () => {
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
              Ajouter un WatchList
            </h2>
          </div>
        </div>
      )}
    </>
  );
};

export default AddWatch;
