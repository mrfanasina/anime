import React, { useEffect, useState, useCallback } from "react";
import api from "../../services/api";
import TopBar from "../../components/TopBar";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getCurrentUser } from "../../controllers/auth";
import { Play, Star, Clock, BookOpen, Sparkles, UserPlus, LogIn, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Loader from "../../utils/Loader";
import AnimeCard from "../../components/AnimeCard";
import { addWatch } from "../../controllers/watch";
import { showToast } from "../../utils/alerts";
import ContinueWatchingCarousel from "../../components/ContinueWatchingCarousel";
import PlayEpisodeModal from "../../components/PlayEpisodeModal";

/* ─── Section header ────────────────────────────────────────────── */
const SectionHeader = ({ icon, title, count, primary, accent, onSeeAll }) => (
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${primary}25, ${accent}25)`, color: primary }}
      >
        {icon}
      </div>
      <div>
        <h2
          className="text-lg font-black tracking-tight leading-none"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          {title}
        </h2>
        {count > 0 && (
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
            {count} titre{count > 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
    {onSeeAll && (
      <button
        onClick={onSeeAll}
        className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all hover:opacity-80"
        style={{ color: primary, background: `${primary}15`, border: `1px solid ${primary}25` }}
      >
        Tout voir <ChevronRight size={12} />
      </button>
    )}
  </div>
);

/* ─── Skeleton card ─────────────────────────────────────────────── */
const SkeletonCard = ({ isDark, delay = 0 }) => (
  <div
    className="rounded-2xl overflow-hidden"
    style={{
      aspectRatio: "225 / 338",
      background: isDark
        ? "linear-gradient(135deg,#1c1c26 25%,#26263a 50%,#1c1c26 75%)"
        : "linear-gradient(135deg,#e0e0ec 25%,#ebebf5 50%,#e0e0ec 75%)",
      backgroundSize: "200% 100%",
      animation: `shimmer 1.8s ease infinite ${delay}s`,
    }}
  />
);

/* ─── Guest CTA ─────────────────────────────────────────────────── */
const GuestCTA = ({ primary, accent, isDark }) => (
  <div className="relative overflow-hidden rounded-3xl p-8 md:p-12 my-8 mx-4 md:mx-0">
    {/* Background */}
    <div
      className="absolute inset-0"
      style={{ background: `linear-gradient(135deg, ${primary}18, ${accent}12)`, border: `1px solid ${primary}20` }}
    />
    <div
      className="absolute -top-16 -right-16 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"
      style={{ background: `radial-gradient(circle, ${primary}, ${accent})` }}
    />

    <div className="relative text-center max-w-lg mx-auto">
      <div
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4"
        style={{ background: `${primary}20`, color: primary, border: `1px solid ${primary}30` }}
      >
        <Sparkles size={11} /> Rejoins la communauté
      </div>
      <h3
        className="text-3xl md:text-4xl font-black mb-3"
        style={{ fontFamily: "'Syne', sans-serif" }}
      >
        Suis ta progression{" "}
        <span
          className="bg-clip-text text-transparent"
          style={{ backgroundImage: `linear-gradient(135deg, ${primary}, ${accent})` }}
        >
          anime
        </span>
      </h3>
      <p className="text-sm mb-8 leading-relaxed" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>
        Crée un compte pour sauvegarder ta watch-list, suivre ta progression et découvrir des recommandations personnalisées.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={() => (window.location.href = "/signup")}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm shadow-lg transition-all hover:opacity-90 hover:scale-105"
          style={{ background: `linear-gradient(135deg, ${primary}, ${accent})`, color: "#fff", boxShadow: `0 8px 24px ${primary}44` }}
        >
          <UserPlus size={16} /> Créer un compte
        </button>
        <button
          onClick={() => (window.location.href = "/login")}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all hover:opacity-80"
          style={{
            background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"}`,
            color: isDark ? "#fff" : "#000",
          }}
        >
          <LogIn size={16} /> Se connecter
        </button>
      </div>
    </div>
  </div>
);

