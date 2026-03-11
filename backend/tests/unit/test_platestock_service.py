"""
Unit Tests for PlateStockService
Tests all business logic methods with comprehensive coverage
"""

import pytest
from decimal import Decimal
from datetime import datetime
from sqlalchemy.orm import Session
from services.platestock import PlateStockService
from services.exceptions import (
    MaterialNotFoundError,
    MaterialPrefixNotUniqueException,
    MaterialHasPlatesException,
    PlateNotFoundError,
    PlateHasActiveClaimsException,
    PlateAlreadyConsumedException,
    PlateNotAtLaserException,
    InvalidRemnantDimensionsException,
    PlateNumberGenerationException,
    ClaimNotFoundError,
    ClaimOnConsumedPlateException
)
from models.user import User
from models.material import Material
from models.plate import Plate
from models.claim import Claim


# ============================================================
# MATERIAL OPERATIONS TESTS
# ============================================================

@pytest.mark.unit
@pytest.mark.platestock
class TestMaterialOperations:
    """Test material-related service methods"""

    def test_generate_prefix_suggestion_basic(self):
        """Test basic prefix generation without specification"""
        result = PlateStockService.generate_prefix_suggestion(
            materiaalgroep="S235",
            specificatie=None,
            oppervlaktebewerking="gestraald"
        )
        assert result == "S235GE"

    def test_generate_prefix_suggestion_with_spec(self):
        """Test prefix generation with specification"""
        result = PlateStockService.generate_prefix_suggestion(
            materiaalgroep="RVS",
            specificatie="316",
            oppervlaktebewerking="geslepen"
        )
        assert result == "RVS316GL"

    def test_generate_prefix_suggestion_aluminium(self):
        """Test prefix generation for aluminium (special handling)"""
        result = PlateStockService.generate_prefix_suggestion(
            materiaalgroep="Aluminium",
            specificatie="5083",
            oppervlaktebewerking="naturel"
        )
        assert result == "ALU5083NA"

    def test_generate_prefix_suggestion_max_length(self):
        """Test prefix generation respects max length of 10 characters"""
        result = PlateStockService.generate_prefix_suggestion(
            materiaalgroep="VERYLONGNAME",
            specificatie="12345",
            oppervlaktebewerking="extralong"
        )
        assert len(result) <= 10
        assert result == "VERYLONGNA"

    def test_generate_prefix_suggestion_single_char_oppervlakte(self):
        """Test prefix generation with single character oppervlaktebewerking"""
        result = PlateStockService.generate_prefix_suggestion(
            materiaalgroep="S235",
            specificatie=None,
            oppervlaktebewerking="X"
        )
        assert result == "S235X"

    def test_validate_prefix_unique_true(self, test_db: Session):
        """Test prefix validation when prefix is unique"""
        is_unique = PlateStockService.validate_prefix_unique(test_db, "NEWPREFIX")
        assert is_unique is True

    def test_validate_prefix_unique_false(self, test_db: Session, test_material: Material):
        """Test prefix validation when prefix already exists"""
        is_unique = PlateStockService.validate_prefix_unique(
            test_db,
            test_material.plaatcode_prefix
        )
        assert is_unique is False

    def test_can_edit_prefix_no_plates(self, test_db: Session, test_material: Material):
        """Test prefix can be edited when no plates exist"""
        can_edit = PlateStockService.can_edit_prefix(
            test_db,
            test_material.plaatcode_prefix
        )
        assert can_edit is True

    def test_can_edit_prefix_with_plates(self, test_db: Session, test_plate: Plate):
        """Test prefix cannot be edited when plates exist"""
        can_edit = PlateStockService.can_edit_prefix(
            test_db,
            test_plate.material_prefix
        )
        assert can_edit is False

    def test_create_material_success(self, test_db: Session, admin_user: User):
        """Test successful material creation"""
        material = PlateStockService.create_material(
            db=test_db,
            user_id=admin_user.id,
            plaatcode_prefix="TEST01",
            materiaalgroep="S235",
            specificatie="JR",
            oppervlaktebewerking="gestraald",
            kleur="grijs"
        )

        assert material.plaatcode_prefix == "TEST01"
        assert material.materiaalgroep == "S235"
        assert material.specificatie == "JR"
        assert material.created_by == admin_user.id

    def test_create_material_duplicate_prefix(self, test_db: Session, admin_user: User, test_material: Material):
        """Test material creation fails with duplicate prefix"""
        with pytest.raises(MaterialPrefixNotUniqueException):
            PlateStockService.create_material(
                db=test_db,
                user_id=admin_user.id,
                plaatcode_prefix=test_material.plaatcode_prefix,
                materiaalgroep="S235",
                specificatie=None,
                oppervlaktebewerking="gestraald",
                kleur=None
            )

    def test_update_material_success(self, test_db: Session, admin_user: User, test_material: Material):
        """Test successful material update"""
        updated = PlateStockService.update_material(
            db=test_db,
            user_id=admin_user.id,
            material_id=test_material.id,
            update_data={"kleur": "blauw", "oppervlaktebewerking": "gelakt"}
        )

        assert updated.kleur == "blauw"
        assert updated.oppervlaktebewerking == "gelakt"

    def test_update_material_not_found(self, test_db: Session, admin_user: User):
        """Test material update fails when material not found"""
        import uuid

        with pytest.raises(MaterialNotFoundError):
            PlateStockService.update_material(
                db=test_db,
                user_id=admin_user.id,
                material_id=uuid.uuid4(),
                update_data={"kleur": "blauw"}
            )

    def test_delete_material_success(self, test_db: Session, admin_user: User, test_material: Material):
        """Test successful material deletion when no plates exist"""
        material_id = test_material.id

        PlateStockService.delete_material(
            db=test_db,
            user_id=admin_user.id,
            material_id=material_id
        )

        # Verify deleted
        deleted = test_db.query(Material).filter(Material.id == material_id).first()
        assert deleted is None

    def test_delete_material_with_plates(self, test_db: Session, admin_user: User, test_material: Material, test_plate: Plate):
        """Test material deletion fails when plates exist"""
        with pytest.raises(MaterialHasPlatesException):
            PlateStockService.delete_material(
                db=test_db,
                user_id=admin_user.id,
                material_id=test_material.id
            )

    def test_delete_material_not_found(self, test_db: Session, admin_user: User):
        """Test material deletion fails when material not found"""
        import uuid

        with pytest.raises(MaterialNotFoundError):
            PlateStockService.delete_material(
                db=test_db,
                user_id=admin_user.id,
                material_id=uuid.uuid4()
            )


