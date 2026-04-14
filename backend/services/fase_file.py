"""
FaseFile Service
Business logic for fase-level file management
"""

from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from pathlib import Path

from models.fase_file import FaseFile
from models.fase import Fase
from models.user import User
from services.exceptions import FaseNotFoundError, ServiceError
from services.file_storage import DXFStorage
from config import settings


class FaseFileNotFoundError(ServiceError):
    """Raised when a fase file record is not found"""
    pass


class FaseFileService:
    """Business logic for fase file management"""

    @staticmethod
    def _build_relative_path(fase_id: UUID, filename: str) -> str:
        """Build relative path for a fase file"""
        return f"fase_files/{fase_id}/{filename}"

    @staticmethod
    def list_files(db: Session, fase_id: UUID) -> List[FaseFile]:
        """List all files for a fase"""
        files = (
            db.query(FaseFile)
            .filter(FaseFile.fase_id == fase_id)
            .order_by(FaseFile.created_at.desc())
            .all()
        )
        return files

    @staticmethod
    def upload_file(
        db: Session,
        fase_id: UUID,
        filename: str,
        content: bytes,
        file_type: Optional[str],
        current_user: User,
    ) -> FaseFile:
        """Upload a file and attach it to a fase"""
        # Validate fase exists
        fase = db.query(Fase).filter(Fase.id == fase_id).first()
        if not fase:
            raise FaseNotFoundError(f"Fase {fase_id} niet gevonden")

        # Build unique path (use UUID prefix to avoid collisions)
        import uuid
        safe_name = filename.replace("/", "_").replace("\\", "_")
        unique_name = f"{uuid.uuid4().hex[:8]}_{safe_name}"
        relative_path = FaseFileService._build_relative_path(fase_id, unique_name)

        # Save to disk
        DXFStorage.save_bytes(relative_path, content)

        # Create DB record
        fase_file = FaseFile(
            fase_id=fase_id,
            filename=filename,
            file_path=relative_path,
            file_type=file_type,
            file_size=len(content),
            uploaded_by=current_user.id,
        )
        db.add(fase_file)
        db.commit()
        db.refresh(fase_file)

        return fase_file

    @staticmethod
    def get_file(db: Session, file_id: UUID) -> Optional[FaseFile]:
        """Get a single fase file by ID"""
        return db.query(FaseFile).filter(FaseFile.id == file_id).first()

    @staticmethod
    def download_file(db: Session, file_id: UUID) -> tuple[FaseFile, bytes]:
        """Get file record and raw bytes for download"""
        fase_file = db.query(FaseFile).filter(FaseFile.id == file_id).first()
        if not fase_file:
            raise FaseFileNotFoundError("Bestand niet gevonden")

        try:
            data = DXFStorage.load_bytes(fase_file.file_path)
        except FileNotFoundError:
            raise FaseFileNotFoundError("Bestand niet gevonden op schijf")

        return fase_file, data

    @staticmethod
    def delete_file(db: Session, file_id: UUID, current_user: User) -> bool:
        """Delete a fase file (record + disk)"""
        fase_file = db.query(FaseFile).filter(FaseFile.id == file_id).first()
        if not fase_file:
            raise FaseFileNotFoundError("Bestand niet gevonden")

        # Remove from disk (best-effort)
        DXFStorage.delete(fase_file.file_path)

        db.delete(fase_file)
        db.commit()
        return True
