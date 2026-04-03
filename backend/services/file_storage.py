"""
File storage abstraction for DXF files.

Currently uses local filesystem. To migrate to Supabase Storage, implement
SupabaseDXFStorage with the same interface and change the DXFStorage alias below.
"""
from pathlib import Path
from typing import Optional
from uuid import UUID

from config import settings


class LocalDXFStorage:
    """Stores DXF files on the local filesystem under FILE_STORAGE_PATH."""

    @staticmethod
    def _build_relative_path(
        project_id: Optional[UUID],
        fase_id: Optional[UUID],
        job_id: UUID,
        posnr: Optional[str],
        filename: str,
    ) -> str:
        """
        Build the relative path (from FILE_STORAGE_PATH) for a DXF file.

        Path structure:
            files/{project_id|_unlinked}/{fase_id|_unlinked}/{job_id}/{safe_posnr}/{filename}

        The relative path is stored in the DB so the storage root can move
        without requiring a data migration.
        """
        proj = str(project_id) if project_id else "_unlinked"
        fase = str(fase_id) if fase_id else "_unlinked"
        # Sanitize posnr so it is safe as a directory name
        safe_posnr = (posnr or "unknown").replace("/", "_").replace("\\", "_").replace(":", "_")
        return f"files/{proj}/{fase}/{job_id}/{safe_posnr}/{filename}"

    @staticmethod
    def save(relative_path: str, content: str) -> None:
        """Write DXF content to disk, creating parent directories as needed.

        Uses newline="" to prevent Python's text-mode newline translation on
        Windows (which would turn \\r\\n into \\r\\r\\n, corrupting DXF files).
        """
        full = Path(settings.FILE_STORAGE_PATH) / relative_path
        full.parent.mkdir(parents=True, exist_ok=True)
        with full.open("w", encoding="utf-8", newline="") as f:
            f.write(content)

    @staticmethod
    def load(relative_path: str) -> str:
        """Read and return DXF content from disk. Raises FileNotFoundError if missing.

        Uses newline="" to prevent Python's text-mode newline translation on
        Windows (which would silently strip \\r from \\r\\n, potentially altering
        round-tripped content).

        Also repairs files that were previously written without newline="" on
        Windows, where \\r\\n was expanded to \\r\\r\\n on disk.  Collapsing
        \\r\\r\\n back to \\r\\n restores the original DXF content.
        """
        full = Path(settings.FILE_STORAGE_PATH) / relative_path
        with full.open("r", encoding="utf-8", newline="") as f:
            content = f.read()
        # Repair double-CR corruption from previous text-mode writes on Windows
        if "\r\r\n" in content:
            content = content.replace("\r\r\n", "\r\n")
        return content

    @staticmethod
    def save_bytes(relative_path: str, data: bytes) -> None:
        """Write binary data to disk (e.g. PDF pages), creating parent directories as needed."""
        full = Path(settings.FILE_STORAGE_PATH) / relative_path
        full.parent.mkdir(parents=True, exist_ok=True)
        full.write_bytes(data)

    @staticmethod
    def load_bytes(relative_path: str) -> bytes:
        """Read binary data from disk. Raises FileNotFoundError if the file is missing."""
        return (Path(settings.FILE_STORAGE_PATH) / relative_path).read_bytes()

    @staticmethod
    def save_temp(filename: str, data: bytes) -> str:
        """
        Save binary data to the _tmp/ directory under FILE_STORAGE_PATH.

        Returns the relative path (e.g. "_tmp/abc123.pdf") so the caller can
        pass temp_id back to the frontend and reload the file at confirm time.
        """
        tmp_dir = Path(settings.FILE_STORAGE_PATH) / "_tmp"
        tmp_dir.mkdir(parents=True, exist_ok=True)
        rel = f"_tmp/{filename}"
        (Path(settings.FILE_STORAGE_PATH) / rel).write_bytes(data)
        return rel

    @staticmethod
    def delete(relative_path: Optional[str]) -> None:
        """
        Remove a file from disk.

        Silently skips if relative_path is None or the file does not exist.
        Best-effort removes empty parent directories after deletion.
        """
        if not relative_path:
            return
        full = Path(settings.FILE_STORAGE_PATH) / relative_path
        if full.exists():
            full.unlink()
        # Clean up empty parent dirs (best-effort; OSError = non-empty, skip)
        try:
            full.parent.rmdir()
            full.parent.parent.rmdir()
        except OSError:
            pass


# -----------------------------------------------------------------------
# Single point-of-swap: change this alias to migrate to Supabase Storage.
# SupabaseDXFStorage must implement the same save/load/delete interface.
# -----------------------------------------------------------------------
DXFStorage = LocalDXFStorage

# PDF storage uses the same class — save_bytes / load_bytes handle binary data.
PDFStorage = LocalDXFStorage
