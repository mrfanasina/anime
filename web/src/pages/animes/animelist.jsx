import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { playAnime } from "../../controllers/anime";
import TopBar from "../../components/TopBar";
import { useSelector } from "react-redux";
import { Folder, Play } from "lucide-react";

export default function Animes() {
  const [animes, setAnimes] = useState([]);
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(null);

  const { mode, primaryColors, secondaryColors } = useSelector(state => state.theme);
  const textColor = mode === 'dark' ? '#fff' : '#000';
  const bgColor = mode === 'dark' ? '#1a1a1a' : '#f9f9f9';

  useEffect(() => {
    api.get("/animes").then(res => setAnimes(res.data));
  }, []);

  const buttonStyle = (bg, border) => ({
    backgroundColor: bg,
    border: `2px solid ${border}`,
    color: textColor
  });

  if (selectedAnime && !selectedSeason) {
    return (
      <div style={{ backgroundColor: bgColor, minHeight: '100vh', color: textColor }}>
        <TopBar />
        <div className="p-8">
          <button
            className="mb-4 px-4 py-2 rounded transition"
            style={buttonStyle(primaryColors.main + '20', secondaryColors.accent)}
            onClick={() => setSelectedAnime(null)}
          >
            ← Retour
          </button>
          <h2 className="text-2xl font-bold mb-6">{selectedAnime.name}</h2>
          <ul className="space-y-2">
            {selectedAnime.seasons.map(season => (
              <li key={season.id}>
                <button
                  className="flex items-center px-4 py-2 rounded transition w-full"
                  style={buttonStyle(primaryColors.main + '20', secondaryColors.accent)}
                  onClick={() => setSelectedSeason(season)}
                >
                  <Folder className="mr-2" size={20} /> {season.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (selectedSeason) {
    return (
      <div style={{ backgroundColor: bgColor, minHeight: '100vh', color: textColor }}>
        <TopBar />
        <div className="p-8">
          <button
            className="mb-4 px-4 py-2 rounded transition"
            style={buttonStyle(primaryColors.main + '20', secondaryColors.accent)}
            onClick={() => setSelectedSeason(null)}
          >
            ← Retour
          </button>
          <h2 className="text-2xl font-bold mb-6">{selectedSeason.name}</h2>
          <ul className="space-y-2">
            {selectedSeason.episodes.map(ep => (
              <li key={ep.id}>
                <button
                  onClick={() => playAnime(ep.path)}
                  className="flex items-center px-2 py-1 rounded transition w-full"
                  style={{ backgroundColor: secondaryColors.main + '20', color: textColor }}
                >
                  <Play className="mr-2" size={18} /> {ep.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: bgColor, minHeight: '100vh', color: textColor }}>
      <TopBar />
      <div className="p-8">
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {animes.map(anime => (
            <li key={anime.id}>
              <button
                className="flex items-center w-full px-6 py-4 rounded shadow hover:shadow-lg transition"
                style={buttonStyle(primaryColors.main + '20', secondaryColors.accent)}
                onClick={() => setSelectedAnime(anime)}
              >
                <Folder className="mr-3" size={20} /> 
                <span className="font-semibold">{anime.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}import React, { useEffect, useState } from "react";
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
              style={{ backgroundColor: primaryColors.main + "90",color: textColor }}
              onClick={(e) => {
                e.stopPropagation();
                onRead && onRead(anime);
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm shadow-md transition"
            >
              <Play size={16} /> Lire
            </button>
          )}

          {showWatchButton && (
            <button
              style={{ backgroundColor: primaryColors.accent + "90",color: textColor }}
              onClick={(e) => {
                e.stopPropagation();
                onAddWatch && onAddWatch(anime);
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm shadow-md transition`}
            >
              <Plus size={16} /> Watch-list
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
