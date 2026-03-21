from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID, uuid4
import csv
import io
import logging
import os
import re
import zipfile

logger = logging.getLogger(__name__)
from pathlib import Path
from datetime import datetime, timezone

from models.laser_job import LaserJob
from models.laser_line_item import LaserLineItem
from models.laser_csv_import import LaserCSVImport
from models.laser_dxf_file import LaserDXFFile
from models.laser_pdf_file import LaserPDFFile
from models.laser_nc_file import LaserNCFile
from models.laser_step_file import LaserStepFile
from models.user import User
from models.orderreeks import Orderreeks
from models.order import Order
from models.order_type import OrderType
from utils.audit import log_action, AuditAction, EntityType
from services.exceptions import (
    LaserJobNotFoundError,
    LaserJobNameExistsError,
    InvalidCSVFormatError,
    LaserLineItemNotFoundError,
    LaserDXFFileNotFoundError,
    DXFFileMissingFromDiskError,
    LaserPDFFileNotFoundError,
    PDFProcessingError,
    JobNotReadyForExportError,
    JobHasNoLineItemsError,
    InvalidStatusTransitionError,
    LaserNCFileNotFoundError,
    NCParseError,
    LaserStepFileNotFoundError,
)
from services.dxf_service import process_dxf
from services.file_storage import DXFStorage, PDFStorage
from services.pdf_service import process_pdf, extract_page_bytes, generate_thumbnail
from pypdf import PdfReader

# ---------------------------------------------------------------------------
# Module-level helpers
# ---------------------------------------------------------------------------

_THICKNESS_RE = re.compile(r'^PL(\d+)', re.IGNORECASE)

_ALMACAM_HEADERS = {"name", "quantity", "material", "thickness",
                     "customerorderid", "plm_externalid", "date"}


def _is_almacam_csv(first_row: List[str]) -> bool:
    """Detect whether the CSV is in Almacam export format (header row only, no metadata)."""
    normalised = {cell.strip().lower() for cell in first_row}
    # Match if at least 3 of the known Almacam headers are present
    return len(normalised & _ALMACAM_HEADERS) >= 3


def _parse_customer_order_id(raw: str) -> Tuple[Optional[str], Optional[str]]:
    """Split 'GENDT         -001       ' into (projectcode, fasenr)."""
    cleaned = raw.strip()
    if not cleaned:
        return None, None
    # Pattern: TEXT <whitespace> -NNN
    m = re.match(r'^(.+?)\s*-\s*(\d+)\s*$', cleaned)
    if m:
        return m.group(1).strip(), m.group(2).strip()
    return cleaned, None


def _safe_int(value: str) -> Optional[int]:
    """Convert string to int, returning None for non-numeric values."""
    try:
        return int(value.strip())
    except (ValueError, AttributeError):
        return None

def _safe_float(value: str) -> Optional[float]:
    """Convert string to float, returning None for non-numeric values."""
    try:
        return float(value.strip())
    except (ValueError, AttributeError):
        return None

def _extract_thickness(profiel: Optional[str]) -> Optional[int]:
    """Extract plate thickness from profiel string.

    Examples: 'PL10*50' → 10,  'PL8' → 8,  'HEA200' → None
    Mirrors the frontend extractDikte() function in LaserplannerDetail.tsx.
    """
    if not profiel:
        return None
    m = _THICKNESS_RE.match(profiel)
    return int(m.group(1)) if m else None

# Allowed manual status transitions (concept ↔ gereed_voor_almacam only)
_MANUAL_TRANSITIONS: Dict[str, List[str]] = {
    'concept':              ['gereed_voor_almacam'],
    'gereed_voor_almacam':  ['concept'],
}


