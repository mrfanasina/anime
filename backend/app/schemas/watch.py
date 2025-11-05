from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List

# Importation des autres schémas (tu peux les créer même minimalistes)
from .anime import AnimeBase
from .season import SeasonBase
from .episode import EpisodeBase


# ===========================
# WatchEpisode
# ===========================
class WatchEpisodeBase(BaseModel):
    id: int
    episode_id: int
    watched: bool

    class Config:
        from_attributes = True


class WatchEpisodeCreate(BaseModel):
    episode_id: int
    watched: Optional[bool] = False
    user_id: Optional[int] = None  # Pour validation côté client
    anime_id: Optional[int] = None  # Pour validation côté client
    season_id: Optional[int] = None  # Pour validation côté client
    
class WatchEpisodeUpdate(BaseModel):
    watched: Optional[bool] = None


class WatchEpisodeOut(WatchEpisodeBase):
    episode: Optional[EpisodeBase]


# ===========================
# WatchSeason
# ===========================
class WatchSeasonBase(BaseModel):
    id: int
    season_id: int
    completed: bool

    class Config:
        from_attributes = True


class WatchSeasonCreate(BaseModel):
    season_id: int
    completed: Optional[bool] = False
    episodes: Optional[List[WatchEpisodeCreate]] = None
    

class WatchSeasonUpdate(BaseModel):
    completed: Optional[bool] = None
    episodes: Optional[List[WatchEpisodeUpdate]] = None


class WatchSeasonOut(WatchSeasonBase):
    season: Optional[SeasonBase]
    episodes: List[WatchEpisodeOut] = []


# ===========================
# Watch (la watchlist principale)
# ===========================
class WatchBase(BaseModel):
    id: int
    anime_id: int
    completed: bool
    added_at: datetime

    class Config:
        from_attributes = True


class WatchCreate(BaseModel):
    user_id: int 
    anime_id: int
    completed: Optional[bool] = False
    seasons: Optional[List[WatchSeasonCreate]] = None


class WatchUpdate(BaseModel):
    completed: Optional[bool] = None
    seasons: Optional[List[WatchSeasonUpdate]] = None


class WatchFull(WatchBase):
    anime: Optional[AnimeBase]
    seasons: List[WatchSeasonOut] = []


# ===========================
# Réponses simplifiées
# ===========================
class WatchOut(WatchBase):
    anime: Optional[AnimeBase]


class WatchProgressRequest(BaseModel):
    user_id: int
    anime_id: int


class WatchSeasonProgress(BaseModel):
    season_id: int
    progress: int


class WatchProgressResponse(BaseModel):
    anime_id: int
    progress: int
    seasons: List[WatchSeasonProgress]
