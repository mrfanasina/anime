import React, { useEffect, useState } from "react";
import api from "../../services/api";
import TopBar from "../../components/TopBar";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import AnimeCard from "../../components/AnimeCard";
import { addWatch } from "../../controllers/watch";
import { showToast } from "../../utils/alerts";
import { getCurrentUser } from "../../controllers/auth";
import AddAnime from "../../components/AddAnime";
import { getAllAnimes } from "../../controllers/anime";
import { motion } from "framer-motion";
import { Tv, Film, LayoutGrid, Sparkles, Eye, EyeOff } from "lucide-react";

/* ─── Type tab config ───────────────────────────────────────────── */
const TYPE_TABS = [
  { key: "ALL", label: "Tout", Icon: LayoutGrid },
  { key: "TV", label: "Séries", Icon: Tv },
  { key: "movies", label: "Films", Icon: Film },
];

/* ─── Skeleton ──────────────────────────────────────────────────── */
const SkeletonCard = ({ isDark, delay = 0 }) => (
  <div
    className="relative overflow-hidden rounded-2xl"
    style={{
      aspectRatio: "225 / 338",
      background: isDark
        ? "linear-gradient(135deg,#1c1c24 25%,#24242e 50%,#1c1c24 75%)"
        : "linear-gradient(135deg,#e0e0ea 25%,#eaeaf4 50%,#e0e0ea 75%)",
      backgroundSize: "200% 100%",
      animation: `shimmer 1.8s ease infinite ${delay}s`,
    }}
  />
);