class LaserplannerService:
    """Business logic for Laserplanner operations"""

    # ============================================================
    # CSV PARSING
    # ============================================================

    @staticmethod
    def parse_csv(csv_content: str) -> Dict[str, Any]:
        """
        Parse CSV content and extract metadata, headers, and data rows.

        Supports two formats:
          1. Tekla materiaallijst (4 metadata rows + header + data)
          2. Almacam export (header row + data, columns:
             Name;Quantity;Material;Thickness;CustomerOrderId;PLM_ExternalID;Date)

        Returns:
            Dictionary with metadata, headers, rows, and raw_content.

        Raises:
            InvalidCSVFormatError: If CSV format is invalid.
        """
        try:
            # Parse CSV with semicolon delimiter
            reader = csv.reader(io.StringIO(csv_content), delimiter=';')
            all_rows = list(reader)

            if len(all_rows) < 2:
                raise InvalidCSVFormatError("CSV must have at least a header row and one data row")

            # --- Auto-detect format ---
            if _is_almacam_csv(all_rows[0]):
                return LaserplannerService._parse_almacam_csv(all_rows, csv_content)

            # --- Tekla materiaallijst format ---
            if len(all_rows) < 6:
                raise InvalidCSVFormatError("CSV must have at least 6 rows (4 metadata + 1 header + 1 data)")

            metadata = {
                "row1": ";".join(all_rows[0]),
                "row2": ";".join(all_rows[1]),
                "row3": ";".join(all_rows[2]),
                "row4": ";".join(all_rows[3]),
            }
            headers = all_rows[4]

            data_rows = []
            for idx, row in enumerate(all_rows[5:], start=1):
                if not row or all(cell.strip() == '' for cell in row):
                    continue
                row_dict = {
                    "row_number": idx,
                    "projectcode": row[0] if len(row) > 0 else None,
                    "fasenr": row[1] if len(row) > 1 else None,
                    "posnr": row[2] if len(row) > 2 else None,
                    "profiel": row[3] if len(row) > 3 else None,
                    "aantal": _safe_int(row[4]) if len(row) > 4 and row[4].strip() else None,
                    "lengte": _safe_int(row[5]) if len(row) > 5 and row[5].strip() else None,
                    "kwaliteit": row[6] if len(row) > 6 else None,
                    "gewicht": _safe_float(row[7]) if len(row) > 7 and row[7].strip() else None,
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

    @staticmethod
    def _parse_almacam_csv(all_rows: List[List[str]], csv_content: str) -> Dict[str, Any]:
        """Parse an Almacam-format CSV (header row + data, 7 columns).

        Column mapping:
            Name            → posnr
            Quantity        → aantal
            Material        → kwaliteit
            Thickness       → profiel (as 'PL{value}' when numeric)
            CustomerOrderId → projectcode + fasenr  (e.g. 'GENDT -001')
            PLM_ExternalID  → opmerkingen
            Date            → (stored in metadata)
        """
        # Build header-index lookup (case-insensitive, stripped)
        raw_headers = all_rows[0]
        hdr = {cell.strip().lower(): i for i, cell in enumerate(raw_headers)}

        def _col(row: List[str], key: str) -> Optional[str]:
            idx = hdr.get(key)
            if idx is None or idx >= len(row):
                return None
            val = row[idx].strip()
            return val if val else None

        # Use the original header names for the table display
        display_headers = [
            "Projectcode", "Fasenr", "Posnr", "Profiel",
            "Aantal", "Lengte", "Kwaliteit", "Gewicht", "Zaag", "Opmerkingen",
        ]

        # Synthesise metadata from the first data row (if available)
        first_data = all_rows[1] if len(all_rows) > 1 else []
        date_val = _col(first_data, "date") if first_data else None
        job_name = _col(first_data, "plm_externalid") if first_data else None
        metadata = {
            "row1": f"Datum: {date_val}" if date_val else "",
            "row2": "",
            "row3": job_name or "",
            "row4": "(Almacam CSV import)",
        }

        data_rows = []
        for idx, row in enumerate(all_rows[1:], start=1):
            if not row or all(cell.strip() == '' for cell in row):
                continue

            posnr = _col(row, "name")
            aantal = _safe_int(row[hdr["quantity"]]) if "quantity" in hdr and hdr["quantity"] < len(row) else None
            kwaliteit = _col(row, "material")

            # Thickness → profiel: numeric thickness becomes 'PL{value}'
            thickness = _col(row, "thickness")
            profiel = f"PL{thickness}" if thickness else None

            # CustomerOrderId → projectcode + fasenr
            order_id = _col(row, "customerorderid") or ""
            projectcode, fasenr = _parse_customer_order_id(order_id)

            opmerkingen = _col(row, "plm_externalid")

            data_rows.append({
                "row_number": idx,
                "projectcode": projectcode,
                "fasenr": fasenr,
                "posnr": posnr,
                "profiel": profiel,
                "aantal": aantal,
                "lengte": None,
                "kwaliteit": kwaliteit,
                "gewicht": None,
                "zaag": None,
                "opmerkingen": opmerkingen,
            })

        return {
            "metadata": metadata,
            "headers": display_headers,
            "rows": data_rows,
            "raw_content": csv_content,
        }

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
                status='concept',
                created_by=current_user.id,
                is_active=True
            )

            db.add(job)
            db.flush()

            # Auto-create Orderreeks + Order "Plaat snijden" when fase_id is set
            if fase_id:
                plaat_snijden_type = db.query(OrderType).filter(
                    OrderType.name == "Plaat snijden"
                ).first()

                if not plaat_snijden_type:
                    logger.warning(
                        "OrderType 'Plaat snijden' niet gevonden in de database — "
                        "laserjob %s wordt niet gekoppeld aan een orderreeks", job.id
                    )
                elif plaat_snijden_type:
                    # Find existing orderreeks for this fase
                    orderreeks = db.query(Orderreeks).filter(
                        and_(
                            Orderreeks.fase_id == fase_id,
                            Orderreeks.is_active == True
                        )
                    ).first()

                    # Create orderreeks if none exists
                    if not orderreeks:
                        orderreeks = Orderreeks(
                            fase_id=fase_id,
                            title="Volledig",
                            status="open",
                            is_active=True
                        )
                        db.add(orderreeks)
                        db.flush()

                    # Find existing "Plaat snijden" order in this orderreeks
                    plaat_order = db.query(Order).filter(
                        and_(
                            Order.orderreeks_id == orderreeks.id,
                            Order.order_type_id == plaat_snijden_type.id
                        )
                    ).first()

                    if not plaat_order:
                        # Determine next sequence position
                        max_pos = db.query(func.max(Order.sequence_position)).filter(
                            Order.orderreeks_id == orderreeks.id
                        ).scalar() or 0

                        plaat_order = Order(
                            orderreeks_id=orderreeks.id,
                            order_type_id=plaat_snijden_type.id,
                            sequence_position=max_pos + 1,
                            status="open"
                        )
                        db.add(plaat_order)
                        db.flush()

                    # Link laser job to the order
                    job.order_id = plaat_order.id

            log_action(
                db=db,
                user_id=current_user.id,
                action=AuditAction.CREATE_LASER_JOB,
                entity_type=EntityType.LASER_JOB,
                entity_id=job.id,
                details={"naam": job.naam, "order_id": str(job.order_id) if job.order_id else None}
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
        """Update job status (manual transitions only: concept ↔ gereed_voor_almacam).

        Raises InvalidStatusTransitionError when:
        - The target status is 'geexporteerd' (only the export endpoint may set this)
        - The job is already 'geexporteerd' (locked after export)
        - The transition is not in the allowed list
        """
        try:
            job = db.query(LaserJob).filter(LaserJob.id == job_id).first()
            if not job:
                raise LaserJobNotFoundError(f"Job {job_id} not found")

            # Block all manual transitions to 'geexporteerd'
            if status == 'geexporteerd':
                raise InvalidStatusTransitionError(
                    "Status 'Geëxporteerd' kan alleen worden ingesteld via het exporteren van de job"
                )
            # Lock exported jobs against manual changes
            if job.status == 'geexporteerd':
                raise InvalidStatusTransitionError(
                    "Een geëxporteerde job kan niet handmatig van status worden gewijzigd"
                )
            # Validate allowed transition
            if status not in _MANUAL_TRANSITIONS.get(job.status, []):
                raise InvalidStatusTransitionError(
                    f"Overgang van '{job.status}' naar '{status}' is niet toegestaan"
                )

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

        except (LaserJobNotFoundError, InvalidStatusTransitionError):
            db.rollback()
            raise
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def _populate_exported_by_names(db: Session, jobs: List[LaserJob]) -> None:
        """Attach exported_by_name as a Python instance attribute to each job.

        Uses a single IN-query so the cost is O(1) extra queries regardless
        of how many jobs have been exported.  Pydantic reads this attribute
        via from_attributes=True on JobResponse.
        """
        exported_ids = [j.exported_by for j in jobs if j.exported_by]
        if not exported_ids:
            return
        users = db.query(User).filter(User.id.in_(exported_ids)).all()
        user_map = {u.id: u.full_name for u in users}
        for j in jobs:
            j.exported_by_name = user_map.get(j.exported_by)  # type: ignore[attr-defined]

    @staticmethod
    def get_job(db: Session, job_id: UUID) -> Optional[LaserJob]:
        """Get job by ID with line items and CSV imports"""
        job = db.query(LaserJob).filter(
            and_(
                LaserJob.id == job_id,
                LaserJob.is_active == True
            )
        ).first()
        if job:
            LaserplannerService._populate_exported_by_names(db, [job])
        return job

    @staticmethod
    def list_jobs(db: Session, status_filter: Optional[str] = None) -> List[LaserJob]:
        """List all active jobs"""
        query = db.query(LaserJob).filter(LaserJob.is_active == True)

        if status_filter:
            query = query.filter(LaserJob.status == status_filter)

        jobs = query.order_by(LaserJob.updated_at.desc()).all()
        LaserplannerService._populate_exported_by_names(db, jobs)
        return jobs

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

                relative_path = DXFStorage._build_relative_path(
                    project_id=job.project_id,
                    fase_id=job.fase_id,
                    job_id=job.id,
                    posnr=stem,
                    filename=original_filename,
                )
                DXFStorage.save(relative_path, file_content)

                dxf_record = LaserDXFFile(
                    laser_job_id=job_id,
                    csv_import_id=import_id,
                    line_item_id=matched_item.id if matched_item else None,
                    original_filename=original_filename,
                    posnr_key=stem,
                    file_path=relative_path,
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
        """
        Return a single DXF file record with file_content injected from disk.

        Pydantic's from_attributes=True picks up the dynamically-set
        file_content attribute via getattr(), so DXFFileDetailResponse
        serializes correctly without any schema changes.

        Raises:
            DXFFileMissingFromDiskError: if file_path is set but file not on disk.
        """
        dxf = db.query(LaserDXFFile).filter(LaserDXFFile.id == dxf_id).first()
        if dxf is None:
            return None

        # Load content from disk and inject as a plain Python attribute
        try:
            dxf.file_content = DXFStorage.load(dxf.file_path)
        except (FileNotFoundError, OSError):
            raise DXFFileMissingFromDiskError(
                f"DXF file not found on disk: {dxf.file_path}"
            )

        return dxf

    @staticmethod
    def delete_dxf_file(db: Session, dxf_id: UUID, current_user: User) -> None:
        """Delete a single DXF file record and its file on disk."""
        try:
            dxf = db.query(LaserDXFFile).filter(LaserDXFFile.id == dxf_id).first()
            if not dxf:
                raise LaserDXFFileNotFoundError(f"DXF {dxf_id} not found")
            file_path = dxf.file_path
            db.delete(dxf)
            db.commit()
            # Delete from disk after successful DB commit so we never lose data
            DXFStorage.delete(file_path)
        except LaserDXFFileNotFoundError:
            db.rollback()
            raise
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

            # Remove any existing DXF linked to this line item (collect paths first)
            existing = db.query(LaserDXFFile).filter(
                LaserDXFFile.line_item_id == item_id
            ).all()
            old_paths = [old.file_path for old in existing]
            for old in existing:
                db.delete(old)

            stem = os.path.splitext(original_filename)[0].lower().strip()
            posnr_lower = (item.posnr or '').lower().strip()
            filename_mismatch = stem != posnr_lower

            thumbnail_svg = process_dxf(file_content, max_w=80, max_h=48)

            # Fetch job to resolve project/fase for the storage path
            job = db.query(LaserJob).filter(LaserJob.id == job_id).first()
            relative_path = DXFStorage._build_relative_path(
                project_id=job.project_id if job else None,
                fase_id=job.fase_id if job else None,
                job_id=job_id,
                posnr=stem,
                filename=original_filename,
            )
            DXFStorage.save(relative_path, file_content)

            dxf_record = LaserDXFFile(
                laser_job_id=job_id,
                csv_import_id=item.csv_import_id,
                line_item_id=item_id,
                original_filename=original_filename,
                posnr_key=stem,
                file_path=relative_path,
                thumbnail_svg=thumbnail_svg,
                uploaded_by=current_user.id,
            )
            db.add(dxf_record)
            db.flush()
            db.commit()
            db.refresh(dxf_record)

            # Remove old disk files after successful commit
            for old_path in old_paths:
                DXFStorage.delete(old_path)

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
        """Delete a line item and any DXF files linked to it (disk + DB)."""
        try:
            item = db.query(LaserLineItem).filter(LaserLineItem.id == item_id).first()
            if not item:
                raise LaserLineItemNotFoundError(f"Line item {item_id} not found")

            # Collect disk paths before deleting DB records
            linked_dxfs = db.query(LaserDXFFile).filter(
                LaserDXFFile.line_item_id == item_id
            ).all()
            dxf_paths = [dxf.file_path for dxf in linked_dxfs]

            for dxf in linked_dxfs:
                db.delete(dxf)

            db.delete(item)
            db.commit()

            # Remove disk files after successful commit
            for path in dxf_paths:
                DXFStorage.delete(path)

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

    # ============================================================
    # PDF FILE OPERATIONS
    # ============================================================

    @staticmethod
    def parse_pdf_upload(
        db: Session,
        job_id: UUID,
        filename: str,
        pdf_bytes: bytes,
        current_user: User,
    ) -> dict:
        """
        Parse a PDF, extract Posnr per page, generate thumbnails.

        Saves the raw PDF to _tmp/ and returns a preview dict so the frontend
        can show a review screen before committing.

        Returns a dict suitable for PDFUploadPreviewResponse.
        """
        job = db.query(LaserJob).filter(LaserJob.id == job_id).first()
        if not job:
            raise LaserJobNotFoundError(f"Job {job_id} not found")

        # Build the set of posnrs from all line items in this job
        items = db.query(LaserLineItem).filter(LaserLineItem.laser_job_id == job_id).all()
        job_posnrs = {(i.posnr or "").lower().strip() for i in items if i.posnr}

        # Build the set of posnr_keys that already have a stored drawing
        existing = db.query(LaserPDFFile).filter(LaserPDFFile.laser_job_id == job_id).all()
        existing_keys = {p.posnr_key for p in existing}

        # Store the raw PDF in _tmp/ — reused during the confirm step
        temp_id = str(uuid4())
        PDFStorage.save_temp(f"{temp_id}.pdf", pdf_bytes)

        result = process_pdf(pdf_bytes, job_posnrs, existing_keys)
        result["temp_id"] = temp_id
        result["original_filename"] = filename
        return result

    @staticmethod
    def confirm_pdf_upload(
        db: Session,
        job_id: UUID,
        temp_id: str,
        original_filename: str,
        confirmed_pages: list,   # list of PDFConfirmedPage-like dicts / Pydantic models
        current_user: User,
    ) -> list:
        """
        Finalise the PDF upload: split pages, store on disk, create DB records.

        confirmed_pages items must have page_number (int) and posnr (str).
        Pages with posnr='' are skipped.

        Pages with an existing drawing for the same Posnr are overwritten:
        the old DB record is deleted first, the old file is removed after commit.

        Returns the list of created LaserPDFFile records.
        """
        job = db.query(LaserJob).filter(LaserJob.id == job_id).first()
        if not job:
            raise LaserJobNotFoundError(f"Job {job_id} not found")

        try:
            pdf_bytes = PDFStorage.load_bytes(f"_tmp/{temp_id}.pdf")
        except FileNotFoundError:
            raise PDFProcessingError("Tijdelijk bestand niet gevonden — upload het PDF opnieuw")

        # Create the reader once so every page extraction reuses the same object
        pdf_reader = PdfReader(io.BytesIO(pdf_bytes))

        old_paths: list = []    # existing disk paths to remove after a successful commit
        new_paths: list = []    # newly written paths — removed on rollback
        created: list = []

        try:
            for cp in confirmed_pages:
                # confirmed_pages are always PDFConfirmedPage Pydantic model instances
                posnr = (cp.posnr or "").strip()
                page_number = cp.page_number

                if not posnr:
                    continue  # user explicitly cleared this posnr → skip

                posnr_lower = posnr.lower()
                page_index = page_number - 1

                page_bytes = extract_page_bytes(pdf_reader, page_index)

                # Re-use the thumbnail from the parse phase if the frontend sent it back;
                # otherwise regenerate (avoids a full PyMuPDF render pass on confirm).
                if cp.thumbnail_png:
                    thumbnail = cp.thumbnail_png
                else:
                    thumbnail = generate_thumbnail(page_bytes)

                # Overwrite existing drawing for this Posnr if one exists
                existing_pdf = db.query(LaserPDFFile).filter(
                    LaserPDFFile.laser_job_id == job_id,
                    LaserPDFFile.posnr_key == posnr_lower,
                ).first()
                if existing_pdf:
                    old_paths.append(existing_pdf.file_path)
                    db.delete(existing_pdf)
                    db.flush()

                # Try to match to a line item
                matched_item = db.query(LaserLineItem).filter(
                    LaserLineItem.laser_job_id == job_id,
                    func.lower(LaserLineItem.posnr) == posnr_lower,
                ).first()

                # Build storage path reusing the same structure as DXF files
                rel_path = DXFStorage._build_relative_path(
                    project_id=job.project_id,
                    fase_id=job.fase_id,
                    job_id=job.id,
                    posnr=posnr_lower,
                    filename="tekening.pdf",
                )
                PDFStorage.save_bytes(rel_path, page_bytes)
                new_paths.append(rel_path)  # track so we can clean up on failure

                record = LaserPDFFile(
                    laser_job_id=job_id,
                    line_item_id=matched_item.id if matched_item else None,
                    original_pdf_filename=original_filename,
                    page_number=page_number,
                    posnr_key=posnr_lower,
                    file_path=rel_path,
                    thumbnail_png=thumbnail,
                    uploaded_by=current_user.id,
                )
                db.add(record)
                created.append(record)

            db.flush()
            db.commit()

            # Clean up superseded disk files and the temp PDF after a successful commit
            for path in old_paths:
                try:
                    PDFStorage.delete(path)
                except FileNotFoundError:
                    pass  # already gone — not an error
            try:
                PDFStorage.delete(f"_tmp/{temp_id}.pdf")
            except FileNotFoundError:
                pass  # temp file may already be gone — not an error

            for r in created:
                db.refresh(r)

            return created

        except (LaserJobNotFoundError, PDFProcessingError):
            db.rollback()
            # Remove any files we wrote during this failed transaction
            for path in new_paths:
                try:
                    PDFStorage.delete(path)
                except FileNotFoundError:
                    pass
            raise
        except Exception:
            db.rollback()
            # Remove any files we wrote during this failed transaction
            for path in new_paths:
                try:
                    PDFStorage.delete(path)
                except FileNotFoundError:
                    pass
            raise

    # ============================================================
    # ALMACAM CSV EXPORT
    # ============================================================

    @staticmethod
    def export_almacam_zip(
        db: Session,
        job_id: UUID,
        current_user: User,
    ) -> Tuple[bytes, str, bool]:
        """Generate an Almacam export ZIP containing the CSV and all linked DXF files.

        The export is allowed when the job status is 'gereed_voor_almacam'
        (first export) or 'geexporteerd' (re-export).

        After generating the ZIP, the job is updated:
          - status  → 'geexporteerd'
          - export_date, exported_by, export_count

        Returns:
            (zip_bytes, zip_filename, is_reexport)  where is_reexport is True
            when export_count was already > 0 before this call.
        """
        job = db.query(LaserJob).filter(
            LaserJob.id == job_id,
            LaserJob.is_active == True,
        ).first()
        if not job:
            raise LaserJobNotFoundError(f"Job {job_id} not found")

        if job.status not in ('gereed_voor_almacam', 'geexporteerd'):
            raise JobNotReadyForExportError(
                "Job moet status 'Gereed voor Almacam' hebben om te exporteren. "
                "Zet de job eerst gereed via de statusknop."
            )

        items = (
            db.query(LaserLineItem)
            .filter(LaserLineItem.laser_job_id == job_id)
            .all()
        )
        if not items:
            raise JobHasNoLineItemsError(
                "Job heeft geen onderdelen om te exporteren. "
                "Importeer eerst een CSV met onderdelen."
            )

        is_reexport = (job.export_count or 0) > 0

        # DXF record per line_item_id (first match wins — typically one DXF per item)
        dxf_files = (
            db.query(LaserDXFFile)
            .filter(LaserDXFFile.laser_job_id == job_id)
            .all()
        )
        dxf_by_item: Dict[UUID, LaserDXFFile] = {}
        for d in dxf_files:
            if d.line_item_id and d.line_item_id not in dxf_by_item:
                dxf_by_item[d.line_item_id] = d

        # Sort: thickness ASC (nulls last) → kwaliteit ASC → aantal DESC
        # Mirrors the frontend sortItems() function in LaserplannerDetail.tsx
        def _sort_key(item: LaserLineItem):
            t = _extract_thickness(item.profiel)
            return (
                0 if t is not None else 1,  # PL-profiles first
                t or 0,
                (item.kwaliteit or '').lower(),
                -(item.aantal or 0),
            )

        items.sort(key=_sort_key)

        # ----- Build CSV content -----
        export_date_str = datetime.now(timezone.utc).date().isoformat()
        rows = ["Name;Quantity;Material;Thickness;CustomerOrderId;PLM_ExternalID;Date"]

        for item in items:
            dxf = dxf_by_item.get(item.id)
            name      = Path(dxf.original_filename).stem if dxf else (item.posnr or '')
            qty       = str(item.aantal or 0)
            material  = item.kwaliteit or ''
            thickness = str(_extract_thickness(item.profiel) or '')
            coi_parts = [p for p in [item.projectcode, item.fasenr] if p]
            coi       = "-".join(coi_parts)
            rows.append(
                f"{name};{qty};{material};{thickness};{coi};{job.naam};{export_date_str}"
            )

        csv_content = "\n".join(rows)

        # ----- Build ZIP: CSV + DXF files -----
        safe_naam = (job.naam or str(job_id)).replace(' ', '_')
        csv_filename = f"almacam_{safe_naam}.csv"

        buf = io.BytesIO()
        with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
            zf.writestr(csv_filename, csv_content)

            seen_names: Dict[str, int] = {}
            for item in items:
                dxf = dxf_by_item.get(item.id)
                if not dxf or not dxf.file_path:
                    continue
                try:
                    dxf_content = DXFStorage.load(dxf.file_path)
                except FileNotFoundError:
                    logger.warning(
                        "DXF file missing from disk during export: %s (job %s)",
                        dxf.file_path, job_id,
                    )
                    continue

                # Deduplicate filenames in ZIP
                dxf_name = dxf.original_filename
                if dxf_name in seen_names:
                    seen_names[dxf_name] += 1
                    stem = Path(dxf_name).stem
                    dxf_name = f"{stem}_{seen_names[dxf_name]}.dxf"
                else:
                    seen_names[dxf_name] = 1

                zf.writestr(dxf_name, dxf_content)

        zip_bytes = buf.getvalue()
        zip_filename = f"almacam_{safe_naam}.zip"

        # ----- Update job export metadata -----
        old_status       = job.status
        new_export_count = (job.export_count or 0) + 1
        job.status       = 'geexporteerd'
        job.export_date  = datetime.now(timezone.utc)
        job.exported_by  = current_user.id
        job.export_count = new_export_count

        log_action(
            db=db,
            user_id=current_user.id,
            action=AuditAction.UPDATE_LASER_JOB,
            entity_type=EntityType.LASER_JOB,
            entity_id=job.id,
            details={
                "status_change": {"old": old_status, "new": "geexporteerd"},
                "export_count": new_export_count,
                "is_reexport": is_reexport,
            }
        )
        db.commit()

        return zip_bytes, zip_filename, is_reexport

    @staticmethod
    def list_pdf_files(db: Session, job_id: UUID) -> list:
        """Return all PDF drawing records for a job, ordered by posnr_key."""
        return (
            db.query(LaserPDFFile)
            .filter(LaserPDFFile.laser_job_id == job_id)
            .order_by(LaserPDFFile.posnr_key.asc())
            .all()
        )

    @staticmethod
    def get_pdf_file(db: Session, pdf_id: UUID):
        """Return a single PDF file record (thumbnail included)."""
        return db.query(LaserPDFFile).filter(LaserPDFFile.id == pdf_id).first()

    @staticmethod
    def delete_pdf_file(db: Session, pdf_id: UUID, current_user: User) -> None:
        """Delete a PDF drawing record and its file on disk."""
        try:
            pdf = db.query(LaserPDFFile).filter(LaserPDFFile.id == pdf_id).first()
            if not pdf:
                raise LaserPDFFileNotFoundError(f"PDF {pdf_id} not found")
            file_path = pdf.file_path
            db.delete(pdf)
            db.commit()
            # Remove from disk after successful DB commit
            PDFStorage.delete(file_path)
        except LaserPDFFileNotFoundError:
            db.rollback()
            raise
        except Exception:
            db.rollback()
            raise

    # ============================================================
    # NC FILE OPERATIONS (DSTV .nc1 from Tekla Structures)
    # ============================================================

    @staticmethod
    def upload_nc_files(
        db: Session,
        job_id: UUID,
        files: List[Tuple[str, str]],   # [(original_filename, content_str), ...]
        current_user: "User",
    ) -> Dict[str, Any]:
        """
        Bulk-upload NC files and match them to line items by filename stem (= posnr).

        All files are saved to disk regardless of whether a matching line item exists.
        Matched files get line_item_id set; unmatched files are saved with line_item_id=None.

        If a line item already has an NC file, the existing record is updated (replaced).

        Returns a dict::

            {
              "matched":   [LaserNCFile, ...],   # records linked to a line item
              "unmatched": [str, ...],            # filenames with no matching posnr
            }
        """
        try:
            job = db.query(LaserJob).filter(LaserJob.id == job_id, LaserJob.is_active == True).first()
            if not job:
                raise LaserJobNotFoundError(f"Job {job_id} not found")

            # Build posnr -> line_item lookup
            items = db.query(LaserLineItem).filter(LaserLineItem.laser_job_id == job_id).all()
            posnr_map: Dict[str, LaserLineItem] = {}
            for item in items:
                if item.posnr:
                    posnr_map[item.posnr.lower().strip()] = item

            matched: List[LaserNCFile] = []
            unmatched: List[str] = []

            for original_filename, content_str in files:
                stem = os.path.splitext(original_filename)[0].lower().strip()
                matched_item = posnr_map.get(stem)

                # Build storage path
                safe_posnr = stem.replace("/", "_").replace("\\", "_").replace(":", "_")
                rel_path = DXFStorage._build_relative_path(
                    project_id=job.project_id,
                    fase_id=job.fase_id,
                    job_id=job.id,
                    posnr=safe_posnr,
                    filename="tekening.nc1",
                )

                # Check for existing NC file for this posnr+job and replace it
                existing = db.query(LaserNCFile).filter(
                    LaserNCFile.laser_job_id == job_id,
                    LaserNCFile.posnr_key == stem,
                ).first()

                if existing:
                    old_path = existing.file_path
                    DXFStorage.save(rel_path, content_str)
                    if old_path != rel_path:
                        DXFStorage.delete(old_path)
                    existing.file_path = rel_path
                    existing.original_filename = original_filename
                    existing.line_item_id = matched_item.id if matched_item else None
                    existing.uploaded_by = current_user.id
                    db.flush()

                    log_action(
                        db, current_user.id, AuditAction.UPLOAD_FILE,
                        EntityType.LASER_JOB, job_id,
                        details={"action": "nc_file_replaced", "filename": original_filename},
                        auto_commit=False,
                    )

                    if matched_item:
                        matched.append(existing)
                    else:
                        unmatched.append(original_filename)
                else:
                    DXFStorage.save(rel_path, content_str)

                    nc_record = LaserNCFile(
                        laser_job_id=job_id,
                        line_item_id=matched_item.id if matched_item else None,
                        original_filename=original_filename,
                        posnr_key=stem,
                        file_path=rel_path,
                        uploaded_by=current_user.id,
                    )
                    db.add(nc_record)
                    db.flush()

                    log_action(
                        db, current_user.id, AuditAction.UPLOAD_FILE,
                        EntityType.LASER_JOB, job_id,
                        details={"action": "nc_file_uploaded", "filename": original_filename},
                        auto_commit=False,
                    )

                    if matched_item:
                        matched.append(nc_record)
                    else:
                        unmatched.append(original_filename)

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
    def list_nc_files(db: Session, job_id: UUID) -> List[LaserNCFile]:
        """Return all NC files for a job, newest first."""
        return (
            db.query(LaserNCFile)
            .filter(LaserNCFile.laser_job_id == job_id)
            .order_by(LaserNCFile.uploaded_at.desc())
            .all()
        )

    @staticmethod
    def get_nc_file(db: Session, nc_id: UUID) -> Optional[LaserNCFile]:
        """Return a single NC file record."""
        return db.query(LaserNCFile).filter(LaserNCFile.id == nc_id).first()

    @staticmethod
    def get_nc_geometry(db: Session, nc_id: UUID) -> dict:
        """Parse an NC file from disk and return geometry for the 3D viewer."""
        from services.dstv_parser import parse_dstv

        nc = db.query(LaserNCFile).filter(LaserNCFile.id == nc_id).first()
        if not nc:
            raise LaserNCFileNotFoundError(f"NC file {nc_id} not found")

        try:
            content = DXFStorage.load(nc.file_path)
        except FileNotFoundError:
            raise LaserNCFileNotFoundError(f"NC file {nc_id} not found on disk")

        try:
            return parse_dstv(content)
        except Exception as e:
            raise NCParseError(f"Fout bij parsen NC bestand: {e}")

    @staticmethod
    def delete_nc_file(db: Session, nc_id: UUID, current_user: User) -> None:
        """Delete an NC file record and its file on disk."""
        try:
            nc = db.query(LaserNCFile).filter(LaserNCFile.id == nc_id).first()
            if not nc:
                raise LaserNCFileNotFoundError(f"NC file {nc_id} not found")
            file_path = nc.file_path
            log_action(
                db, current_user.id, AuditAction.DELETE_FILE,
                EntityType.LASER_JOB, nc.laser_job_id,
                details={"filename": nc.original_filename},
                auto_commit=False,
            )
            db.delete(nc)
            db.commit()
            # Remove from disk after successful DB commit
            DXFStorage.delete(file_path)
        except LaserNCFileNotFoundError:
            db.rollback()
            raise
        except Exception:
            db.rollback()
            raise

    # ============================================================
    # STEP FILE METHODS (3D CAD .step/.stp files)
    # ============================================================

    @staticmethod
    def upload_step_files(
        db: Session,
        job_id: UUID,
        files: List[Tuple[str, bytes]],   # [(original_filename, content_bytes), ...]
        current_user: "User",
    ) -> Dict[str, Any]:
        """
        Bulk-upload STEP files and match them to line items by filename stem (= posnr).

        STEP files are binary 3D CAD files. All files are saved to disk regardless of
        whether a matching line item exists. Matched files get line_item_id set;
        unmatched files are saved with line_item_id=None.

        If a line item already has a STEP file, the existing record is updated (replaced).

        Returns a dict::

            {
              "matched":   [LaserStepFile, ...],   # records linked to a line item
              "unmatched": [str, ...],              # filenames with no matching posnr
            }
        """
        try:
            job = db.query(LaserJob).filter(LaserJob.id == job_id, LaserJob.is_active == True).first()
            if not job:
                raise LaserJobNotFoundError(f"Job {job_id} not found")

            # Build posnr -> line_item lookup
            items = db.query(LaserLineItem).filter(LaserLineItem.laser_job_id == job_id).all()
            posnr_map: Dict[str, LaserLineItem] = {}
            for item in items:
                if item.posnr:
                    posnr_map[item.posnr.lower().strip()] = item

            matched: List[LaserStepFile] = []
            unmatched: List[str] = []

            for original_filename, content_bytes in files:
                stem = os.path.splitext(original_filename)[0].lower().strip()
                matched_item = posnr_map.get(stem)

                # Build storage path
                safe_posnr = stem.replace("/", "_").replace("\\", "_").replace(":", "_")
                rel_path = DXFStorage._build_relative_path(
                    project_id=job.project_id,
                    fase_id=job.fase_id,
                    job_id=job.id,
                    posnr=safe_posnr,
                    filename="tekening.step",
                )

                # Check for existing STEP file for this posnr+job and replace it
                existing = db.query(LaserStepFile).filter(
                    LaserStepFile.laser_job_id == job_id,
                    LaserStepFile.posnr_key == stem,
                ).first()

                if existing:
                    old_path = existing.file_path
                    DXFStorage.save_bytes(rel_path, content_bytes)
                    if old_path != rel_path:
                        DXFStorage.delete(old_path)
                    existing.file_path = rel_path
                    existing.original_filename = original_filename
                    existing.line_item_id = matched_item.id if matched_item else None
                    existing.uploaded_by = current_user.id
                    db.flush()

                    log_action(
                        db, current_user.id, AuditAction.UPLOAD_FILE,
                        EntityType.LASER_JOB, job_id,
                        details={"action": "step_file_replaced", "filename": original_filename},
                        auto_commit=False,
                    )

                    if matched_item:
                        matched.append(existing)
                    else:
                        unmatched.append(original_filename)
                else:
                    DXFStorage.save_bytes(rel_path, content_bytes)

                    step_record = LaserStepFile(
                        laser_job_id=job_id,
                        line_item_id=matched_item.id if matched_item else None,
                        original_filename=original_filename,
                        posnr_key=stem,
                        file_path=rel_path,
                        uploaded_by=current_user.id,
                    )
                    db.add(step_record)
                    db.flush()

                    log_action(
                        db, current_user.id, AuditAction.UPLOAD_FILE,
                        EntityType.LASER_JOB, job_id,
                        details={"action": "step_file_uploaded", "filename": original_filename},
                        auto_commit=False,
                    )

                    if matched_item:
                        matched.append(step_record)
                    else:
                        unmatched.append(original_filename)

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
    def list_step_files(db: Session, job_id: UUID) -> List[LaserStepFile]:
        """Return all STEP files for a job, newest first."""
        return (
            db.query(LaserStepFile)
            .filter(LaserStepFile.laser_job_id == job_id)
            .order_by(LaserStepFile.uploaded_at.desc())
            .all()
        )

    @staticmethod
    def get_step_file(db: Session, step_id: UUID) -> Optional[LaserStepFile]:
        """Return a single STEP file record."""
        return db.query(LaserStepFile).filter(LaserStepFile.id == step_id).first()

    @staticmethod
    def delete_step_file(db: Session, step_id: UUID, current_user: User) -> None:
        """Delete a STEP file record and its file on disk."""
        try:
            step = db.query(LaserStepFile).filter(LaserStepFile.id == step_id).first()
            if not step:
                raise LaserStepFileNotFoundError(f"STEP file {step_id} not found")
            file_path = step.file_path
            log_action(
                db, current_user.id, AuditAction.DELETE_FILE,
                EntityType.LASER_JOB, step.laser_job_id,
                details={"filename": step.original_filename},
                auto_commit=False,
            )
            db.delete(step)
            db.commit()
            # Remove from disk after successful DB commit
            DXFStorage.delete(file_path)
        except LaserStepFileNotFoundError:
            db.rollback()
            raise
        except Exception:
            db.rollback()
            raise
