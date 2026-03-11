"""
Integration Tests for PlateStock API Endpoints
Tests complete request/response cycles for materials, plates, and claims
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from models.material import Material
from models.plate import Plate
from models.claim import Claim


@pytest.mark.integration
@pytest.mark.platestock
class TestMaterialEndpoints:
    """Test material API endpoints"""

    def test_get_materials_authenticated(self, test_client: TestClient, admin_user, test_material):
        """Test GET /materials with authentication"""
        # Login first
        test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )

        response = test_client.get("/api/platestock/materials")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_get_materials_unauthenticated(self, test_client: TestClient):
        """Test GET /materials without authentication fails"""
        response = test_client.get("/api/platestock/materials")

        assert response.status_code == 401

    def test_create_material_as_admin(self, test_client: TestClient, admin_user):
        """Test POST /materials as admin"""
        test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )

        response = test_client.post(
            "/api/platestock/materials",
            json={
                "plaatcode_prefix": "TEST123",
                "materiaalgroep": "S355",
                "specificatie": "J2",
                "oppervlaktebewerking": "gestraald",
                "kleur": "grijs"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["plaatcode_prefix"] == "TEST123"
        assert data["materiaalgroep"] == "S355"

    def test_create_material_as_werkvoorbereider_fails(self, test_client: TestClient, werkvoorbereider_user):
        """Test POST /materials as werkvoorbereider fails (admin only)"""
        test_client.post(
            "/api/auth/login",
            json={"email": "werkvoorbereider@test.com", "password": "werk123"}
        )

        response = test_client.post(
            "/api/platestock/materials",
            json={
                "plaatcode_prefix": "TEST456",
                "materiaalgroep": "S235",
                "specificatie": None,
                "oppervlaktebewerking": "gestraald",
                "kleur": None
            }
        )

        assert response.status_code == 403

    def test_create_material_duplicate_prefix(self, test_client: TestClient, admin_user, test_material):
        """Test POST /materials with duplicate prefix fails"""
        test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )

        response = test_client.post(
            "/api/platestock/materials",
            json={
                "plaatcode_prefix": test_material.plaatcode_prefix,
                "materiaalgroep": "S235",
                "specificatie": None,
                "oppervlaktebewerking": "gestraald",
                "kleur": None
            }
        )

        assert response.status_code == 400
        assert "in gebruik" in response.json()["detail"].lower()

    def test_update_material_as_admin(self, test_client: TestClient, admin_user, test_material):
        """Test PUT /materials/{id} as admin"""
        test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )

        response = test_client.put(
            f"/api/platestock/materials/{test_material.id}",
            json={"kleur": "blauw"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["kleur"] == "blauw"

    def test_delete_material_as_admin(self, test_client: TestClient, admin_user, test_material_rvs):
        """Test DELETE /materials/{id} as admin"""
        test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )

        response = test_client.delete(f"/api/platestock/materials/{test_material_rvs.id}")

        assert response.status_code == 200
        assert response.json()["success"] is True

    def test_delete_material_with_plates_fails(self, test_client: TestClient, admin_user, test_material, test_plate):
        """Test DELETE /materials/{id} fails when plates exist"""
        test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )

        response = test_client.delete(f"/api/platestock/materials/{test_material.id}")

        assert response.status_code == 400

    def test_suggest_prefix(self, test_client: TestClient, admin_user):
        """Test POST /materials/suggest-prefix"""
        test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )

        response = test_client.post(
            "/api/platestock/materials/suggest-prefix",
            json={
                "materiaalgroep": "RVS",
                "specificatie": "316",
                "oppervlaktebewerking": "geslepen"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["suggestion"] == "RVS316GL"
        assert "is_unique" in data


@pytest.mark.integration
@pytest.mark.platestock
class TestPlateEndpoints:
    """Test plate API endpoints"""

    def test_get_plates_authenticated(self, test_client: TestClient, admin_user, test_plate):
        """Test GET /plates with authentication"""
        test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )

        response = test_client.get("/api/platestock/plates")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_get_plates_filter_by_location(self, test_client: TestClient, admin_user, test_plate):
        """Test GET /plates with location filter"""
        test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )

        response = test_client.get(
            "/api/platestock/plates",
            params={"location": test_plate.location}
        )

        assert response.status_code == 200
        data = response.json()
        assert all(p["location"] == test_plate.location for p in data)

    def test_get_plates_exclude_consumed(self, test_client: TestClient, admin_user, test_plate, test_plate_consumed):
        """Test GET /plates excludes consumed by default"""
        test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )

        response = test_client.get("/api/platestock/plates")

        assert response.status_code == 200
        data = response.json()

        plate_numbers = [p["plate_number"] for p in data]
        assert test_plate.plate_number in plate_numbers
        assert test_plate_consumed.plate_number not in plate_numbers

    def test_get_plates_include_consumed(self, test_client: TestClient, admin_user, test_plate_consumed):
        """Test GET /plates includes consumed when requested"""
        test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )

        response = test_client.get(
            "/api/platestock/plates",
            params={"include_consumed": True}
        )

        assert response.status_code == 200
        data = response.json()

        plate_numbers = [p["plate_number"] for p in data]
        assert test_plate_consumed.plate_number in plate_numbers

    def test_get_single_plate(self, test_client: TestClient, admin_user, test_plate):
        """Test GET /plates/{id}"""
        test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )

        response = test_client.get(f"/api/platestock/plates/{test_plate.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["plate_number"] == test_plate.plate_number

    def test_create_plate_as_werkvoorbereider(self, test_client: TestClient, werkvoorbereider_user, test_material):
        """Test POST /plates as werkvoorbereider"""
        test_client.post(
            "/api/auth/login",
            json={"email": "werkvoorbereider@test.com", "password": "werk123"}
        )

        response = test_client.post(
            "/api/platestock/plates",
            json={
                "material_prefix": test_material.plaatcode_prefix,
                "quality": "3.1",
                "thickness": 8.0,
                "width": 1500,
                "length": 3000,
                "weight": 280.0,
                "location": "Hal B",
                "notes": "Test plate",
                "barcode": "BC123",
                "heatnummer": "HN789"
            },
            params={"aantal": 1}
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["material_prefix"] == test_material.plaatcode_prefix

    def test_create_multiple_plates(self, test_client: TestClient, admin_user, test_material):
        """Test POST /plates with aantal > 1"""
        test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )

        response = test_client.post(
            "/api/platestock/plates",
            json={
                "material_prefix": test_material.plaatcode_prefix,
                "quality": "3.1",
                "thickness": 10.0,
                "width": 2000,
                "length": 4000,
                "location": "Hal A"
            },
            params={"aantal": 3}
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3
        # All should have unique plate numbers
        plate_numbers = [p["plate_number"] for p in data]
        assert len(set(plate_numbers)) == 3

    def test_update_plate(self, test_client: TestClient, admin_user, test_plate):
        """Test PUT /plates/{id}"""
        test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )

        response = test_client.put(
            f"/api/platestock/plates/{test_plate.id}",
            json={"location": "Hal C - Rek 3", "notes": "Updated location"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["location"] == "Hal C - Rek 3"
        assert data["notes"] == "Updated location"

    def test_delete_plate_as_admin(self, test_client: TestClient, admin_user, test_db, test_material):
        """Test DELETE /plates/{id} as admin"""
        # Create a new plate to delete
        from services.platestock import PlateStockService
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
            notes=None,
            barcode=None,
            heatnummer=None,
            aantal=1
        )
        plate_id = plates[0].id

        test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )

        response = test_client.delete(f"/api/platestock/plates/{plate_id}")

        assert response.status_code == 200

    def test_move_to_laser(self, test_client: TestClient, werkplaats_user, test_plate):
        """Test POST /plates/{id}/naar-laser"""
        test_client.post(
            "/api/auth/login",
            json={"email": "werkplaats@test.com", "password": "werk123"}
        )

        response = test_client.post(f"/api/platestock/plates/{test_plate.id}/naar-laser")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "bij_laser"
        assert data["location"] == "Bij Laser"

    def test_move_from_laser(self, test_client: TestClient, werkplaats_user, test_plate_at_laser):
        """Test POST /plates/{id}/van-laser"""
        test_client.post(
            "/api/auth/login",
            json={"email": "werkplaats@test.com", "password": "werk123"}
        )

        response = test_client.post(
            f"/api/platestock/plates/{test_plate_at_laser.id}/van-laser",
            json={"new_location": "Hal A - Rek 1"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "beschikbaar"
        assert data["location"] == "Hal A - Rek 1"

    def test_consume_plate(self, test_client: TestClient, admin_user, test_plate):
        """Test POST /plates/{id}/consume"""
        test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )

        response = test_client.post(f"/api/platestock/plates/{test_plate.id}/consume")

        assert response.status_code == 200
        data = response.json()
        assert data["is_consumed"] is True

    def test_process_remnant(self, test_client: TestClient, werkplaats_user, test_plate_at_laser):
        """Test POST /plates/{id}/process-remnant"""
        test_client.post(
            "/api/auth/login",
            json={"email": "werkplaats@test.com", "password": "werk123"}
        )

        response = test_client.post(
            f"/api/platestock/plates/{test_plate_at_laser.id}/process-remnant",
            json={
                "new_width": 1500,
                "new_length": 3000,
                "new_location": "Hal A - Restanten",
                "notes": "Remnant from project X"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert "original_plate" in data
        assert "remnant_plate" in data
        assert data["original_plate"]["is_consumed"] is True
        assert data["remnant_plate"]["width"] == 1500
        assert data["remnant_plate"]["length"] == 3000


@pytest.mark.integration
@pytest.mark.platestock
class TestClaimEndpoints:
    """Test claim API endpoints"""

    def test_get_claims_authenticated(self, test_client: TestClient, admin_user, test_claim):
        """Test GET /claims with authentication"""
        test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )

        response = test_client.get("/api/platestock/claims")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_get_claims_filter_by_project(self, test_client: TestClient, admin_user, test_claim):
        """Test GET /claims with project filter"""
        test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )

        response = test_client.get(
            "/api/platestock/claims",
            params={"project_naam": "Project X"}
        )

        assert response.status_code == 200
        data = response.json()
        assert all(c["project_naam"] == "Project X" for c in data)

    def test_create_claim(self, test_client: TestClient, werkvoorbereider_user, test_plate):
        """Test POST /claims"""
        test_client.post(
            "/api/auth/login",
            json={"email": "werkvoorbereider@test.com", "password": "werk123"}
        )

        response = test_client.post(
            "/api/platestock/claims",
            json={
                "plate_id": str(test_plate.id),
                "project_naam": "Project Y",
                "project_fase": "002",
                "m2_geclaimd": 5.0,
                "notes": "Claim for engineering phase"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["project_naam"] == "Project Y"
        assert data["is_active"] is True

    def test_create_bulk_claims(self, test_client: TestClient, werkvoorbereider_user, test_db, test_material, admin_user):
        """Test POST /claims/bulk"""
        # Create multiple plates
        from services.platestock import PlateStockService
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
            notes=None,
            barcode=None,
            heatnummer=None,
            aantal=3
        )
        plate_ids = [str(p.id) for p in plates]

        test_client.post(
            "/api/auth/login",
            json={"email": "werkvoorbereider@test.com", "password": "werk123"}
        )

        response = test_client.post(
            "/api/platestock/claims/bulk",
            json={
                "plate_ids": plate_ids,
                "project_naam": "Bulk Project",
                "project_fase": "001"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["claims"]) == 3
        assert "total_m2" in data

    def test_update_claim(self, test_client: TestClient, werkvoorbereider_user, test_claim):
        """Test PUT /claims/{id}"""
        test_client.post(
            "/api/auth/login",
            json={"email": "werkvoorbereider@test.com", "password": "werk123"}
        )

        response = test_client.put(
            f"/api/platestock/claims/{test_claim.id}",
            json={"notes": "Updated claim notes"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["notes"] == "Updated claim notes"

    def test_release_claim(self, test_client: TestClient, werkvoorbereider_user, test_claim):
        """Test DELETE /claims/{id} (release)"""
        test_client.post(
            "/api/auth/login",
            json={"email": "werkvoorbereider@test.com", "password": "werk123"}
        )

        response = test_client.delete(f"/api/platestock/claims/{test_claim.id}")

        assert response.status_code == 200
        assert response.json()["success"] is True

    def test_release_claims_by_project(self, test_client: TestClient, werkvoorbereider_user, test_claim):
        """Test POST /claims/release-by-project"""
        test_client.post(
            "/api/auth/login",
            json={"email": "werkvoorbereider@test.com", "password": "werk123"}
        )

        response = test_client.post(
            "/api/platestock/claims/release-by-project",
            json={
                "project_naam": "Project X",
                "project_fase": "001"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["claims_released"] >= 1
        assert "plates_freed" in data


@pytest.mark.integration
@pytest.mark.platestock
class TestStatisticsEndpoints:
    """Test statistics API endpoints"""

    def test_get_overview_stats(self, test_client: TestClient, admin_user, test_plate):
        """Test GET /stats/overview"""
        test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )

        response = test_client.get("/api/platestock/stats/overview")

        assert response.status_code == 200
        data = response.json()
        assert "total_plates" in data
        assert "total_m2" in data
        assert "claimed_plates" in data
        assert "by_material" in data
        assert "by_location" in data

    def test_get_project_stats(self, test_client: TestClient, admin_user, test_claim):
        """Test GET /stats/projects"""
        test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )

        response = test_client.get("/api/platestock/stats/projects")

        assert response.status_code == 200
        data = response.json()
        assert "active_projects" in data
        assert "total_claimed_m2" in data
        assert "projects" in data