/* ─── Page ─────────────────────────────────────────────────────── */
const AnimePage = () => {
  const { type = "ALL" } = useParams();

  const [animes, setAnimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // garde ton filtre important
  const [hideEmpty, setHideEmpty] = useState(true);

  const navigate = useNavigate();
  const { mode, primaryColors } = useSelector((state) => state.theme);

  const isDark = mode === "dark";
  const primaryMain = primaryColors?.main || "#6366f1";
  const primaryAccent = primaryColors?.accent || "#8b5cf6";

  const theme = {
    bg: isDark ? "#0c0c10" : "#f0f0f6",
    surface: isDark ? "#13131a" : "#ffffff",
    border: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)",
    text: isDark ? "#f0f0f4" : "#111118",
    subText: isDark ? "#52525b" : "#a1a1aa",
  };

  /* ─── fetch ───────────────────────────────────────────── */
  useEffect(() => {
    setLoading(true);
    setError(null);

    const fetcher =
      type === "TV"
        ? api.get("/anime/TV").then((r) => r.data)
        : type === "movies"
        ? api.get("/anime/movies").then((r) => r.data)
        : getAllAnimes();

    fetcher
      .then((data) => setAnimes(data))
      .catch(() => setError("Impossible de charger les animés"))
      .finally(() => setLoading(false));
  }, [type]);

  useEffect(() => {
    getCurrentUser().then(setCurrentUser).catch(console.error);
  }, []);

  /* ─── watchlist ───────────────────────────────────────── */
  const handleAddWatchList = (anime) => {
    if (!currentUser) {
      showToast("Connectez-vous pour utiliser la watch-list", "error");
      return;
    }

    addWatch(currentUser.id, {
      anime_id: anime.id,
      status: "watching",
    })
      .then(() => showToast(`${anime.name} ajouté !`, "success"))
      .catch((err) =>
        showToast(err.message || "Erreur lors de l'ajout", "error")
      );
  };

  /* ─── filtre final ────────────────────────────────────── */
  const filteredAnimes = hideEmpty
    ? animes.filter((a) => !( a.status_on_disk === "empty"))
    : animes;

  const resultCount = filteredAnimes.length;

  return (
    <div
      className="min-h-screen transition-colors duration-500"
      style={{
        backgroundColor: theme.bg,
        color: theme.text,
        fontFamily: "'DM Sans', 'Inter', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      `}</style>

      <TopBar />
      <AddAnime />

      {/* ── HEADER ── */}
      <header className="relative pt-28 pb-6 px-6 md:px-10 max-w-screen-xl mx-auto">
        <div
          className="absolute top-10 left-0 w-72 h-72 rounded-full blur-3xl opacity-10 pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${primaryMain}, ${primaryAccent})`,
          }}
        />

        <div className="flex items-end justify-between gap-4">
          <div>
            <div
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-3"
              style={{
                background: `linear-gradient(135deg, ${primaryMain}20, ${primaryAccent}20)`,
                color: primaryMain,
                border: `1px solid ${primaryMain}30`,
              }}
            >
              <Sparkles size={11} />
              Bibliothèque
            </div>

            <h1 className="text-4xl md:text-5xl font-black">
              Catalogue{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${primaryMain}, ${primaryAccent})`,
                }}
              >
                Anime
              </span>
            </h1>

            {!loading && (
              <p className="mt-2 text-sm" style={{ color: theme.subText }}>
                {resultCount} titre{resultCount > 1 ? "s" : ""}
              </p>
            )}
          </div>

          <button
            onClick={() => setHideEmpty(!hideEmpty)}
            className={`
              relative overflow-hidden px-5 py-3 rounded-2xl
              flex items-center gap-3 transition-all duration-300 ease-out
              active:scale-95 group
              ${hideEmpty ? 'shadow-[0_0_20px_-5px_rgba(var(--primary-rgb),0.4)]' : 'shadow-lg'}
            `}
            style={{
              background: hideEmpty 
                ? `linear-gradient(135deg, ${primaryMain}15, ${primaryMain}30)` 
                : `linear-gradient(135deg, ${theme.surface}80, ${theme.surface})`,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: `1px solid ${hideEmpty ? primaryMain : `${theme.border}40`}`,
              color: hideEmpty ? primaryMain : theme.text,
            }}
          >
            {/* Effet de reflet interne (Inner Glow) */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />

            <div className="relative flex items-center gap-3 font-medium tracking-wide">
              {hideEmpty ? (
                <>
                  <EyeOff size={20} className="animate-pulse" />
                  <span className="text-sm uppercase tracking-wider font-bold">Masqué</span>
                </>
              ) : (
                <>
                  <Eye size={20} className="group-hover:rotate-12 transition-transform" />
                  <span className="text-sm uppercase tracking-wider opacity-80">Tout voir</span>
                </>
              )}
            </div>
          </button>
        </div>

        {/* ── TYPE TABS ── */}
        <div
          className="flex gap-2 p-1.5 rounded-2xl w-fit mt-6"
          style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
        >
          {TYPE_TABS.map(({ key, label, Icon }) => {
            const isActive =
              type === key || (type === "ALL" && key === "ALL");

            return (
              <motion.button
                key={key}
                whileTap={{ scale: 0.95 }}
                onClick={() =>
                  navigate(key === "ALL" ? "/animes/ALL" : `/animes/${key}`)
                }
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
                style={{
                  background: isActive
                    ? `linear-gradient(135deg, ${primaryMain}, ${primaryAccent})`
                    : "transparent",
                  color: isActive ? "#fff" : theme.subText,
                }}
              >
                <Icon size={15} />
                {label}
              </motion.button>
            );
          })}
        </div>
      </header>

      {/* ── GRID ── */}
      <main className="max-w-screen-xl mx-auto px-6 md:px-10 pb-24">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {Array.from({ length: 18 }).map((_, i) => (
              <SkeletonCard key={i} isDark={isDark} delay={i * 0.05} />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-24">
            <p className="text-5xl mb-4">😶‍🌫️</p>
            <p>{error}</p>
          </div>
        ) : (
          <motion.div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {filteredAnimes.map((anime, i) => (
              <motion.div
                key={anime.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <AnimeCard
                  anime={anime}
                  onClick={() => navigate(`/details/${anime.id}`)}
                  onAddWatch={handleAddWatchList}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default AnimePage;