import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import TopBar from "../../components/TopBar";
import { getSeasonal } from "../../controllers/anime";
import { getCurrentUser } from "../../controllers/auth";
import { addWatch } from "../../controllers/watch";
import { showToast } from "../../utils/alerts";
import AnimeCard from "../../components/AnimeCard";
import { ChevronLeft, ChevronRight, LayoutGrid, Grid } from "lucide-react";

const SeasonalPage = () => {
  const [seasonData, setSeasonData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeSeason, setActiveSeason] = useState(null);
  const [combinedView, setCombinedView] = useState(false);

  const containerRef = useRef(null);

  const navigate = useNavigate();
  const { mode, primaryColors } = useSelector((state) => state.theme);
  const isDark = mode === "dark";
  const textColor = isDark ? "#f2f2f2" : "#111";
  const bgColor = isDark ? "#0f0f11" : "#f5f6fa";
  const primary = primaryColors.main;
  const accent = primaryColors.accent;

  useEffect(() => {
    getSeasonal()
      .then((data) => {
        setSeasonData(data);
        if (data.length > 0) setActiveSeason(data[0].season_name);
      })
      .catch(() => setError("Impossible de charger les animés saisonniers"))
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

  const handleAddWatchList = (anime) => {
    if (!currentUser) {
      showToast("Vous devez être connecté pour ajouter à la watch-list", "error");
      return;
    }
    addWatch(currentUser.id, { anime_id: anime.anime_id, status: "watching" })
      .then(() => showToast(`${anime.name} ajouté à la watch-list`, "success"))
      .catch((err) => showToast(err.message || "Erreur lors de l'ajout à la watch-list", "error"));
  };

  const handleRead = (anime) => navigate(`/details/${anime.anime_id}`);

  const SkeletonCard = () => (
    <div
      className="relative overflow-hidden rounded-xl animate-pulse flex-shrink-0"
      style={{ backgroundColor: isDark ? "#2a2a2d" : "#d8d8dc", width: "240px", aspectRatio: "225/338" }}
    />
  );

  const handleScroll = (id, dir = "right") => {
    const el = document.getElementById(id);
    if (!el) return;
    const scrollAmount = el.offsetWidth * 0.7;
    el.scrollBy({ left: dir === "right" ? scrollAmount : -scrollAmount, behavior: "smooth" });
  };

  return (
    <div
      ref={containerRef}
      className="transition-colors duration-500 min-h-screen overflow-y-auto"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <TopBar />

      <div className="pt-28 px-4 md:px-8 space-y-12">
        {/* === BARRE MODE + SAISONS === */}
        {!loading && !error && seasonData.length > 0 && (
          <div
            className="flex justify-between items-center py-2 px-4"
            style={{ backgroundColor: isDark ? "#111111bb" : "#ffffffcc" }}
          >
            {/* Saisons au centre seulement si on n'est pas en vue combinée */}
            {!combinedView && seasonData.length > 0 ? (
              <div className="flex flex-wrap gap-2 justify-center flex-1">
                {seasonData.map((s) => (
                  <button
                    key={s.season_name}
                    onClick={() => setActiveSeason(s.season_name)}
                    className="px-4 py-1 rounded-full text-sm font-medium shadow-md uppercase transition-all duration-300"
                    style={{
                      backgroundColor: activeSeason === s.season_name ? primary : isDark ? "#2a2a2e" : "#eaeaea",
                      color: activeSeason === s.season_name ? "#fff" : textColor,
                      border: `1px solid ${activeSeason === s.season_name ? accent : isDark ? "#3a3a3e" : "#ccc"}`,
                    }}
                  >
                    {s.season_name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex-1" /> // garde le toggle à droite même si rien au centre
            )}

            {/* Toggle mode icône à droite */}
            <div className="ml-4 flex-shrink-0">
              <button
                onClick={() => setCombinedView(!combinedView)}
                className="p-2 rounded-full shadow-md transition-all duration-300"
                style={{ backgroundColor: combinedView ? primary : isDark ? "#2a2a2d" : "#eaeaea", color: combinedView ? "#fff" : textColor }}
                title={combinedView ? "Vue verticale (une saison)" : "Vue horizontale (toutes les saisons)"}
              >
                {combinedView ? <Grid size={20} /> : <LayoutGrid size={20} />}
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex overflow-x-auto gap-4">
            {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Erreur */}
        {!loading && error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-red-500 text-lg mt-20">{error}</motion.div>
        )}

        {/* Contenu */}
        {!loading && !error && seasonData.length > 0 && (
          <motion.div key={combinedView ? "horizontal" : activeSeason} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-16">
            {(combinedView ? seasonData : seasonData.filter((s) => s.season_name === activeSeason)).map((season, index) => (
              <div key={index} className="relative p-4 rounded-2xl shadow-lg" style={{ backgroundColor: isDark ? "#18181b" : "#ffffff", border: `1px solid ${isDark ? "#2b2b2f" : "#d0d0d5"}` }}>
                <h2 className="text-3xl font-bold mb-6 text-center md:text-left tracking-wide" style={{ color: primary, textShadow: isDark ? "0 0 8px rgba(120,168,224,0.4)" : "none" }}>{season.season_name}</h2>

                {combinedView ? (
                  <div className="relative">
                    <button onClick={() => handleScroll(`season-scroll-${index}`, "left")} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/30 hover:bg-black/50 text-white rounded-full w-10 h-10 flex items-center justify-center backdrop-blur-md">
                      <ChevronLeft size={20} />
                    </button>

                    <div id={`season-scroll-${index}`} className="flex overflow-x-auto gap-5 pb-4 scroll-smooth no-scrollbar" style={{ scrollbarWidth: "none" }}>
                      {season.animes.map((anime) => (
                        <div key={anime.id} className="flex-shrink-0 w-[240px] aspect-[225/338] hover:scale-105 transition-transform duration-300">
                          <AnimeCard anime={anime} onClick={() => handleRead(anime)} onRead={handleRead} onAddWatch={handleAddWatchList} showReadButton showWatchButton />
                        </div>
                      ))}
                    </div>

                    <button onClick={() => handleScroll(`season-scroll-${index}`, "right")} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/30 hover:bg-black/50 text-white rounded-full w-10 h-10 flex items-center justify-center backdrop-blur-md">
                      <ChevronRight size={20} />
                    </button>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {season.animes.map((anime) => <AnimeCard key={anime.id} anime={anime} onClick={() => handleRead(anime)} onRead={handleRead} onAddWatch={handleAddWatchList} showReadButton showWatchButton />)}
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {/* Aucun anime */}
        {!loading && !error && seasonData.length === 0 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-gray-500 mt-16 text-lg">Aucun anime trouvé pour cette saison.</motion.div>}
      </div>
    </div>
  );
};

export default SeasonalPage;
