"""
PlateStock API endpoints
Materials, Plates, Claims management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
from typing import List, Optional
from datetime import datetime

from database import get_db
from models.user import User
from models.material import Material
from models.plate import Plate
from models.claim import Claim
from schemas.platestock import (
    # Material schemas
    MaterialCreate, MaterialUpdate, MaterialResponse,
    PrefixSuggestionRequest, PrefixSuggestionResponse,
    # Plate schemas
    PlateCreate, PlateUpdate, PlateResponse, PlateWithRelations,
    VanLaserRequest, RemnantRequest, RemnantResponse, UserSummary, PlateBulkCreate,
    # Claim schemas
    ClaimCreate, ClaimUpdate, ClaimResponse, ClaimWithPlate,
    ClaimBulkCreate, BulkClaimResponse,
    ReleaseByProjectRequest, ReleaseByProjectResponse,
    # Statistics schemas
    OverviewStats, ProjectsStatsResponse
)
from services.platestock import PlateStockService
from utils.auth import get_current_user
from utils.permissions import require_admin, require_admin_or_werkvoorbereider, require_werkplaats_access

router = APIRouter()


# ============================================================
# NOTE: Authorization helpers moved to utils/permissions.py
# Use dependency injection: current_user: User = Depends(require_admin)
# ============================================================


# ============================================================
# ============================================================
# ============================================================
# MATERIAL ENDPOINTS
# ============================================================

@router.post("/materials/suggest-prefix", response_model=PrefixSuggestionResponse)
async def suggest_prefix(
    request: PrefixSuggestionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate prefix suggestion and check uniqueness"""
    suggestion = PlateStockService.generate_prefix_suggestion(
        request.materiaalgroep,
        request.specificatie,
        request.oppervlaktebewerking
    )
    is_unique = PlateStockService.validate_prefix_unique(db, suggestion)
    
    return PrefixSuggestionResponse(suggestion=suggestion, is_unique=is_unique)


@router.get("/materials", response_model=List[MaterialResponse])
async def get_materials(
    materiaalgroep: Optional[str] = None,
    specificatie: Optional[str] = None,
    oppervlaktebewerking: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get materials with optional filters"""
    # PERFORMANCE OPTIMIZATION: Use single query with LEFT JOIN instead of N+1 queries
    # This prevents running a separate COUNT query for each material
    # Example: 50 materials = 1 query instead of 51 queries (1 + 50)
    from sqlalchemy import func

    query = db.query(
        Material,
        func.coalesce(func.count(Plate.id), 0).label('plate_count')
    ).outerjoin(Plate, Material.plaatcode_prefix == Plate.material_prefix)

    # Apply filters before grouping
    if materiaalgroep:
        query = query.filter(Material.materiaalgroep == materiaalgroep)
    if specificatie:
        query = query.filter(Material.specificatie == specificatie)
    if oppervlaktebewerking:
        query = query.filter(Material.oppervlaktebewerking == oppervlaktebewerking)

    # Group by all Material columns to get counts per material
    query = query.group_by(Material.id)

    # Execute query and build response
    results = query.order_by(Material.plaatcode_prefix).all()

    materials = []
    for material, plate_count in results:
        material.plate_count = plate_count
        materials.append(material)

    return materials


@router.post("/materials", response_model=MaterialResponse)
async def create_material(
    material: MaterialCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Create new material (admin only)"""
    from services.exceptions import MaterialPrefixNotUniqueException

    try:
        db_material = PlateStockService.create_material(
            db=db,
            user_id=current_user.id,
            plaatcode_prefix=material.plaatcode_prefix,
            materiaalgroep=material.materiaalgroep,
            specificatie=material.specificatie,
            oppervlaktebewerking=material.oppervlaktebewerking,
            kleur=material.kleur
        )

        # Add plate count
        db_material.plate_count = 0

        return db_material

    except MaterialPrefixNotUniqueException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e.message)
        )


