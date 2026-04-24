import React, { useEffect, useState, useMemo } from "react";
import { Plus, X, Search, Loader2 } from "lucide-react";
import { addAnime, getFolders } from "../controllers/anime";
import { fetchAniList, getCurrentSeason, getCurrentYear } from "../services/anilist";
import { useSelector } from "react-redux";
import { showToast } from "../utils/alerts";

/* ===============================
   GraphQL Queries
================================ */
const TRENDING_QUERY = `
query TrendingNow($season: MediaSeason, $year: Int) {
  Page(perPage: 48) {
    media(type: ANIME, season: $season, seasonYear: $year, sort: TRENDING_DESC) {
      id
      title { romaji }
      coverImage { extraLarge }
      averageScore
    }
  }
}
`;

const SEARCH_QUERY = `
query SearchAnime($search: String) {
  Page(perPage: 6) {
    media(type: ANIME, search: $search, sort: POPULARITY_DESC) {
      id
      title { romaji }
      coverImage { large }
      averageScore
    }
  }
}
`;

const AddSeasonalAnime = () => {
  // États de base
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [folders, setFolders] = useState([]);
  const [folder, setFolder] = useState("");

  // Données
  const [trending, setTrending] = useState([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  // Formulaire personnalisé
  const [customName, setCustomName] = useState("");
  const [customImage, setCustomImage] = useState("");

  const { primaryColors } = useSelector((s) => s.theme);
  const mainColor = primaryColors.main;

  // Charger les dossiers au montage
  useEffect(() => {
    getFolders().then((res) => {
      setFolders(res.data);
      if (res.data.length) {
        const f = res.data[0];
        setFolder(`${f.path}/${f.folder}/#saisonier`);
      }
    });
  }, []);

  // Charger les tendances à l'ouverture
  useEffect(() => {
    if (open && trending.length === 0) {
      fetchAniList(TRENDING_QUERY, {
        season: getCurrentSeason(),
        year: getCurrentYear()
      }).then((data) => setTrending(data.Page.media));
    }
  }, [open, trending.length]);

  // Recherche avec Debounce
  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const data = await fetchAniList(SEARCH_QUERY, { search: query });
        setResults(data.Page.media);
      } catch (err) {
        console.error("Search error", err);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  /* ---------------- Logique d'Ajout ---------------- */
  const handleAdd = async (name, image) => {
    if (!name || loading) return;

    setLoading(true); // Bloque les clics multiples
    try {
      const res = await addAnime(name, folder, image);
      showToast(`Anime ajouté : ${name}`, "success");
      
      // Redirection ou fermeture
      window.location.href = `/details/${res.anime.id}`;
    } catch (error) {
      showToast(error.response?.data?.message || "Erreur lors de l’ajout", "error");
      setLoading(false); // Libère le bouton en cas d'échec
    }
  };

  return (
    <>
      {/* Bouton Flottant */}
      <button
        onClick={() => setOpen(true)}
        style={{ backgroundColor: mainColor }}
        className="fixed bottom-6 right-6 flex items-center justify-center w-16 h-16 text-white rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 z-50"
      >
        <Plus size={28} />
      </button>

      {/* Modal Overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#121217] border border-white/10 rounded-2xl p-6 text-white overflow-y-auto shadow-2xl">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold">Ajouter un anime</h2>
              <button 
                onClick={() => setOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Sélection Dossier */}
            <div className="mb-8">
              <label className="block text-sm opacity-50 mb-2">Dossier de destination</label>
              <select
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 outline-none focus:border-blue-500 transition"
              >
                {folders.map((f, i) => (
                  <option key={i} value={`${f.path}/${f.folder}/#saisonier`}>
                    {f.folder} ({f.path})
                  </option>
                ))}
              </select>
            </div>

            {/* Section Tendances */}
            <section className="mb-10">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                🔥 Tendances de la saison
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {trending.length === 0 && <p className="opacity-40">Chargement...</p>}
                {trending.map((a) => (
                  <AnimeCard 
                    key={a.id} 
                    anime={a} 
                    onAdd={handleAdd} 
                    disabled={loading} 
                  />
                ))}
              </div>
            </section>

            {/* Section Recherche */}
            <section className="mb-10">
              <h3 className="text-lg font-semibold mb-4">🔎 Rechercher un titre</h3>
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={20} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher sur AniList..."
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:ring-2 ring-blue-500/20 outline-none"
                />
              </div>

              {results.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-6">
                  {results.map((a) => (
                    <AnimeCard 
                      key={a.id} 
                      anime={a} 
                      onAdd={handleAdd} 
                      disabled={loading} 
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Section Manuelle */}
            <section className="p-4 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-lg font-semibold mb-4">➕ Ajout manuel</h3>
              <div className="flex flex-col md:flex-row gap-3">
                <input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Titre de l'anime"
                  className="flex-[2] px-4 py-2 bg-black/40 border border-white/10 rounded-lg outline-none"
                />
                <input
                  value={customImage}
                  onChange={(e) => setCustomImage(e.target.value)}
                  placeholder="URL de l'image (optionnel)"
                  className="flex-[2] px-4 py-2 bg-black/40 border border-white/10 rounded-lg outline-none"
                />
                <button
                  disabled={loading || !customName}
                  onClick={() => handleAdd(customName, customImage)}
                  style={{ backgroundColor: loading ? '#333' : mainColor }}
                  className="flex-1 px-6 py-2 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : "Créer"}
                </button>
              </div>
            </section>

          </div>
        </div>
      )}
    </>
  );
};

/* Sub-component for Anime Cards */
const AnimeCard = ({ anime, onAdd, disabled }) => {
  return (
    <button
      disabled={disabled}
      onClick={() => onAdd(anime.title.romaji, anime.coverImage.extraLarge || anime.coverImage.large)}
      className="group relative aspect-[2/3] rounded-lg overflow-hidden transition-all hover:ring-2 ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <img
        src={anime.coverImage.extraLarge || anime.coverImage.large}
        alt={anime.title.romaji}
        className="w-full h-full object-cover transition duration-300 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 text-left">
        <p className="font-bold text-[10px] leading-tight line-clamp-2 uppercase">
          {anime.title.romaji}
        </p>
        {anime.averageScore && (
          <span className="text-[10px] text-yellow-400 mt-1">⭐ {anime.averageScore / 10}</span>
        )}
      </div>
      {disabled && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <Loader2 className="animate-spin text-white" />
        </div>
      )}
    </button>
  );
};

export default AddSeasonalAnime;