from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID
import csv
import io
import os

from models.laser_job import LaserJob
from models.laser_line_item import LaserLineItem
from models.laser_csv_import import LaserCSVImport
from models.laser_dxf_file import LaserDXFFile
from models.user import User
from utils.audit import log_action, AuditAction, EntityType
from services.exceptions import (
    LaserJobNotFoundError,
    LaserJobNameExistsError,
    InvalidCSVFormatError,
    LaserLineItemNotFoundError,
    LaserDXFFileNotFoundError,
)
from services.dxf_service import process_dxf

class LaserplannerService:
    """Business logic for Laserplanner operations"""

    # ============================================================
    # CSV PARSING
    # ============================================================

    @staticmethod
    def parse_csv(csv_content: str) -> Dict[str, Any]:
        """
        Parse CSV content and extract metadata, headers, and data rows.

        Args:
            csv_content: Raw CSV file content as string (semicolon-delimited).
                         Expected format:
                           Line 1: Datum: DD.MM.YYYY
                           Line 2: Tekenaar name
                           Line 3: Opdrachtgever (client) name
                           Line 4: empty
                           Line 5: column headers
                           Line 6+: data rows

        Returns:
            Dictionary with metadata, headers, rows, and raw_content.

        Raises:
            InvalidCSVFormatError: If CSV format is invalid.
        """
        try:
            # Parse CSV with semicolon delimiter
            reader = csv.reader(io.StringIO(csv_content), delimiter=';')
            all_rows = list(reader)

            if len(all_rows) < 6:
                raise InvalidCSVFormatError("CSV must have at least 6 rows (4 metadata + 1 header + 1 data)")

            # Extract metadata (rows 1-4)
            metadata = {
                "row1": ";".join(all_rows[0]),  # Datum: DD.MM.YYYY
                "row2": ";".join(all_rows[1]),  # Tekenaar
                "row3": ";".join(all_rows[2]),  # Opdrachtgever (client name)
                "row4": ";".join(all_rows[3]),  # Empty row
            }

            # Extract headers (row 5, index 4)
            headers = all_rows[4]

            # Extract data rows (row 6+, index 5+)
            data_rows = []
            for idx, row in enumerate(all_rows[5:], start=1):
                if not row or all(cell.strip() == '' for cell in row):
                    continue  # Skip empty rows

                row_dict = {
                    "row_number": idx,
                    "projectcode": row[0] if len(row) > 0 else None,
                    "fasenr": row[1] if len(row) > 1 else None,
                    "posnr": row[2] if len(row) > 2 else None,
                    "profiel": row[3] if len(row) > 3 else None,
                    "aantal": int(row[4]) if len(row) > 4 and row[4].strip() else None,
                    "lengte": int(row[5]) if len(row) > 5 and row[5].strip() else None,
                    "kwaliteit": row[6] if len(row) > 6 else None,
                    "gewicht": float(row[7]) if len(row) > 7 and row[7].strip() else None,
                    "zaag": row[8] if len(row) > 8 else None,
                    "opmerkingen": row[9] if len(row) > 9 else None,
                }
                data_rows.append(row_dict)

            return {
                "metadata": metadata,
                "headers": headers,
                "rows": data_rows,
                "raw_content": csv_content,
            }

        except InvalidCSVFormatError:
            raise
        except Exception as e:
            raise InvalidCSVFormatError(f"Failed to parse CSV: {str(e)}")

    # ============================================================
    # JOB OPERATIONS
    # ============================================================

    @staticmethod
    def create_job(
        db: Session,
        naam: str,
        beschrijving: Optional[str],
        project_id: Optional[UUID],
        fase_id: Optional[UUID],
        current_user: User
    ) -> LaserJob:
        """Create a new laser job"""
        try:
            existing = db.query(LaserJob).filter(
                and_(
                    LaserJob.naam == naam,
                    LaserJob.is_active == True
                )
            ).first()
            if existing:
                raise LaserJobNameExistsError(f"Job '{naam}' already exists")

            job = LaserJob(
                naam=naam,
                beschrijving=beschrijving,
                project_id=project_id,
                fase_id=fase_id,
                status='aangemaakt',
                created_by=current_user.id,
                is_active=True
            )

            db.add(job)
            db.flush()

            log_action(
                db=db,
                user_id=current_user.id,
                action=AuditAction.CREATE_LASER_JOB,
                entity_type=EntityType.LASER_JOB,
                entity_id=job.id,
                details={"naam": job.naam}
            )

            db.commit()
            db.refresh(job)
            return job

        except LaserJobNameExistsError:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise

    @staticmethod
    def update_job_status(
        db: Session,
        job_id: UUID,
        status: str,
        current_user: User
    ) -> LaserJob:
        """Update job status"""
        try:
            job = db.query(LaserJob).filter(LaserJob.id == job_id).first()
            if not job:
                raise LaserJobNotFoundError(f"Job {job_id} not found")

            old_status = job.status
            job.status = status

            log_action(
                db=db,
                user_id=current_user.id,
                action=AuditAction.UPDATE_LASER_JOB,
                entity_type=EntityType.LASER_JOB,
                entity_id=job.id,
                details={"status_change": {"old": old_status, "new": status}}
            )

            db.commit()
            db.refresh(job)
            return job

        except LaserJobNotFoundError:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise

    @staticmethod
    def get_job(db: Session, job_id: UUID) -> Optional[LaserJob]:
        """Get job by ID with line items and CSV imports"""
        return db.query(LaserJob).filter(
            and_(
                LaserJob.id == job_id,
                LaserJob.is_active == True
            )
        ).first()

    @staticmethod
    def list_jobs(db: Session, status_filter: Optional[str] = None) -> List[LaserJob]:
        """List all active jobs"""
        query = db.query(LaserJob).filter(LaserJob.is_active == True)

        if status_filter:
            query = query.filter(LaserJob.status == status_filter)

        return query.order_by(LaserJob.updated_at.desc()).all()

    @staticmethod
    def delete_job(db: Session, job_id: UUID, current_user: User) -> None:
        """Soft delete a job"""
        try:
            job = db.query(LaserJob).filter(LaserJob.id == job_id).first()
            if not job:
                raise LaserJobNotFoundError(f"Job {job_id} not found")

            job.is_active = False

            log_action(
                db=db,
                user_id=current_user.id,
                action=AuditAction.DELETE_LASER_JOB,
                entity_type=EntityType.LASER_JOB,
                entity_id=job.id,
                details={"naam": job.naam}
            )

            db.commit()

        except LaserJobNotFoundError:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise

    # ============================================================
    # LINE ITEM OPERATIONS
    # ============================================================

    @staticmethod
    def add_line_items(
        db: Session,
        job_id: UUID,
        csv_metadata: Dict[str, str],
        line_items: List[Dict[str, Any]],
        current_user: User,
        original_filename: str = '',
        raw_content: str = '',
    ) -> LaserJob:
        """
        Add line items to a job from a parsed CSV, recording the import.

        Creates a LaserCSVImport record (with filename and raw content) and
        links each new LaserLineItem to it. Also keeps job.csv_metadata in
        sync with the latest import for backward compatibility.

        Args:
            db: Database session
            job_id: Job to add items to
            csv_metadata: Metadata from CSV rows 1-4
            line_items: List of selected row dictionaries
            current_user: User performing the action
            original_filename: Original CSV filename from the browser
            raw_content: Full original CSV text

        Returns:
            Updated LaserJob
        """
        try:
            job = db.query(LaserJob).filter(LaserJob.id == job_id).first()
            if not job:
                raise LaserJobNotFoundError(f"Job {job_id} not found")

            # Create CSV import record
            csv_import = LaserCSVImport(
                laser_job_id=job_id,
                original_filename=original_filename or '(onbekend)',
                raw_content=raw_content,
                csv_metadata=csv_metadata,
                uploaded_by=current_user.id,
            )
            db.add(csv_import)
            db.flush()  # Get the import id before creating line items

            # Keep job.csv_metadata in sync with the latest import
            job.csv_metadata = csv_metadata

            # Create line items linked to this import
            for item_data in line_items:
                line_item = LaserLineItem(
                    laser_job_id=job_id,
                    csv_import_id=csv_import.id,
                    projectcode=item_data.get('projectcode'),
                    fasenr=item_data.get('fasenr'),
                    posnr=item_data.get('posnr'),
                    profiel=item_data.get('profiel'),
                    aantal=item_data.get('aantal'),
                    lengte=item_data.get('lengte'),
                    kwaliteit=item_data.get('kwaliteit'),
                    gewicht=item_data.get('gewicht'),
                    zaag=item_data.get('zaag'),
                    opmerkingen=item_data.get('opmerkingen'),
                    row_number=item_data['row_number']
                )
                db.add(line_item)

            db.flush()

            log_action(
                db=db,
                user_id=current_user.id,
                action=AuditAction.IMPORT_CSV,
                entity_type=EntityType.LASER_JOB,
                entity_id=job.id,
                details={
                    "line_items_added": len(line_items),
                    "csv_import_id": str(csv_import.id),
                    "filename": original_filename,
                }
            )

            db.commit()
            db.refresh(job)
            return job

        except LaserJobNotFoundError:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise

    # ============================================================
    # CSV IMPORT OPERATIONS
    # ============================================================

    @staticmethod
    def list_csv_imports(db: Session, job_id: UUID) -> List[LaserCSVImport]:
        """Return all CSV imports for a job, newest first"""
        return (
            db.query(LaserCSVImport)
            .filter(LaserCSVImport.laser_job_id == job_id)
            .order_by(LaserCSVImport.uploaded_at.desc())
            .all()
        )

    @staticmethod
    def get_csv_import(db: Session, import_id: UUID) -> Optional[LaserCSVImport]:
        """Return a single CSV import record (includes raw_content)"""
        return db.query(LaserCSVImport).filter(LaserCSVImport.id == import_id).first()

    # ============================================================
    # DXF FILE OPERATIONS
    # ============================================================

    @staticmethod
    def upload_dxf_files(
        db: Session,
        job_id: UUID,
        files: List[Tuple[str, str]],   # [(original_filename, file_content), ...]
        current_user: "User",
        import_id: Optional[UUID] = None,
    ) -> Dict[str, Any]:
        """
        Bulk-upload DXF files and match them to line items by filename stem.

        Matching is case-insensitive: the filename without extension is compared
        to each line item's posnr field.  If import_id is provided, matching is
        scoped to line items belonging to that CSV import; otherwise all line
        items in the job are considered.

        For each file a LaserDXFFile record is created with:
          - the raw DXF text
          - a pre-generated SVG thumbnail
          - line_item_id set if a match is found

        Returns a dict::

            {
              "matched":   [LaserDXFFile, ...],   # matched records
              "unmatched": [str, ...],             # filenames with no match
            }
        """
        try:
            job = db.query(LaserJob).filter(LaserJob.id == job_id).first()
            if not job:
                raise LaserJobNotFoundError(f"Job {job_id} not found")

            # Build posnr → line_item lookup
            q = db.query(LaserLineItem).filter(LaserLineItem.laser_job_id == job_id)
            if import_id:
                q = q.filter(LaserLineItem.csv_import_id == import_id)
            line_items = q.all()

            # Map lowercase posnr → line_item (first match wins)
            posnr_map: Dict[str, LaserLineItem] = {}
            for item in line_items:
                if item.posnr:
                    posnr_map[item.posnr.lower().strip()] = item

            matched: List[LaserDXFFile] = []
            unmatched: List[str] = []

            for original_filename, file_content in files:
                stem = os.path.splitext(original_filename)[0].lower().strip()
                matched_item = posnr_map.get(stem)

                thumbnail_svg = process_dxf(file_content, max_w=80, max_h=48)

                dxf_record = LaserDXFFile(
                    laser_job_id=job_id,
                    csv_import_id=import_id,
                    line_item_id=matched_item.id if matched_item else None,
                    original_filename=original_filename,
                    posnr_key=stem,
                    file_content=file_content,
                    thumbnail_svg=thumbnail_svg,
                    uploaded_by=current_user.id,
                )
                db.add(dxf_record)

                if matched_item:
                    matched.append(dxf_record)
                else:
                    unmatched.append(original_filename)

            db.flush()
            db.commit()

            # Refresh matched records so their IDs are populated
            for rec in matched:
                db.refresh(rec)

            return {"matched": matched, "unmatched": unmatched}

        except LaserJobNotFoundError:
            db.rollback()
            raise
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def list_dxf_files(db: Session, job_id: UUID) -> List[LaserDXFFile]:
        """Return all DXF files for a job (no raw content — use get_dxf_raw for that)."""
        return (
            db.query(LaserDXFFile)
            .filter(LaserDXFFile.laser_job_id == job_id)
            .order_by(LaserDXFFile.uploaded_at.asc())
            .all()
        )

    @staticmethod
    def get_dxf_file(db: Session, dxf_id: UUID) -> Optional[LaserDXFFile]:
        """Return a single DXF file record (includes file_content)."""
        return db.query(LaserDXFFile).filter(LaserDXFFile.id == dxf_id).first()

    @staticmethod
    def delete_dxf_file(db: Session, dxf_id: UUID, current_user: User) -> None:
        """Delete a single DXF file record."""
        try:
            dxf = db.query(LaserDXFFile).filter(LaserDXFFile.id == dxf_id).first()
            if not dxf:
                raise LaserDXFFileNotFoundError(f"DXF {dxf_id} not found")
            db.delete(dxf)
            db.commit()
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def upload_single_dxf_for_item(
        db: Session,
        job_id: UUID,
        item_id: UUID,
        original_filename: str,
        file_content: str,
        current_user: User,
    ) -> Tuple[LaserDXFFile, bool]:
        """
        Upload a single DXF file and force-link it to a specific line item.
        Any previously linked DXF for this item is replaced (old record deleted).
        Returns (LaserDXFFile, filename_mismatch: bool).
        """
        try:
            item = db.query(LaserLineItem).filter(
                LaserLineItem.id == item_id,
                LaserLineItem.laser_job_id == job_id,
            ).first()
            if not item:
                raise LaserLineItemNotFoundError(f"Line item {item_id} not found")

            # Remove any existing DXF linked to this line item
            existing = db.query(LaserDXFFile).filter(
                LaserDXFFile.line_item_id == item_id
            ).all()
            for old in existing:
                db.delete(old)

            stem = os.path.splitext(original_filename)[0].lower().strip()
            posnr_lower = (item.posnr or '').lower().strip()
            filename_mismatch = stem != posnr_lower

            thumbnail_svg = process_dxf(file_content, max_w=80, max_h=48)

            dxf_record = LaserDXFFile(
                laser_job_id=job_id,
                csv_import_id=item.csv_import_id,
                line_item_id=item_id,
                original_filename=original_filename,
                posnr_key=stem,
                file_content=file_content,
                thumbnail_svg=thumbnail_svg,
                uploaded_by=current_user.id,
            )
            db.add(dxf_record)
            db.flush()
            db.commit()
            db.refresh(dxf_record)
            return dxf_record, filename_mismatch

        except (LaserLineItemNotFoundError,):
            db.rollback()
            raise
        except Exception:
            db.rollback()
            raise

    # ============================================================
    # LINE ITEM EDIT / DELETE / MANUAL CREATE
    # ============================================================

    @staticmethod
    def update_line_item(
        db: Session,
        item_id: UUID,
        data: dict,
        current_user: User,
    ) -> LaserLineItem:
        """Patch editable fields of a line item."""
        try:
            item = db.query(LaserLineItem).filter(LaserLineItem.id == item_id).first()
            if not item:
                raise LaserLineItemNotFoundError(f"Line item {item_id} not found")

            for field in ('profiel', 'kwaliteit', 'aantal', 'opmerkingen'):
                if field in data:
                    # None explicitly clears the field; non-None sets it
                    setattr(item, field, data[field])

            db.commit()
            db.refresh(item)
            return item

        except LaserLineItemNotFoundError:
            db.rollback()
            raise
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def delete_line_item(
        db: Session,
        item_id: UUID,
        current_user: User,
    ) -> None:
        """Delete a line item and any DXF files linked to it."""
        try:
            item = db.query(LaserLineItem).filter(LaserLineItem.id == item_id).first()
            if not item:
                raise LaserLineItemNotFoundError(f"Line item {item_id} not found")

            # Delete linked DXF files first
            db.query(LaserDXFFile).filter(LaserDXFFile.line_item_id == item_id).delete()

            db.delete(item)
            db.commit()

        except LaserLineItemNotFoundError:
            db.rollback()
            raise
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def create_manual_line_item(
        db: Session,
        job_id: UUID,
        data: dict,
        current_user: User,
    ) -> LaserLineItem:
        """Create a single line item manually (not from a CSV import)."""
        try:
            job = db.query(LaserJob).filter(LaserJob.id == job_id).first()
            if not job:
                raise LaserJobNotFoundError(f"Job {job_id} not found")

            # row_number = max existing + 1 (or 1 if none)
            max_row = db.query(func.max(LaserLineItem.row_number)).filter(
                LaserLineItem.laser_job_id == job_id
            ).scalar() or 0

            item = LaserLineItem(
                laser_job_id=job_id,
                csv_import_id=None,
                posnr=data.get('posnr'),
                profiel=data.get('profiel'),
                kwaliteit=data.get('kwaliteit'),
                aantal=data.get('aantal'),
                opmerkingen=data.get('opmerkingen'),
                row_number=max_row + 1,
            )
            db.add(item)
            db.commit()
            db.refresh(item)
            return item

        except LaserJobNotFoundError:
            db.rollback()
            raise
        except Exception:
            db.rollback()
            raise
