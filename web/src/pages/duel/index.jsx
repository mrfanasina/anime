import React, { useEffect, useState } from "react";
import api from "../../services/api";
import TopBar from "../../components/TopBar";
import { useSelector } from "react-redux";

export default function Duel() {
  const { mode, primaryColors, secondaryColors } = useSelector(state => state.theme);
  const textColor = mode === 'dark' ? '#fff' : '#000';

  const [animes, setAnimes] = useState([]);
  const [duel, setDuel] = useState([null, null]);
  const [result, setResult] = useState(null);
  const [classement, setClassement] = useState([]);
  const [winnerIdx, setWinnerIdx] = useState(null);

  useEffect(() => {
    api.get("/anime/all").then(res => setAnimes(res.data));
    fetchClassement();
  }, []);

  const fetchClassement = () => {
    api.get("/anime/all").then(res => {
      const sorted = [...res.data].sort((a, b) => b.elo - a.elo);
      setClassement(sorted.slice(0, 10));
    });
  };

  const startDuel = () => {
    if (animes.length < 2) return;
    const shuffled = [...animes].sort(() => Math.random() - 0.5);
    setDuel([shuffled[0], shuffled[1]]);
    setResult(null);
    setWinnerIdx(null);
  };

  const vote = async idx => {
    setWinnerIdx(idx);
    const winner = duel[idx];
    await api.post("stats/duel", {
      anime1_id: duel[0].id,
      anime2_id: duel[1].id,
      winner_id: winner.id,
    });
    setResult(`Tu as voté pour "${winner.name}" !`);
    fetchClassement();
    setTimeout(startDuel, 1200);
  };

  const skipDuel = () => {
    setResult("Duel ignoré.");
    setWinnerIdx(null);
    setTimeout(startDuel, 800);
  };

  useEffect(() => {
    if (animes.length >= 2) startDuel();
  }, [animes]);

  return (
    <div style={{ backgroundColor: mode === 'dark' ? '#111' : '#f9f9f9', color: textColor, minHeight: '100vh' }}>
      <TopBar />
      <div className="flex flex-col pt-20 md:flex-row p-8 gap-8">
        <div className="flex-1">
          <h2 className="text-2xl font-bold mb-6">Duel d'animés</h2>
          {duel[0] && duel[1] ? (
            <div className="flex gap-8">
              {[0, 1].map(idx => {
                const isWinner = winnerIdx === idx;
                return (
                  <div
                    key={duel[idx].id}
                    className={`flex flex-col items-center rounded shadow p-6 min-w-[220px] transition-all duration-500`}
                    style={{
                      background: isWinner
                        ? `linear-gradient(135deg, ${secondaryColors.main}, ${primaryColors.main})`
                        : mode === 'dark' ? '#222' : '#fff',
                      color: textColor,
                      transform: winnerIdx === null ? 'scale(1)' : isWinner ? 'scale(1.05)' : 'scale(1)',
                      opacity: winnerIdx !== null && !isWinner ? 0.6 : 1,
                      boxShadow: isWinner ? `0 0 24px ${primaryColors.main}55` : undefined,
                      cursor: winnerIdx === null ? 'pointer' : 'default'
                    }}
                  >
                    <h3 className="text-xl font-semibold mb-2">{duel[idx].name}</h3>
                    <div className="text-sm mb-4" style={{ color: mode === 'dark' ? '#ccc' : '#555' }}>Elo: {duel[idx].elo}</div>
                    <button
                      className="mt-auto px-6 py-2 rounded transition-all duration-300"
                      style={{
                        backgroundColor: winnerIdx === null
                          ? primaryColors.main
                          : isWinner
                          ? secondaryColors.main
                          : '#999',
                        color: '#fff',
                        cursor: winnerIdx !== null && !isWinner ? 'not-allowed' : 'pointer'
                      }}
                      disabled={winnerIdx !== null}
                      onClick={() => vote(idx)}
                    >
                      Voter pour
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div>Chargement...</div>
          )}
          {result && (
            <div className="mt-6 font-bold animate-bounce" style={{ color: primaryColors.main }}>{result}</div>
          )}
          {duel[0] && duel[1] && winnerIdx === null && (
            <div className="mt-6 flex justify-center">
              <button
                className="px-6 py-2 rounded transition"
                style={{ backgroundColor: secondaryColors.main, color: '#fff' }}
                onClick={skipDuel}
              >
                Passer
              </button>
            </div>
          )}
        </div>
        <div className="flex-1 border-t md:border-t-0 md:border-l" style={{ borderColor: mode === 'dark' ? '#444' : '#ccc', paddingTop: '2rem', paddingLeft: '2rem' }}>
          <h3 className="text-xl font-bold mb-4">Classement Elo</h3>
          <ol className="space-y-2">
            {classement.map(anime => (
              <li key={anime.id} className="flex justify-between items-center rounded px-4 py-2"
                  style={{
                    backgroundColor: mode === 'dark' ? '#222' : '#f0f0f0',
                    color: textColor
                  }}>
                <span className="font-semibold">{anime.name}</span>
                <span>{anime.elo}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}