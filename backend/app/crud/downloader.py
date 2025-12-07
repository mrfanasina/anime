from sqlalchemy.orm import Session
from app.schemas.downloader import DownloadRequest, DownloadResponse

def download_anime(db: Session, download_request: DownloadRequest) -> DownloadResponse:
    # Implémentez la logique de téléchargement ici
    anime_folder = download_request.anime_folder 
    torrent_magnet = download_request.torrent_magnet
    
    return DownloadResponse(success=True, message="Téléchargement réussi")