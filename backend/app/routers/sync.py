from fastapi import APIRouter
from app.sync import sync_all_disks

router = APIRouter()

@router.post("/all")
def trigger_full_sync():
    """
    Synchronisation complète : disques + saisonniers + vérification
    de l'existence des animés sur le disque.
    """
    try:
        sync_all_disks()
        return {"message": "Synchronisation complète terminée"}
    except Exception as e:
        return {"error": str(e)}