@router.put("/materials/{material_id}", response_model=MaterialResponse)
async def update_material(
    material_id: str,
    material: MaterialUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update material (admin only)"""
    from services.exceptions import MaterialNotFoundError
    from sqlalchemy import func

    try:
        update_data = material.model_dump(exclude_unset=True)
        db_material = PlateStockService.update_material(
            db=db,
            user_id=current_user.id,
            material_id=material_id,
            update_data=update_data
        )

        # PERFORMANCE OPTIMIZATION: Use aggregate query instead of separate count query
        plate_count = db.query(func.count(Plate.id)).filter(
            Plate.material_prefix == db_material.plaatcode_prefix
        ).scalar() or 0

        db_material.plate_count = plate_count

        return db_material

    except MaterialNotFoundError:
        raise HTTPException(status_code=404, detail="Materiaal niet gevonden")


@router.delete("/materials/{material_id}")
async def delete_material(
    material_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete material (admin only)"""
    from services.exceptions import MaterialNotFoundError, MaterialHasPlatesException

    try:
        PlateStockService.delete_material(
            db=db,
            user_id=current_user.id,
            material_id=material_id
        )

        return {"success": True}

    except MaterialNotFoundError:
        raise HTTPException(status_code=404, detail="Materiaal niet gevonden")
    except MaterialHasPlatesException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e.message)
        )


# PLATE ENDPOINTS
# ============================================================

@router.get("/plates", response_model=List[PlateWithRelations])
async def get_plates(
    include_consumed: bool = Query(False),
    location: Optional[str] = Query(None),
    material_prefix: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all plates with filters"""
    query = db.query(Plate).options(
        joinedload(Plate.material),
        joinedload(Plate.creator),
        joinedload(Plate.consumer),
        joinedload(Plate.claims).joinedload(Claim.claimer)
    )

    # Apply filters
    if not include_consumed:
        query = query.filter(Plate.is_consumed == False)
    if location:
        query = query.filter(Plate.location == location)
    if material_prefix:
        query = query.filter(Plate.material_prefix == material_prefix)

    plates = query.order_by(Plate.plate_number).all()

    # Convert to response format
    result = []
    for plate in plates:
        plate_dict = PlateResponse.from_orm(plate).dict()
        plate_dict['material'] = MaterialResponse.from_orm(plate.material) if plate.material else None
        plate_dict['creator'] = UserSummary.from_orm(plate.creator) if plate.creator else None
        plate_dict['consumer'] = UserSummary.from_orm(plate.consumer) if plate.consumer else None
        plate_dict['claims'] = [ClaimResponse.from_orm(c) for c in plate.claims if c.actief]

        result.append(plate_dict)

    return result


@router.get("/plates/{plate_id}", response_model=PlateWithRelations)
async def get_plate(
    plate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get single plate with relations"""
    plate = db.query(Plate).options(
        joinedload(Plate.material),
        joinedload(Plate.creator),
        joinedload(Plate.consumer),
        joinedload(Plate.claims).joinedload(Claim.claimer)
    ).filter(Plate.id == plate_id).first()

    if not plate:
        raise HTTPException(status_code=404, detail="Plaat niet gevonden")

    return plate


@router.post("/plates", response_model=List[PlateResponse])
async def create_plates(
    plate_data: PlateCreate,
    aantal: int = Query(1, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider)
):
    """Create one or more plates (admin, werkvoorbereider)"""
    from services.exceptions import MaterialNotFoundError, PlateNumberGenerationException

    try:
        created_plates = PlateStockService.create_plates(
            db=db,
            user_id=current_user.id,
            material_prefix=plate_data.material_prefix,
            quality=plate_data.quality,
            thickness=plate_data.thickness,
            width=plate_data.width,
            length=plate_data.length,
            weight=plate_data.weight,
            location=plate_data.location,
            notes=plate_data.notes,
            barcode=plate_data.barcode,
            heatnummer=plate_data.heatnummer if hasattr(plate_data, 'heatnummer') else None,
            aantal=aantal
        )

        return created_plates

    except MaterialNotFoundError:
        raise HTTPException(
            status_code=404,
            detail=f"Materiaal '{plate_data.material_prefix}' niet gevonden"
        )
    except PlateNumberGenerationException as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e.message)
        )


@router.put("/plates/{plate_id}", response_model=PlateResponse)
async def update_plate(
    plate_id: str,
    plate_data: PlateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider)
):
    """Update plate (admin, werkvoorbereider)"""
    from services.exceptions import PlateNotFoundError

    try:
        update_data = plate_data.dict(exclude_unset=True)
        db_plate = PlateStockService.update_plate(
            db=db,
            user_id=current_user.id,
            plate_id=plate_id,
            update_data=update_data
        )

        return db_plate

    except PlateNotFoundError:
        raise HTTPException(status_code=404, detail="Plaat niet gevonden")


