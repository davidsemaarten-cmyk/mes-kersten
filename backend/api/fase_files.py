"""
Fase Files API Routes
Provides endpoints for uploading, listing, downloading and deleting fase-level files
"""

import mimetypes
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
import io

from database import get_db
from models.user import User
from schemas.fase_file import FaseFileResponse
from services.fase_file import FaseFileService, FaseFileNotFoundError
from services.exceptions import FaseNotFoundError
from utils.auth import get_current_user
from utils.permissions import require_admin_or_werkvoorbereider, require_any_authenticated

router = APIRouter(tags=["Fase Files"])


@router.get("/fases/{fase_id}/files", response_model=List[FaseFileResponse])
def list_fase_files(
    fase_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated),
):
    """List all files attached to a fase"""
    files = FaseFileService.list_files(db, fase_id)

    # Build response with uploader_name
    result = []
    for f in files:
        item = FaseFileResponse(
            id=f.id,
            fase_id=f.fase_id,
            filename=f.filename,
            file_path=f.file_path,
            file_type=f.file_type,
            file_size=f.file_size,
            uploaded_by=f.uploaded_by,
            created_at=f.created_at,
            uploader_name=f.uploader.full_name if f.uploader else None,
        )
        result.append(item)
    return result


@router.post(
    "/fases/{fase_id}/files",
    response_model=FaseFileResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_fase_file(
    fase_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider),
):
    """Upload a file and attach it to a fase"""
    content = await file.read()
    file_type = file.content_type or mimetypes.guess_type(file.filename or "")[0]

    try:
        fase_file = FaseFileService.upload_file(
            db=db,
            fase_id=fase_id,
            filename=file.filename or "onbekend",
            content=content,
            file_type=file_type,
            current_user=current_user,
        )
    except FaseNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return FaseFileResponse(
        id=fase_file.id,
        fase_id=fase_file.fase_id,
        filename=fase_file.filename,
        file_path=fase_file.file_path,
        file_type=fase_file.file_type,
        file_size=fase_file.file_size,
        uploaded_by=fase_file.uploaded_by,
        created_at=fase_file.created_at,
        uploader_name=current_user.full_name,
    )


@router.get("/fase-files/{file_id}/download")
def download_fase_file(
    file_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated),
):
    """Download a fase file"""
    try:
        fase_file, data = FaseFileService.download_file(db, file_id)
    except FaseFileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    media_type = fase_file.file_type or "application/octet-stream"
    headers = {"Content-Disposition": f'attachment; filename="{fase_file.filename}"'}

    return StreamingResponse(io.BytesIO(data), media_type=media_type, headers=headers)


@router.delete("/fase-files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_fase_file(
    file_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider),
):
    """Delete a fase file"""
    try:
        FaseFileService.delete_file(db, file_id, current_user)
    except FaseFileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    return None
