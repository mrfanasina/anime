from fastapi import APIRouter
from app.sync import sync_all_disks, sync_seasonal_animes

router = APIRouter()

@router.post("/all")
def trigger_full_sync():
    try:
        sync_all_disks()
        sync_seasonal_animes()
        return {"message": "Synchronisation complète terminée"}
    except Exception as e:
        return {"error": str(e)}
