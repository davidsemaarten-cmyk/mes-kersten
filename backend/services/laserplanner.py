from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional, Dict, Any
from uuid import UUID
import csv
import io

from models.laser_job import LaserJob
from models.laser_line_item import LaserLineItem
from models.user import User
from utils.audit import log_action, AuditAction, EntityType
from services.exceptions import (
    LaserJobNotFoundError,
    LaserJobNameExistsError,
    InvalidCSVFormatError,
    LaserLineItemNotFoundError
)

class LaserplannerService:
    """Business logic for Laserplanner operations"""

    # ============================================================
    # CSV PARSING
    # ============================================================

    @staticmethod
    def parse_csv(csv_content: str) -> Dict[str, Any]:
        """
        Parse CSV content and extract metadata, headers, and data rows

        Args:
            csv_content: Raw CSV file content as string

        Returns:
            Dictionary with metadata, headers, and rows

        Raises:
            InvalidCSVFormatError: If CSV format is invalid
        """
        try:
            # Parse CSV with semicolon delimiter
            reader = csv.reader(io.StringIO(csv_content), delimiter=';')
            all_rows = list(reader)

            if len(all_rows) < 6:
                raise InvalidCSVFormatError("CSV must have at least 6 rows (4 metadata + 1 header + 1 data)")

            # Extract metadata (rows 1-4)
            metadata = {
                "row1": ";".join(all_rows[0]),  # Title row
                "row2": ";".join(all_rows[1]),  # Tekenaar
                "row3": ";".join(all_rows[2]),  # Opdrachtgever
                "row4": ";".join(all_rows[3]),  # Blank or extra info
            }

            # Extract headers (row 5, index 4)
            headers = all_rows[4]

            # Extract data rows (row 6+, index 5+)
            data_rows = []
            for idx, row in enumerate(all_rows[5:], start=1):
                if not row or all(cell.strip() == '' for cell in row):
                    continue  # Skip empty rows

                # Map row to dictionary using headers
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
                "rows": data_rows
            }

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
            # Validate name is unique
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
                action=AuditAction.CREATE_PROJECT,  # Reuse or add CREATE_LASER_JOB
                entity_type=EntityType.PROJECT,  # Reuse or add LASER_JOB
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
                action=AuditAction.UPDATE_PROJECT,
                entity_type=EntityType.PROJECT,
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
        """Get job by ID with line items"""
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
                action=AuditAction.DELETE_PROJECT,
                entity_type=EntityType.PROJECT,
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
        current_user: User
    ) -> LaserJob:
        """
        Add line items to a job from parsed CSV

        Args:
            db: Database session
            job_id: Job to add items to
            csv_metadata: Metadata from CSV rows 1-4
            line_items: List of selected row dictionaries
            current_user: User performing action

        Returns:
            Updated LaserJob
        """
        try:
            job = db.query(LaserJob).filter(LaserJob.id == job_id).first()
            if not job:
                raise LaserJobNotFoundError(f"Job {job_id} not found")

            # Store CSV metadata
            job.csv_metadata = csv_metadata

            # Create line items
            for item_data in line_items:
                line_item = LaserLineItem(
                    laser_job_id=job_id,
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
                action=AuditAction.UPDATE_PROJECT,
                entity_type=EntityType.PROJECT,
                entity_id=job.id,
                details={"line_items_added": len(line_items)}
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