# ============================================================
# PLATE OPERATIONS TESTS
# ============================================================

@pytest.mark.unit
@pytest.mark.platestock
class TestPlateOperations:
    """Test plate-related service methods"""

    def test_generate_plate_number_first(self, test_db: Session, test_material: Material):
        """Test plate number generation for first plate"""
        plate_number = PlateStockService.generate_plate_number(
            test_db,
            test_material.plaatcode_prefix
        )
        assert plate_number == f"{test_material.plaatcode_prefix}-001"

    def test_generate_plate_number_increment(self, test_db: Session, test_plate: Plate):
        """Test plate number generation increments correctly"""
        plate_number = PlateStockService.generate_plate_number(
            test_db,
            test_plate.material_prefix
        )
        # test_plate is S235GE-001, so next should be -002
        assert plate_number == f"{test_plate.material_prefix}-002"

    def test_generate_plate_number_gaps(self, test_db: Session, test_material: Material, admin_user: User):
        """Test plate number generation handles gaps in sequence"""
        # Create plates with gap: 001, 003 (missing 002)
        plate1 = Plate(
            plate_number=f"{test_material.plaatcode_prefix}-001",
            material_prefix=test_material.plaatcode_prefix,
            quality="3.1",
            thickness=10.0,
            width=2000,
            length=4000,
            location="Test",
            status="beschikbaar",
            created_by=admin_user.id
        )
        plate3 = Plate(
            plate_number=f"{test_material.plaatcode_prefix}-003",
            material_prefix=test_material.plaatcode_prefix,
            quality="3.1",
            thickness=10.0,
            width=2000,
            length=4000,
            location="Test",
            status="beschikbaar",
            created_by=admin_user.id
        )
        test_db.add_all([plate1, plate3])
        test_db.commit()

        # Next number should be 004 (based on highest)
        plate_number = PlateStockService.generate_plate_number(
            test_db,
            test_material.plaatcode_prefix
        )
        assert plate_number == f"{test_material.plaatcode_prefix}-004"

    def test_generate_plate_number_collision(self, test_db: Session, test_material: Material, admin_user: User):
        """Test plate number generation handles collision (retries)"""
        # Create plate with number 001
        plate1 = Plate(
            plate_number=f"{test_material.plaatcode_prefix}-001",
            material_prefix=test_material.plaatcode_prefix,
            quality="3.1",
            thickness=10.0,
            width=2000,
            length=4000,
            location="Test",
            status="beschikbaar",
            created_by=admin_user.id
        )
        test_db.add(plate1)
        test_db.commit()

        # Generate next should be 002 (no collision)
        plate_number = PlateStockService.generate_plate_number(
            test_db,
            test_material.plaatcode_prefix
        )
        assert plate_number == f"{test_material.plaatcode_prefix}-002"

    def test_calculate_plate_area_standard(self, test_plate: Plate):
        """Test plate area calculation for standard plate"""
        area = PlateStockService.calculate_plate_area(test_plate)
        # 2000mm * 4000mm = 8,000,000 mm² = 8 m²
        assert area == Decimal("8.0")

    def test_calculate_plate_area_small(self, test_db: Session, test_material: Material, admin_user: User):
        """Test plate area calculation for small plate"""
        small_plate = Plate(
            plate_number=f"{test_material.plaatcode_prefix}-099",
            material_prefix=test_material.plaatcode_prefix,
            quality="3.1",
            thickness=5.0,
            width=100,
            length=200,
            location="Test",
            status="beschikbaar",
            created_by=admin_user.id
        )
        test_db.add(small_plate)
        test_db.commit()

        area = PlateStockService.calculate_plate_area(small_plate)
        # 100mm * 200mm = 20,000 mm² = 0.02 m²
        assert area == Decimal("0.02")

    def test_update_plate_status_claimed(self, test_db: Session, test_plate: Plate, werkvoorbereider_user: User):
        """Test plate status updates to geclaimd when claim added"""
        # Create claim
        claim = Claim(
            plate_id=test_plate.id,
            project_naam="Test Project",
            project_fase="001",
            is_active=True,
            claimed_by=werkvoorbereider_user.id
        )
        test_db.add(claim)
        test_db.flush()

        # Update status
        PlateStockService.update_plate_status(test_db, test_plate)

        assert test_plate.status == "geclaimd"

    def test_update_plate_status_available(self, test_db: Session, test_plate: Plate):
        """Test plate status updates to beschikbaar when no claims"""
        test_plate.status = "geclaimd"
        test_db.flush()

        PlateStockService.update_plate_status(test_db, test_plate)

        assert test_plate.status == "beschikbaar"

    def test_update_plate_status_bij_laser_guard(self, test_db: Session, test_plate_at_laser: Plate):
        """Test plate status is not changed when at laser"""
        original_status = test_plate_at_laser.status
        assert original_status == "bij_laser"

        PlateStockService.update_plate_status(test_db, test_plate_at_laser)

        # Status should remain bij_laser
        assert test_plate_at_laser.status == "bij_laser"

    def test_create_plates_single(self, test_db: Session, admin_user: User, test_material: Material):
        """Test creating single plate"""
        plates = PlateStockService.create_plates(
            db=test_db,
            user_id=admin_user.id,
            material_prefix=test_material.plaatcode_prefix,
            quality="3.1",
            thickness=10.0,
            width=2000,
            length=4000,
            weight=630.0,
            location="Hal A",
            notes="Test plate",
            barcode="BC123",
            heatnummer="HN999",
            aantal=1
        )

        assert len(plates) == 1
        assert plates[0].material_prefix == test_material.plaatcode_prefix
        assert plates[0].quality == "3.1"
        assert plates[0].heatnummer == "HN999"

    def test_create_plates_multiple(self, test_db: Session, admin_user: User, test_material: Material):
        """Test creating multiple plates"""
        plates = PlateStockService.create_plates(
            db=test_db,
            user_id=admin_user.id,
            material_prefix=test_material.plaatcode_prefix,
            quality="3.1",
            thickness=10.0,
            width=2000,
            length=4000,
            weight=630.0,
            location="Hal A",
            notes="Test plates",
            barcode=None,
            heatnummer=None,
            aantal=5
        )

        assert len(plates) == 5
        # Verify unique plate numbers
        plate_numbers = [p.plate_number for p in plates]
        assert len(set(plate_numbers)) == 5

    def test_create_plates_material_not_found(self, test_db: Session, admin_user: User):
        """Test plate creation fails when material not found"""
        with pytest.raises(MaterialNotFoundError):
            PlateStockService.create_plates(
                db=test_db,
                user_id=admin_user.id,
                material_prefix="NONEXISTENT",
                quality="3.1",
                thickness=10.0,
                width=2000,
                length=4000,
                weight=None,
                location="Test",
                notes=None,
                barcode=None,
                heatnummer=None,
                aantal=1
            )

    def test_update_plate_success(self, test_db: Session, admin_user: User, test_plate: Plate):
        """Test successful plate update"""
        updated = PlateStockService.update_plate(
            db=test_db,
            user_id=admin_user.id,
            plate_id=test_plate.id,
            update_data={"location": "Hal B - Rek 2", "notes": "Updated notes"}
        )

        assert updated.location == "Hal B - Rek 2"
        assert updated.notes == "Updated notes"

    def test_update_plate_not_found(self, test_db: Session, admin_user: User):
        """Test plate update fails when plate not found"""
        import uuid

        with pytest.raises(PlateNotFoundError):
            PlateStockService.update_plate(
                db=test_db,
                user_id=admin_user.id,
                plate_id=uuid.uuid4(),
                update_data={"location": "New Location"}
            )

    def test_delete_plate_success(self, test_db: Session, admin_user: User, test_plate: Plate):
        """Test successful plate deletion when no active claims"""
        plate_id = test_plate.id

        PlateStockService.delete_plate(
            db=test_db,
            user_id=admin_user.id,
            plate_id=plate_id
        )

        # Verify deleted
        deleted = test_db.query(Plate).filter(Plate.id == plate_id).first()
        assert deleted is None

    def test_delete_plate_with_active_claims(self, test_db: Session, admin_user: User, test_plate: Plate, test_claim: Claim):
        """Test plate deletion fails when active claims exist"""
        with pytest.raises(PlateHasActiveClaimsException):
            PlateStockService.delete_plate(
                db=test_db,
                user_id=admin_user.id,
                plate_id=test_plate.id
            )

    def test_delete_plate_not_found(self, test_db: Session, admin_user: User):
        """Test plate deletion fails when plate not found"""
        import uuid

        with pytest.raises(PlateNotFoundError):
            PlateStockService.delete_plate(
                db=test_db,
                user_id=admin_user.id,
                plate_id=uuid.uuid4()
            )

    def test_move_plate_to_laser_success(self, test_db: Session, werkplaats_user: User, test_plate: Plate):
        """Test successfully moving plate to laser"""
        moved = PlateStockService.move_plate_to_laser(
            db=test_db,
            user_id=werkplaats_user.id,
            plate_id=test_plate.id
        )

        assert moved.status == "bij_laser"
        assert moved.location == "Bij Laser"
        assert moved.bij_laser_sinds is not None

    def test_move_plate_to_laser_consumed(self, test_db: Session, werkplaats_user: User, test_plate_consumed: Plate):
        """Test moving consumed plate to laser fails"""
        with pytest.raises(PlateAlreadyConsumedException):
            PlateStockService.move_plate_to_laser(
                db=test_db,
                user_id=werkplaats_user.id,
                plate_id=test_plate_consumed.id
            )

    def test_move_plate_from_laser_success(self, test_db: Session, werkplaats_user: User, test_plate_at_laser: Plate):
        """Test successfully moving plate from laser"""
        moved = PlateStockService.move_plate_from_laser(
            db=test_db,
            user_id=werkplaats_user.id,
            plate_id=test_plate_at_laser.id,
            new_location="Hal A - Rek 1"
        )

        assert moved.status == "beschikbaar"
        assert moved.location == "Hal A - Rek 1"
        assert moved.bij_laser_sinds is None

    def test_move_plate_from_laser_not_at_laser(self, test_db: Session, werkplaats_user: User, test_plate: Plate):
        """Test moving plate from laser fails when not at laser"""
        with pytest.raises(PlateNotAtLaserException):
            PlateStockService.move_plate_from_laser(
                db=test_db,
                user_id=werkplaats_user.id,
                plate_id=test_plate.id,
                new_location="Hal A"
            )

    def test_consume_plate_success(self, test_db: Session, admin_user: User, test_plate: Plate):
        """Test successfully consuming plate"""
        consumed = PlateStockService.consume_plate(
            db=test_db,
            user_id=admin_user.id,
            plate_id=test_plate.id
        )

        assert consumed.is_consumed is True
        assert consumed.consumed_at is not None
        assert consumed.consumed_by == admin_user.id

    def test_consume_plate_already_consumed(self, test_db: Session, admin_user: User, test_plate_consumed: Plate):
        """Test consuming already consumed plate fails"""
        with pytest.raises(PlateAlreadyConsumedException):
            PlateStockService.consume_plate(
                db=test_db,
                user_id=admin_user.id,
                plate_id=test_plate_consumed.id
            )

    def test_consume_plate_releases_claims(self, test_db: Session, admin_user: User, test_plate: Plate, test_claim: Claim):
        """Test consuming plate releases all active claims"""
        # Verify claim is active
        assert test_claim.is_active is True

        PlateStockService.consume_plate(
            db=test_db,
            user_id=admin_user.id,
            plate_id=test_plate.id
        )

        # Refresh claim
        test_db.refresh(test_claim)

        # Claim should now be inactive
        assert test_claim.is_active is False

    def test_process_remnant_success(self, test_db: Session, werkplaats_user: User, test_plate_at_laser: Plate):
        """Test successfully processing remnant"""
        result = PlateStockService.process_remnant(
            db=test_db,
            user_id=werkplaats_user.id,
            original_plate_id=test_plate_at_laser.id,
            new_width=1500,
            new_length=3000,
            new_location="Hal A - Rek 1",
            notes="Remnant from cutting"
        )

        original = result["original_plate"]
        remnant = result["remnant_plate"]

        # Original plate should be consumed
        assert original.is_consumed is True
        assert original.consumed_by == werkplaats_user.id

        # Remnant plate should be created
        assert remnant.width == 1500
        assert remnant.length == 3000
        assert remnant.location == "Hal A - Rek 1"
        assert remnant.material_prefix == original.material_prefix
        assert remnant.thickness == original.thickness
        assert remnant.heatnummer == original.heatnummer
        assert "Restant van" in remnant.notes

    def test_process_remnant_not_at_laser(self, test_db: Session, werkplaats_user: User, test_plate: Plate):
        """Test processing remnant fails when plate not at laser"""
        with pytest.raises(PlateNotAtLaserException):
            PlateStockService.process_remnant(
                db=test_db,
                user_id=werkplaats_user.id,
                original_plate_id=test_plate.id,
                new_width=1000,
                new_length=2000,
                new_location="Hal A",
                notes=None
            )

    def test_process_remnant_invalid_width(self, test_db: Session, werkplaats_user: User, test_plate_at_laser: Plate):
        """Test processing remnant fails when width >= original"""
        with pytest.raises(InvalidRemnantDimensionsException):
            PlateStockService.process_remnant(
                db=test_db,
                user_id=werkplaats_user.id,
                original_plate_id=test_plate_at_laser.id,
                new_width=2000,  # Same as original
                new_length=3000,
                new_location="Hal A",
                notes=None
            )

    def test_process_remnant_invalid_length(self, test_db: Session, werkplaats_user: User, test_plate_at_laser: Plate):
        """Test processing remnant fails when length >= original"""
        with pytest.raises(InvalidRemnantDimensionsException):
            PlateStockService.process_remnant(
                db=test_db,
                user_id=werkplaats_user.id,
                original_plate_id=test_plate_at_laser.id,
                new_width=1500,
                new_length=5000,  # Greater than original
                new_location="Hal A",
                notes=None
            )

    def test_process_remnant_weight_calculation(self, test_db: Session, werkplaats_user: User, test_plate_at_laser: Plate):
        """Test remnant weight is calculated proportionally"""
        # Set weight on original plate
        test_plate_at_laser.weight = 100.0  # 100 kg
        test_db.flush()

        result = PlateStockService.process_remnant(
            db=test_db,
            user_id=werkplaats_user.id,
            original_plate_id=test_plate_at_laser.id,
            new_width=1000,  # Half the width
            new_length=2000,  # Half the length
            new_location="Hal A",
            notes=None
        )

        remnant = result["remnant_plate"]

        # Remnant area is 1/4 of original, so weight should be ~25 kg
        assert remnant.weight is not None
        assert abs(float(remnant.weight) - 25.0) < 0.1


