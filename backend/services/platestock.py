"""
PlateStock Service
Business logic for PlateStock module
"""

from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime
from typing import List, Dict, Any
from decimal import Decimal
import time

from models.material import Material
from models.plate import Plate
from models.claim import Claim


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

        raise ValueError(f"Could not generate unique plate number after {max_attempts} attempts")

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

        db.commit()

    @staticmethod
    def move_plate_to_laser(db: Session, plate: Plate) -> None:
        """
        Move plate to "Bij Laser" location

        Sets:
        - status = 'bij_laser'
        - location = 'Bij Laser'
        - bij_laser_sinds = NOW()

        Args:
            db: Database session
            plate: Plate to move
        """
        plate.status = 'bij_laser'
        plate.location = 'Bij Laser'
        plate.bij_laser_sinds = datetime.utcnow()
        db.commit()

    @staticmethod
    def move_plate_from_laser(db: Session, plate: Plate, new_location: str) -> None:
        """
        Move plate back from laser to specified location

        Sets:
        - location = new_location
        - bij_laser_sinds = NULL
        - status = determined by claims (via update_plate_status)

        Args:
            db: Database session
            plate: Plate to move
            new_location: Target location
        """
        plate.location = new_location
        plate.bij_laser_sinds = None

        # Update status based on claims
        PlateStockService.update_plate_status(db, plate)

    @staticmethod
    def consume_plate(db: Session, plate: Plate, user_id: str) -> None:
        """
        Mark plate as consumed

        Actions:
        1. Release all active claims
        2. Set is_consumed = True
        3. Set consumed_at = NOW()
        4. Set consumed_by = user_id

        Args:
            db: Database session
            plate: Plate to consume
            user_id: ID of user consuming the plate
        """
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

        db.commit()

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
