import React, { useEffect, useState } from "react";
import api from "../../services/api";
import TopBar from "../../components/TopBar";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import noImage from "../../assets/no-image.png";
import { Play, Check, Plus } from "lucide-react";

const HomePage = () => {
  const [animes, setAnimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { mode } = useSelector((state) => state.theme);

  const textColor = mode === "dark" ? "#fff" : "#000";
  const bgColor = mode === "dark" ? "#1a1a1a" : "#f9f9f9";

  useEffect(() => {
    api
      .get("/anime/all")
      .then((res) => setAnimes(res.data))
      .catch(() => setError("Impossible de charger les animés"))
      .finally(() => setLoading(false));
  }, []);

  // --- Skeleton Loader ---
  const SkeletonCard = () => (
    <div
      className="relative overflow-hidden rounded-lg bg-gray-300 dark:bg-gray-700 animate-pulse"
      style={{ aspectRatio: "225 / 338" }}
    >
      <div className="absolute bottom-0 left-0 w-full h-12 bg-gray-400/60 dark:bg-gray-600/60" />
    </div>
  );

  // --- Handlers pour les boutons ---
  const handleAddWatchList = (anime) => {
    console.log("Ajouté à la watch-list :", anime.name);
  };

  const handleMarkAsRead = (anime) => {
    console.log("Marqué comme lu :", anime.name);
  };

  const handleRead = (anime) => {
    console.log("Lecture :", anime.name);
    navigate(`/details/${anime.id}`);
  };

  return (
    <div style={{ backgroundColor: bgColor, minHeight: "100vh", color: textColor }}>
      <TopBar />

      <div className="pt-28 p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {/* Loading */}
        {loading &&
          Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}

        {/* Erreur */}
        {!loading && error && (
          <div className="col-span-full text-center text-red-500 mt-10">
            {error}
          </div>
        )}

        {/* Liste des animés */}
        {!loading &&
          !error &&
          animes.map((anime) => {
            const hasImage = anime.image_url && anime.image_url !== "";
            return (
              <div
                key={anime.id}
                className="relative group cursor-pointer overflow-hidden rounded-lg shadow-lg hover:shadow-2xl transition-transform transform hover:-translate-y-1"
                style={{
                  aspectRatio: "225 / 338",
                  backgroundColor: !hasImage ? "#555" : "transparent",
                }}
                onClick={() => navigate(`/details/${anime.id}`)}
              >
                {/* Image */}
                <img
                  src={hasImage ? anime.image_url : noImage}
                  alt={anime.name}
                  title={anime.name}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Overlay sombre */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Titre centré */}
                <div className="absolute inset-0 flex justify-center items-center text-center">
                  <h3 className="text-white font-bold text-lg px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg">
                    {anime.name}
                  </h3>
                </div>

                {/* Boutons en bas */}
                <div
                  className="absolute bottom-0 left-0 w-full flex justify-center gap-2 pb-4 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => handleRead(anime)}
                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-full text-sm shadow-md transition"
                  >
                    <Play size={16} /> Lire
                  </button>
                  <button
                    onClick={() => handleMarkAsRead(anime)}
                    className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-full text-sm shadow-md transition"
                  >
                    <Check size={16} /> Lu
                  </button>
                  <button
                    onClick={() => handleAddWatchList(anime)}
                    className="flex items-center gap-1 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded-full text-sm shadow-md transition"
                  >
                    <Plus size={16} /> Watch-list
                  </button>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default HomePage;