# ============================================================
# CLAIM OPERATIONS TESTS
# ============================================================

@pytest.mark.unit
@pytest.mark.platestock
class TestClaimOperations:
    """Test claim-related service methods"""

    def test_create_claim_success(self, test_db: Session, werkvoorbereider_user: User, test_plate: Plate):
        """Test successfully creating claim"""
        claim = PlateStockService.create_claim(
            db=test_db,
            user_id=werkvoorbereider_user.id,
            plate_id=test_plate.id,
            project_naam="Project Y",
            project_fase="002",
            m2_geclaimd=Decimal("5.0"),
            notes="Test claim"
        )

        assert claim.plate_id == test_plate.id
        assert claim.project_naam == "Project Y"
        assert claim.project_fase == "002"
        assert claim.m2_geclaimd == Decimal("5.0")
        assert claim.is_active is True

        # Plate status should be updated
        test_db.refresh(test_plate)
        assert test_plate.status == "geclaimd"

    def test_create_claim_on_consumed_plate(self, test_db: Session, werkvoorbereider_user: User, test_plate_consumed: Plate):
        """Test creating claim on consumed plate fails"""
        with pytest.raises(ClaimOnConsumedPlateException):
            PlateStockService.create_claim(
                db=test_db,
                user_id=werkvoorbereider_user.id,
                plate_id=test_plate_consumed.id,
                project_naam="Project X",
                project_fase="001",
                m2_geclaimd=None,
                notes=None
            )

    def test_update_claim_success(self, test_db: Session, werkvoorbereider_user: User, test_claim: Claim):
        """Test successfully updating claim"""
        updated = PlateStockService.update_claim(
            db=test_db,
            user_id=werkvoorbereider_user.id,
            claim_id=test_claim.id,
            update_data={"m2_geclaimd": Decimal("10.0"), "notes": "Updated claim"}
        )

        assert updated.m2_geclaimd == Decimal("10.0")
        assert updated.notes == "Updated claim"

    def test_update_claim_not_found(self, test_db: Session, werkvoorbereider_user: User):
        """Test updating claim fails when claim not found"""
        import uuid

        with pytest.raises(ClaimNotFoundError):
            PlateStockService.update_claim(
                db=test_db,
                user_id=werkvoorbereider_user.id,
                claim_id=uuid.uuid4(),
                update_data={"notes": "Updated"}
            )

    def test_release_claim_success(self, test_db: Session, werkvoorbereider_user: User, test_claim: Claim, test_plate: Plate):
        """Test successfully releasing claim"""
        PlateStockService.release_claim(
            db=test_db,
            user_id=werkvoorbereider_user.id,
            claim_id=test_claim.id
        )

        test_db.refresh(test_claim)
        test_db.refresh(test_plate)

        assert test_claim.is_active is False
        assert test_plate.status == "beschikbaar"  # No more active claims

    def test_release_claim_not_found(self, test_db: Session, werkvoorbereider_user: User):
        """Test releasing claim fails when claim not found"""
        import uuid

        with pytest.raises(ClaimNotFoundError):
            PlateStockService.release_claim(
                db=test_db,
                user_id=werkvoorbereider_user.id,
                claim_id=uuid.uuid4()
            )

    def test_create_bulk_claims_success(self, test_db: Session, werkvoorbereider_user: User, test_material: Material, admin_user: User):
        """Test successfully creating bulk claims"""
        # Create multiple plates
        plates = []
        for i in range(3):
            plate = Plate(
                plate_number=f"{test_material.plaatcode_prefix}-{100+i:03d}",
                material_prefix=test_material.plaatcode_prefix,
                quality="3.1",
                thickness=10.0,
                width=2000,
                length=4000,
                location="Hal A",
                status="beschikbaar",
                created_by=admin_user.id
            )
            test_db.add(plate)
            plates.append(plate)
        test_db.commit()

        plate_ids = [p.id for p in plates]

        claims = PlateStockService.create_bulk_claims(
            db=test_db,
            user_id=werkvoorbereider_user.id,
            plate_ids=plate_ids,
            project_naam="Bulk Project",
            project_fase="001"
        )

        assert len(claims) == 3
        for claim in claims:
            assert claim.project_naam == "Bulk Project"
            assert claim.is_active is True

    def test_create_bulk_claims_skips_consumed(self, test_db: Session, werkvoorbereider_user: User, test_plate: Plate, test_plate_consumed: Plate):
        """Test bulk claims skips consumed plates"""
        plate_ids = [test_plate.id, test_plate_consumed.id]

        claims = PlateStockService.create_bulk_claims(
            db=test_db,
            user_id=werkvoorbereider_user.id,
            plate_ids=plate_ids,
            project_naam="Bulk Project",
            project_fase="001"
        )

        # Only 1 claim created (consumed plate skipped)
        assert len(claims) == 1
        assert claims[0].plate_id == test_plate.id

    def test_release_claims_by_project(self, test_db: Session, werkvoorbereider_user: User, test_claim: Claim):
        """Test releasing all claims for a project"""
        result = PlateStockService.release_claims_by_project(
            db=test_db,
            user_id=werkvoorbereider_user.id,
            project_naam="Project X",
            project_fase="001"
        )

        assert result["claims_released"] == 1
        assert result["plates_freed"] == 1

        test_db.refresh(test_claim)
        assert test_claim.is_active is False


