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

router = APIRouter()


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def check_admin_or_werkvoorbereider(current_user: User):
    """Check if user has admin or werkvoorbereider role"""
    user_roles = [role.role for role in current_user.roles]
    if 'admin' not in user_roles and 'werkvoorbereider' not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Alleen admin en werkvoorbereider hebben toegang"
        )


def check_admin(current_user: User):
    """Check if user has admin role"""
    user_roles = [role.role for role in current_user.roles]
    if 'admin' not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Alleen admin heeft toegang"
        )


def check_laser_access(current_user: User):
    """Check if user has access to laser operations (admin, werkvoorbereider, werkplaats)"""
    user_roles = [role.role for role in current_user.roles]
    if 'admin' not in user_roles and 'werkvoorbereider' not in user_roles and 'werkplaats' not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Alleen admin, werkvoorbereider en werkplaats hebben toegang tot laser operaties"
        )


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
    query = db.query(Material)
    
    if materiaalgroep:
        query = query.filter(Material.materiaalgroep == materiaalgroep)
    if specificatie:
        query = query.filter(Material.specificatie == specificatie)
    if oppervlaktebewerking:
        query = query.filter(Material.oppervlaktebewerking == oppervlaktebewerking)
    
    materials = query.order_by(Material.plaatcode_prefix).all()
    
    # Add plate count to each material
    for material in materials:
        material.plate_count = db.query(Plate).filter(
            Plate.material_prefix == material.plaatcode_prefix
        ).count()
    
    return materials


@router.post("/materials", response_model=MaterialResponse)
async def create_material(
    material: MaterialCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new material (admin only)"""
    check_admin(current_user)
    
    # Validate prefix is unique
    if not PlateStockService.validate_prefix_unique(db, material.plaatcode_prefix):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Prefix {material.plaatcode_prefix} is al in gebruik"
        )
    
    db_material = Material(
        plaatcode_prefix=material.plaatcode_prefix,
        materiaalgroep=material.materiaalgroep,
        specificatie=material.specificatie,
        oppervlaktebewerking=material.oppervlaktebewerking,
        kleur=material.kleur,
        created_by=current_user.id
    )
    db.add(db_material)
    db.commit()
    db.refresh(db_material)
    
    # Add plate count
    db_material.plate_count = 0
    
    return db_material


@router.put("/materials/{material_id}", response_model=MaterialResponse)
async def update_material(
    material_id: str,
    material: MaterialUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update material (admin only)"""
    check_admin(current_user)
    
    db_material = db.query(Material).filter(Material.id == material_id).first()
    if not db_material:
        raise HTTPException(status_code=404, detail="Materiaal niet gevonden")
    
    # Update fields (prefix is NOT editable if plates exist)
    update_data = material.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_material, key, value)
    
    db.commit()
    db.refresh(db_material)
    
    # Add plate count
    db_material.plate_count = db.query(Plate).filter(
        Plate.material_prefix == db_material.plaatcode_prefix
    ).count()
    
    return db_material


@router.delete("/materials/{material_id}")
async def delete_material(
    material_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete material (admin only)"""
    check_admin(current_user)
    
    db_material = db.query(Material).filter(Material.id == material_id).first()
    if not db_material:
        raise HTTPException(status_code=404, detail="Materiaal niet gevonden")
    
    # Check if any plates use this material
    plate_count = db.query(Plate).filter(
        Plate.material_prefix == db_material.plaatcode_prefix
    ).count()
    
    if plate_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Kan materiaal niet verwijderen: {plate_count} platen gebruiken dit materiaal"
        )
    
    db.delete(db_material)
    db.commit()
    
    return {"success": True}


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
    current_user: User = Depends(get_current_user)
):
    """Create one or more plates (admin, werkvoorbereider)"""
    check_admin_or_werkvoorbereider(current_user)

    # Verify material exists
    material = db.query(Material).filter(Material.plaatcode_prefix == plate_data.material_prefix).first()
    if not material:
        raise HTTPException(status_code=404, detail=f"Materiaal '{plate_data.material_prefix}' niet gevonden")

    created_plates = []

    for i in range(aantal):
        # Generate plate number
        plate_number = PlateStockService.generate_plate_number(db, plate_data.material_prefix)

        db_plate = Plate(
            plate_number=plate_number,
            material_prefix=plate_data.material_prefix,
            quality=plate_data.quality,
            thickness=plate_data.thickness,
            width=plate_data.width,
            length=plate_data.length,
            weight=plate_data.weight,
            location=plate_data.location,
            notes=plate_data.notes,
            barcode=plate_data.barcode,
            status='beschikbaar',
            created_by=current_user.id
        )

        db.add(db_plate)
        db.flush()  # Get ID without committing
        created_plates.append(db_plate)

    db.commit()

    # Refresh all plates
    for plate in created_plates:
        db.refresh(plate)

    return created_plates


@router.put("/plates/{plate_id}", response_model=PlateResponse)
async def update_plate(
    plate_id: str,
    plate_data: PlateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update plate (admin, werkvoorbereider)"""
    check_admin_or_werkvoorbereider(current_user)

    db_plate = db.query(Plate).filter(Plate.id == plate_id).first()
    if not db_plate:
        raise HTTPException(status_code=404, detail="Plaat niet gevonden")

    # Update fields
    update_data = plate_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_plate, field, value)

    db.commit()
    db.refresh(db_plate)

    return db_plate


