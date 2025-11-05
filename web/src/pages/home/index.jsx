import React, { useEffect, useState } from "react";
import api from "../../services/api";
import TopBar from "../../components/TopBar";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getCurrentUser } from "../../controllers/auth";
import { Play, Star, Clock, Plus, BookOpen } from "lucide-react";
import Loader from "../../utils/Loader";
import AnimeCard from "../../components/AnimeCard";
import { addWatch } from "../../controllers/watch";
import { showToast } from "../../utils/alerts";

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [sections, setSections] = useState([]);
  const [randomAnimes, setRandomAnimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { mode } = useSelector((state) => state.theme);

  // Theme colors
  const textColor = mode === "dark" ? "#fff" : "#000";
  const bgColor = mode === "dark" ? "#1a1a1a" : "#f9f9f9";

  useEffect(() => {
    const fetchData = async () => {
      const u = await getCurrentUser();
      setUser(u);

      try {
        if (u && u.id) {
          const res = await api.get(`/home/${u.id}`);
          setSections([
            {
              title: "Continuer à regarder",
              icon: <Clock size={20} />,
              data: res.data.continueWatching || [],
            },
            {
              title: "Nouveaux épisodes",
              icon: <Play size={20} />,
              data: res.data.newEpisodes || [],
            },
            {
              title: "Top notés",
              icon: <Star size={20} />,
              data: res.data.topRated || [],
            },
            {
              title: "Pas encore commencés",
              icon: <BookOpen size={20} />,
              data: res.data.notWatched || [],
            },
            {
              title: "Récommencer",
              icon: <Plus size={20} />,
              data: res.data.finished || [],
            },
          ]);
        } else {
          const res = await api.get("/home/random");
          setRandomAnimes(res.data.suggestedAnimes || []);
        }
      } catch (err) {
        console.error("Error fetching homepage data:", err);
        setSections([]);
        setRandomAnimes([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Skeleton loader
  const SkeletonCard = () => (
    <div
      className="relative overflow-hidden rounded-lg bg-gray-300 dark:bg-gray-700 animate-pulse"
      style={{ aspectRatio: "225 / 338" }}
    >
      <div className="absolute bottom-0 left-0 w-full h-12 bg-gray-400/60 dark:bg-gray-600/60" />
    </div>
  );

  // Add to watchlist
  const handleAddWatchList = (anime) => {
    if (!user) {
      showToast("Connectez-vous pour ajouter à la watch-list", "error");
      return;
    }

    addWatch(user.id, { anime_id: anime.id, status: "watching" })
      .then(() => showToast(`${anime.name} ajouté à la watch-list`, "success"))
      .catch((err) =>
        showToast(err.message || "Erreur lors de l'ajout", "error")
      );
  };

  // Open details page
  const handleRead = (anime) => {
    navigate(`/details/${anime.id}`);
  };

  if (loading) return <Loader />;

  return (
    <div
      className="min-h-screen pt-20 transition-colors duration-300"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <TopBar />

      {user && user.id ? (
        <div className="p-4 space-y-8">
          {sections.map(
            (section) =>
              section.data?.length > 0 && (
                <div key={section.title}>
                  <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
                    {section.icon} {section.title}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {section.data.map((anime) => (
                      <AnimeCard
                        key={anime.id}
                        anime={anime}
                        onClick={() => handleRead(anime)}
                        onRead={handleRead}
                        onAddWatch={handleAddWatchList}
                      />
                    ))}
                  </div>
                </div>
              )
          )}
        </div>
      ) : (
        <div className="p-4 space-y-8">
          <h2 className="flex items-center justify-center gap-2 text-xl font-semibold mb-4">
            <Play size={20} /> Animes populaires
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {randomAnimes.length > 0 ? (
              randomAnimes.map((anime) => (
                <AnimeCard
                  key={anime.id}
                  anime={anime}
                  onClick={() => handleRead(anime)}
                  onRead={handleRead}
                  onAddWatch={handleAddWatchList}
                />
              ))
            ) : (
              Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)
            )}
          </div>

          {/* CTA buttons for guests */}
          <div className="flex justify-center mt-6">
            <button
              className="border px-7 py-2 mx-2 rounded-lg"
              onClick={() => (window.location.href = "/signup")}
            >
              Créer un compte
            </button>
            <button
              className="bg-blue-600 hover:bg-blue-700 mx-2 text-white px-7 py-2 rounded-lg"
              onClick={() => (window.location.href = "/login")}
            >
              Se connecter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
