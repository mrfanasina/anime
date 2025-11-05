import React, { useEffect, useState } from "react";
import noImageDark from "../assets/no-image-dark.png";
import noImageLight from "../assets/no-image-light.png";
import { Play, Plus } from "lucide-react";
import { useSelector } from "react-redux";

export default function AnimeCard({
  anime,
  onClick,
  onRead,
  onAddWatch,
  showReadButton = true,
  showWatchButton = true,
}) {
  if (!anime) return null;
  const { mode, primaryColors, secondaryColors, textColor } = useSelector(
      (state) => state.theme
    );
  const hasImage = anime.image_url && anime.image_url !== "";
  const [isDark, setIsDark] = useState(
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  console.log(primaryColors)
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => setIsDark(e.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const fallbackImage = isDark ? noImageDark : noImageLight;

  return (
    <div
      className="relative group cursor-pointer overflow-hidden rounded-lg shadow-lg hover:shadow-2xl transition-transform transform hover:-translate-y-1"
      style={{
        aspectRatio: "225 / 338",
        backgroundColor: !hasImage ? "#555" : "transparent",
      }}
      onClick={onClick}
    >
      <img
        src={hasImage ? anime.image_url : fallbackImage}
        alt={anime.name}
        title={anime.name}
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />

      <div
        className="absolute w-full text-center font-bold text-gray-200 flex justify-center items-center transition-all duration-300 group-hover:opacity-0"
        style={{
          fontSize: "18px",
          backdropFilter: !hasImage ? "blur(6px)" : "none",
          background: !hasImage ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.4)",
          bottom: "0",
          height: hasImage ? "auto" : "100%",
          padding: hasImage ? "0.5rem" : "1rem",
          textAlign: "center",
          transform: "translateY(0)",
          fontFamily: "'Anime Ace', sans-serif",
        }}
      >
        {anime.name}
      </div>

      <div
        className="absolute inset-0 flex flex-col justify-between items-center opacity-0 group-hover:opacity-100 transition-all duration-300"
        style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      >
        <div className="flex-1 flex items-center justify-center text-center px-2">
          <h3
            className="text-white font-bold text-lg drop-shadow-lg"
            style={{
              fontFamily: "'Anime Ace', sans-serif",
              textShadow: "2px 2px 6px rgba(0,0,0,0.8)",
            }}
          >
            {anime.name}
          </h3>
        </div>

        <div className="flex justify-center gap-2 pb-3">
          {showReadButton && (
            <button
              style={{ backgroundColor: primaryColors.main,color: textColor }}
              onClick={(e) => {
                e.stopPropagation();
                onRead && onRead(anime);
              }}
              className="flex items-center gap-1 text-white px-3 py-1.5 rounded-full text-sm shadow-md transition"
            >
              <Play size={16} /> Lire
            </button>
          )}

          {showWatchButton && (
            <button
              style={{ backgroundColor: secondaryColors.main,color: textColor }}
              onClick={(e) => {
                e.stopPropagation();
                onAddWatch && onAddWatch(anime);
              }}
              className={`flex items-center gap-1 text-white px-3 py-1.5 rounded-full text-sm shadow-md transition`}
            >
              <Plus size={16} /> Watch-list
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