# ============================================================
# STATISTICS OPERATIONS TESTS
# ============================================================

@pytest.mark.unit
@pytest.mark.platestock
class TestStatisticsOperations:
    """Test statistics-related service methods"""

    def test_get_inventory_stats(self, test_db: Session, test_plate: Plate, test_claim: Claim):
        """Test inventory statistics calculation"""
        stats = PlateStockService.get_inventory_stats(test_db)

        assert "total_plates" in stats
        assert "total_m2" in stats
        assert "claimed_plates" in stats
        assert "claimed_m2" in stats
        assert "available_plates" in stats
        assert "available_m2" in stats
        assert "by_material" in stats
        assert "by_location" in stats

        # We have 1 plate claimed
        assert stats["total_plates"] >= 1
        assert stats["claimed_plates"] >= 1

    def test_get_project_stats(self, test_db: Session, test_claim: Claim):
        """Test project statistics calculation"""
        stats = PlateStockService.get_project_stats(test_db)

        assert "active_projects" in stats
        assert "total_claimed_m2" in stats
        assert "projects" in stats

        # We have 1 active project
        assert stats["active_projects"] >= 1
        assert len(stats["projects"]) >= 1

    def test_get_inventory_stats_excludes_consumed(self, test_db: Session, test_plate: Plate, test_plate_consumed: Plate):
        """Test inventory stats excludes consumed plates"""
        stats = PlateStockService.get_inventory_stats(test_db)

        # Count plates in DB
        from sqlalchemy import func
        total_count = test_db.query(func.count(Plate.id)).filter(Plate.is_consumed == False).scalar()

        assert stats["total_plates"] == total_count
