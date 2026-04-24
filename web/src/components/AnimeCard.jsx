import React from "react";
import noImageDark from "../assets/no-image-dark.png";
import noImageLight from "../assets/no-image-light.png";
import { Play, BookmarkPlus, Star, Trophy, Layers, Building2 } from "lucide-react";
import { useSelector } from "react-redux";

/* ─── Status config ─────────────────────────────────────────────── */
const STATUS_CONFIG = {
  ongoing:   { label: "En cours", color: "#22c55e" },
  finished:  { label: "Terminé",  color: "#71717a" },
  completed: { label: "Terminé",  color: "#71717a" },
  paused:    { label: "En pause", color: "#f59e0b" },
  upcoming:  { label: "À venir",  color: "#38bdf8" },
  cancelled: { label: "Annulé",   color: "#ef4444" },
};

const getStatus = (raw = "") => {
  const key = raw.toLowerCase().replace(/\s/g, "");
  return (
    STATUS_CONFIG[key] ||
    Object.entries(STATUS_CONFIG).find(([k]) => key.includes(k))?.[1] ||
    { label: raw, color: "#71717a" }
  );
};

const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

/* ────────────────────────────────────────────────────────────────
   AnimeCard
   Toutes les props show* sont true par défaut — passez false pour masquer.
──────────────────────────────────────────────────────────────── */
export default function AnimeCard({
  anime,
  onClick,
  onRead,
  onAddWatch,

  // Boutons d'action
  showReadButton  = true,
  showWatchButton = true,

  // Badges permanents (visibles sans hover)
  showRank  = true,   // #N — coin haut gauche
  showNote  = true,   // note/10 — coin haut droit
  showType  = true,   // TV/Movie/OVA — coin bas droit

  // Infos dans l'overlay hover
  showStatus  = true,  // pill coloré selon statut
  showStudio  = true,  // nom du studio
  showSeasons = true,  // "N saison(s)"
  showGenres  = true,  // genre pills
  maxGenres   = 2,     // max de genres affichés
}) {
  if (!anime) return null;

  const { mode, primaryColors } = useSelector((state) => state.theme);
  const isDark   = mode === "dark";
  const hasImage = !!anime.image_url;
  const fallback = isDark ? noImageDark : noImageLight;
  const primary  = primaryColors?.main   || "#6366f1";
  const accent   = primaryColors?.accent || "#8b5cf6";

  const statusCfg = anime.status ? getStatus(anime.status) : null;
  const noteVal   = anime.note != null ? clamp(anime.note, 0, 10) : null;
  const genres    = Array.isArray(anime.genres) ? anime.genres.slice(0, maxGenres) : [];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        .ac-root { font-family:'DM Sans',sans-serif; }

        .ac-img { transition:transform 0.5s cubic-bezier(0.25,0.46,0.45,0.94); }
        .ac-root:hover .ac-img { transform:scale(1.08); }

        .ac-overlay { opacity:0; transition:opacity 0.3s ease; }
        .ac-root:hover .ac-overlay { opacity:1; }

        .ac-footer { transition:opacity 0.25s ease, transform 0.25s ease; }
        .ac-root:hover .ac-footer { opacity:0; transform:translateY(6px); }

        .ac-bar { opacity:0; transition:opacity 0.3s ease; }
        .ac-root:hover .ac-bar { opacity:1; }

        /* staggered slide-up */
        .ac-s  { opacity:0; transform:translateY(10px);
          transition:opacity 0.3s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1); }
        .ac-root:hover .ac-s   { opacity:1; transform:translateY(0); }
        .ac-root:hover .ac-s2  { transition-delay:.05s; }
        .ac-root:hover .ac-s3  { transition-delay:.10s; }
        .ac-root:hover .ac-s4  { transition-delay:.15s; }
        .ac-root:hover .ac-s5  { transition-delay:.20s; }
      `}</style>

      <div
        className="ac-root relative group cursor-pointer overflow-hidden rounded-2xl select-none"
        style={{
          aspectRatio: "225 / 338",
          backgroundColor: isDark ? "#18181f" : "#e8e8f0",
          boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.5)" : "0 4px 16px rgba(0,0,0,0.12)",
          transition: "box-shadow 0.3s ease, transform 0.3s ease",
          
        }}
        onClick={onClick}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = `0 16px 40px ${primary}44, 0 4px 16px rgba(0,0,0,0.4)`;
          e.currentTarget.style.transform = "translateY(-6px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = isDark ? "0 4px 20px rgba(0,0,0,0.5)" : "0 4px 16px rgba(0,0,0,0.12)";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        {/* Image */}
        <img
          src={hasImage ? anime.image_url : fallback}
          alt={anime.name}
          loading="lazy"
          className={`c-img w-full h-full object-cover ${ anime.status_on_disk === "empty" ? "grayscale opacity-90" : ""} `}
        />

        {/* Accent bar gauche */}
        <div
          className="ac-bar absolute top-0 left-0 w-1 h-full z-30"
          style={{ background: `linear-gradient(to bottom, ${primary}, ${accent})` }}
        />

        {/* ══ BADGES PERMANENTS ══ */}

        {/* Rank #N — haut gauche */}
        {showRank && anime.rank != null && (
          <div
            className="absolute top-2 left-2 z-20 flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-black backdrop-blur-sm"
            style={{ background: "rgba(0,0,0,0.72)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" }}
          >
            <Trophy size={9} /> #{anime.rank}
          </div>
        )}

        {/* Note /10 — haut droit */}
        {showNote && noteVal != null && (
          <div
            className="absolute top-2 right-2 z-20 flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-black backdrop-blur-sm"
            style={{ background: "rgba(0,0,0,0.72)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" }}
          >
            <Star size={9} fill="#fbbf24" /> {noteVal}/10
          </div>
        )}

        {/* Type badge — bas droit, au-dessus du footer */}
        {showType && anime.type && (
          <div
            className="absolute bottom-11 right-2 z-20 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest backdrop-blur-sm"
            style={{ background: `${primary}cc`, color: "#fff" }}
          >
            {anime.type}
          </div>
        )}

        {/* ══ FOOTER STATIQUE (sans hover) ══ */}
        <div
          className="ac-footer absolute bottom-0 left-0 w-full z-10 px-3 py-3"
          style={{
            background: hasImage
              ? "linear-gradient(to top,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0.45) 65%,transparent 100%)"
              : "rgba(0,0,0,0.55)",
            backdropFilter: !hasImage ? "blur(6px)" : "none",
          }}
        >
          <p
            className="text-white font-bold text-sm leading-tight line-clamp-2 text-center"
            style={{ fontFamily: "'Syne',sans-serif", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
          >
            {anime.name}
          </p>
        </div>

        {/* ══ OVERLAY HOVER ══ */}
        <div
          className="ac-overlay absolute inset-0 z-20 flex flex-col justify-between p-3"
          style={{
            background: "linear-gradient(180deg,rgba(0,0,0,0.1) 0%,rgba(0,0,0,0.85) 100%)",
            backdropFilter: "blur(2px)",
          }}
        >
          {/* Zone centrale */}
          <div className="flex flex-col items-center gap-1.5 flex-1 justify-center px-1">

            {/* Status pill */}
            {showStatus && statusCfg && (
              <div
                className="ac-s flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                style={{
                  background: `${statusCfg.color}22`,
                  color: statusCfg.color,
                  border: `1px solid ${statusCfg.color}55`,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: statusCfg.color, boxShadow: `0 0 5px ${statusCfg.color}` }}
                />
                {statusCfg.label}
              </div>
            )}

            {/* Titre */}
            <h3
              className="ac-s ac-s2 text-white font-black text-base text-center leading-snug"
              style={{ fontFamily: "'Syne',sans-serif", textShadow: "0 2px 8px rgba(0,0,0,0.9)" }}
            >
              {anime.name}
            </h3>

            {/* Studio + Saisons */}
            {(showStudio && anime.studio) || (showSeasons && anime.seasons_count > 0) ? (
              <div className="ac-s ac-s3 flex flex-wrap justify-center gap-1.5 mt-0.5">
                {showStudio && anime.studio && (
                  <span
                    className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.75)" }}
                  >
                    <Building2 size={9} />
                    {anime.studio}
                  </span>
                )}
                {showSeasons && anime.seasons_count > 0 && (
                  <span
                    className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.75)" }}
                  >
                    <Layers size={9} />
                    {anime.seasons_count} saison{anime.seasons_count > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            ) : null}

            {/* Genre pills */}
            {showGenres && genres.length > 0 && (
              <div className="ac-s ac-s4 flex flex-wrap justify-center gap-1 mt-0.5">
                {genres.map((g, i) => (
                  <span
                    key={g.id ?? i}
                    className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{
                      background: `linear-gradient(135deg,${primary}28,${accent}28)`,
                      color: primary,
                      border: `1px solid ${primary}40`,
                    }}
                  >
                    {g.name ?? g}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-2 justify-center">
            {showReadButton && (
              <button
                className="ac-s ac-s4 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-lg"
                style={{
                  background: `linear-gradient(135deg,${primary},${accent})`,
                  color: "#fff",
                  boxShadow: `0 4px 14px ${primary}55`,
                }}
                onClick={(e) => { e.stopPropagation(); onRead?.(anime); }}
              >
                <Play size={12} fill="white" /> Lire
              </button>
            )}
            {showWatchButton && (
              <button
                className="ac-s ac-s5 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.22)",
                  backdropFilter: "blur(8px)",
                }}
                onClick={(e) => { e.stopPropagation(); onAddWatch?.(anime); }}
              >
                <BookmarkPlus size={12} /> +Liste
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}