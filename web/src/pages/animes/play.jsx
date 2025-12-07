import { useParams } from "react-router-dom";
import VideoPlayerAndDownloader from "../../components/VideoPlayerAndDownolader";
import TopBar from "../../components/TopBar";

const PlayPage = () => {
    const { episodeId } = useParams();
    return(
        <div>
            <TopBar />
            <div style={{ marginTop: '50px' }}>
                <VideoPlayerAndDownloader episodeId={episodeId} apiUrl="http://localhost:8000/player" />
            </div>            
            
        </div>
    )

}

export default PlayPage;