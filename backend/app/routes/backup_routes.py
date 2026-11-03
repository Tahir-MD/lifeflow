from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.admin import Admin
from app.services import backup_service
from app.services.audit_service import record_event
from app.utils.dependencies import get_current_admin

router = APIRouter(prefix="/admin/backups", tags=["Backups"])


@router.get("")
def list_backups(current_admin: Admin = Depends(get_current_admin)):
    return {
        "enabled": backup_service.backups_enabled(),
        "every_hours": backup_service.every_hours(),
        "keep": backup_service.keep_count(),
        "backups": backup_service.list_backups(),
    }


@router.post("/run")
def run_now(db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    try:
        info = backup_service.run_backup()
    except Exception as error:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Backup failed: {error}")
    record_event(db, "backup_created", "admin", current_admin.id, {"name": info["name"]})
    return info


@router.get("/download/{name}")
def download(name: str, db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    path = backup_service.backup_path(name)
    if not path:
        raise HTTPException(status_code=404, detail="Backup not found")
    record_event(db, "backup_downloaded", "admin", current_admin.id, {"name": name})
    return FileResponse(path, filename=name, media_type="application/gzip")
