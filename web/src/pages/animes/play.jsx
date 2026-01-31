import { useParams } from "react-router-dom";
import VideoPlayerAndDownloader from "../../components/VideoPlayerAndDownolader";
import TopBar from "../../components/TopBar";
import { useEffect, useState } from "react";
import { getAnimeByEpId, getBackUrl, getEpisodeById } from "../../controllers/anime";


const PlayPage = () => {
    const { episodeId } = useParams();
    const [episode, setEpisode] = useState([]);
    const [anime, setAnime] = useState([]);
    const [apiUrl, setApiUrl] = useState('');
    
      // 🔹 Récupérer l'URL du back-end pour le QR code
    useEffect(() => {
        async function fetchBackUrl() {
          try {
            const data = await getBackUrl();
            setApiUrl(data.backUrl);
          } catch (err) {
            console.error('Erreur lors de la récupération de l\'URL du back-end :', err);
          }
        }
        fetchBackUrl();
    }, []);
    useEffect(() => {
        getEpisodeById(episodeId).then(setEpisode);
        console.log(episode)
    }, []);
    useEffect(() => {
        getAnimeByEpId(episodeId).then(setAnime);
    }, []);
    return(
        <div>
            <TopBar />
            <div style={{ marginTop: '50px' }}>
                <VideoPlayerAndDownloader episode={episode} anime={anime.anime} season={anime.season} apiUrl={`${apiUrl}/player`} />
            </div>            
            
        </div>
    )

}

export default PlayPage;