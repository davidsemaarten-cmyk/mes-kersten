"""
PlateStock Service
Business logic for PlateStock module

TRANSACTION PATTERN:
- All service methods own their database transactions
- Service methods call db.commit() on success
- Service methods call db.rollback() on exception
- Service methods raise custom ServiceError exceptions
- API layer converts ServiceError to HTTPException
"""

from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime
from typing import List, Dict, Any, Optional
from decimal import Decimal
from uuid import UUID
import time

from models.material import Material
from models.plate import Plate
from models.claim import Claim
from services.exceptions import (
    PlateNotFoundError,
    MaterialNotFoundError,
    ClaimNotFoundError,
    PlateHasActiveClaimsException,
    PlateAlreadyConsumedException,
    PlateNotAtLaserException,
    MaterialHasPlatesException,
    MaterialPrefixNotUniqueException,
    InvalidRemnantDimensionsException,
    PlateNumberGenerationException,
    ClaimOnConsumedPlateException
)
from utils.audit import log_action, AuditAction, EntityType


class PlateStockService:
    """Business logic for PlateStock operations"""

    # ============================================================
    # MATERIAL OPERATIONS
    # ============================================================

    @staticmethod
    def generate_prefix_suggestion(
        materiaalgroep: str,
        specificatie: str | None,
        oppervlaktebewerking: str
    ) -> str:
        """
        Generate prefix suggestion from material properties

        Pattern: GROEP + SPEC + FIRST_2_LETTERS_OF_OPPERVLAKTE

        Examples:
        - S235 + NULL + "gestraald" -> "S235GE"
        - RVS + "316" + "geslepen" -> "RVS316GL"
        - Aluminium + "5083" + "naturel" -> "ALU5083NA"
        """
        parts = []

        # Handle special materiaalgroep names
        if materiaalgroep.lower() == "aluminium":
            parts.append("ALU")
        else:
            parts.append(materiaalgroep.upper())

        # Add specificatie if exists
        if specificatie:
            parts.append(specificatie.upper())

        # Add first 2 letters of oppervlaktebewerking
        if len(oppervlaktebewerking) >= 2:
            parts.append(oppervlaktebewerking[:2].upper())
        elif len(oppervlaktebewerking) == 1:
            parts.append(oppervlaktebewerking[0].upper())

        suggestion = "".join(parts)

        # Ensure max 10 characters
        return suggestion[:10]

    @staticmethod
    def validate_prefix_unique(db: Session, prefix: str) -> bool:
        """Check if prefix is unique (not already in use)"""
        existing = db.query(Material).filter(
            Material.plaatcode_prefix == prefix
        ).first()
        return existing is None

    @staticmethod
    def can_edit_prefix(db: Session, current_prefix: str) -> bool:
        """Check if prefix can be edited (no plates exist with this prefix)"""
        plate_count = db.query(Plate).filter(
            Plate.material_prefix == current_prefix
        ).count()
        return plate_count == 0

    @staticmethod
    def create_material(
        db: Session,
        user_id: UUID,
        plaatcode_prefix: str,
        materiaalgroep: str,
        specificatie: Optional[str],
        oppervlaktebewerking: str,
        kleur: Optional[str]
    ) -> Material:
        """
        Create new material with audit logging

        Args:
            db: Database session
            user_id: ID of user creating material
            plaatcode_prefix: Unique prefix for plate numbers
            materiaalgroep: Material group (e.g., "S235", "RVS")
            specificatie: Material specification (optional)
            oppervlaktebewerking: Surface treatment (e.g., "gestraald")
            kleur: Color (optional)

        Returns:
            Created Material object

        Raises:
            MaterialPrefixNotUniqueException: If prefix already exists
        """
        try:
            # Validate prefix is unique
            if not PlateStockService.validate_prefix_unique(db, plaatcode_prefix):
                raise MaterialPrefixNotUniqueException(f"Prefix {plaatcode_prefix} is al in gebruik")

            # Create material
            material = Material(
                plaatcode_prefix=plaatcode_prefix,
                materiaalgroep=materiaalgroep,
                specificatie=specificatie,
                oppervlaktebewerking=oppervlaktebewerking,
                kleur=kleur,
                created_by=user_id
            )

            db.add(material)
            db.flush()  # Get ID

            # Audit log
            log_action(
                db=db,
                user_id=user_id,
                action=AuditAction.CREATE_MATERIAL,
                entity_type=EntityType.MATERIAL,
                entity_id=material.id,
                details={
                    "prefix": plaatcode_prefix,
                    "materiaalgroep": materiaalgroep,
                    "specificatie": specificatie,
                    "oppervlaktebewerking": oppervlaktebewerking
                }
            )

            db.commit()
            db.refresh(material)

            return material

        except MaterialPrefixNotUniqueException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise

    @staticmethod
    def update_material(
        db: Session,
        user_id: UUID,
        material_id: UUID,
        update_data: Dict[str, Any]
    ) -> Material:
        """
        Update material with audit logging

        Args:
            db: Database session
            user_id: ID of user updating material
            material_id: ID of material to update
            update_data: Dictionary of fields to update

        Returns:
            Updated Material object

        Raises:
            MaterialNotFoundError: If material doesn't exist
        """
        try:
            material = db.query(Material).filter(Material.id == material_id).first()
            if not material:
                raise MaterialNotFoundError(f"Materiaal {material_id} niet gevonden")

            # Apply updates
            for key, value in update_data.items():
                setattr(material, key, value)

            db.flush()

            # Audit log
            log_action(
                db=db,
                user_id=user_id,
                action=AuditAction.UPDATE_MATERIAL,
                entity_type=EntityType.MATERIAL,
                entity_id=material.id,
                details={"updated_fields": list(update_data.keys())}
            )

            db.commit()
            db.refresh(material)

            return material

        except MaterialNotFoundError:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise

    @staticmethod
    def delete_material(
        db: Session,
        user_id: UUID,
        material_id: UUID
    ) -> None:
        """
        Delete material with validation and audit logging

        Args:
            db: Database session
            user_id: ID of user deleting material
            material_id: ID of material to delete

        Raises:
            MaterialNotFoundError: If material doesn't exist
            MaterialHasPlatesException: If material has plates
        """
        try:
            material = db.query(Material).filter(Material.id == material_id).first()
            if not material:
                raise MaterialNotFoundError(f"Materiaal {material_id} niet gevonden")

            # Check if any plates use this material
            plate_count = db.query(Plate).filter(
                Plate.material_prefix == material.plaatcode_prefix
            ).count()

            if plate_count > 0:
                raise MaterialHasPlatesException(
                    f"Kan materiaal niet verwijderen: {plate_count} platen gebruiken prefix '{material.plaatcode_prefix}'"
                )

            # Audit log before deletion
            log_action(
                db=db,
                user_id=user_id,
                action=AuditAction.DELETE_MATERIAL,
                entity_type=EntityType.MATERIAL,
                entity_id=material.id,
                details={"prefix": material.plaatcode_prefix}
            )

            db.delete(material)
            db.commit()

        except (MaterialNotFoundError, MaterialHasPlatesException):
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise

    # ============================================================
    # PLATE OPERATIONS
    # ============================================================

    @staticmethod
    def generate_plate_number(db: Session, material_prefix: str, max_attempts: int = 100) -> str:
        """
        Generate next unique plate number for material.

        CRITICAL: Always checks if number exists before returning.
        Prevents duplicate key errors when adding multiple plates.

        Process:
        1. Query highest existing number for prefix
        2. Calculate next number (highest + 1)
        3. Generate candidate: PREFIX-XXX
        4. CHECK if candidate already exists in database
        5. If exists: increment and retry (up to max_attempts)
        6. If not exists: return candidate

        Args:
            db: Database session
            material_prefix: Material prefix (e.g., "S235GE")
            max_attempts: Max retry attempts

        Returns:
            Unique plate number (e.g., "S235GE-042")

        Raises:
            ValueError: If cannot generate unique number after max_attempts
        """
        attempts = 0

        while attempts < max_attempts:
            # Find highest number for this prefix
            highest_plate = db.query(Plate).filter(
                Plate.material_prefix == material_prefix
            ).order_by(Plate.plate_number.desc()).first()

            # Calculate next number
            if not highest_plate:
                next_num = 1
            else:
                # Extract number from "PREFIX-042" � 42
                try:
                    last_number = int(highest_plate.plate_number.split('-')[-1])
                    next_num = last_number + 1
                except (ValueError, IndexError):
                    # Fallback if plate_number format is unexpected
                    next_num = 1

            # Generate candidate
            candidate = f"{material_prefix}-{next_num:03d}"

            # CRITICAL: Check if exists
            existing = db.query(Plate).filter(
                Plate.plate_number == candidate
            ).first()

            if not existing:
                return candidate

            # If exists, increment and retry
            attempts += 1
            time.sleep(0.01)  # Small delay for concurrent operations

        raise PlateNumberGenerationException(
            prefix=material_prefix,
            max_attempts=max_attempts
        )

    @staticmethod
    def calculate_plate_area(plate: Plate) -> Decimal:
        """
        Calculate plate area in m�

        Args:
            plate: Plate object with width and length in mm

        Returns:
            Area in m� as Decimal
        """
        # Convert mm� to m�
        area_mm2 = plate.width * plate.length
        area_m2 = Decimal(area_mm2) / Decimal(1_000_000)
        return area_m2

    @staticmethod
    def update_plate_status(db: Session, plate: Plate) -> None:
        """
        Update plate status based on claims

        NOTE: This is an internal helper method that does NOT commit.
        It's called from other service methods that manage their own transactions.

        Logic:
        - If plate has active claims: status = 'geclaimd'
        - If plate at laser: status = 'bij_laser' (unchanged)
        - If no active claims: status = 'beschikbaar'

        Args:
            db: Database session
            plate: Plate to update
        """
        # Don't change status if at laser (system-managed)
        if plate.status == 'bij_laser':
            return

        # Check for active claims
        active_claims = db.query(Claim).filter(
            and_(
                Claim.plate_id == plate.id,
                Claim.actief == True
            )
        ).count()

        if active_claims > 0:
            plate.status = 'geclaimd'
        else:
            plate.status = 'beschikbaar'

        # NOTE: Does NOT commit - caller owns transaction

    @staticmethod
    def create_plates(
        db: Session,
        user_id: UUID,
        material_prefix: str,
        quality: str,
        thickness: float,
        width: int,
        length: int,
        weight: Optional[float],
        location: str,
        notes: Optional[str],
        barcode: Optional[str],
        heatnummer: Optional[str],
        aantal: int = 1
    ) -> List[Plate]:
        """
        Create one or more plates with audit logging

        Args:
            db: Database session
            user_id: ID of user creating plates
            material_prefix: Material prefix for plate numbers
            quality: Material quality (e.g., "3.1")
            thickness: Plate thickness in mm
            width: Plate width in mm
            length: Plate length in mm
            weight: Plate weight in kg (optional)
            location: Storage location
            notes: Additional notes (optional)
            barcode: Barcode (optional)
            heatnummer: Heat number (optional)
            aantal: Number of plates to create

        Returns:
            List of created Plate objects

        Raises:
            MaterialNotFoundError: If material doesn't exist
            PlateNumberGenerationException: If can't generate unique numbers
        """
        try:
            # Verify material exists
            material = db.query(Material).filter(
                Material.plaatcode_prefix == material_prefix
            ).first()
            if not material:
                raise MaterialNotFoundError(f"Materiaal met prefix '{material_prefix}' niet gevonden")

            created_plates = []

            for i in range(aantal):
                # Generate unique plate number
                plate_number = PlateStockService.generate_plate_number(db, material_prefix)

                plate = Plate(
                    plate_number=plate_number,
                    material_prefix=material_prefix,
                    quality=quality,
                    thickness=thickness,
                    width=width,
                    length=length,
                    weight=weight,
                    location=location,
                    notes=notes,
                    barcode=barcode,
                    heatnummer=heatnummer,
                    status='beschikbaar',
                    created_by=user_id
                )

                db.add(plate)
                db.flush()  # Get ID

                # Audit log for each plate
                log_action(
                    db=db,
                    user_id=user_id,
                    action=AuditAction.CREATE_PLATE,
                    entity_type=EntityType.PLATE,
                    entity_id=plate.id,
                    details={
                        "plate_number": plate_number,
                        "material_prefix": material_prefix,
                        "dimensions": f"{width}x{length}x{thickness}mm",
                        "location": location
                    }
                )

                created_plates.append(plate)

            db.commit()

            # Refresh all plates
            for plate in created_plates:
                db.refresh(plate)

            return created_plates

        except (MaterialNotFoundError, PlateNumberGenerationException):
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise

    @staticmethod
    def update_plate(
        db: Session,
        user_id: UUID,
        plate_id: UUID,
        update_data: Dict[str, Any]
    ) -> Plate:
        """
        Update plate with audit logging

        Args:
            db: Database session
            user_id: ID of user updating plate
            plate_id: ID of plate to update
            update_data: Dictionary of fields to update

        Returns:
            Updated Plate object

        Raises:
            PlateNotFoundError: If plate doesn't exist
        """
        try:
            plate = db.query(Plate).filter(Plate.id == plate_id).first()
            if not plate:
                raise PlateNotFoundError(f"Plate {plate_id} not found")

            # Apply updates
            for key, value in update_data.items():
                setattr(plate, key, value)

            db.flush()

            # Audit log
            log_action(
                db=db,
                user_id=user_id,
                action=AuditAction.UPDATE_PLATE,
                entity_type=EntityType.PLATE,
                entity_id=plate.id,
                details={"updated_fields": list(update_data.keys())}
            )

            db.commit()
            db.refresh(plate)

            return plate

        except PlateNotFoundError:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise

    @staticmethod
    def delete_plate(
        db: Session,
        user_id: UUID,
        plate_id: UUID
    ) -> None:
        """
        Delete plate with validation and audit logging

        Args:
            db: Database session
            user_id: ID of user deleting plate
            plate_id: ID of plate to delete

        Raises:
            PlateNotFoundError: If plate doesn't exist
            PlateHasActiveClaimsException: If plate has active claims
        """
        try:
            plate = db.query(Plate).filter(Plate.id == plate_id).first()
            if not plate:
                raise PlateNotFoundError(f"Plate {plate_id} not found")

            # Check for active claims
            active_claims_count = db.query(Claim).filter(
                and_(Claim.plate_id == plate_id, Claim.actief == True)
            ).count()

            if active_claims_count > 0:
                raise PlateHasActiveClaimsException(
                    plate_id=str(plate_id),
                    active_claims_count=active_claims_count
                )

            # Audit log before deletion
            log_action(
                db=db,
                user_id=user_id,
                action=AuditAction.DELETE_PLATE,
                entity_type=EntityType.PLATE,
                entity_id=plate.id,
                details={"plate_number": plate.plate_number}
            )

            db.delete(plate)
            db.commit()

        except (PlateNotFoundError, PlateHasActiveClaimsException):
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise

    @staticmethod
    def move_plate_to_laser(
        db: Session,
        user_id: UUID,
        plate_id: UUID
    ) -> Plate:
        """
        Move plate to "Bij Laser" location with audit logging

        Sets:
        - status = 'bij_laser'
        - location = 'Bij Laser'
        - bij_laser_sinds = NOW()

        Args:
            db: Database session
            user_id: ID of user moving plate
            plate_id: ID of plate to move

        Returns:
            Updated Plate object

        Raises:
            PlateNotFoundError: If plate doesn't exist
            PlateAlreadyConsumedException: If plate is already consumed
        """
        try:
            plate = db.query(Plate).filter(Plate.id == plate_id).first()
            if not plate:
                raise PlateNotFoundError(f"Plate {plate_id} not found")

            if plate.is_consumed:
                raise PlateAlreadyConsumedException(
                    plate_id=str(plate_id),
                    plate_number=plate.plate_number
                )

            plate.status = 'bij_laser'
            plate.location = 'Bij Laser'
            plate.bij_laser_sinds = datetime.utcnow()

            db.flush()

            # Audit log
            log_action(
                db=db,
                user_id=user_id,
                action=AuditAction.MOVE_TO_LASER,
                entity_type=EntityType.PLATE,
                entity_id=plate.id,
                details={"plate_number": plate.plate_number}
            )

            db.commit()
            db.refresh(plate)

            return plate

        except (PlateNotFoundError, PlateAlreadyConsumedException):
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise

    @staticmethod
    def move_plate_from_laser(
        db: Session,
        user_id: UUID,
        plate_id: UUID,
        new_location: str
    ) -> Plate:
        """
        Move plate back from laser to specified location with audit logging

        Sets:
        - location = new_location
        - bij_laser_sinds = NULL
        - status = determined by claims (via update_plate_status)

        Args:
            db: Database session
            user_id: ID of user moving plate
            plate_id: ID of plate to move
            new_location: Target location

        Returns:
            Updated Plate object

        Raises:
            PlateNotFoundError: If plate doesn't exist
            PlateNotAtLaserException: If plate is not at laser
        """
        try:
            plate = db.query(Plate).filter(Plate.id == plate_id).first()
            if not plate:
                raise PlateNotFoundError(f"Plate {plate_id} not found")

            if plate.status != 'bij_laser':
                raise PlateNotAtLaserException(
                    plate_id=str(plate_id),
                    current_status=plate.status
                )

            plate.location = new_location
            plate.bij_laser_sinds = None
            plate.status = 'beschikbaar'

            # Update status based on claims (doesn't commit)
            PlateStockService.update_plate_status(db, plate)

            db.flush()

            # Audit log
            log_action(
                db=db,
                user_id=user_id,
                action=AuditAction.MOVE_FROM_LASER,
                entity_type=EntityType.PLATE,
                entity_id=plate.id,
                details={
                    "plate_number": plate.plate_number,
                    "new_location": new_location
                }
            )

            db.commit()
            db.refresh(plate)

            return plate

        except (PlateNotFoundError, PlateNotAtLaserException):
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise

    @staticmethod
    def consume_plate(
        db: Session,
        user_id: UUID,
        plate_id: UUID
    ) -> Plate:
        """
        Mark plate as consumed with audit logging

        Actions:
        1. Release all active claims
        2. Set is_consumed = True
        3. Set consumed_at = NOW()
        4. Set consumed_by = user_id

        Args:
            db: Database session
            user_id: ID of user consuming plate
            plate_id: ID of plate to consume

        Returns:
            Updated Plate object

        Raises:
            PlateNotFoundError: If plate doesn't exist
            PlateAlreadyConsumedException: If plate is already consumed
        """
        try:
            plate = db.query(Plate).filter(Plate.id == plate_id).first()
            if not plate:
                raise PlateNotFoundError(f"Plate {plate_id} not found")

            if plate.is_consumed:
                raise PlateAlreadyConsumedException(
                    plate_id=str(plate_id),
                    plate_number=plate.plate_number
                )

            # Release all active claims
            active_claims = db.query(Claim).filter(
                and_(
                    Claim.plate_id == plate.id,
                    Claim.actief == True
                )
            ).all()

            for claim in active_claims:
                claim.actief = False

            # Mark as consumed
            plate.is_consumed = True
            plate.consumed_at = datetime.utcnow()
            plate.consumed_by = user_id

            db.flush()

            # Audit log
            log_action(
                db=db,
                user_id=user_id,
                action=AuditAction.CONSUME_PLATE,
                entity_type=EntityType.PLATE,
                entity_id=plate.id,
                details={"plate_number": plate.plate_number}
            )

            db.commit()
            db.refresh(plate)

            return plate

        except (PlateNotFoundError, PlateAlreadyConsumedException):
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise

    @staticmethod
    def process_remnant(
        db: Session,
        user_id: UUID,
        original_plate_id: UUID,
        new_width: int,
        new_length: int,
        new_location: str,
        notes: Optional[str]
    ) -> Dict[str, Plate]:
        """
        Process remnant from laser-cut plate with audit logging

        Args:
            db: Database session
            user_id: ID of user processing remnant
            original_plate_id: ID of original plate being cut
            new_width: Width of remnant in mm
            new_length: Length of remnant in mm
            new_location: Location for remnant plate
            notes: Additional notes for remnant (optional)

        Returns:
            Dict with 'original_plate' and 'remnant_plate' keys

        Raises:
            PlateNotFoundError: If original plate doesn't exist
            PlateNotAtLaserException: If plate is not at laser
            PlateAlreadyConsumedException: If plate is already consumed
            InvalidRemnantDimensionsException: If remnant dimensions >= original
        """
        try:
            # Get original plate
            original_plate = db.query(Plate).filter(Plate.id == original_plate_id).first()
            if not original_plate:
                raise PlateNotFoundError(f"Plate {original_plate_id} not found")

            # Validate plate is at laser
            if original_plate.status != 'bij_laser':
                raise PlateNotAtLaserException(
                    plate_id=str(original_plate_id),
                    current_status=original_plate.status
                )

            # Validate plate not already consumed
            if original_plate.is_consumed:
                raise PlateAlreadyConsumedException(
                    plate_id=str(original_plate_id),
                    plate_number=original_plate.plate_number
                )

            # Validate remnant dimensions
            if new_width >= original_plate.width:
                raise InvalidRemnantDimensionsException(
                    field="breedte",
                    new_value=new_width,
                    original_value=original_plate.width
                )

            if new_length >= original_plate.length:
                raise InvalidRemnantDimensionsException(
                    field="lengte",
                    new_value=new_length,
                    original_value=original_plate.length
                )

            # 1. Mark original plate as consumed
            # Release all active claims
            active_claims = db.query(Claim).filter(
                and_(
                    Claim.plate_id == original_plate.id,
                    Claim.actief == True
                )
            ).all()

            for claim in active_claims:
                claim.actief = False

            original_plate.is_consumed = True
            original_plate.consumed_at = datetime.utcnow()
            original_plate.consumed_by = user_id

            # 2. Generate new plate number for remnant
            remnant_plate_number = PlateStockService.generate_plate_number(
                db, original_plate.material_prefix
            )

            # 3. Calculate remnant weight (proportional to area)
            if original_plate.weight:
                original_area = original_plate.width * original_plate.length
                remnant_area = new_width * new_length
                area_ratio = remnant_area / original_area
                remnant_weight = float(original_plate.weight) * area_ratio
            else:
                remnant_weight = None

            # 4. Create remnant plate
            remnant_notes = f"Restant van {original_plate.plate_number}. {notes or ''}".strip()
            remnant_plate = Plate(
                plate_number=remnant_plate_number,
                material_prefix=original_plate.material_prefix,
                quality=original_plate.quality,
                thickness=original_plate.thickness,
                width=new_width,
                length=new_length,
                weight=remnant_weight,
                location=new_location,
                notes=remnant_notes,
                barcode=None,
                heatnummer=original_plate.heatnummer,
                status='beschikbaar',
                created_by=user_id
            )

            db.add(remnant_plate)
            db.flush()  # Get IDs

            # Audit log for original plate consumption
            log_action(
                db=db,
                user_id=user_id,
                action=AuditAction.CONSUME_PLATE,
                entity_type=EntityType.PLATE,
                entity_id=original_plate.id,
                details={
                    "plate_number": original_plate.plate_number,
                    "reason": "remnant_processing"
                }
            )

            # Audit log for remnant creation
            log_action(
                db=db,
                user_id=user_id,
                action=AuditAction.PROCESS_REMNANT,
                entity_type=EntityType.PLATE,
                entity_id=remnant_plate.id,
                details={
                    "original_plate": original_plate.plate_number,
                    "remnant_plate": remnant_plate_number,
                    "original_dimensions": f"{original_plate.width}x{original_plate.length}mm",
                    "remnant_dimensions": f"{new_width}x{new_length}mm"
                }
            )

            db.commit()

            # Refresh both plates
            db.refresh(original_plate)
            db.refresh(remnant_plate)

            return {
                "original_plate": original_plate,
                "remnant_plate": remnant_plate
            }

        except (
            PlateNotFoundError,
            PlateNotAtLaserException,
            PlateAlreadyConsumedException,
            InvalidRemnantDimensionsException,
            PlateNumberGenerationException
        ):
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise

    # ============================================================
    # CLAIM OPERATIONS
    # ============================================================

    @staticmethod
    def create_claim(
        db: Session,
        user_id: UUID,
        plate_id: UUID,
        project_naam: str,
        project_fase: str,
        m2_geclaimd: Optional[Decimal],
        notes: Optional[str]
    ) -> Claim:
        """
        Create claim on plate with audit logging

        Args:
            db: Database session
            user_id: ID of user creating claim
            plate_id: ID of plate to claim
            project_naam: Project name
            project_fase: Project phase
            m2_geclaimd: Area claimed in m2 (optional)
            notes: Additional notes (optional)

        Returns:
            Created Claim object

        Raises:
            PlateNotFoundError: If plate doesn't exist
            ClaimOnConsumedPlateException: If plate is consumed
        """
        try:
            # Verify plate exists
            plate = db.query(Plate).filter(Plate.id == plate_id).first()
            if not plate:
                raise PlateNotFoundError(f"Plate {plate_id} not found")

            if plate.is_consumed:
                raise ClaimOnConsumedPlateException(
                    f"Kan geen claim maken op geconsumeerde plaat {plate.plate_number}"
                )

            # Create claim
            claim = Claim(
                plate_id=plate_id,
                project_naam=project_naam,
                project_fase=project_fase,
                m2_geclaimd=m2_geclaimd,
                notes=notes,
                actief=True,
                claimed_by=user_id
            )

            db.add(claim)
            db.flush()  # Get ID

            # Update plate status (doesn't commit)
            PlateStockService.update_plate_status(db, plate)

            # Audit log
            log_action(
                db=db,
                user_id=user_id,
                action=AuditAction.CREATE_CLAIM,
                entity_type=EntityType.CLAIM,
                entity_id=claim.id,
                details={
                    "plate_number": plate.plate_number,
                    "project": f"{project_naam} - {project_fase}"
                }
            )

            db.commit()
            db.refresh(claim)

            return claim

        except (PlateNotFoundError, ClaimOnConsumedPlateException):
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise

    @staticmethod
    def update_claim(
        db: Session,
        user_id: UUID,
        claim_id: UUID,
        update_data: Dict[str, Any]
    ) -> Claim:
        """
        Update claim with audit logging

        Args:
            db: Database session
            user_id: ID of user updating claim
            claim_id: ID of claim to update
            update_data: Dictionary of fields to update

        Returns:
            Updated Claim object

        Raises:
            ClaimNotFoundError: If claim doesn't exist
        """
        try:
            claim = db.query(Claim).filter(Claim.id == claim_id).first()
            if not claim:
                raise ClaimNotFoundError(f"Claim {claim_id} not found")

            # Apply updates
            for key, value in update_data.items():
                setattr(claim, key, value)

            db.flush()

            # Audit log
            log_action(
                db=db,
                user_id=user_id,
                action=AuditAction.UPDATE_PLATE,  # Reusing for now
                entity_type=EntityType.CLAIM,
                entity_id=claim.id,
                details={"updated_fields": list(update_data.keys())}
            )

            db.commit()
            db.refresh(claim)

            return claim

        except ClaimNotFoundError:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise

    @staticmethod
    def release_claim(
        db: Session,
        user_id: UUID,
        claim_id: UUID
    ) -> None:
        """
        Release claim (set actief=False) with audit logging

        Args:
            db: Database session
            user_id: ID of user releasing claim
            claim_id: ID of claim to release

        Raises:
            ClaimNotFoundError: If claim doesn't exist
        """
        try:
            claim = db.query(Claim).filter(Claim.id == claim_id).first()
            if not claim:
                raise ClaimNotFoundError(f"Claim {claim_id} not found")

            claim.actief = False
            db.flush()

            # Update plate status (doesn't commit)
            plate = db.query(Plate).filter(Plate.id == claim.plate_id).first()
            if plate:
                PlateStockService.update_plate_status(db, plate)

            # Audit log
            log_action(
                db=db,
                user_id=user_id,
                action=AuditAction.RELEASE_CLAIM,
                entity_type=EntityType.CLAIM,
                entity_id=claim.id,
                details={
                    "project": f"{claim.project_naam} - {claim.project_fase}"
                }
            )

            db.commit()

        except ClaimNotFoundError:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise

    @staticmethod
    def create_bulk_claims(
        db: Session,
        user_id: UUID,
        plate_ids: List[UUID],
        project_naam: str,
        project_fase: str
    ) -> List[Claim]:
        """
        Create bulk claims on multiple plates with audit logging

        Args:
            db: Database session
            user_id: ID of user creating claims
            plate_ids: List of plate IDs to claim
            project_naam: Project name
            project_fase: Project phase

        Returns:
            List of created Claim objects
        """
        try:
            created_claims = []

            for plate_id in plate_ids:
                # Verify plate exists and not consumed
                plate = db.query(Plate).filter(Plate.id == plate_id).first()
                if not plate or plate.is_consumed:
                    continue  # Skip invalid/consumed plates

                # Create claim
                claim = Claim(
                    plate_id=plate_id,
                    project_naam=project_naam,
                    project_fase=project_fase,
                    actief=True,
                    claimed_by=user_id
                )

                db.add(claim)
                db.flush()  # Get ID

                created_claims.append(claim)

                # Update plate status (doesn't commit)
                PlateStockService.update_plate_status(db, plate)

            # Single audit log for bulk operation
            log_action(
                db=db,
                user_id=user_id,
                action=AuditAction.BULK_CLAIM,
                entity_type=EntityType.CLAIM,
                entity_id=None,
                details={
                    "project": f"{project_naam} - {project_fase}",
                    "plates_claimed": len(created_claims),
                    "plate_ids": [str(c.plate_id) for c in created_claims]
                }
            )

            db.commit()

            # Refresh claims
            for claim in created_claims:
                db.refresh(claim)

            return created_claims

        except Exception as e:
            db.rollback()
            raise

    @staticmethod
    def release_claims_by_project(
        db: Session,
        user_id: UUID,
        project_naam: str,
        project_fase: str
    ) -> Dict[str, int]:
        """
        Release all claims for a project/fase with audit logging

        Args:
            db: Database session
            user_id: ID of user releasing claims
            project_naam: Project name
            project_fase: Project phase

        Returns:
            Dict with 'claims_released' and 'plates_freed' counts
        """
        try:
            # Find all active claims for this project/fase
            claims = db.query(Claim).filter(
                and_(
                    Claim.project_naam == project_naam,
                    Claim.project_fase == project_fase,
                    Claim.actief == True
                )
            ).all()

            plate_ids = set()
            for claim in claims:
                claim.actief = False
                plate_ids.add(claim.plate_id)

            db.flush()

            # Update plate statuses
            plates_freed = 0
            for plate_id in plate_ids:
                plate = db.query(Plate).filter(Plate.id == plate_id).first()
                if plate:
                    PlateStockService.update_plate_status(db, plate)
                    if plate.status == 'beschikbaar':
                        plates_freed += 1

            # Audit log
            log_action(
                db=db,
                user_id=user_id,
                action=AuditAction.RELEASE_BY_PROJECT,
                entity_type=EntityType.CLAIM,
                entity_id=None,
                details={
                    "project": f"{project_naam} - {project_fase}",
                    "claims_released": len(claims),
                    "plates_freed": plates_freed
                }
            )

            db.commit()

            return {
                "claims_released": len(claims),
                "plates_freed": plates_freed
            }

        except Exception as e:
            db.rollback()
            raise

    # ============================================================
    # STATISTICS OPERATIONS
    # ============================================================

    @staticmethod
    def get_inventory_stats(db: Session) -> Dict[str, Any]:
        """
        Get inventory overview statistics

        Returns:
            Dict with inventory stats:
            - total_plates: Total number of plates
            - total_m2: Total area in m�
            - claimed_plates: Number of claimed plates
            - claimed_m2: Claimed area in m�
            - available_plates: Number of available plates
            - available_m2: Available area in m�
            - by_material: List of stats per material
            - by_location: List of stats per location
        """
        # Get all non-consumed plates
        plates = db.query(Plate).filter(Plate.is_consumed == False).all()

        total_plates = len(plates)
        total_m2 = sum(float(PlateStockService.calculate_plate_area(p)) for p in plates)

        # Claimed vs available
        claimed_plates = [p for p in plates if p.status == 'geclaimd' or p.status == 'bij_laser']
        available_plates = [p for p in plates if p.status == 'beschikbaar']

        claimed_m2 = sum(float(PlateStockService.calculate_plate_area(p)) for p in claimed_plates)
        available_m2 = sum(float(PlateStockService.calculate_plate_area(p)) for p in available_plates)

        # By material
        by_material = {}
        for plate in plates:
            prefix = plate.material_prefix
            if prefix not in by_material:
                by_material[prefix] = {'count': 0, 'm2': 0.0}
            by_material[prefix]['count'] += 1
            by_material[prefix]['m2'] += float(PlateStockService.calculate_plate_area(plate))

        by_material_list = [
            {'material': k, 'count': v['count'], 'm2': v['m2']}
            for k, v in by_material.items()
        ]

        # By location
        by_location = {}
        for plate in plates:
            loc = plate.location or 'Onbekend'
            if loc not in by_location:
                by_location[loc] = 0
            by_location[loc] += 1

        by_location_list = [
            {'location': k, 'count': v}
            for k, v in by_location.items()
        ]

        return {
            'total_plates': total_plates,
            'total_m2': total_m2,
            'claimed_plates': len(claimed_plates),
            'claimed_m2': claimed_m2,
            'available_plates': len(available_plates),
            'available_m2': available_m2,
            'by_material': by_material_list,
            'by_location': by_location_list
        }

    @staticmethod
    def get_project_stats(db: Session) -> Dict[str, Any]:
        """
        Get project statistics

        Returns:
            Dict with project stats:
            - active_projects: Number of unique projects
            - total_claimed_m2: Total claimed area
            - projects: List of project details
        """
        from sqlalchemy.orm import joinedload

        # Get all active claims with plate data (eager loaded to prevent N+1 queries)
        active_claims = db.query(Claim).options(
            joinedload(Claim.plate)
        ).filter(Claim.actief == True).all()

        # Group by project
        projects = {}
        for claim in active_claims:
            key = f"{claim.project_naam}_{claim.project_fase}"

            if key not in projects:
                projects[key] = {
                    'project_naam': claim.project_naam,
                    'fase': claim.project_fase,
                    'plates': 0,
                    'm2': 0.0
                }

            projects[key]['plates'] += 1

            # Calculate m� (use m2_geclaimd if specified, otherwise full plate area)
            if claim.m2_geclaimd:
                projects[key]['m2'] += float(claim.m2_geclaimd)
            else:
                # Use eager-loaded plate relationship (no additional query)
                if claim.plate:
                    projects[key]['m2'] += float(PlateStockService.calculate_plate_area(claim.plate))

        project_list = list(projects.values())
        total_claimed_m2 = sum(p['m2'] for p in project_list)

        return {
            'active_projects': len(project_list),
            'total_claimed_m2': total_claimed_m2,
            'projects': project_list
        }
