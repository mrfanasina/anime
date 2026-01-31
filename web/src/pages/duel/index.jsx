import React, { useEffect, useState } from "react";
import api from "../../services/api";
import TopBar from "../../components/TopBar";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Info, Play, Plus, SkipForward, Trophy, Zap } from "lucide-react";
import { addWatch } from "../../controllers/watch";
import { getCurrentUser } from "../../controllers/auth";

export default function Duel() {
  const { mode, primaryColors, secondaryColors } = useSelector(state => state.theme);
  const [animes, setAnimes] = useState([]);
  const [duel, setDuel] = useState([null, null]);
  const [winnerIdx, setWinnerIdx] = useState(null);
  const [classement, setClassement] = useState([]);
  const [isShaking, setIsShaking] = useState(false);
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  const textColor = mode === 'dark' ? '#fff' : '#1a1a1a';
  const cardBg = mode === 'dark' ? '#1e1e1e' : '#ffffff';
  const innactifBg = mode === 'dark' ? '#2d2d2d' : '#e0e0e0';

  useEffect(() => {
    getCurrentUser()
      .then(setCurrentUser)
      .catch(console.error);
  }, []);

  useEffect(() => {
    api.get("/anime").then(res => {
      setAnimes(res.data);
      if (res.data.length >= 2) generateDuel(res.data);
    });
    fetchClassement();
  }, []);

  const fetchClassement = () => {
    api.get("/anime").then(res => {
      const sorted = [...res.data].sort((a, b) => b.elo - a.elo);
      setClassement(sorted.slice(0, 10));
    });
  };

  const generateDuel = (list) => {
    const shuffled = [...list].sort(() => Math.random() - 0.5);
    setDuel([shuffled[0], shuffled[1]]);
    setWinnerIdx(null);
    setIsShaking(false);
  };
  const handleAddWatchList = (anime) => {
    if (!currentUser) {
      showToast("Vous devez être connecté pour ajouter à la watch-list", "error");
      return;
    }

    const payload = {
      anime_id: anime.id,
      status: "watching", // par défaut
    };

    addWatch(currentUser.id, payload)
      .then(() => {
        showToast(anime.name + " ajouté à la watch-list", "success");
      })
      .catch((err) => {
        console.error(err);
        showToast(err.message || "Erreur lors de l'ajout à la watch-list", "error");
      });
  };

  const vote = async (idx) => {
    if (winnerIdx !== null) return;
    setWinnerIdx(idx);
    setIsShaking(true); // Déclenche l'effet d'impact
    
    try {
      await api.post("stats/duel", {
        anime1_id: duel[0].id,
        anime2_id: duel[1].id,
        winner_id: duel[idx].id,
      });
      fetchClassement();
      setTimeout(() => generateDuel(animes), 1200);
    } catch (err) {
      console.error("Erreur vote", err);
    }
  };

  
  return (
    <div style={{ backgroundColor: mode === 'dark' ? '#0a0a0a' : '#f0f2f5', color: textColor, minHeight: '100vh', transition: 'background 0.5s' }}>
      <TopBar />
      
      <div className="max-w-7xl mx-auto pt-20 px-4 flex flex-col lg:flex-row gap-10">
        
      <div className="flex-[2]">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <Zap size={18} style={{ color: secondaryColors.main, fill: secondaryColors.main }} />
            <p className="font-bold uppercase tracking-widest text-sm opacity-80">Tranchez le destin</p>
            <Zap size={18} style={{ color: secondaryColors.main, fill: secondaryColors.main }} />
          </div>
        </div>

        {duel[0] && duel[1] ? (
          <div className="relative flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 h-[500px]">
            
            {/* BADGE VS CENTRAL */}
            <div className="absolute z-50 pointer-events-none">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-32 h-32 bg-white/10 blur-3xl animate-pulse"></div>
                <div className="bg-white text-black text-4xl font-[1000] italic px-6 py-2 skew-x-[-15deg] border-4 border-black outline outline-4 outline-white">
                  VS
                </div>
              </div>
            </div>

            {[0, 1].map(idx => {
              const isWinner = winnerIdx === idx;
              const isLooser = winnerIdx !== null && winnerIdx !== idx;
              
              return (
                <div
                  key={duel[idx].id}
                  onClick={() => vote(idx)}
                  className={`relative overflow-hidden cursor-pointer transition-all duration-300
                    w-[260px] h-[380px]
                    border-4
                    ${idx === 0 ? 'animate-impact-l skew-x-[-2deg]' : 'animate-impact-r skew-x-[2deg]'}
                    ${isLooser ? 'grayscale brightness-50 scale-90 z-0' : 'z-10 scale-100 hover:scale-105'}
                    ${isWinner ? 'border-[var(--secondary-main)] shadow-[0_0_50px_rgba(0,0,0,0.5)]' : 'border-white/20'}
                  `}
                  style={{ borderRadius: '20px', '--secondary-main': secondaryColors.main }}
                >
                  {/* L'IMAGE */}
                  <img
                    src={duel[idx].image_url}
                    alt={duel[idx].name}
                    className="w-full h-full object-cover"
                  />

                  {/* OVERLAY D'INFO */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex flex-col justify-end p-6">
                    <div className="translate-y-4 group-hover:translate-y-0 transition-transform">
                      <span className="text-[10px] font-black px-2 py-1 uppercase italic text-white"
                            style={{ backgroundColor: primaryColors.main + "30"}}
                      >
                        Elo: {duel[idx].elo}
                      </span>
                      {duel[idx].rank &&
                        <span className="bg-white mx-1.5 text-black text-[10px] font-black px-2 py-0.5 rounded-sm uppercase">
                          #{duel[idx].rank}
                        </span>
                      }


                      <h3 className="text-xl font-black uppercase text-white leading-tight mt-1 truncate">
                        {duel[idx].name}
                      </h3>
                      <div className="flex gap-2 mt-2">
                        <button 
                          aria-label="Voir détails"
                          onClick={(e) => { e.stopPropagation(); navigate(`/details/${duel[idx].id}`); }}
                          className="flex items-center gap-1 px-3 py-2 rounded-full backdrop-blur-xl transition-all duration-300"
                          style={{
                            backgroundColor: primaryColors.main + "40",
                            color: primaryColors.main
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = primaryColors.main + "40"}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = primaryColors.main + "20"}
                        >
                          <Info size={16} /> Voir
                        </button>

                        <button 
                          aria-label="Ajouter à ma liste"
                          onClick={(e) => { 
                            e.stopPropagation();
                            handleAddWatchList(duel[idx]);
                          }}
                          className="flex items-center gap-1 px-3 py-2 rounded-full backdrop-blur-xl transition-all duration-300"
                          style={{
                            backgroundColor: secondaryColors.accent + "40",
                            color: secondaryColors.accent
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = secondaryColors.accent + "40"}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = secondaryColors.accent + "20"}
                        >
                          <Plus size={16} /> Ajouter
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* EFFET VICTOIRE */}
                  {isWinner && (
                    <div className="absolute inset-0 flex items-center justify-center backdrop-blur-[2px]"
                        style={{ backgroundColor: secondaryColors.main + "30" }}
                    >
                      <div className="p-4 rounded-full animate-ping absolute opacity-75 w-20 h-20"
                          style={{ backgroundColor: secondaryColors.main }}
                      ></div>
                      <Trophy size={80} style={{ color: secondaryColors.main }} className="relative z-10 drop-shadow-2xl" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-[400px] flex items-center justify-center font-black italic animate-pulse text-2xl">
            PREPARING THE FIGHT...
          </div>
        )}

        <div className="flex justify-center">
          <button
            onClick={() => generateDuel(animes)}
            className="group relative flex items-center gap-3 px-10 py-4 rounded-xl font-black uppercase tracking-tighter transition-all overflow-hidden"
            style={{ backgroundColor: primaryColors.accent + "50" }}
          >
            <div className="absolute inset-0 w-0 bg-red-500 transition-all duration-300 group-hover:w-full opacity-10"></div>
            <span className="relative z-10">Passer le tour</span>
            <SkipForward size={20} className="relative z-10 group-hover:translate-x-2 transition-transform" />
          </button>
        </div>
      </div>

        {/* CLASSEMENT SIDEBAR - Look Glassmorphism */}
        <div className="flex-1">
          <div
            className="sticky top-24 p-8 rounded-[2rem] border border-white/10"
            style={{
              backgroundColor: cardBg,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              '--primary-main': primaryColors.main,
              '--hover-gradient': primaryColors.main + "40",
              '--secondary-main': secondaryColors.main,
            }}
          >
            <h3 className="text-2xl font-black flex items-center gap-4 mb-2 italic uppercase">
              <Trophy size={28} style={{ color: primaryColors.main }} /> Top Légendes
            </h3>

            {classement.map((anime, index) => (
            <div
              key={anime.id}
              onClick={() => navigate(`/details/${anime.id}`)}
              className="flex justify-between items-center px-4 p-2 rounded-2xl 
                        hover:bg-gradient-to-r 
                        hover:from-[var(--hover-gradient)] 
                        hover:to-transparent
                        cursor-pointer transition-all duration-300 
                        border border-transparent hover:border-white/10"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-8 flex items-center justify-center rounded-lg font-black"
                  style={{
                    backgroundColor: index === 0 
                      ? primaryColors.main + "90"
                      : index === 1 
                        ? primaryColors.accent + "40" 
                        : index === 2 
                          ? secondaryColors.main + "40" 
                          : innactifBg, 
                  }}
                >
                  {index + 1}
                </div>

                <span 
                  className={`font-bold text-lg ${index === 0 ? 'text-[var(--secondary-main)]' : 'group-hover:text-[var(--primary-main)]'} transition-colors`}
                  style={{color:  index === 0 
                      ? primaryColors.main 
                      : index === 1 
                        ? primaryColors.accent 
                        : index === 2 
                          ? secondaryColors.main 
                          : textColor}}
                >
                  {anime.name}
                </span>
              </div>

              <div className="flex flex-col items-end">
                <span className="text-sm font-black" style={{ color: primaryColors.main }}>
                  {anime.elo}
                </span>
              </div>
            </div>

            ))}
          </div>
        </div>
      </div>
    </div>
  );
}