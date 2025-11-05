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
}