@router.delete("/plates/{plate_id}")
async def delete_plate(
    plate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete plate (admin only)"""
    check_admin(current_user)

    db_plate = db.query(Plate).filter(Plate.id == plate_id).first()
    if not db_plate:
        raise HTTPException(status_code=404, detail="Plaat niet gevonden")

    # Check for active claims
    active_claims = db.query(Claim).filter(
        and_(Claim.plate_id == plate_id, Claim.actief == True)
    ).count()

    if active_claims > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Kan plaat niet verwijderen: {active_claims} actieve claims"
        )

    db.delete(db_plate)
    db.commit()

    return {"success": True, "message": "Plaat verwijderd"}


@router.post("/plates/{plate_id}/naar-laser", response_model=PlateResponse)
async def move_plate_to_laser(
    plate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Move plate to laser station (admin, werkvoorbereider, werkplaats)"""
    check_laser_access(current_user)

    db_plate = db.query(Plate).filter(Plate.id == plate_id).first()
    if not db_plate:
        raise HTTPException(status_code=404, detail="Plaat niet gevonden")

    if db_plate.is_consumed:
        raise HTTPException(status_code=400, detail="Plaat is al geconsumeerd")

    PlateStockService.move_plate_to_laser(db, db_plate)

    db.refresh(db_plate)
    return db_plate


@router.post("/plates/{plate_id}/van-laser", response_model=PlateResponse)
async def move_plate_from_laser(
    plate_id: str,
    request: VanLaserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return plate from laser (admin, werkvoorbereider, werkplaats)"""
    check_laser_access(current_user)

    db_plate = db.query(Plate).filter(Plate.id == plate_id).first()
    if not db_plate:
        raise HTTPException(status_code=404, detail="Plaat niet gevonden")

    if db_plate.status != 'bij_laser':
        raise HTTPException(status_code=400, detail="Plaat staat niet bij laser")

    PlateStockService.move_plate_from_laser(db, db_plate, request.new_location)

    db.refresh(db_plate)
    return db_plate


@router.post("/plates/{plate_id}/process-remnant", response_model=RemnantResponse)
async def process_remnant(
    plate_id: str,
    request: RemnantRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Process remnant from laser-cut plate (admin, werkvoorbereider, werkplaats)"""
    check_laser_access(current_user)

    # Get original plate
    original_plate = db.query(Plate).filter(Plate.id == plate_id).first()
    if not original_plate:
        raise HTTPException(status_code=404, detail="Plaat niet gevonden")

    # Validate plate is bij_laser
    if original_plate.status != 'bij_laser':
        raise HTTPException(status_code=400, detail="Plaat staat niet bij laser")

    # Validate plate not already consumed
    if original_plate.is_consumed:
        raise HTTPException(status_code=400, detail="Plaat is al geconsumeerd")

    # Validate remnant dimensions are smaller than original
    if request.new_width >= original_plate.width:
        raise HTTPException(
            status_code=400,
            detail=f"Nieuwe breedte ({request.new_width}mm) moet kleiner zijn dan origineel ({original_plate.width}mm)"
        )

    if request.new_length >= original_plate.length:
        raise HTTPException(
            status_code=400,
            detail=f"Nieuwe lengte ({request.new_length}mm) moet kleiner zijn dan origineel ({original_plate.length}mm)"
        )

    try:
        # Start transaction
        # 1. Mark original plate as consumed
        PlateStockService.consume_plate(db, original_plate, str(current_user.id))

        # 2. Generate new plate number for remnant
        remnant_plate_number = PlateStockService.generate_plate_number(db, original_plate.material_prefix)

        # 3. Calculate remnant weight (proportional to area)
        if original_plate.weight:
            original_area = original_plate.width * original_plate.length
            remnant_area = request.new_width * request.new_length
            area_ratio = remnant_area / original_area
            remnant_weight = float(original_plate.weight) * area_ratio
        else:
            remnant_weight = None

        # 4. Create remnant plate
        remnant_plate = Plate(
            plate_number=remnant_plate_number,
            material_prefix=original_plate.material_prefix,
            quality=original_plate.quality,
            thickness=original_plate.thickness,
            width=request.new_width,
            length=request.new_length,
            weight=remnant_weight,
            location=request.new_location,
            notes=f"Restant van {original_plate.plate_number}. {request.notes or ''}".strip(),
            barcode=None,  # New barcode will be generated if needed
            status='beschikbaar',
            created_by=current_user.id
        )

        db.add(remnant_plate)
        db.flush()  # Get ID without committing

        # Commit transaction
        db.commit()

        # Refresh both plates to get updated data
        db.refresh(original_plate)
        db.refresh(remnant_plate)

        # Return both plates
        return RemnantResponse(
            original_plate=original_plate,
            remnant_plate=remnant_plate
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Fout bij verwerken restant: {str(e)}")


@router.post("/plates/{plate_id}/consume", response_model=PlateResponse)
async def consume_plate(
    plate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark plate as consumed (admin, werkvoorbereider)"""
    check_admin_or_werkvoorbereider(current_user)

    db_plate = db.query(Plate).filter(Plate.id == plate_id).first()
    if not db_plate:
        raise HTTPException(status_code=404, detail="Plaat niet gevonden")

    if db_plate.is_consumed:
        raise HTTPException(status_code=400, detail="Plaat is al geconsumeerd")

    PlateStockService.consume_plate(db, db_plate, str(current_user.id))

    db.refresh(db_plate)
    return db_plate


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
    current_user: User = Depends(get_current_user)
):
    """Create claim on plate (admin, werkvoorbereider)"""
    check_admin_or_werkvoorbereider(current_user)

    # Verify plate exists
    plate = db.query(Plate).filter(Plate.id == claim_data.plate_id).first()
    if not plate:
        raise HTTPException(status_code=404, detail="Plaat niet gevonden")

    if plate.is_consumed:
        raise HTTPException(status_code=400, detail="Kan geen claim maken op geconsumeerde plaat")

    # Create claim
    db_claim = Claim(
        plate_id=claim_data.plate_id,
        project_naam=claim_data.project_naam,
        project_fase=claim_data.project_fase,
        m2_geclaimd=claim_data.m2_geclaimd,
        notes=claim_data.notes,
        actief=True,
        claimed_by=current_user.id
    )

    db.add(db_claim)
    db.commit()

    # Update plate status
    PlateStockService.update_plate_status(db, plate)

    db.refresh(db_claim)
    return db_claim


@router.post("/claims/bulk", response_model=BulkClaimResponse)
async def create_bulk_claims(
    bulk_data: ClaimBulkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Bulk claim multiple plates (admin, werkvoorbereider)"""
    check_admin_or_werkvoorbereider(current_user)

    created_claims = []
    total_m2 = 0

    for plate_id in bulk_data.plate_ids:
        # Verify plate exists
        plate = db.query(Plate).filter(Plate.id == plate_id).first()
        if not plate or plate.is_consumed:
            continue

        # Create claim
        db_claim = Claim(
            plate_id=plate_id,
            project_naam=bulk_data.project_naam,
            project_fase=bulk_data.project_fase,
            actief=True,
            claimed_by=current_user.id
        )

        db.add(db_claim)
        db.flush()

        created_claims.append(db_claim)

        # Calculate m²
        total_m2 += float(PlateStockService.calculate_plate_area(plate))

        # Update plate status
        PlateStockService.update_plate_status(db, plate)

    db.commit()

    # Refresh claims
    for claim in created_claims:
        db.refresh(claim)

    return BulkClaimResponse(
        claims=created_claims,
        total_m2=total_m2
    )


@router.put("/claims/{claim_id}", response_model=ClaimResponse)
async def update_claim(
    claim_id: str,
    claim_data: ClaimUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update claim (admin, werkvoorbereider)"""
    check_admin_or_werkvoorbereider(current_user)

    db_claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not db_claim:
        raise HTTPException(status_code=404, detail="Claim niet gevonden")

    # Update fields
    update_data = claim_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_claim, field, value)

    db.commit()
    db.refresh(db_claim)

    return db_claim


@router.delete("/claims/{claim_id}")
async def release_claim(
    claim_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Release claim (sets actief=false) (admin, werkvoorbereider)"""
    check_admin_or_werkvoorbereider(current_user)

    db_claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not db_claim:
        raise HTTPException(status_code=404, detail="Claim niet gevonden")

    db_claim.actief = False
    db.commit()

    # Update plate status
    plate = db.query(Plate).filter(Plate.id == db_claim.plate_id).first()
    if plate:
        PlateStockService.update_plate_status(db, plate)

    return {"success": True, "message": "Claim vrijgegeven"}


@router.post("/claims/release-by-project", response_model=ReleaseByProjectResponse)
async def release_claims_by_project(
    request: ReleaseByProjectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Release all claims for a project/fase (admin, werkvoorbereider)"""
    check_admin_or_werkvoorbereider(current_user)

    # Find all active claims for this project/fase
    claims = db.query(Claim).filter(
        and_(
            Claim.project_naam == request.project_naam,
            Claim.project_fase == request.project_fase,
            Claim.actief == True
        )
    ).all()

    plate_ids = set()
    for claim in claims:
        claim.actief = False
        plate_ids.add(claim.plate_id)

    db.commit()

    # Update plate statuses
    plates_freed = 0
    for plate_id in plate_ids:
        plate = db.query(Plate).filter(Plate.id == plate_id).first()
        if plate:
            PlateStockService.update_plate_status(db, plate)
            if plate.status == 'beschikbaar':
                plates_freed += 1

    return ReleaseByProjectResponse(
        claims_released=len(claims),
        plates_freed=plates_freed
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
