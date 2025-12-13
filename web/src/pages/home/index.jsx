import React, { useEffect, useState, useCallback } from "react";
import api from "../../services/api";
import TopBar from "../../components/TopBar";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getCurrentUser } from "../../controllers/auth";
import {
  Play,
  Star,
  Clock,
  BookOpen,
  SkipForward,
} from "lucide-react"; // Ajout des chevrons pour la navigation manuelle
import Loader from "../../utils/Loader";
import AnimeCard from "../../components/AnimeCard";
import { addWatch } from "../../controllers/watch";
import { showToast } from "../../utils/alerts";
import ContinueWatchingCarousel from "../../components/ContinueWatchingCarousel";
import { playAnime } from "../../controllers/anime";
import PlayEpisodeModal from "../../components/PlayEpisodeModal";

// --- Composant : Indicateur de Slide (Nouveau) ---

const SlideIndicator = ({ count, activeIndex, mode }) => {
  const indicatorColor = mode === "dark" ? "bg-white" : "bg-gray-800";
  const inactiveColor =
    mode === "dark" ? "bg-gray-500/50" : "bg-gray-300/70";

  return (
    <div className="flex justify-center space-x-2 mt-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`w-2 h-2 rounded-full transition-all duration-300 ${
            index === activeIndex ? `${indicatorColor} w-4` : inactiveColor
          }`}
        />
      ))}
    </div>
  );
};

// --- Composant : Carte de Continuité (Glassmorphism + Améliorations) ---

/**
 * Affiche une carte pour les animes regardés récemment, avec progression et boutons d'action rapide.
 */
const ContinueWatchingCard = ({ anime, onContinue, onPlayNext, mode }) => {
  const { last_episode } = anime;
  const progressPercent =
    (last_episode.position / last_episode.duration) * 100 || 0;

  const textColor = mode === "dark" ? "#fff" : "#000";
  // Verre plus prononcé
  const glassBg =
    mode === "dark" ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.1)";
  const glassBorder =
    mode === "dark"
      ? "rgba(255, 255, 255, 0.3)"
      : "rgba(0, 0, 0, 0.15)";

  return (
    <div
      className="relative w-full h-[400px] md:h-[450px] lg:h-[500px] rounded-xl overflow-hidden shadow-2xl transition-opacity duration-500"
      style={{
        // Utilisation de l'image pour l'effet de flou
        backgroundImage: `url(${anime.image_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay pour l'effet Glassmorphism et assombrissement */}
      <div
        className="absolute inset-0 backdrop-blur-xl p-6 md:p-8 flex flex-col justify-end border border-solid transition-all duration-500"
        style={{
          backgroundColor: glassBg,
          borderColor: glassBorder,
        }}
      >
        <div className="flex items-center">
          {/* Image de l'anime (visible sur le côté pour le contexte) */}
          <div className="flex-shrink-0 w-24 h-36 md:w-32 md:h-48 rounded-lg overflow-hidden shadow-2xl mr-6">
            <img
              src={anime.image_url}
              alt={anime.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex flex-col justify-between flex-grow">
            {/* Informations principales */}
            <div>
              <p className="text-sm font-light uppercase tracking-widest mb-1" style={{ color: textColor }}>
                Continuer
              </p>
              <h3
                className="text-2xl md:text-3xl font-extrabold mb-1 line-clamp-2"
                style={{ color: textColor }}
              >
                {anime.name}
              </h3>
              <p
                className="text-base md:text-lg font-medium line-clamp-1 opacity-80"
                style={{ color: textColor }}
              >
                Épisode {last_episode.number}: {last_episode.name}
              </p>
            </div>

            {/* Barre de progression */}
            <div className="w-full my-4">
              <div className="h-2 rounded-full bg-gray-600/50 dark:bg-gray-400/50 overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-700"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-xs mt-1 font-semibold" style={{ color: textColor }}>
                {Math.round(progressPercent)}% Vus
              </p>
            </div>

            {/* Boutons d'action */}
            <div className="flex space-x-4 mt-2">
              <button
                onClick={() => onContinue(anime)}
                className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-full shadow-lg hover:shadow-xl transition duration-300 text-sm md:text-base transform hover:scale-[1.02]"
              >
                <Play size={18} className="mr-2" />
                Continuer
              </button>
              <button
                onClick={() => onPlayNext(last_episode.id)}
                className="flex items-center bg-white/20 hover:bg-white/30 text-white font-semibold py-2 px-5 rounded-full backdrop-blur-sm transition duration-300 text-sm md:text-base border border-white/30"
              >
                <SkipForward size={18} className="mr-2" />
                Ép. Suivant
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Composant Principal : HomePage ---

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [sections, setSections] = useState([]);
  const [continueWatchingData, setContinueWatchingData] = useState([]);
  const [randomAnimes, setRandomAnimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentAnimeIndex, setCurrentAnimeIndex] = useState(0); // État pour le slider
  const navigate = useNavigate();
  const { mode } = useSelector((state) => state.theme);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentEpisode, setCurrentEpisode] = useState([]);

  const textColor = mode === "dark" ? "#fff" : "#000";
  const bgColor = mode === "dark" ? "#121212" : "#f0f2f5";

  // --- Gestion du Slider (Carousel) ---

  const totalSlides = continueWatchingData.length;

  const nextSlide = useCallback(() => {
    setCurrentAnimeIndex((prevIndex) => (prevIndex + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = () => {
    setCurrentAnimeIndex(
      (prevIndex) => (prevIndex - 1 + totalSlides) % totalSlides
    );
  };

  useEffect(() => {
    if (totalSlides > 1) {
      // Changement automatique toutes les 5 secondes
      const interval = setInterval(nextSlide, 5000);
      return () => clearInterval(interval);
    }
  }, [totalSlides, nextSlide]);

  // --- Fetch Data (inchangé) ---

  useEffect(() => {
    const fetchData = async () => {
      const u = await getCurrentUser();
      setUser(u);
      setLoading(true);

      try {
        if (u && u.id) {
          const res = await api.get(`/home/${u.id}`);

          setContinueWatchingData(res.data.continueWatching || []);

          setSections([
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
              title: "Regardés Récemment",
              icon: <Clock size={20} />,
              data: res.data.finished || [],
            },
            {
              title: "Pas encore commencés",
              icon: <BookOpen size={20} />,
              data: res.data.notWatched || [],
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

  // --- Squelettes de Chargement ---

  const SkeletonCard = () => (
    <div
      className="relative overflow-hidden rounded-lg bg-gray-300 dark:bg-gray-700 animate-pulse"
      style={{ aspectRatio: "225 / 338" }}
    >
      <div className="absolute bottom-0 left-0 w-full h-12 bg-gray-400/60 dark:bg-gray-600/60" />
    </div>
  );

  const ContinueWatchingSkeleton = () => (
    <div
      className="relative w-full h-[400px] md:h-[450px] lg:h-[500px] rounded-xl overflow-hidden bg-gray-300 dark:bg-gray-700 animate-pulse p-6 md:p-8 flex flex-col justify-end"
      style={{
        backdropFilter: "blur(10px)",
        backgroundColor: "rgba(100, 100, 100, 0.1)",
        border: "1px solid rgba(100, 100, 100, 0.2)",
      }}
    >
      <div className="flex items-center">
        <div className="flex-shrink-0 w-24 h-36 md:w-32 md:h-48 rounded-lg bg-gray-400 dark:bg-gray-600 mr-6" />
        <div className="flex flex-col justify-end flex-grow">
          <div className="h-4 w-1/4 mb-1 bg-gray-400 dark:bg-gray-600 rounded" />
          <div className="h-8 w-3/4 mb-2 bg-gray-400 dark:bg-gray-600 rounded" />
          <div className="h-6 w-1/2 mb-4 bg-gray-400 dark:bg-gray-600 rounded" />

          <div className="h-2 w-full mb-4 bg-gray-400 dark:bg-gray-600 rounded-full" />
          <div className="flex space-x-4 mt-2">
            <div className="h-10 w-32 bg-gray-400 dark:bg-gray-600 rounded-full" />
            <div className="h-10 w-32 bg-gray-400 dark:bg-gray-600 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );

  // --- Fonctions d'Action (inchangé) ---

  const handleRead = (anime) => {
    navigate(`/details/${anime.id}`);
  };
  
  const handlePlay = (episode) => {
    setCurrentEpisode([{ ...episode}]); 
    setIsPlaying(true);
  };

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

  if (loading) return <Loader />;

  return (
    <div
      className="min-h-screen pt-20 transition-colors duration-300"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <TopBar />
      <PlayEpisodeModal
        userId={user?.id}
        selectedEpisodes={currentEpisode}
        isOpen={isPlaying}
        onClose={() => setIsPlaying(false)}
      />

      {user && user.id ? (
        <div className="p-4 space-y-10">
          {/* --- Section "Continuer à regarder" (Slider/Carousel) --- */}
          {totalSlides > 0 && (
            <div className="relative">
              <div>
                <div className="relative overflow-hidden rounded-xl">
                {/* La Carte Active */}
                <ContinueWatchingCarousel
                  animes={continueWatchingData}
                  handlePlay={handlePlay}
                  mode={mode}
                />
                </div>
              </div>
            </div>
          )}

          {sections.map(
            (section) =>
              section.data?.length > 0 && (
                <div key={section.title}>
                  <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
                    {section.icon} {section.title}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
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
        // --- Mode Invité (inchangé) ---
        <div className="p-4 space-y-8">
          <h2 className="flex items-center justify-center gap-2 text-xl font-semibold mb-4">
            <Play size={20} /> Animes populaires
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {randomAnimes.length > 0
              ? randomAnimes.map((anime) => (
                  <AnimeCard
                    key={anime.id}
                    anime={anime}
                    onClick={() => handleRead(anime)}
                    onRead={handleRead}
                    onAddWatch={handleAddWatchList}
                  />
                ))
              : Array.from({ length: 12 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
          </div>

          {/* CTA buttons for guests */}
          <div className="flex justify-center mt-6">
            <button
              className={`border px-7 py-2 mx-2 rounded-lg ${
                mode === "dark"
                  ? "border-white/50 text-white hover:bg-white/10"
                  : "border-gray-500 hover:bg-gray-100"
              }`}
              onClick={() => (window.location.href = "/signup")}
            >
              Créer un compte
            </button>
            <button
              className="bg-blue-600 hover:bg-blue-700 mx-2 text-white px-7 py-2 rounded-lg shadow-md"
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