@router.delete("/plates/{plate_id}")
async def delete_plate(
    plate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete plate (admin only)"""
    from services.exceptions import PlateNotFoundError, PlateHasActiveClaimsException

    try:
        PlateStockService.delete_plate(
            db=db,
            user_id=current_user.id,
            plate_id=plate_id
        )

        return {"success": True, "message": "Plaat verwijderd"}

    except PlateNotFoundError:
        raise HTTPException(status_code=404, detail="Plaat niet gevonden")
    except PlateHasActiveClaimsException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e.message)
        )


@router.post("/plates/{plate_id}/naar-laser", response_model=PlateResponse)
async def move_plate_to_laser(
    plate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_werkplaats_access)
):
    """Move plate to laser station (admin, werkvoorbereider, werkplaats)"""
    from services.exceptions import PlateNotFoundError, PlateAlreadyConsumedException

    try:
        db_plate = PlateStockService.move_plate_to_laser(
            db=db,
            user_id=current_user.id,
            plate_id=plate_id
        )

        return db_plate

    except PlateNotFoundError:
        raise HTTPException(status_code=404, detail="Plaat niet gevonden")
    except PlateAlreadyConsumedException:
        raise HTTPException(status_code=400, detail="Plaat is al geconsumeerd")


@router.post("/plates/{plate_id}/van-laser", response_model=PlateResponse)
async def move_plate_from_laser(
    plate_id: str,
    request: VanLaserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_werkplaats_access)
):
    """Return plate from laser (admin, werkvoorbereider, werkplaats)"""
    from services.exceptions import PlateNotFoundError, PlateNotAtLaserException

    try:
        db_plate = PlateStockService.move_plate_from_laser(
            db=db,
            user_id=current_user.id,
            plate_id=plate_id,
            new_location=request.new_location
        )

        return db_plate

    except PlateNotFoundError:
        raise HTTPException(status_code=404, detail="Plaat niet gevonden")
    except PlateNotAtLaserException:
        raise HTTPException(status_code=400, detail="Plaat staat niet bij laser")


@router.post("/plates/{plate_id}/process-remnant", response_model=RemnantResponse)
async def process_remnant(
    plate_id: str,
    request: RemnantRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_werkplaats_access)
):
    """Process remnant from laser-cut plate (admin, werkvoorbereider, werkplaats)"""
    from services.exceptions import (
        PlateNotFoundError,
        PlateNotAtLaserException,
        PlateAlreadyConsumedException,
        InvalidRemnantDimensionsException
    )

    try:
        result = PlateStockService.process_remnant(
            db=db,
            user_id=current_user.id,
            original_plate_id=plate_id,
            new_width=request.new_width,
            new_length=request.new_length,
            new_location=request.new_location,
            notes=request.notes
        )

        return RemnantResponse(
            original_plate=result["original_plate"],
            remnant_plate=result["remnant_plate"]
        )

    except PlateNotFoundError:
        raise HTTPException(status_code=404, detail="Plaat niet gevonden")
    except PlateNotAtLaserException:
        raise HTTPException(status_code=400, detail="Plaat staat niet bij laser")
    except PlateAlreadyConsumedException:
        raise HTTPException(status_code=400, detail="Plaat is al geconsumeerd")
    except InvalidRemnantDimensionsException as e:
        raise HTTPException(status_code=400, detail=str(e.message))


@router.post("/plates/{plate_id}/consume", response_model=PlateResponse)
async def consume_plate(
    plate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider)
):
    """Mark plate as consumed (admin, werkvoorbereider)"""
    from services.exceptions import PlateNotFoundError, PlateAlreadyConsumedException

    try:
        db_plate = PlateStockService.consume_plate(
            db=db,
            user_id=current_user.id,
            plate_id=plate_id
        )

        return db_plate

    except PlateNotFoundError:
        raise HTTPException(status_code=404, detail="Plaat niet gevonden")
    except PlateAlreadyConsumedException:
        raise HTTPException(status_code=400, detail="Plaat is al geconsumeerd")


# ============================================================
# CLAIM ENDPOINTS
# ============================================================

@router.get("/claims", response_model=List[ClaimWithPlate])
async def get_claims(
    actief: Optional[bool] = Query(None),
    project_naam: Optional[str] = Query(None),
    project_fase: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all claims with filters"""
    query = db.query(Claim).options(
        joinedload(Claim.plate).joinedload(Plate.material),
        joinedload(Claim.claimer)
    )

    # Apply filters
    if actief is not None:
        query = query.filter(Claim.actief == actief)
    if project_naam:
        query = query.filter(Claim.project_naam == project_naam)
    if project_fase:
        query = query.filter(Claim.project_fase == project_fase)

    claims = query.order_by(Claim.claimed_at.desc()).all()

    return claims


@router.post("/claims", response_model=ClaimResponse)
async def create_claim(
    claim_data: ClaimCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider)
):
    """Create claim on plate (admin, werkvoorbereider)"""
    from services.exceptions import PlateNotFoundError, ClaimOnConsumedPlateException

    try:
        db_claim = PlateStockService.create_claim(
            db=db,
            user_id=current_user.id,
            plate_id=claim_data.plate_id,
            project_naam=claim_data.project_naam,
            project_fase=claim_data.project_fase,
            m2_geclaimd=claim_data.m2_geclaimd,
            notes=claim_data.notes
        )

        return db_claim

    except PlateNotFoundError:
        raise HTTPException(status_code=404, detail="Plaat niet gevonden")
    except ClaimOnConsumedPlateException:
        raise HTTPException(status_code=400, detail="Kan geen claim maken op geconsumeerde plaat")


