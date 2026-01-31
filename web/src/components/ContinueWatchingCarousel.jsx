import React, { useEffect, useState } from "react";
import {
  Play,
  Clock,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Pause,
  Info,
  Sparkles,
  Layers,
} from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

const ContinueWatchingCarousel = ({ animes = [], handlePlay }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const navigate = useNavigate();

  // 🎨 Theme
  const { mode, primaryColors, secondaryColors } = useSelector(
    (state) => state.theme
  );

  const bgGlass =
    mode === "dark" ? "rgba(0,0,0,0.45)" : "rgba(100,100,100,0.2)";
  const borderGlass =
    mode === "dark" ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.15)";
  const main = primaryColors.main;
  const accent = primaryColors.accent;
  const main2 = secondaryColors.main;

  /* --------------------------------------------------
   * AUTO PLAY
   * -------------------------------------------------- */
  useEffect(() => {
    if (!isAutoPlaying || animes.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % animes.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, animes.length]);

  const handleNext = () =>
    setCurrentIndex((prev) => (prev + 1) % animes.length);

  const handlePrev = () =>
    setCurrentIndex((prev) => (prev - 1 + animes.length) % animes.length);

  const currentAnime = animes[currentIndex];
  if (!currentAnime) return null;

  /* --------------------------------------------------
   * PROGRESSION / RECENT
   * -------------------------------------------------- */
  const hasProgress =
    currentAnime.last_episode?.position != null &&
    currentAnime.last_episode?.duration != null;

  const progress = hasProgress
    ? (currentAnime.last_episode.position /
        currentAnime.last_episode.duration) *
      100
    : 0;

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden shadow-2xl group"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${currentAnime.image_url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transform: "scale(1.05)",
          filter: "brightness(0.6)",
        }}
      />

      {/* Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/70" />

      {/* Content */}
      <div className="relative min-h-[470px] flex">
        <div
          className="w-full backdrop-blur-md p-6 md:p-8 border-t"
          style={{ backgroundColor: bgGlass, borderColor: borderGlass }}
        >
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 items-start ">
            {/* Poster */}
            <div className="w-[270px] shrink-0 rounded-xl overflow-hidden shadow-lg">
              <img
                src={currentAnime.image_url}
                alt={currentAnime.name}
                className="w-full h-auto object-cover"
              />
            </div>

            {/* Infos */}
            <div className="flex-1 space-y-4 min-w-0">
              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {hasProgress ? (
                  <Badge icon={<Clock size={14} />} color={accent}>
                    En cours de visionnage
                  </Badge>
                ) : (
                  <Badge icon={<Sparkles size={14} />} color={main}>
                    Récemment ajouté
                  </Badge>
                )}

                {!hasProgress && currentAnime.recent_episodes_count > 0 && (
                  <Badge ghost icon={<Layers size={14} />}>
                    {currentAnime.recent_episodes_count} épisode
                    {currentAnime.recent_episodes_count > 1 ? "s" : ""} ajouté
                    {currentAnime.recent_episodes_count > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>

              {/* Title */}
              <h2
                className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight line-clamp-2"
                title={currentAnime.name}
              >
                {currentAnime.name}
              </h2>

              {/* Episode subtitle */}
              <p
                className="text-lg md:text-xl text-white/85 line-clamp-1"
                title={currentAnime.last_episode.name}
              >
                Épisode {currentAnime.last_episode.number} ·{" "}
                {currentAnime.last_episode.name}
              </p>

            <div className="items-end">
              {/* Progress */}
              {hasProgress && (
                <div className="space-y-2 max-w-xl">
                  <div className="flex justify-between text-sm text-white/80">
                    <span>Progression</span>
                    <span>{Math.round(progress)}%</span>
                  </div>

                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-700"
                      style={{
                        width: `${progress}%`,
                        background: `linear-gradient(90deg, ${main}, ${accent})`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex flex-wrap gap-3 pt-3">
                <ActionButton
                  onClick={() => handlePlay(currentAnime.last_episode)}
                  color={main2}
                  icon={<Play size={20} />}
                >
                  {hasProgress ? "Continuer" : "Regarder"}
                </ActionButton>

                {currentAnime.next_episode && (
                  <ActionButton
                    ghost
                    onClick={() => handlePlay(currentAnime.next_episode)}
                    icon={<SkipForward size={20} />}
                  >
                    Épisode suivant
                  </ActionButton>
                )}

                <ActionButton
                  ghost
                  onClick={() => navigate(`/details/${currentAnime.id}`)}
                  icon={<Info size={20} />}
                >
                  Détails
                </ActionButton>
              </div>
            </div>

            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      {animes.length > 1 && (
        <>
          <NavButton left onClick={handlePrev}>
            <ChevronLeft size={28} />
          </NavButton>

          <NavButton right onClick={handleNext}>
            <ChevronRight size={28} />
          </NavButton>

          <NavButton top right onClick={() => setIsAutoPlaying(!isAutoPlaying)}>
            {isAutoPlaying ? <Pause size={18} /> : <Play size={18} />}
          </NavButton>

          {/* Dots */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {animes.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className="transition-all rounded-full"
                style={{
                  width: i === currentIndex ? 28 : 8,
                  height: 8,
                  backgroundColor:
                    i === currentIndex
                      ? accent
                      : "rgba(255,255,255,0.4)",
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/* --------------------------------------------------
 * UI HELPERS
 * -------------------------------------------------- */

const Badge = ({ children, icon, color, ghost }) => (
  <div
    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
      ghost
        ? "bg-white/10 text-white/90 border border-white/10"
        : ""
    }`}
    style={
      !ghost
        ? {
            backgroundColor: color + "30",
            border: "1px solid " + color + "55",
            color,
          }
        : {}
    }
  >
    {icon}
    {children}
  </div>
);

const ActionButton = ({ children, onClick, icon, color, ghost }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-3 rounded-full transition transform hover:scale-105 ${
      ghost
        ? "bg-white/10 hover:bg-white/20 border border-white/20 text-white"
        : "text-white shadow-lg"
    }`}
    style={!ghost ? { background: color + "70" } : {}}
  >
    {icon}
    {children}
  </button>
);

const NavButton = ({ children, left, right, top, onClick }) => (
  <button
    onClick={onClick}
    className={`absolute bg-black/40 p-3 rounded-full text-white opacity-0 group-hover:opacity-100 hover:bg-black/60 transition ${
      left ? "left-4" : ""
    } ${right ? "right-4" : ""} ${
      top ? "top-4" : "top-1/2 -translate-y-1/2"
    }`}
  >
    {children}
  </button>
);

export default ContinueWatchingCarousel;
