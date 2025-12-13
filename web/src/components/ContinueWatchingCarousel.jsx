import React, { useEffect, useState } from "react";
import {
  Play,
  Clock,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Pause,
  Info,
} from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

const ContinueWatchingCarousel = ({ animes, handlePlay }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const navigate = useNavigate();
  // ---- 🎨 Couleurs du thème depuis Redux ----
  const { mode, primaryColors, secondaryColors } = useSelector(
    (state) => state.theme
  );

  const bgGlass =
    mode === "dark" ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.45)";
  const borderGlass =
    mode === "dark" ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
  const main = primaryColors.main;
  const accent = primaryColors.accent;
  const main2 = secondaryColors.main;
  const accent2 = secondaryColors.accent;

  // -----------------------------------------------------
  // AUTO-PLAY FIXÉ (ne dépend plus de currentIndex)
  // -----------------------------------------------------
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

  const progress =
    (currentAnime.last_episode.position /
      currentAnime.last_episode.duration) *
      100 || 0;

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden shadow-2xl group"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      {/* ---- Background ---- */}
      <div
        className="absolute inset-0 transition-transform duration-700"
        style={{
          backgroundImage: `url(${currentAnime.image_url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transform: "scale(1.05)",
          filter: "brightness(0.65)",
        }}
      />

      {/* ---- Gradient ---- */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 50%, rgba(0,0,0,0.7) 100%)",
        }}
      />

      {/* ---- Content ---- */}
      <div className="relative min-h-[380px] md:min-h-[420px] lg:min-h-[480px] flex">
        <div
          className="w-full backdrop-blur-xl p-6 md:p-8 border-t"
          style={{
            backgroundColor: bgGlass,
            borderColor: borderGlass,
          }}
        >
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 items-start md:items-end">
            {/* Poster */}
            <div className="rounded-xl overflow-hidden shadow-lg">
              <img
                src={currentAnime.image_url}
                alt={currentAnime.name}
                className="w-full h-auto object-cover"
              />
            </div>

            {/* Infos */}
            <div className="flex-grow space-y-4">
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: accent + "30",
                  border: "1px solid " + accent + "55",
                  color: accent,
                }}
              >
                <Clock size={14} />
                En cours de visionnage
              </div>

              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white drop-shadow-xl">
                {currentAnime.name}
              </h2>

              <p className="text-lg md:text-xl text-white/90 drop-shadow-lg ">
                Épisode {currentAnime.last_episode.number} :{" "}
                {currentAnime.last_episode.name}
              </p>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-white/85">
                  <span>Progression</span>
                  <span>{Math.round(progress)}%</span>
                </div>

                <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-700"
                    style={{
                      width: `${progress}%`,
                      background: `linear-gradient(90deg, ${main}, ${accent})`,
                    }}
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-wrap gap-3 pt-4">
                <button
                  onClick={() => handlePlay(currentAnime.last_episode)}
                  className="flex items-center gap-2 text-white px-6 py-3 rounded-full shadow-lg transition transform hover:scale-105"
                  style={{
                    background: main2 + "70",
                  }}
                >
                  <Play size={20} />
                  Continuer à regarder
                </button>

                <button
                  onClick={() => handlePlay(currentAnime.next_episode)}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-full border border-white/20 transition transform hover:scale-105"
                  style={{
                    background: main2 + "10",
                  }}
                >
                  <SkipForward size={20} />
                  Épisode suivant
                </button>
                <button
                  onClick={() =>
                    navigate(`/details/${currentAnime.id}`)
                  }
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-full border border-white/20 transition transform hover:scale-105"
                  style={{
                    background: main2 + "10",
                  }}
                >
                  <Info size={20} />
                  Détails de l'anime
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Navigation ---- */}
      {animes.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 p-3 rounded-full text-white opacity-0 group-hover:opacity-100 hover:bg-black/60 transition"
          >
            <ChevronLeft size={28} />
          </button>

          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 p-3 rounded-full text-white opacity-0 group-hover:opacity-100 hover:bg-black/60 transition"
          >
            <ChevronRight size={28} />
          </button>

          {/* Auto-play toggle */}
          <button
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className="absolute top-4 right-4 bg-black/40 p-2 rounded-full text-white opacity-0 group-hover:opacity-100 hover:bg-black/60 transition"
          >
            {isAutoPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>

          {/* Dots */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
            {animes.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === currentIndex ? 30 : 10,
                  height: 8,
                  backgroundColor:
                    i === currentIndex ? accent : "rgba(255,255,255,0.4)",
                  boxShadow:
                    i === currentIndex ? `0 0 10px ${accent}` : "none",
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ContinueWatchingCarousel;