/* ─── Main ──────────────────────────────────────────────────────── */
export default function HomePage() {
  const [user, setUser]                       = useState(null);
  const [sections, setSections]               = useState([]);
  const [continueWatchingData, setContinueWatchingData] = useState([]);
  const [randomAnimes, setRandomAnimes]       = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [isPlaying, setIsPlaying]             = useState(false);
  const [currentEpisode, setCurrentEpisode]   = useState([]);

  const navigate = useNavigate();
  const { mode, primaryColors, secondaryColors } = useSelector((s) => s.theme);
  const isDark   = mode === "dark";
  const primary  = primaryColors?.main   || "#6366f1";
  const accent   = primaryColors?.accent || "#8b5cf6";

  const theme = {
    bg:      isDark ? "#0a0a0f" : "#f0f0f7",
    surface: isDark ? "#111118" : "#ffffff",
    border:  isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)",
    text:    isDark ? "#f0f0f4" : "#111118",
    sub:     isDark ? "#52525b" : "#a1a1aa",
  };

  /* fetch */
  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      setUser(u);
      setLoading(true);
      try {
        if (u?.id) {
          const res = await api.get(`/home/${u.id}`);
          setContinueWatchingData(res.data.continueWatching || []);
          setSections([
            { title: "Nouveaux épisodes",      icon: <Play size={16} />,     data: res.data.recently_added_animes || [] },
            { title: "Top notés",              icon: <Star size={16} />,     data: res.data.topRated || [] },
            { title: "Regardés récemment",     icon: <Clock size={16} />,    data: res.data.finished || [] },
            { title: "Pas encore commencés",   icon: <BookOpen size={16} />, data: res.data.notWatched || [] },
          ]);
        } else {
          const res = await api.get("/home/random");
          setRandomAnimes(res.data.suggestedAnimes || []);
        }
      } catch (err) {
        console.error(err);
        setSections([]);
        setRandomAnimes([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handlePlay = (episode) => { setCurrentEpisode([{ ...episode }]); setIsPlaying(true); };
  const handleRead = (anime)   => navigate(`/details/${anime.id}`);

  const handleAddWatchList = (anime) => {
    if (!user) { showToast("Connectez-vous pour utiliser la watch-list", "error"); return; }
    addWatch(user.id, { anime_id: anime.id, status: "watching" })
      .then(() => showToast(`${anime.name} ajouté !`, "success"))
      .catch((err) => showToast(err.message || "Erreur", "error"));
  };

  if (loading) return <Loader />;

  return (
    <div
      className="min-h-screen transition-colors duration-500"
      style={{ backgroundColor: theme.bg, color: theme.text, fontFamily: "'DM Sans', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      `}</style>

      <TopBar />
      <PlayEpisodeModal
        userId={user?.id}
        selectedEpisodes={currentEpisode}
        isOpen={isPlaying}
        onClose={() => setIsPlaying(false)}
      />

      {/* ── Hero Carousel ── */}
      {continueWatchingData.length > 0 && (
        <div className="pt-16">
          <ContinueWatchingCarousel
            animes={continueWatchingData}
            handlePlay={handlePlay}
            mode={mode}
          />
        </div>
      )}

      {/* ── Spacer when no carousel ── */}
      {continueWatchingData.length === 0 && <div className="pt-24" />}

      {user?.id ? (
        /* ══ LOGGED IN ══ */
        <main className="max-w-screen-xl mx-auto px-4 md:px-8 py-10 space-y-14 pb-24">
          {sections.map((section, si) =>
            section.data?.length > 0 ? (
              <motion.section
                key={section.title}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: si * 0.08, duration: 0.4, ease: "easeOut" }}
              >
                <SectionHeader
                  icon={section.icon}
                  title={section.title}
                  count={section.data.length}
                  primary={primary}
                  accent={accent}
                />

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
                  {section.data.map((anime, i) => (
                    <motion.div
                      key={anime.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: si * 0.04 + i * 0.025, duration: 0.3 }}
                    >
                      <AnimeCard
                        anime={anime}
                        onClick={() => handleRead(anime)}
                        onRead={() => handleRead(anime)}
                        onAddWatch={handleAddWatchList}
                        showRank={section.title === "Top notés"}
                        showNote
                        showType
                        showStatus
                        showStudio
                        showSeasons
                        showGenres
                      />
                    </motion.div>
                  ))}
                </div>

                {/* Divider */}
                {si < sections.length - 1 && (
                  <div
                    className="mt-14 h-px w-full"
                    style={{ background: `linear-gradient(90deg, transparent, ${theme.border} 30%, ${theme.border} 70%, transparent)` }}
                  />
                )}
              </motion.section>
            ) : null
          )}
        </main>
      ) : (
        /* ══ GUEST ══ */
        <main className="max-w-screen-xl mx-auto px-4 md:px-8 pb-24">
          {/* Guest CTA banner */}
          <GuestCTA primary={primary} accent={accent} isDark={isDark} />

          {/* Popular animes grid */}
          <section className="mt-4">
            <SectionHeader
              icon={<Sparkles size={16} />}
              title="Animes populaires"
              count={randomAnimes.length}
              primary={primary}
              accent={accent}
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
              {randomAnimes.length > 0
                ? randomAnimes.map((anime, i) => (
                    <motion.div
                      key={anime.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.025, duration: 0.3 }}
                    >
                      <AnimeCard
                        anime={anime}
                        onClick={() => handleRead(anime)}
                        onRead={() => handleRead(anime)}
                        onAddWatch={handleAddWatchList}
                        showNote
                        showType
                        showRank
                        showStatus={false}
                        showStudio
                        showSeasons={false}
                        showGenres
                      />
                    </motion.div>
                  ))
                : Array.from({ length: 12 }).map((_, i) => (
                    <SkeletonCard key={i} isDark={isDark} delay={i * 0.06} />
                  ))}
            </div>
          </section>
        </main>
      )}
    </div>
  );
}