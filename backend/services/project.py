"""
Project Service
Business logic for Project and Fase operations
"""

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func, and_
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime

from models.project import Project
from models.fase import Fase
from models.user import User
from models.orderreeks import Orderreeks
from models.order import Order
from models.posnummer import Posnummer
from utils.audit import log_action, AuditAction, EntityType
from services.exceptions import (
    ProjectNotFoundError,
    ProjectCodeExistsError,
    FaseNotFoundError,
    FaseAlreadyExistsError
)


class ProjectService:
    """Business logic for Project and Fase operations"""

    # ============================================================
    # PROJECT OPERATIONS
    # ============================================================

    @staticmethod
    def create_project(
        db: Session,
        code: str,
        naam: str,
        beschrijving: Optional[str],
        current_user: User
    ) -> Project:
        """
        Create a new project with unique code validation

        Args:
            db: Database session
            code: Unique project code (e.g., "STAGR")
            naam: Project name
            beschrijving: Optional description
            current_user: User creating the project

        Returns:
            Created Project object

        Raises:
            ValueError: If project code already exists
            IntegrityError: If database constraint violated
        """
        # Validate code is unique
        existing = db.query(Project).filter(Project.code == code.upper()).first()
        if existing:
            raise ProjectCodeExistsError(f"Project code '{code}' already exists")

        # Create project
        project = Project(
            code=code.upper(),
            naam=naam,
            beschrijving=beschrijving,
            status='actief',
            created_by=current_user.id,
            is_active=True
        )

        db.add(project)
        db.flush()  # Get ID for audit log

        # Log action
        log_action(
            db=db,
            user_id=current_user.id,
            action=AuditAction.CREATE_PROJECT,
            entity_type=EntityType.PROJECT,
            entity_id=project.id,
            details={
                "code": project.code,
                "naam": project.naam
            }
        )

        # Note: API layer must commit the transaction
        return project

    @staticmethod
    def update_project(
        db: Session,
        project_id: UUID,
        naam: Optional[str],
        beschrijving: Optional[str],
        status: Optional[str],
        current_user: User
    ) -> Project:
        """
        Update project details

        Args:
            db: Database session
            project_id: UUID of project to update
            naam: New name (optional)
            beschrijving: New description (optional)
            status: New status (optional)
            current_user: User performing update

        Returns:
            Updated Project object

        Raises:
            ProjectNotFoundError: If project not found
        """
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ProjectNotFoundError(f"Project with ID {project_id} not found")

        # Track changes for audit log
        changes = {}

        if naam is not None:
            changes['naam'] = {'old': project.naam, 'new': naam}
            project.naam = naam

        if beschrijving is not None:
            changes['beschrijving'] = {'old': project.beschrijving, 'new': beschrijving}
            project.beschrijving = beschrijving

        if status is not None:
            changes['status'] = {'old': project.status, 'new': status}
            project.status = status

        # Note: updated_at handled automatically by SQLAlchemy onupdate

        # Log action
        log_action(
            db=db,
            user_id=current_user.id,
            action=AuditAction.UPDATE_PROJECT,
            entity_type=EntityType.PROJECT,
            entity_id=project.id,
            details={"changes": changes}
        )

        # Note: API layer must commit the transaction
        return project

    @staticmethod
    def get_project(db: Session, project_id: UUID) -> Optional[Project]:
        """
        Get project by ID with fases

        Args:
            db: Database session
            project_id: UUID of project

        Returns:
            Project object or None if not found
        """
        return db.query(Project).filter(
            and_(
                Project.id == project_id,
                Project.is_active == True
            )
        ).first()

    @staticmethod
    def get_project_by_code(db: Session, code: str) -> Optional[Project]:
        """
        Get project by code

        Args:
            db: Database session
            code: Project code (e.g., "STAGR")

        Returns:
            Project object or None if not found
        """
        return db.query(Project).filter(
            and_(
                Project.code == code.upper(),
                Project.is_active == True
            )
        ).first()

    @staticmethod
    def list_projects(
        db: Session,
        current_user: User,
        status_filter: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[Project]:
        """
        List projects based on user permissions

        Args:
            db: Database session
            current_user: Current user (for permission filtering)
            status_filter: Optional status filter ('actief', 'afgerond', 'geannuleerd')
            search: Optional search term for code or name

        Returns:
            List of Project objects

        Note:
            - Admin sees all projects
            - Werkvoorbereider sees only their own projects (for now, until Phase 6 permissions)
            - Other roles see projects based on their involvement
        """
        query = db.query(Project).filter(Project.is_active == True)

        # Apply status filter
        if status_filter:
            query = query.filter(Project.status == status_filter)

        # Apply search filter
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (Project.code.ilike(search_term)) | (Project.naam.ilike(search_term))
            )

        # Permission filtering
        user_roles = [role.role for role in current_user.roles]

        if 'admin' not in user_roles:
            # Non-admin users only see their own projects for now
            # TODO Phase 6: Add shared project permissions
            query = query.filter(Project.created_by == current_user.id)

        return query.order_by(Project.updated_at.desc()).all()

    @staticmethod
    def delete_project(
        db: Session,
        project_id: UUID,
        current_user: User
    ) -> None:
        """
        Soft delete a project (sets is_active = False)

        Args:
            db: Database session
            project_id: UUID of project to delete
            current_user: User performing deletion

        Raises:
            ProjectNotFoundError: If project not found
        """
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ProjectNotFoundError(f"Project with ID {project_id} not found")

        project.is_active = False
        # Note: updated_at handled automatically by SQLAlchemy onupdate

        # Log action
        log_action(
            db=db,
            user_id=current_user.id,
            action=AuditAction.DELETE_PROJECT,
            entity_type=EntityType.PROJECT,
            entity_id=project.id,
            details={
                "code": project.code,
                "naam": project.naam
            }
        )

        # Note: API layer must commit the transaction

    @staticmethod
    def get_project_statistics(db: Session, project_id: UUID) -> Dict[str, Any]:
        """
        Get statistics for a project

        Args:
            db: Database session
            project_id: UUID of project

        Returns:
            Dictionary with project statistics

        Example:
            {
                "fase_count": 3,
                "order_count": 0,  # Future: Phase 1.2
                "posnummer_count": 0,  # Future: Phase 1.2
                "file_count": 0  # Future: Phase 2
            }
        """
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ProjectNotFoundError(f"Project with ID {project_id} not found")

        # Count fases
        fase_count = db.query(Fase).filter(Fase.project_id == project_id).count()

        # Get all fase IDs for this project
        fase_ids = db.query(Fase.id).filter(Fase.project_id == project_id).all()
        fase_id_list = [fase_id[0] for fase_id in fase_ids]

        # Count orders (via orderreeksen linked to fases)
        order_count = db.query(Order).join(Orderreeks).filter(
            Orderreeks.fase_id.in_(fase_id_list)
        ).count() if fase_id_list else 0

        # Count posnummers
        posnummer_count = db.query(Posnummer).filter(
            Posnummer.fase_id.in_(fase_id_list),
            Posnummer.is_active == True
        ).count() if fase_id_list else 0

        return {
            "fase_count": fase_count,
            "order_count": order_count,
            "posnummer_count": posnummer_count,
            "file_count": 0  # TODO Phase 2: Count files
        }

    # ============================================================
    # FASE OPERATIONS
    # ============================================================

    @staticmethod
    def create_fase(
        db: Session,
        project_id: UUID,
        fase_nummer: str,
        beschrijving: Optional[str],
        opmerkingen_intern: Optional[str],
        opmerkingen_werkplaats: Optional[str],
        montage_datum: Optional[datetime],
        current_user: User
    ) -> Fase:
        """
        Create a new fase within a project

        Args:
            db: Database session
            project_id: UUID of parent project
            fase_nummer: 3-digit fase number (e.g., "001")
            beschrijving: Optional description
            opmerkingen_intern: Internal notes
            opmerkingen_werkplaats: Workshop notes
            montage_datum: Planned assembly date
            current_user: User creating the fase

        Returns:
            Created Fase object

        Raises:
            ProjectNotFoundError: If project not found
            FaseAlreadyExistsError: If fase_nummer already exists
            IntegrityError: If database constraint violated
        """
        # Validate project exists
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ProjectNotFoundError(f"Project with ID {project_id} not found")

        # Validate fase_nummer is unique within project
        existing = db.query(Fase).filter(
            and_(
                Fase.project_id == project_id,
                Fase.fase_nummer == fase_nummer
            )
        ).first()
        if existing:
            raise FaseAlreadyExistsError(f"Fase {fase_nummer} already exists in project {project.code}")

        # Create fase
        fase = Fase(
            project_id=project_id,
            fase_nummer=fase_nummer,
            beschrijving=beschrijving,
            opmerkingen_intern=opmerkingen_intern,
            opmerkingen_werkplaats=opmerkingen_werkplaats,
            montage_datum=montage_datum,
            status='actief',
            created_by=current_user.id
        )

        db.add(fase)
        db.flush()  # Get ID for audit log

        # Log action
        log_action(
            db=db,
            user_id=current_user.id,
            action=AuditAction.CREATE_FASE,
            entity_type=EntityType.FASE,
            entity_id=fase.id,
            details={
                "project_code": project.code,
                "fase_nummer": fase.fase_nummer,
                "beschrijving": fase.beschrijving
            }
        )

        # Note: API layer must commit the transaction
        return fase

    @staticmethod
    def update_fase(
        db: Session,
        fase_id: UUID,
        beschrijving: Optional[str],
        opmerkingen_intern: Optional[str],
        opmerkingen_werkplaats: Optional[str],
        montage_datum: Optional[datetime],
        status: Optional[str],
        current_user: User
    ) -> Fase:
        """
        Update fase details

        Args:
            db: Database session
            fase_id: UUID of fase to update
            beschrijving: New description (optional)
            opmerkingen_intern: New internal notes (optional)
            opmerkingen_werkplaats: New workshop notes (optional)
            montage_datum: New assembly date (optional)
            status: New status (optional)
            current_user: User performing update

        Returns:
            Updated Fase object

        Raises:
            FaseNotFoundError: If fase not found
        """
        fase = db.query(Fase).filter(Fase.id == fase_id).first()
        if not fase:
            raise FaseNotFoundError(f"Fase with ID {fase_id} not found")

        # Track changes for audit log
        changes = {}

        if beschrijving is not None:
            changes['beschrijving'] = {'old': fase.beschrijving, 'new': beschrijving}
            fase.beschrijving = beschrijving

        if opmerkingen_intern is not None:
            changes['opmerkingen_intern'] = {'old': fase.opmerkingen_intern, 'new': opmerkingen_intern}
            fase.opmerkingen_intern = opmerkingen_intern

        if opmerkingen_werkplaats is not None:
            changes['opmerkingen_werkplaats'] = {'old': fase.opmerkingen_werkplaats, 'new': opmerkingen_werkplaats}
            fase.opmerkingen_werkplaats = opmerkingen_werkplaats

        if montage_datum is not None:
            changes['montage_datum'] = {'old': str(fase.montage_datum), 'new': str(montage_datum)}
            fase.montage_datum = montage_datum

        if status is not None:
            changes['status'] = {'old': fase.status, 'new': status}
            fase.status = status

        # Note: updated_at handled automatically by SQLAlchemy onupdate

        # Log action
        log_action(
            db=db,
            user_id=current_user.id,
            action=AuditAction.UPDATE_FASE,
            entity_type=EntityType.FASE,
            entity_id=fase.id,
            details={"changes": changes}
        )

        # Note: API layer must commit the transaction
        return fase

    @staticmethod
    def get_fase(db: Session, fase_id: UUID) -> Optional[Fase]:
        """
        Get fase by ID

        Args:
            db: Database session
            fase_id: UUID of fase

        Returns:
            Fase object or None if not found
        """
        return db.query(Fase).filter(Fase.id == fase_id).first()

    @staticmethod
    def list_fases_for_project(db: Session, project_id: UUID) -> List[Fase]:
        """
        List all fases for a project

        Args:
            db: Database session
            project_id: UUID of project

        Returns:
            List of Fase objects ordered by fase_nummer
        """
        return db.query(Fase).filter(
            Fase.project_id == project_id
        ).order_by(Fase.fase_nummer).all()

    @staticmethod
    def get_fase_statistics(db: Session, fase_id: UUID) -> Dict[str, Any]:
        """
        Get statistics for a fase

        Args:
            db: Database session
            fase_id: UUID of fase

        Returns:
            Dictionary with fase statistics

        Example:
            {
                "order_count": 0,  # Future: Phase 1.2
                "posnummer_count": 0,  # Future: Phase 1.2
                "file_count": 0,  # Future: Phase 2
                "claimed_plate_count": 0  # Future: Phase 5
            }
        """
        fase = db.query(Fase).filter(Fase.id == fase_id).first()
        if not fase:
            raise FaseNotFoundError(f"Fase with ID {fase_id} not found")

        # Count orders (via orderreeksen linked to this fase)
        order_count = db.query(Order).join(Orderreeks).filter(
            Orderreeks.fase_id == fase_id
        ).count()

        # Count posnummers
        posnummer_count = db.query(Posnummer).filter(
            Posnummer.fase_id == fase_id,
            Posnummer.is_active == True
        ).count()

        return {
            "order_count": order_count,
            "posnummer_count": posnummer_count,
            "file_count": 0,  # TODO Phase 2: Count files
            "claimed_plate_count": 0  # TODO Phase 5: Count claimed plates
        }
