import React, { useEffect, useState } from "react";
import api from "../../services/api";
import TopBar from "../../components/TopBar";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import AnimeCard from "../../components/AnimeCard";
import { addWatch } from "../../controllers/watch";
import { showToast } from "../../utils/alerts";
import { getCurrentUser } from "../../controllers/auth";

const AnimePage = () => {   
  const [animes, setAnimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { mode } = useSelector((state) => state.theme);
  const [currentUser, setCurrentUser] = useState(null);

  const textColor = mode === "dark" ? "#fff" : "#000";
  const bgColor = mode === "dark" ? "#1a1a1a" : "#f9f9f9";

  // Charger les animés et l'utilisateur actuel
  useEffect(() => {
    api
      .get("/anime/all")
      .then((res) => setAnimes(res.data))
      .catch(() => setError("Impossible de charger les animés"))
      .finally(() => setLoading(false));

    async function fetchUser() {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
      } catch (err) {
        console.error("Impossible de récupérer l'utilisateur:", err);
      }
    }
    fetchUser();
  }, []);

  const SkeletonCard = () => (
    <div
      className="relative overflow-hidden rounded-lg bg-gray-300 dark:bg-gray-700 animate-pulse"
      style={{ aspectRatio: "225 / 338" }}
    >
      <div className="absolute bottom-0 left-0 w-full h-12 bg-gray-400/60 dark:bg-gray-600/60" />
    </div>
  );

  const handleAddWatchList = (anime) => {
    if (!currentUser) {
      showToast("Vous devez être connecté pour ajouter à la watch-list", "error");
      return;
    }

    const payload = {
      anime_id: anime.id,
      status: "watching", // par défaut
    };

    addWatch(currentUser.id, payload)
      .then(() => {
        showToast(anime.name + " ajouté à la watch-list", "success");
      })
      .catch((err) => {
        console.error(err);
        showToast(err.message || "Erreur lors de l'ajout à la watch-list", "error");
      });
  };

  const handleRead = (anime) => {
    navigate(`/details/${anime.id}`);
  };

  return (
    <div style={{ backgroundColor: bgColor, minHeight: "100vh", color: textColor }}>
      <TopBar />

      <div className="pt-28 p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {loading && Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
        {!loading && error && (
          <div className="col-span-full text-center text-red-500 mt-10">{error}</div>
        )}

        {!loading && !error && animes.map((anime) => (
          <AnimeCard
            key={anime.id}
            anime={anime}
            onClick={() => navigate(`/details/${anime.id}`)}
            onRead={() => handleRead(anime)}
            onAddWatch={handleAddWatchList}
          />
        ))}
      </div>
    </div>
  );
};

export default AnimePage;
