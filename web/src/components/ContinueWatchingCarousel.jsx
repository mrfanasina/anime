import React, { useEffect, useState, useRef } from "react";
import {
  Play, Clock, SkipForward, ChevronLeft, ChevronRight,
  Pause, Info, Sparkles, Layers, Volume2,
} from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Sub-components ────────────────────────────────────────────── */

const Badge = ({ children, icon, color, ghost }) => (
  <div
    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
    style={
      ghost
        ? { background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.15)" }
        : { background: color + "28", border: `1px solid ${color}50`, color }
    }
  >
    {icon}{children}
  </div>
);

const ActionBtn = ({ children, onClick, icon, color, ghost, small }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 ${
      small ? "px-4 py-2 text-xs" : "px-6 py-3 text-sm"
    }`}
    style={
      ghost
        ? { background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)", color: "#fff", backdropFilter: "blur(8px)" }
        : { background: color, color: "#fff", boxShadow: `0 6px 20px ${color}55` }
    }
  >
    {icon}{children}
  </button>
);

/* ─── Main Component ────────────────────────────────────────────── */

const ContinueWatchingCarousel = ({ animes = [], handlePlay }) => {
  const [currentIndex, setCurrentIndex]   = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [direction, setDirection]         = useState(1); // 1 = forward, -1 = backward
  const navigate = useNavigate();

  const { mode, primaryColors, secondaryColors } = useSelector((s) => s.theme);
  const isDark  = mode === "dark";
  const primary = primaryColors?.main   || "#6366f1";
  const accent  = primaryColors?.accent || "#8b5cf6";
  const cta     = secondaryColors?.main || primary;

  /* autoplay */
  useEffect(() => {
    if (!isAutoPlaying || animes.length <= 1) return;
    const t = setInterval(() => {
      setDirection(1);
      setCurrentIndex((p) => (p + 1) % animes.length);
    }, 6000);
    return () => clearInterval(t);
  }, [isAutoPlaying, animes.length]);

  const goTo = (idx) => {
    setDirection(idx > currentIndex ? 1 : -1);
    setCurrentIndex(idx);
  };
  const handleNext = () => { setDirection(1);  setCurrentIndex((p) => (p + 1) % animes.length); };
  const handlePrev = () => { setDirection(-1); setCurrentIndex((p) => (p - 1 + animes.length) % animes.length); };

  const current = animes[currentIndex];
  if (!current) return null;

  const hasProgress = current.last_episode?.position != null && current.last_episode?.duration != null;
  const progress    = hasProgress ? (current.last_episode.position / current.last_episode.duration) * 100 : 0;

  /* slide variants */
  const variants = {
    enter:  (d) => ({ opacity: 0, x: d > 0 ? 60 : -60, scale: 0.97 }),
    center: { opacity: 1, x: 0, scale: 1 },
    exit:   (d) => ({ opacity: 0, x: d > 0 ? -60 : 60, scale: 0.97 }),
  };

  return (
    <div
      className="relative w-full overflow-hidden group"
      style={{ minHeight: 520 }}
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@400;500;600&display=swap');
      `}</style>

      {/* ── Background layer (blurred image) ── */}
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={`bg-${currentIndex}`}
          className="absolute inset-0 z-0"
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1.03 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
          style={{
            backgroundImage: `url(${current.image_url})`,
            backgroundSize: "cover",
            backgroundPosition: "center top",
            filter: "blur(18px) brightness(0.35) saturate(1.3)",
            transform: "scale(1.1)",
          }}
        />
      </AnimatePresence>

      {/* Deep gradient overlay */}
      <div
        className="absolute inset-0 z-10"
        style={{
          background: isDark
            ? "linear-gradient(180deg, rgba(10,10,15,0.3) 0%, rgba(10,10,15,0.65) 50%, rgba(10,10,15,0.97) 100%)"
            : "linear-gradient(180deg, rgba(240,240,247,0.2) 0%, rgba(240,240,247,0.6) 50%, rgba(240,240,247,0.98) 100%)",
        }}
      />

      {/* Side gradient for poster contrast */}
      <div
        className="absolute inset-0 z-10 hidden md:block"
        style={{
          background: "linear-gradient(90deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.5) 100%)",
        }}
      />

      {/* ── Content ── */}
      <div className="relative z-20 max-w-screen-xl mx-auto px-6 md:px-10 py-12 md:py-16 flex flex-col md:flex-row items-end md:items-center gap-8">

        {/* Poster */}
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={`poster-${currentIndex}`}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="hidden md:block shrink-0"
            style={{ width: 200, borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}
          >
            <img
              src={current.image_url}
              alt={current.name}
              className="w-full h-auto object-cover"
              style={{ display: "block" }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Info */}
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={`info-${currentIndex}`}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
            className="flex-1 min-w-0"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              {hasProgress ? (
                <Badge icon={<Clock size={12} />} color={accent}>En cours</Badge>
              ) : (
                <Badge icon={<Sparkles size={12} />} color={primary}>Récemment ajouté</Badge>
              )}
              {!hasProgress && current.recent_episodes_count > 0 && (
                <Badge ghost icon={<Layers size={12} />}>
                  {current.recent_episodes_count} épisode{current.recent_episodes_count > 1 ? "s" : ""} récent{current.recent_episodes_count > 1 ? "s" : ""}
                </Badge>
              )}
              {current.type && (
                <Badge ghost>
                  {current.type}
                </Badge>
              )}
            </div>

            {/* Title */}
            <h2
              className="font-black leading-none mb-2"
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: "clamp(1.8rem, 4vw, 3.2rem)",
                color: isDark ? "#fff" : "#0a0a0f",
                textShadow: isDark ? "0 2px 16px rgba(0,0,0,0.5)" : "none",
              }}
            >
              {current.name}
            </h2>

            {/* Episode */}
            <p
              className="text-base mb-5 line-clamp-1"
              style={{ color: isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.55)" }}
            >
              Épisode {current.last_episode.number} · {current.last_episode.name}
            </p>

            {/* Progress bar */}
            {hasProgress && (
              <div className="max-w-sm mb-5">
                <div className="flex justify-between text-xs font-semibold mb-1.5"
                  style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)" }}>
                  <span>Progression</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)" }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                    style={{ background: `linear-gradient(90deg, ${primary}, ${accent})` }}
                  />
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <ActionBtn
                onClick={() => handlePlay(current.last_episode)}
                icon={<Play size={18} fill="white" />}
                color={`linear-gradient(135deg, ${primary}, ${accent})`}
              >
                {hasProgress ? "Continuer" : "Regarder"}
              </ActionBtn>

              {current.next_episode && (
                <ActionBtn ghost onClick={() => handlePlay(current.next_episode)} icon={<SkipForward size={17} />}>
                  Épisode suivant
                </ActionBtn>
              )}

              <ActionBtn ghost onClick={() => navigate(`/details/${current.id}`)} icon={<Info size={17} />}>
                Détails
              </ActionBtn>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Navigation arrows ── */}
      {animes.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-2xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
            style={{ background: "rgba(0,0,0,0.5)", color: "#fff", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-2xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
            style={{ background: "rgba(0,0,0,0.5)", color: "#fff", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}
          >
            <ChevronRight size={22} />
          </button>

          {/* Autoplay toggle */}
          <button
            onClick={() => setIsAutoPlaying((v) => !v)}
            className="absolute top-4 right-4 z-30 p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
            style={{ background: "rgba(0,0,0,0.45)", color: "rgba(255,255,255,0.7)", backdropFilter: "blur(6px)" }}
            title={isAutoPlaying ? "Pause autoplay" : "Reprendre autoplay"}
          >
            {isAutoPlaying ? <Pause size={15} /> : <Play size={15} />}
          </button>

          {/* Progress dots */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
            {animes.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className="transition-all duration-300 rounded-full"
                style={{
                  width:  i === currentIndex ? 24 : 7,
                  height: 7,
                  background: i === currentIndex
                    ? `linear-gradient(90deg, ${primary}, ${accent})`
                    : "rgba(255,255,255,0.3)",
                }}
              />
            ))}
          </div>

          {/* Autoplay timer bar */}
          {isAutoPlaying && (
            <div className="absolute bottom-0 left-0 right-0 z-30 h-0.5" style={{ background: "rgba(255,255,255,0.1)" }}>
              <motion.div
                key={currentIndex}
                className="h-full"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 6, ease: "linear" }}
                style={{ background: `linear-gradient(90deg, ${primary}, ${accent})` }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ContinueWatchingCarousel;