import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ChevronLeft, ChevronRight, LayoutGrid, Rows, Sparkles, TrendingUp } from "lucide-react";

import TopBar from "../../components/TopBar";
import AnimeCard from "../../components/AnimeCard";
import AddSeasonalAnime from "../../components/AddAnimeSaisonier";
import { getSeasonal } from "../../controllers/anime";
import { getCurrentUser } from "../../controllers/auth";
import { addWatch } from "../../controllers/watch";
import { showToast } from "../../utils/alerts";

/* ─── Season accent colors ─────────────────────────────────────── */
const SEASON_PALETTE = {
  default: { from: "#6366f1", to: "#8b5cf6", label: "#fff" },
  Hiver:   { from: "#38bdf8", to: "#818cf8", label: "#fff" },
  Winter:  { from: "#38bdf8", to: "#818cf8", label: "#fff" },
  Printemps: { from: "#34d399", to: "#10b981", label: "#fff" },
  Spring:  { from: "#34d399", to: "#10b981", label: "#fff" },
  Été:     { from: "#fbbf24", to: "#f59e0b", label: "#1a1a1a" },
  Summer:  { from: "#fbbf24", to: "#f59e0b", label: "#1a1a1a" },
  Automne: { from: "#fb923c", to: "#ef4444", label: "#fff" },
  Fall:    { from: "#fb923c", to: "#ef4444", label: "#fff" },
  Autumn:  { from: "#fb923c", to: "#ef4444", label: "#fff" },
};

const getSeasonColors = (name = "") => {
  for (const key of Object.keys(SEASON_PALETTE)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return SEASON_PALETTE[key];
  }
  return SEASON_PALETTE.default;
};

/* ─── Skeleton ──────────────────────────────────────────────────── */
const SkeletonGrid = ({ isDark }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
    {Array.from({ length: 10 }).map((_, i) => (
      <div key={i} className="space-y-3">
        <div
          className="aspect-[2/3] rounded-2xl"
          style={{
            background: isDark
              ? "linear-gradient(135deg, #1e1e24 25%, #2a2a34 50%, #1e1e24 75%)"
              : "linear-gradient(135deg, #e8e8f0 25%, #f0f0f8 50%, #e8e8f0 75%)",
            backgroundSize: "200% 100%",
            animation: `shimmer 1.6s ease infinite ${i * 0.1}s`,
          }}
        />
        <div className="h-3.5 rounded-full w-3/4" style={{ background: isDark ? "#2a2a34" : "#e8e8f0" }} />
        <div className="h-3 rounded-full w-1/2" style={{ background: isDark ? "#2a2a34" : "#e8e8f0" }} />
      </div>
    ))}
    <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
  </div>
);

/* ─── Season Tab Pill ───────────────────────────────────────────── */
const SeasonTab = ({ season, isActive, onClick, isDark }) => {
  const colors = getSeasonColors(season.season_name);
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      className="relative px-5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all uppercase tracking-widest overflow-hidden"
      style={{
        background: isActive
          ? `linear-gradient(135deg, ${colors.from}, ${colors.to})`
          : "transparent",
        color: isActive ? colors.label : isDark ? "#71717a" : "#71717a",
        border: isActive ? "none" : `1.5px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}`,
        boxShadow: isActive ? `0 4px 20px ${colors.from}55` : "none",
      }}
    >
      {isActive && (
        <motion.span
          layoutId="tab-glow"
          className="absolute inset-0 opacity-30"
          style={{ background: `radial-gradient(circle at 50% 0%, ${colors.label}80, transparent 70%)` }}
        />
      )}
      <span className="relative flex items-center gap-2">
        {season.season_name}
        <span
          className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
          style={{
            background: isActive ? "rgba(0,0,0,0.2)" : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
            color: isActive ? colors.label : isDark ? "#a1a1aa" : "#71717a",
          }}
        >
          {season.animes.length}
        </span>
      </span>
    </motion.button>
  );
};

/* ─── Season Section Header ─────────────────────────────────────── */
const SectionHeader = ({ name, count, isDark }) => {
  const colors = getSeasonColors(name);
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-4">
        <div
          className="w-1.5 h-10 rounded-full"
          style={{ background: `linear-gradient(to bottom, ${colors.from}, ${colors.to})` }}
        />
        <div>
          <h2
            className="text-2xl font-black tracking-tight"
            style={{ fontFamily: "'Syne', 'Space Grotesk', sans-serif" }}
          >
            {name}
          </h2>
          <p className="text-xs uppercase tracking-widest mt-0.5" style={{ color: isDark ? "#52525b" : "#a1a1aa" }}>
            {count} titres · Saison
          </p>
        </div>
      </div>
      <div
        className="hidden md:flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-xl"
        style={{
          background: `linear-gradient(135deg, ${colors.from}18, ${colors.to}18)`,
          color: colors.from,
          border: `1px solid ${colors.from}30`,
        }}
      >
        <TrendingUp size={13} />
        Voir tout
      </div>
    </div>
  );
};

