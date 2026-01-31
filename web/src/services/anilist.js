/* =========================================
   AniList GraphQL Service
   ========================================= */

const API_URL = "https://graphql.anilist.co";

/* ---------- Generic fetch ---------- */
export const fetchAniList = async (query, variables = {}) => {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({ query, variables })
  });

  const json = await res.json();

  if (json.errors) {
    console.error("AniList GraphQL error:", json.errors);
    throw new Error("AniList API error");
  }

  return json.data;
};

/* =========================================
   Helpers
   ========================================= */

export const getCurrentSeason = () => {
  const month = new Date().getMonth() + 1;

  if (month <= 3) return "WINTER";
  if (month <= 6) return "SPRING";
  if (month <= 9) return "SUMMER";
  return "FALL";
};

export const getCurrentYear = () => new Date().getFullYear();

/* =========================================
   Mapping (AniList → UI)
   ========================================= */

const mapAnime = (media) => ({
  anime_id: media.id,
  name: media.title.romaji || media.title.english,
  cover: media.coverImage.extraLarge || media.coverImage.large,
  banner: media.bannerImage,
  score: media.averageScore,
  popularity: media.popularity,
  genres: media.genres,
  status: media.status,
  episodes: media.episodes,
  description: media.description
});

/* =========================================
   GraphQL Queries
   ========================================= */

/* 🔥 Trending saisonnier */
const SEASONAL_TRENDING_QUERY = `
query SeasonalTrending($season: MediaSeason, $year: Int) {
  Page(perPage: 20) {
    media(
      type: ANIME
      season: $season
      seasonYear: $year
      sort: TRENDING_DESC
    ) {
      id
      title { romaji english }
      coverImage { large extraLarge }
      bannerImage
      averageScore
      popularity
      genres
      status
      episodes
      description
    }
  }
}
`;

/* ⭐ Top rated */
const TOP_RATED_QUERY = `
query TopRated {
  Page(perPage: 20) {
    media(
      type: ANIME
      sort: SCORE_DESC
    ) {
      id
      title { romaji }
      coverImage { large extraLarge }
      averageScore
      genres
      status
      description
    }
  }
}
`;

/* 🆕 Nouveautés de la saison */
const SEASONAL_NEW_QUERY = `
query SeasonalNew($season: MediaSeason, $year: Int) {
  Page(perPage: 20) {
    media(
      type: ANIME
      season: $season
      seasonYear: $year
      sort: START_DATE_DESC
    ) {
      id
      title { romaji }
      coverImage { large extraLarge }
      averageScore
      genres
      status
      description
    }
  }
}
`;

/* 🧠 Recommandations basées sur un anime */
const RECOMMENDATIONS_QUERY = `
query Recommendations($id: Int) {
  Media(id: $id, type: ANIME) {
    recommendations(sort: RATING_DESC, perPage: 10) {
      nodes {
        mediaRecommendation {
          id
          title { romaji }
          coverImage { large extraLarge }
          averageScore
          genres
          description
        }
      }
    }
  }
}
`;

/* =========================================
   Public API
   ========================================= */

export const getSeasonalTrending = async () => {
  const data = await fetchAniList(SEASONAL_TRENDING_QUERY, {
    season: getCurrentSeason(),
    year: getCurrentYear()
  });

  return data.Page.media.map(mapAnime);
};

export const getTopRated = async () => {
  const data = await fetchAniList(TOP_RATED_QUERY);
  return data.Page.media.map(mapAnime);
};

export const getSeasonalNew = async () => {
  const data = await fetchAniList(SEASONAL_NEW_QUERY, {
    season: getCurrentSeason(),
    year: getCurrentYear()
  });

  return data.Page.media.map(mapAnime);
};

export const getRecommendationsFromAnime = async (animeId) => {
  const data = await fetchAniList(RECOMMENDATIONS_QUERY, {
    id: animeId
  });

  return data.Media.recommendations.nodes.map(
    (n) => mapAnime(n.mediaRecommendation)
  );
};
