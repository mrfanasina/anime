import React, { useEffect, useState, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import { getCurrentUser } from "../../controllers/auth.js";
import {
  addWatched,
  removeFromWatchList,
  getWatchList,
  toggleEpisode,
  toggleSeason,
} from "../../controllers/watch.js";
import { getAnimeById } from "../../controllers/anime.js";
import TopBar from "../../components/TopBar.jsx";
import { useNavigate } from "react-router-dom";
import noImage from "../../assets/no-image-dark.png";
import {
  Play, Info, Check, X, Bookmark, Trash2, Search,
  LayoutGrid, List, Star, Award, Zap, Target, Trophy,
  ChevronDown, ChevronUp, GripVertical, Filter, TrendingUp,
  Eye, EyeOff, Flame, Clock,
} from "lucide-react";
import { showToast, showConfirm } from "../../utils/alerts";

// ─── Badge definitions ────────────────────────────────────────────────────────
const BADGES = [
  { id: "first",     icon: Star,   label: "Premier anime",   color: "#f59e0b", condition: (list) => list.length >= 1 },
  { id: "five",      icon: Zap,    label: "5 animes",        color: "#6366f1", condition: (list) => list.length >= 5 },
  { id: "ten",       icon: Target, label: "10 animes",       color: "#ec4899", condition: (list) => list.length >= 10 },
  { id: "watcher",   icon: Eye,    label: "Curieux",         color: "#14b8a6", condition: (list) => list.filter((a) => a.completed).length >= 1 },
  { id: "master",    icon: Trophy, label: "Maître",          color: "#f97316", condition: (list) => list.filter((a) => a.completed).length >= 5 },
  { id: "flame",     icon: Flame,  label: "Passionné",       color: "#ef4444", condition: (list) => list.length >= 20 },
];

// ─── Glassmorphism CSS injected once ─────────────────────────────────────────
const GLASS_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

  :root {
    --glass-bg: rgba(255,255,255,0.07);
    --glass-border: rgba(255,255,255,0.14);
    --glass-shadow: 0 8px 32px rgba(0,0,0,0.37);
    --accent: #a78bfa;
    --accent2: #f472b6;
    --accent3: #34d399;
    --grid-glow: rgba(167,139,250,0.18);
  }

  .wl-page { background: #080b14; min-height: 100vh; font-family: 'DM Sans', sans-serif; color: #e2e8f0; }
  .wl-page.light { background: linear-gradient(135deg,#e0e7ff 0%,#f0fdf4 50%,#fdf4ff 100%); color: #1e1b4b; }

  .glass {
    background: var(--glass-bg);
    backdrop-filter: blur(18px) saturate(160%);
    -webkit-backdrop-filter: blur(18px) saturate(160%);
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow);
  }

  /* Hero gradient background */
  .wl-hero-bg {
    position: fixed; inset: 0; z-index: 0; pointer-events: none;
    background:
      radial-gradient(ellipse 80% 50% at 20% 10%, rgba(139,92,246,0.22) 0%, transparent 60%),
      radial-gradient(ellipse 60% 40% at 80% 80%, rgba(236,72,153,0.15) 0%, transparent 55%),
      radial-gradient(ellipse 50% 60% at 60% 30%, rgba(52,211,153,0.1) 0%, transparent 60%),
      #080b14;
  }
  .light .wl-hero-bg {
    background:
      radial-gradient(ellipse 80% 50% at 20% 10%, rgba(139,92,246,0.12) 0%, transparent 60%),
      radial-gradient(ellipse 60% 40% at 80% 80%, rgba(236,72,153,0.09) 0%, transparent 55%),
      linear-gradient(135deg,#e0e7ff,#fdf4ff);
  }

  /* Stats */
  .stat-card { border-radius: 16px; padding: 20px 24px; transition: transform .2s; }
  .stat-card:hover { transform: translateY(-4px); }
  .stat-value { font-family: 'Syne', sans-serif; font-size: 2.2rem; font-weight: 800; line-height: 1; }
  .stat-label { font-size: 0.78rem; opacity: 0.65; margin-top: 4px; letter-spacing: 0.06em; text-transform: uppercase; }

  /* Badges */
  .badge-pill {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 14px; border-radius: 999px; font-size: 0.75rem; font-weight: 500;
    border: 1px solid; transition: transform .2s, box-shadow .2s;
  }
  .badge-pill:hover { transform: scale(1.07); }
  .badge-pill.locked { opacity: 0.28; filter: grayscale(1); }

  /* Filter bar */
  .filter-btn {
    padding: 7px 18px; border-radius: 999px; font-size: 0.82rem; font-weight: 500;
    border: 1px solid var(--glass-border); cursor: pointer; transition: all .18s;
    background: var(--glass-bg); color: inherit;
  }
  .filter-btn.active { background: var(--accent); border-color: var(--accent); color: #fff; box-shadow: 0 0 16px rgba(167,139,250,0.45); }
  .filter-btn:hover:not(.active) { border-color: var(--accent); color: var(--accent); }

  .search-box {
    background: var(--glass-bg); border: 1px solid var(--glass-border);
    border-radius: 999px; padding: 8px 18px 8px 42px;
    color: inherit; font-size: 0.88rem; outline: none; width: 220px;
    transition: width .3s, border-color .2s;
  }
  .search-box:focus { width: 300px; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(167,139,250,0.15); }

  /* Grid */
  .anime-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 20px;
  }

  /* Anime card */
  .anime-card {
    border-radius: 18px; overflow: hidden; cursor: pointer;
    transition: transform .25s, box-shadow .25s;
    position: relative;
  }
  .anime-card:hover { transform: translateY(-8px) scale(1.02); box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 30px var(--grid-glow); }
  .anime-card.dragging { opacity: 0.45; transform: scale(0.96); }
  .anime-card.drag-over { box-shadow: 0 0 0 2px var(--accent), 0 20px 40px rgba(167,139,250,0.35); }

  .card-img { width: 100%; aspect-ratio: 2/3; object-fit: cover; display: block; transition: transform .4s; }
  .anime-card:hover .card-img { transform: scale(1.06); }

  .card-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.2) 50%, transparent 100%);
    display: flex; flex-direction: column; justify-content: flex-end; padding: 14px;
    opacity: 0; transition: opacity .25s;
  }
  .anime-card:hover .card-overlay { opacity: 1; }

  .card-footer {
    position: absolute; bottom: 0; left: 0; right: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 100%);
    padding: 32px 12px 12px;
  }
  .card-title { font-family: 'Syne',sans-serif; font-size: 0.88rem; font-weight: 700; line-height: 1.25; color: #fff; }
  .card-status { font-size: 0.68rem; margin-top: 4px; }

  .grip-handle { position: absolute; top: 8px; left: 8px; opacity: 0; transition: opacity .2s; cursor: grab; color: #fff; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.8)); }
  .anime-card:hover .grip-handle { opacity: 0.8; }

  .vu-badge {
    position: absolute; top: 8px; right: 8px;
    background: rgba(52,211,153,0.9); border-radius: 999px;
    padding: 3px 9px; font-size: 0.65rem; font-weight: 700; color: #fff;
    letter-spacing: 0.04em; text-transform: uppercase;
  }

  /* Detail drawer */
  .detail-drawer {
    position: fixed; right: 0; top: 0; bottom: 0; width: min(480px, 100vw);
    z-index: 200; display: flex; flex-direction: column;
    transform: translateX(100%); transition: transform .35s cubic-bezier(.4,0,.2,1);
  }
  .detail-drawer.open { transform: translateX(0); }
  .drawer-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 199; opacity: 0; pointer-events: none; transition: opacity .3s; }
  .drawer-backdrop.open { opacity: 1; pointer-events: auto; }

  .progress-bar-bg { background: rgba(255,255,255,0.1); border-radius: 999px; height: 6px; overflow: hidden; }
  .progress-bar-fill { height: 100%; border-radius: 999px; transition: width .6s ease; background: linear-gradient(90deg, var(--accent), var(--accent2)); }

  /* Season accordion */
  .season-row { border-radius: 12px; overflow: hidden; margin-bottom: 8px; }
  .season-header { padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: background .15s; }
  .season-header:hover { background: rgba(255,255,255,0.06); }
  .ep-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 8px; padding: 12px 14px; }
  .ep-chip {
    padding: 6px 4px; border-radius: 8px; text-align: center; font-size: 0.72rem; cursor: pointer;
    border: 1px solid var(--glass-border); transition: all .15s;
    background: var(--glass-bg);
  }
  .ep-chip.watched { background: rgba(52,211,153,0.2); border-color: rgba(52,211,153,0.5); color: #34d399; }
  .ep-chip:hover:not(.watched) { border-color: var(--accent); color: var(--accent); }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }

  /* Animations */
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .anime-card { animation: fadeSlideUp .4s ease both; }

  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 12px rgba(167,139,250,0.3); }
    50%       { box-shadow: 0 0 28px rgba(167,139,250,0.7); }
  }
  .badge-pill:not(.locked) { animation: pulse-glow 3s ease-in-out infinite; }