@router.post("/claims/bulk", response_model=BulkClaimResponse)
async def create_bulk_claims(
    bulk_data: ClaimBulkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider)
):
    """Bulk claim multiple plates (admin, werkvoorbereider)"""
    created_claims = PlateStockService.create_bulk_claims(
        db=db,
        user_id=current_user.id,
        plate_ids=bulk_data.plate_ids,
        project_naam=bulk_data.project_naam,
        project_fase=bulk_data.project_fase
    )

    # Calculate total m²
    total_m2 = 0
    for claim in created_claims:
        plate = db.query(Plate).filter(Plate.id == claim.plate_id).first()
        if plate:
            total_m2 += float(PlateStockService.calculate_plate_area(plate))

    return BulkClaimResponse(
        claims=created_claims,
        total_m2=total_m2
    )


@router.put("/claims/{claim_id}", response_model=ClaimResponse)
async def update_claim(
    claim_id: str,
    claim_data: ClaimUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider)
):
    """Update claim (admin, werkvoorbereider)"""
    from services.exceptions import ClaimNotFoundError

    try:
        update_data = claim_data.dict(exclude_unset=True)
        db_claim = PlateStockService.update_claim(
            db=db,
            user_id=current_user.id,
            claim_id=claim_id,
            update_data=update_data
        )

        return db_claim

    except ClaimNotFoundError:
        raise HTTPException(status_code=404, detail="Claim niet gevonden")


@router.delete("/claims/{claim_id}")
async def release_claim(
    claim_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider)
):
    """Release claim (sets actief=false) (admin, werkvoorbereider)"""
    from services.exceptions import ClaimNotFoundError

    try:
        PlateStockService.release_claim(
            db=db,
            user_id=current_user.id,
            claim_id=claim_id
        )

        return {"success": True, "message": "Claim vrijgegeven"}

    except ClaimNotFoundError:
        raise HTTPException(status_code=404, detail="Claim niet gevonden")


@router.post("/claims/release-by-project", response_model=ReleaseByProjectResponse)
async def release_claims_by_project(
    request: ReleaseByProjectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider)
):
    """Release all claims for a project/fase (admin, werkvoorbereider)"""
    result = PlateStockService.release_claims_by_project(
        db=db,
        user_id=current_user.id,
        project_naam=request.project_naam,
        project_fase=request.project_fase
    )

    return ReleaseByProjectResponse(
        claims_released=result["claims_released"],
        plates_freed=result["plates_freed"]
    )


# ============================================================
# STATISTICS ENDPOINTS
# ============================================================

@router.get("/stats/overview", response_model=OverviewStats)
async def get_overview_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get inventory overview statistics"""
    stats = PlateStockService.get_inventory_stats(db)
    return stats


@router.get("/stats/projects", response_model=ProjectsStatsResponse)
async def get_project_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get project statistics"""
    stats = PlateStockService.get_project_stats(db)
    return stats