/* ─── Main Page ─────────────────────────────────────────────────── */
const SeasonalPage = () => {
  const [seasonData, setSeasonData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeSeason, setActiveSeason] = useState(null);
  const [combinedView, setCombinedView] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);

  const navigate = useNavigate();
  const { mode, primaryColors } = useSelector((state) => state.theme);
  const isDark = mode === "dark";

  const theme = {
    bg: isDark ? "#0c0c10" : "#f4f4f8",
    surface: isDark ? "#13131a" : "#ffffff",
    surfaceAlt: isDark ? "#18181f" : "#f0f0f5",
    border: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
    text: isDark ? "#f0f0f4" : "#111118",
    subText: isDark ? "#52525b" : "#a1a1aa",
    primary: primaryColors?.main || "#6366f1",
    accent: primaryColors?.accent || "#8b5cf6",
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [data, user] = await Promise.all([getSeasonal(), getCurrentUser()]);
        setSeasonData(data);
        setCurrentUser(user);
        if (data.length > 0) setActiveSeason(data[0].season_name);
      } catch {
        setError("Une erreur est survenue lors du chargement.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleWatch = async (anime) => {
    try {
      await addWatch({ anime_id: anime.anime_id, user_id: currentUser?.id });
      showToast("Ajouté à votre watchlist !", "success");
    } catch {
      showToast("Erreur lors de l'ajout.", "error");
    }
  };

  const handleScroll = (id, dir) => {
    const el = document.getElementById(id);
    if (el) el.scrollBy({ left: dir === "left" ? -el.offsetWidth * 0.75 : el.offsetWidth * 0.75, behavior: "smooth" });
  };

  const activeSeasonData = seasonData.find((s) => s.season_name === activeSeason);
  const colors = getSeasonColors(activeSeason || "");

  return (
    <div
      className="min-h-screen transition-colors duration-500"
      style={{ backgroundColor: theme.bg, color: theme.text, fontFamily: "'DM Sans', 'Inter', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@400;500;700&display=swap');
        .no-scrollbar::-webkit-scrollbar{display:none}
        .no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}
        .card-hover{transition:transform 0.25s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.25s ease}
        .card-hover:hover{transform:translateY(-8px) scale(1.02);box-shadow:0 24px 48px rgba(0,0,0,0.3)}
      `}</style>

      <TopBar />
      <AddSeasonalAnime />

      {/* ── Hero ── */}
      <header className="relative pt-28 pb-12 px-6 md:px-12 max-w-7xl mx-auto overflow-hidden">
        {/* Ambient glow */}
        <div
          className="absolute -top-20 -right-20 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-1000"
          style={{ background: `radial-gradient(circle, ${colors.from}, ${colors.to})` }}
        />

        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4"
              style={{
                background: `linear-gradient(135deg, ${colors.from}20, ${colors.to}20)`,
                color: colors.from,
                border: `1px solid ${colors.from}35`,
              }}
            >
              <Sparkles size={11} />
              Catalogue Saisonnier
            </div>
            <h1
              className="text-5xl md:text-6xl font-black tracking-tight leading-none mb-3"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Saisons<br />
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}
              >
                Anime
              </span>
            </h1>
            <p className="text-base max-w-md leading-relaxed" style={{ color: theme.subText }}>
              Explorez les pépites animées saison par saison — des classiques oubliés aux nouveautés incontournables.
            </p>
          </div>

          {/* View toggle */}
          <div
            className="flex items-center gap-1 p-1 rounded-2xl"
            style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
          >
            {[
              { mode: false, Icon: LayoutGrid, label: "Grille" },
              { mode: true, Icon: Rows, label: "Carrousel" },
            ].map(({ mode: m, Icon, label }) => (
              <motion.button
                key={label}
                whileTap={{ scale: 0.93 }}
                onClick={() => setCombinedView(m)}
                title={label}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: combinedView === m ? `linear-gradient(135deg, ${colors.from}, ${colors.to})` : "transparent",
                  color: combinedView === m ? "#fff" : theme.subText,
                  boxShadow: combinedView === m ? `0 4px 14px ${colors.from}44` : "none",
                }}
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Season Nav (Sticky) ── */}
      {!combinedView && !loading && seasonData.length > 0 && (
        <nav
          className="sticky top-[60px] z-40 py-3 backdrop-blur-xl"
          style={{
            background: `${theme.bg}e8`,
            borderBottom: `1px solid ${theme.border}`,
          }}
        >
          <div className="max-w-7xl mx-auto px-6 md:px-12 flex gap-2 overflow-x-auto no-scrollbar">
            {seasonData.map((s) => (
              <SeasonTab
                key={s.season_name}
                season={s}
                isActive={activeSeason === s.season_name}
                onClick={() => setActiveSeason(s.season_name)}
                isDark={isDark}
              />
            ))}
          </div>
        </nav>
      )}

      {/* ── Main Content ── */}
      <main className="max-w-7xl mx-auto px-6 md:px-12 py-10 pb-24">
        {loading ? (
          <SkeletonGrid isDark={isDark} />
        ) : error ? (
          <div
            className="text-center py-24 rounded-3xl"
            style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
          >
            <p className="text-5xl mb-4">😶‍🌫️</p>
            <p className="font-bold text-lg mb-1">Oups, quelque chose a mal tourné</p>
            <p style={{ color: theme.subText }}>{error}</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={combinedView ? "carousel-all" : activeSeason}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="space-y-16"
            >
              {seasonData
                .filter((s) => combinedView || s.season_name === activeSeason)
                .map((season, idx) => (
                  <section key={season.season_name}>
                    <SectionHeader name={season.season_name} count={season.animes.length} isDark={isDark} />

                    {combinedView ? (
                      /* ── Carousel View ── */
                      <div className="group relative -mx-2">
                        {/* Left arrow */}
                        <motion.button
                          initial={{ opacity: 0 }}
                          whileHover={{ scale: 1.1 }}
                          onClick={() => handleScroll(`scroll-${idx}`, "left")}
                          className="absolute -left-2 top-1/2 -translate-y-1/2 z-20 p-3 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-sm"
                          style={{
                            background: isDark ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.9)",
                            border: `1px solid ${theme.border}`,
                            color: theme.text,
                            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                          }}
                        >
                          <ChevronLeft size={22} />
                        </motion.button>

                        <div
                          id={`scroll-${idx}`}
                          className="flex gap-5 overflow-x-auto pb-4 pt-2 px-2 no-scrollbar scroll-smooth"
                        >
                          {season.animes.map((anime, i) => (
                            <motion.div
                              key={anime.id}
                              className="min-w-[190px] md:min-w-[220px] card-hover cursor-pointer"
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.04, duration: 0.3 }}
                            >
                              <AnimeCard
                                anime={anime}
                                showReadButton
                                showWatchButton
                                onAddWatch={() => handleWatch(anime)}
                                onClick={() => navigate(`/details/${anime.anime_id}`)}
                              />
                            </motion.div>
                          ))}
                        </div>

                        {/* Right arrow */}
                        <motion.button
                          initial={{ opacity: 0 }}
                          whileHover={{ scale: 1.1 }}
                          onClick={() => handleScroll(`scroll-${idx}`, "right")}
                          className="absolute -right-2 top-1/2 -translate-y-1/2 z-20 p-3 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-sm"
                          style={{
                            background: isDark ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.9)",
                            border: `1px solid ${theme.border}`,
                            color: theme.text,
                            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                          }}
                        >
                          <ChevronRight size={22} />
                        </motion.button>
                      </div>
                    ) : (
                      /* ── Grid View ── */
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 md:gap-7">
                        {season.animes.map((anime, i) => (
                          <motion.div
                            key={anime.id}
                            className="card-hover cursor-pointer"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.035, duration: 0.3, ease: "easeOut" }}
                          >
                            <AnimeCard
                              anime={anime}
                              showReadButton
                              showWatchButton
                              onAddWatch={() => handleWatch(anime)}
                              onClick={() => navigate(`/details/${anime.anime_id}`)}
                            />
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </section>
                ))}

              {/* Empty state */}
              {seasonData.filter((s) => combinedView || s.season_name === activeSeason).every((s) => s.animes.length === 0) && (
                <div className="text-center py-24">
                  <p className="text-5xl mb-4">🎌</p>
                  <p className="font-bold text-lg mb-1">Aucun anime pour cette saison</p>
                  <p style={{ color: theme.subText }}>Revenez bientôt, du contenu arrive !</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
};

export default SeasonalPage;