`;

// ─── Skeleton card ────────────────────────────────────────────────────────────
const SkeletonCard = ({ i }) => (
  <div
    className="anime-card glass"
    style={{ aspectRatio: "2/3", animationDelay: `${i * 0.06}s` }}
  >
    <div style={{ width: "100%", height: "100%", background: "rgba(255,255,255,0.04)", borderRadius: 18 }} />
  </div>
);

// ─── Stats bar ────────────────────────────────────────────────────────────────
const StatsBar = ({ watchList }) => {
  const total     = watchList.length;
  const watched   = watchList.filter((a) => a.completed).length;
  const inProgress = total - watched;
  const pct       = total ? Math.round((watched / total) * 100) : 0;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 28 }}>
      {[
        { label: "Total animes", value: total,      color: "var(--accent)",  icon: <LayoutGrid size={16}/> },
        { label: "Terminés",     value: watched,    color: "var(--accent3)", icon: <Check size={16}/> },
        { label: "En cours",     value: inProgress, color: "var(--accent2)", icon: <Clock size={16}/> },
        { label: "Progression",  value: `${pct}%`,  color: "#f59e0b",        icon: <TrendingUp size={16}/> },
      ].map((s) => (
        <div key={s.label} className="stat-card glass">
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: s.color, marginBottom: 8 }}>
            {s.icon}
            <span className="stat-label" style={{ color: "inherit" }}>{s.label}</span>
          </div>
          <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
          {s.label === "Progression" && (
            <div className="progress-bar-bg" style={{ marginTop: 10 }}>
              <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ─── Badges row ──────────────────────────────────────────────────────────────
const BadgesRow = ({ watchList }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 28 }}>
    {BADGES.map((b) => {
      const earned = b.condition(watchList);
      const Icon   = b.icon;
      return (
        <div
          key={b.id}
          className={`badge-pill glass ${earned ? "" : "locked"}`}
          style={{
            borderColor: earned ? b.color : "rgba(255,255,255,0.1)",
            color:       earned ? b.color : "inherit",
            boxShadow:   earned ? `0 0 12px ${b.color}44` : "none",
          }}
          title={earned ? b.label : `🔒 ${b.label}`}
        >
          <Icon size={13} />
          {b.label}
        </div>
      );
    })}
  </div>
);

// ─── Detail Drawer ───────────────────────────────────────────────────────────
const DetailDrawer = ({ anime, details, onClose, onEpisodeToggle, onSeasonToggle, onMarkWatched, onDelete, onWatch }) => {
  const [openSeasons, setOpenSeasons] = useState({});
  if (!anime) return null;

  const d = details[anime.id] || {};
  const episodes = (anime.seasons || []).flatMap((s) => s.episodes || []);
  const watchedEps = episodes.filter((e) => e.watched).length;
  const pct = episodes.length ? Math.round((watchedEps / episodes.length) * 100) : 0;

  return (
    <>
      <div className={`drawer-backdrop ${anime ? "open" : ""}`} onClick={onClose} />
      <div className={`detail-drawer glass ${anime ? "open" : ""}`} style={{ borderLeft: "1px solid var(--glass-border)" }}>
        {/* Hero image */}
        <div style={{ position: "relative", height: 280, flexShrink: 0, overflow: "hidden" }}>
          <img
            src={d.image_url || noImage}
            alt={d.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #10111a 0%, transparent 55%)" }} />
          <button
            onClick={onClose}
            style={{ position: "absolute", top: 14, right: 14, background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}
          >
            <X size={18} />
          </button>
          <div style={{ position: "absolute", bottom: 16, left: 16, right: 16 }}>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: "1.4rem", fontWeight: 800, color: "#fff", marginBottom: 6 }}>
              {d.name || `Anime ${anime.anime_id}`}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.72rem", background: anime.completed ? "rgba(52,211,153,0.85)" : "rgba(167,139,250,0.85)", padding: "3px 10px", borderRadius: 999, color: "#fff", fontWeight: 600 }}>
                {anime.completed ? "✓ Vu" : "En cours"}
              </span>
              {episodes.length > 0 && (
                <span style={{ fontSize: "0.72rem", opacity: 0.7 }}>{watchedEps}/{episodes.length} épisodes</span>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {/* Progress */}
          {episodes.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: 6, opacity: 0.7 }}>
                <span>Progression</span><span>{pct}%</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          {/* Description */}
          <p style={{ fontSize: "0.85rem", lineHeight: 1.7, opacity: 0.75, marginBottom: 20 }}>
            {d.description || "Pas de description disponible."}
          </p>

          {/* Action buttons */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
            <button
              onClick={() => onWatch(anime.anime_id)}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "linear-gradient(135deg,#7c3aed,#a855f7)", border: "none", borderRadius: 12, padding: "10px 16px", color: "#fff", fontSize: "0.84rem", fontWeight: 600, cursor: "pointer" }}
            >
              <Play size={15} /> Regarder
            </button>
            <button
              onClick={() => onMarkWatched(anime)}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: anime.completed ? "rgba(239,68,68,0.18)" : "rgba(52,211,153,0.18)", border: `1px solid ${anime.completed ? "rgba(239,68,68,0.4)" : "rgba(52,211,153,0.4)"}`, borderRadius: 12, padding: "10px 16px", color: anime.completed ? "#f87171" : "#34d399", fontSize: "0.84rem", fontWeight: 600, cursor: "pointer" }}
            >
              <Bookmark size={15} /> {anime.completed ? "Démarquer" : "Marquer vu"}
            </button>
            <button
              onClick={() => onDelete(anime)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "10px 14px", color: "#f87171", fontSize: "0.84rem", cursor: "pointer" }}
            >
              <Trash2 size={15} />
            </button>
          </div>

          {/* Seasons / episodes */}
          {(anime.seasons || []).map((season) => {
            const open   = openSeasons[season.id];
            const eps    = season.episodes || [];
            const doneEps = eps.filter((e) => e.watched).length;
            return (
              <div key={season.id} className="season-row glass" style={{ marginBottom: 10 }}>
                <div className="season-header" onClick={() => setOpenSeasons((p) => ({ ...p, [season.id]: !p[season.id] }))}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "0.88rem" }}>
                      Saison {season.season_id}
                    </span>
                    <span style={{ fontSize: "0.72rem", opacity: 0.6 }}>{doneEps}/{eps.length}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onSeasonToggle(season, anime.id); }}
                    style={{ fontSize: "0.72rem", padding: "3px 10px", borderRadius: 999, border: "none", background: season.completed ? "rgba(52,211,153,0.25)" : "rgba(255,255,255,0.08)", color: season.completed ? "#34d399" : "inherit", cursor: "pointer", fontWeight: 600 }}
                  >
                    {season.completed ? "✓ Terminée" : "Marquer terminée"}
                  </button>
                </div>
                {open && (
                  <div className="ep-grid">
                    {eps.map((ep) => (
                      <div
                        key={ep.id}
                        className={`ep-chip ${ep.watched ? "watched" : ""}`}
                        onClick={() => onEpisodeToggle(ep, season.id, anime.id)}
                      >
                        {ep.watched ? <Check size={10} style={{ margin: "0 auto 2px" }} /> : null}
                        <div>Ép. {ep.episode_id}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const WatchListPage = () => {
  const [user,          setUser]          = useState(null);
  const [watchList,     setWatchList]     = useState([]);
  const [animeDetails,  setAnimeDetails]  = useState({});
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [filter,        setFilter]        = useState("all");    // all | watching | watched
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [dragSrc,       setDragSrc]       = useState(null);
  const [dragOver,      setDragOver]      = useState(null);
  const navigate = useNavigate();

  const { mode } = useSelector((state) => state.theme);

  // Inject CSS once
  useEffect(() => {
    if (document.getElementById("wl-glass-css")) return;
    const s = document.createElement("style");
    s.id    = "wl-glass-css";
    s.textContent = GLASS_CSS;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getWatchList(user.id)
      .then(async (list) => {
        const details = {};
        for (const w of list) {
          try { details[w.id] = await getAnimeById(w.anime_id); }
          catch (e) { console.error(e); }
        }
        setAnimeDetails(details);
        setWatchList(list);
      })
      .catch(() => showToast("Erreur chargement watch-list", "error"))
      .finally(() => setLoading(false));
  }, [user]);

  // ── Filtered + sorted list ─────────────────────────────────────────────────
  const displayList = [...watchList]
    .filter((a) => {
      const name = (animeDetails[a.id]?.name || "").toLowerCase();
      if (!name.includes(search.toLowerCase())) return false;
      if (filter === "watched")  return a.completed;
      if (filter === "watching") return !a.completed;
      return true;
    })
    .sort((a, b) => a.completed === b.completed ? 0 : a.completed ? 1 : -1);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleEpisodeToggle = async (ep, seasonId, animeId) => {
    try {
      const updated = await toggleEpisode(ep.id, !ep.watched);
      setWatchList((prev) => prev.map((a) =>
        a.id !== animeId ? a : {
          ...a,
          seasons: a.seasons?.map((s) =>
            s.id !== seasonId ? s : {
              ...s, episodes: s.episodes.map((e) => e.id === updated.id ? updated : e),
            }
          ),
        }
      ));
      if (selectedAnime?.id === animeId) {
        setSelectedAnime((prev) => ({
          ...prev,
          seasons: prev.seasons?.map((s) =>
            s.id !== seasonId ? s : {
              ...s, episodes: s.episodes.map((e) => e.id === updated.id ? updated : e),
            }
          ),
        }));
      }
    } catch { showToast("Erreur de mise à jour épisode", "error"); }
  };

  const handleSeasonToggle = async (season, animeId) => {
    try {
      const updated = await toggleSeason(season.id, !season.completed);
      const patchSeasons = (seasons) =>
        seasons?.map((s) =>
          s.id !== updated.id ? s : {
            ...s, completed: updated.completed,
            episodes: s.episodes.map((e) => ({ ...e, watched: updated.completed })),
          }
        );
      setWatchList((prev) =>
        prev.map((a) => a.id !== animeId ? a : { ...a, seasons: patchSeasons(a.seasons) })
      );
      if (selectedAnime?.id === animeId)
        setSelectedAnime((prev) => ({ ...prev, seasons: patchSeasons(prev.seasons) }));
    } catch { showToast("Erreur de mise à jour saison", "error"); }
  };

  const handleMarkWatched = async (anime) => {
    try {
      const updated = await addWatched(anime.id);
      setWatchList((prev) =>
        prev.map((a) => a.id === anime.id ? { ...a, completed: updated.completed } : a)
      );
      if (selectedAnime?.id === anime.id)
        setSelectedAnime((prev) => ({ ...prev, completed: updated.completed }));
      showToast(updated.completed ? `Marqué comme vu ✓` : "Marquage retiré", "success");
    } catch { showToast("Erreur lors du marquage", "error"); }
  };

  const handleDelete = async (anime) => {
    const ok = await showConfirm(`Supprimer "${animeDetails[anime.id]?.name || "cet anime"}" ?`);
    if (!ok) return;
    try {
      await removeFromWatchList(anime.id);
      setWatchList((prev) => prev.filter((a) => a.id !== anime.id));
      if (selectedAnime?.id === anime.id) setSelectedAnime(null);
      showToast("Anime supprimé ✓", "success");
    } catch { showToast("Erreur lors de la suppression", "error"); }
  };

  // ── Drag & drop ────────────────────────────────────────────────────────────
  const handleDragStart = (e, id) => { setDragSrc(id); e.dataTransfer.effectAllowed = "move"; };
  const handleDragEnter = (id) => { if (id !== dragSrc) setDragOver(id); };
  const handleDragEnd   = () => { setDragSrc(null); setDragOver(null); };
  const handleDrop      = (e, targetId) => {
    e.preventDefault();
    if (!dragSrc || dragSrc === targetId) return;
    setWatchList((prev) => {
      const arr  = [...prev];
      const from = arr.findIndex((a) => a.id === dragSrc);
      const to   = arr.findIndex((a) => a.id === targetId);
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
    setDragSrc(null); setDragOver(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={`wl-page ${mode === "light" ? "light" : ""}`}>
      <div className="wl-hero-bg" />

      <TopBar />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1400, margin: "0 auto", padding: "96px 24px 60px" }}>
        {/* Page title */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: "clamp(2rem,5vw,3.2rem)", fontWeight: 800, background: "linear-gradient(135deg,#a78bfa,#f472b6,#34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 6 }}>
            Ma Watch-List
          </h1>
          <p style={{ opacity: 0.55, fontSize: "0.9rem" }}>Suis ta progression et réordonne comme tu veux</p>
        </div>

        {!user && (
          <div className="glass" style={{ borderRadius: 18, padding: "40px 24px", textAlign: "center", color: "#f87171" }}>
            Connecte-toi pour voir ta watch-list.
          </div>
        )}

        {user && (
          <>
            {/* Stats */}
            {!loading && <StatsBar watchList={watchList} />}

            {/* Badges */}
            {!loading && <BadgesRow watchList={watchList} />}

            {/* Filter bar */}
            <div className="glass" style={{ borderRadius: 16, padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 24 }}>
              {/* Search */}
              <div style={{ position: "relative", flex: "1 1 200px" }}>
                <Search size={14} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", opacity: 0.5 }} />
                <input
                  className="search-box"
                  placeholder="Rechercher..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {/* Filters */}
              <div style={{ display: "flex", gap: 8 }}>
                {[["all","Tous"], ["watching","En cours"], ["watched","Terminés"]].map(([val, label]) => (
                  <button key={val} className={`filter-btn ${filter === val ? "active" : ""}`} onClick={() => setFilter(val)}>
                    {label}
                  </button>
                ))}
              </div>
              <div style={{ marginLeft: "auto", fontSize: "0.78rem", opacity: 0.5 }}>
                {displayList.length} anime{displayList.length > 1 ? "s" : ""}
              </div>
            </div>

            {/* Empty state */}
            {!loading && displayList.length === 0 && (
              <div className="glass" style={{ borderRadius: 18, padding: "60px 24px", textAlign: "center", opacity: 0.6 }}>
                <Eye size={36} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
                <p>Aucun anime trouvé 💤</p>
              </div>
            )}

            {/* Grid */}
            <div className="anime-grid">
              {loading
                ? Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} i={i} />)
                : displayList.map((anime, idx) => {
                    const d = animeDetails[anime.id] || {};
                    return (
                      <div
                        key={anime.id}
                        className={`anime-card glass ${dragSrc === anime.id ? "dragging" : ""} ${dragOver === anime.id ? "drag-over" : ""}`}
                        style={{ animationDelay: `${idx * 0.05}s` }}
                        draggable
                        onDragStart={(e) => handleDragStart(e, anime.id)}
                        onDragEnter={() => handleDragEnter(anime.id)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, anime.id)}
                        onClick={() => setSelectedAnime(anime)}
                      >
                        {/* Grip */}
                        <div className="grip-handle" onClick={(e) => e.stopPropagation()}>
                          <GripVertical size={16} />
                        </div>

                        {/* Vu badge */}
                        {anime.completed && <div className="vu-badge">✓ Vu</div>}

                        {/* Image */}
                        <img
                          className="card-img"
                          src={d.image_url || noImage}
                          alt={d.name || `Anime ${anime.anime_id}`}
                        />

                        {/* Hover overlay */}
                        <div className="card-overlay">
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/details/${anime.anime_id}`); }}
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(124,58,237,0.85)", border: "none", borderRadius: 10, padding: "8px 14px", color: "#fff", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", marginBottom: 8, width: "100%" }}
                          >
                            <Play size={13} /> Regarder
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMarkWatched(anime); }}
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, padding: "7px 14px", color: "#fff", fontSize: "0.78rem", cursor: "pointer", width: "100%" }}
                          >
                            <Bookmark size={13} /> {anime.completed ? "Démarquer" : "Marquer vu"}
                          </button>
                        </div>

                        {/* Footer always visible */}
                        <div className="card-footer">
                          <div className="card-title">{d.name || `Anime ${anime.anime_id}`}</div>
                          <div className="card-status" style={{ color: anime.completed ? "#34d399" : "rgba(255,255,255,0.5)" }}>
                            {anime.completed ? "Terminé" : "En cours"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
            </div>
          </>
        )}
      </div>

      {/* Detail Drawer */}
      <DetailDrawer
        anime={selectedAnime}
        details={animeDetails}
        onClose={() => setSelectedAnime(null)}
        onEpisodeToggle={handleEpisodeToggle}
        onSeasonToggle={handleSeasonToggle}
        onMarkWatched={handleMarkWatched}
        onDelete={handleDelete}
        onWatch={(id) => navigate(`/details/${id}`)}
      />
    </div>
  );
};

export default WatchListPage;