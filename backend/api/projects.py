"""
Projects API endpoints
Project and Fase management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from database import get_db
from models.user import User
from models.project import Project
from models.fase import Fase
from schemas.project import (
    ProjectCreate, ProjectUpdate, ProjectResponse, ProjectWithFases,
    FaseCreate, FaseUpdate, FaseResponse, FaseWithProject,
    ProjectStatistics, FaseStatistics
)
from services.project import ProjectService
from services.exceptions import (
    ProjectNotFoundError,
    ProjectCodeExistsError,
    FaseNotFoundError,
    FaseAlreadyExistsError
)
from utils.auth import get_current_user
from utils.permissions import (
    require_admin,
    require_admin_or_werkvoorbereider,
    require_any_authenticated
)

router = APIRouter()


# ============================================================
# PROJECT ENDPOINTS
# ============================================================

@router.get("/projects", response_model=List[ProjectResponse])
async def list_projects(
    status_filter: Optional[str] = Query(None, description="Filter by status: actief, afgerond, geannuleerd"),
    search: Optional[str] = Query(None, description="Search by code or name"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """
    List projects with optional filters

    Permissions:
    - All authenticated users can view projects
    - Non-admin users see only their own projects (for now, until Phase 6)
    - Admin sees all projects
    """

    projects = ProjectService.list_projects(
        db=db,
        current_user=current_user,
        status_filter=status_filter,
        search=search
    )

    return projects


@router.post("/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider)
):
    """
    Create a new project

    Permissions:
    - admin, werkvoorbereider
    """

    try:
        project = ProjectService.create_project(
            db=db,
            code=project_data.code,
            naam=project_data.naam,
            beschrijving=project_data.beschrijving,
            current_user=current_user
        )

        # Commit the transaction
        db.commit()
        db.refresh(project)

        return project

    except ProjectCodeExistsError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fout bij aanmaken project: {str(e)}"
        )


@router.get("/projects/{project_id}", response_model=ProjectWithFases)
async def get_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """
    Get project by ID with all fases

    Permissions:
    - All authenticated users
    """

    project = ProjectService.get_project(db=db, project_id=project_id)

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project met ID {project_id} niet gevonden"
        )

    return project


@router.get("/projects/code/{code}", response_model=ProjectWithFases)
async def get_project_by_code(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """
    Get project by code with all fases

    Permissions:
    - All authenticated users
    """

    project = ProjectService.get_project_by_code(db=db, code=code)

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project met code '{code}' niet gevonden"
        )

    return project


@router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    project_data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider)
):
    """
    Update project details

    Permissions:
    - admin, werkvoorbereider

    Note: project code cannot be changed after creation
    """

    try:
        project = ProjectService.update_project(
            db=db,
            project_id=project_id,
            naam=project_data.naam,
            beschrijving=project_data.beschrijving,
            status=project_data.status,
            current_user=current_user
        )

        # Commit the transaction
        db.commit()
        db.refresh(project)

        return project

    except ProjectNotFoundError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fout bij bijwerken project: {str(e)}"
        )


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Soft delete a project (sets is_active = False)

    Permissions:
    - admin only

    Note: This performs a soft delete. The project remains in the database
    but is marked as inactive and won't appear in normal queries.
    """

    try:
        ProjectService.delete_project(
            db=db,
            project_id=project_id,
            current_user=current_user
        )

        # Commit the transaction
        db.commit()

        return None

    except ProjectNotFoundError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fout bij verwijderen project: {str(e)}"
        )


@router.get("/projects/{project_id}/statistics", response_model=dict)
async def get_project_statistics(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """
    Get statistics for a project

    Returns:
    - fase_count
    - order_count (future: Phase 1.2)
    - posnummer_count (future: Phase 1.2)
    - file_count (future: Phase 2)
    """

    try:
        stats = ProjectService.get_project_statistics(db=db, project_id=project_id)
        return stats

    except ProjectNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


# ============================================================
# FASE ENDPOINTS
# ============================================================

@router.post("/projects/{project_id}/fases", response_model=FaseResponse, status_code=status.HTTP_201_CREATED)
async def create_fase(
    project_id: UUID,
    fase_data: FaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider)
):
    """
    Create a new fase within a project

    Permissions:
    - admin, werkvoorbereider
    """

    # Ensure fase_data.project_id matches URL parameter
    if fase_data.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project ID in URL moet overeenkomen met project_id in request body"
        )

    try:
        fase = ProjectService.create_fase(
            db=db,
            project_id=project_id,
            fase_nummer=fase_data.fase_nummer,
            beschrijving=fase_data.beschrijving,
            opmerkingen_intern=fase_data.opmerkingen_intern,
            opmerkingen_werkplaats=fase_data.opmerkingen_werkplaats,
            montage_datum=fase_data.montage_datum,
            current_user=current_user
        )

        # Commit the transaction
        db.commit()
        db.refresh(fase)

        # Add computed fields
        fase.order_count = 0
        fase.posnummer_count = 0
        fase.file_count = 0

        return fase

    except ProjectNotFoundError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except FaseAlreadyExistsError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fout bij aanmaken fase: {str(e)}"
        )


@router.get("/projects/{project_id}/fases", response_model=List[FaseResponse])
async def list_fases_for_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """
    List all fases for a project

    Permissions:
    - All authenticated users
    """

    fases = ProjectService.list_fases_for_project(db=db, project_id=project_id)

    # Add computed fields
    for fase in fases:
        fase.order_count = 0
        fase.posnummer_count = 0
        fase.file_count = 0
        # Note: full_code will be computed by the @property in the model

    return fases


@router.get("/fases/{fase_id}", response_model=FaseWithProject)
async def get_fase(
    fase_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """
    Get fase by ID with project details

    Permissions:
    - All authenticated users
    """

    fase = ProjectService.get_fase(db=db, fase_id=fase_id)

    if not fase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Fase met ID {fase_id} niet gevonden"
        )

    # Add computed fields
    fase.order_count = 0
    fase.posnummer_count = 0
    fase.file_count = 0

    return fase


@router.put("/fases/{fase_id}", response_model=FaseResponse)
async def update_fase(
    fase_id: UUID,
    fase_data: FaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider)
):
    """
    Update fase details

    Permissions:
    - admin, werkvoorbereider

    Note: project_id and fase_nummer cannot be changed after creation
    """

    try:
        fase = ProjectService.update_fase(
            db=db,
            fase_id=fase_id,
            beschrijving=fase_data.beschrijving,
            opmerkingen_intern=fase_data.opmerkingen_intern,
            opmerkingen_werkplaats=fase_data.opmerkingen_werkplaats,
            montage_datum=fase_data.montage_datum,
            status=fase_data.status,
            current_user=current_user
        )

        # Commit the transaction
        db.commit()
        db.refresh(fase)

        # Add computed fields
        fase.order_count = 0
        fase.posnummer_count = 0
        fase.file_count = 0

        return fase

    except FaseNotFoundError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fout bij bijwerken fase: {str(e)}"
        )


@router.get("/fases/{fase_id}/statistics", response_model=dict)
async def get_fase_statistics(
    fase_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """
    Get statistics for a fase

    Returns:
    - order_count (future: Phase 1.2)
    - posnummer_count (future: Phase 1.2)
    - file_count (future: Phase 2)
    - claimed_plate_count (future: Phase 5)
    """

    try:
        stats = ProjectService.get_fase_statistics(db=db, fase_id=fase_id)
        return stats

    except FaseNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
