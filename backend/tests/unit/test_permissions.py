"""
Unit Tests for Permission Utilities
Tests role-based authorization dependencies
"""

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from models.user import User


@pytest.mark.unit
@pytest.mark.auth
class TestPermissionDependencies:
    """Test permission dependency functions"""

    def test_require_admin_with_admin(self, test_client: TestClient, admin_user: User):
        """Test require_admin succeeds with admin user"""
        # Login as admin
        login_response = test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )
        assert login_response.status_code == 200

        # Try to access admin-only endpoint
        response = test_client.get("/api/platestock/materials")
        assert response.status_code == 200

    def test_require_admin_with_werkvoorbereider(self, test_client: TestClient, werkvoorbereider_user: User, test_material):
        """Test require_admin fails with werkvoorbereider user"""
        # Login as werkvoorbereider
        login_response = test_client.post(
            "/api/auth/login",
            json={"email": "werkvoorbereider@test.com", "password": "werk123"}
        )
        assert login_response.status_code == 200

        # Try to delete material (admin only)
        response = test_client.delete(f"/api/platestock/materials/{test_material.id}")
        assert response.status_code == 403
        assert "admin" in response.json()["detail"].lower()

    def test_require_admin_with_werkplaats(self, test_client: TestClient, werkplaats_user: User, test_material):
        """Test require_admin fails with werkplaats user"""
        # Login as werkplaats
        login_response = test_client.post(
            "/api/auth/login",
            json={"email": "werkplaats@test.com", "password": "werk123"}
        )
        assert login_response.status_code == 200

        # Try to delete material (admin only)
        response = test_client.delete(f"/api/platestock/materials/{test_material.id}")
        assert response.status_code == 403

    def test_require_admin_or_werkvoorbereider_with_admin(self, test_client: TestClient, admin_user: User, test_material):
        """Test require_admin_or_werkvoorbereider succeeds with admin"""
        # Login as admin
        login_response = test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )
        assert login_response.status_code == 200

        # Create plate (admin or werkvoorbereider)
        response = test_client.post(
            "/api/platestock/plates",
            json={
                "material_prefix": test_material.plaatcode_prefix,
                "quality": "3.1",
                "thickness": 10.0,
                "width": 2000,
                "length": 4000,
                "weight": 630.0,
                "location": "Hal A"
            },
            params={"aantal": 1}
        )
        assert response.status_code == 200

    def test_require_admin_or_werkvoorbereider_with_werkvoorbereider(self, test_client: TestClient, werkvoorbereider_user: User, test_material):
        """Test require_admin_or_werkvoorbereider succeeds with werkvoorbereider"""
        # Login as werkvoorbereider
        login_response = test_client.post(
            "/api/auth/login",
            json={"email": "werkvoorbereider@test.com", "password": "werk123"}
        )
        assert login_response.status_code == 200

        # Create plate (admin or werkvoorbereider)
        response = test_client.post(
            "/api/platestock/plates",
            json={
                "material_prefix": test_material.plaatcode_prefix,
                "quality": "3.1",
                "thickness": 10.0,
                "width": 2000,
                "length": 4000,
                "weight": 630.0,
                "location": "Hal A"
            },
            params={"aantal": 1}
        )
        assert response.status_code == 200

    def test_require_admin_or_werkvoorbereider_with_werkplaats(self, test_client: TestClient, werkplaats_user: User, test_material):
        """Test require_admin_or_werkvoorbereider fails with werkplaats"""
        # Login as werkplaats
        login_response = test_client.post(
            "/api/auth/login",
            json={"email": "werkplaats@test.com", "password": "werk123"}
        )
        assert login_response.status_code == 200

        # Try to create plate (admin or werkvoorbereider only)
        response = test_client.post(
            "/api/platestock/plates",
            json={
                "material_prefix": test_material.plaatcode_prefix,
                "quality": "3.1",
                "thickness": 10.0,
                "width": 2000,
                "length": 4000,
                "weight": 630.0,
                "location": "Hal A"
            },
            params={"aantal": 1}
        )
        assert response.status_code == 403

    def test_require_werkplaats_access_with_werkplaats(self, test_client: TestClient, werkplaats_user: User, test_plate):
        """Test require_werkplaats_access succeeds with werkplaats user"""
        # Login as werkplaats
        login_response = test_client.post(
            "/api/auth/login",
            json={"email": "werkplaats@test.com", "password": "werk123"}
        )
        assert login_response.status_code == 200

        # Move plate to laser (werkplaats access)
        response = test_client.post(f"/api/platestock/plates/{test_plate.id}/naar-laser")
        assert response.status_code == 200

    def test_require_werkplaats_access_with_admin(self, test_client: TestClient, admin_user: User, test_plate):
        """Test require_werkplaats_access succeeds with admin user"""
        # Login as admin
        login_response = test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )
        assert login_response.status_code == 200

        # Move plate to laser (werkplaats access)
        response = test_client.post(f"/api/platestock/plates/{test_plate.id}/naar-laser")
        assert response.status_code == 200

    def test_require_any_authenticated_with_any_user(self, test_client: TestClient, werkplaats_user: User):
        """Test require_any_authenticated succeeds with any authenticated user"""
        # Login as werkplaats
        login_response = test_client.post(
            "/api/auth/login",
            json={"email": "werkplaats@test.com", "password": "werk123"}
        )
        assert login_response.status_code == 200

        # Get materials (any authenticated user)
        response = test_client.get("/api/platestock/materials")
        assert response.status_code == 200

    def test_require_any_authenticated_without_auth(self, test_client: TestClient):
        """Test require_any_authenticated fails without authentication"""
        response = test_client.get("/api/platestock/materials")
        assert response.status_code == 401


@pytest.mark.unit
@pytest.mark.auth
class TestRoleBasedAccess:
    """Test role-based access control scenarios"""

    def test_admin_can_access_all_endpoints(self, test_client: TestClient, admin_user: User, test_material, test_plate):
        """Test admin can access all endpoints"""
        # Login as admin
        test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )

        # Test various endpoints
        endpoints = [
            ("GET", "/api/platestock/materials", 200),
            ("GET", "/api/platestock/plates", 200),
            ("GET", "/api/platestock/claims", 200),
            ("POST", f"/api/platestock/plates/{test_plate.id}/naar-laser", 200),
        ]

        for method, url, expected_status in endpoints:
            if method == "GET":
                response = test_client.get(url)
            elif method == "POST":
                response = test_client.post(url)

            assert response.status_code == expected_status, f"Failed for {method} {url}"

    def test_werkvoorbereider_limited_access(self, test_client: TestClient, werkvoorbereider_user: User, test_material):
        """Test werkvoorbereider has limited access"""
        # Login as werkvoorbereider
        test_client.post(
            "/api/auth/login",
            json={"email": "werkvoorbereider@test.com", "password": "werk123"}
        )

        # Can view materials
        response = test_client.get("/api/platestock/materials")
        assert response.status_code == 200

        # Cannot delete materials (admin only)
        response = test_client.delete(f"/api/platestock/materials/{test_material.id}")
        assert response.status_code == 403

    def test_werkplaats_laser_operations_only(self, test_client: TestClient, werkplaats_user: User, test_plate, test_material):
        """Test werkplaats can only perform laser operations"""
        # Login as werkplaats
        test_client.post(
            "/api/auth/login",
            json={"email": "werkplaats@test.com", "password": "werk123"}
        )

        # Can move to laser
        response = test_client.post(f"/api/platestock/plates/{test_plate.id}/naar-laser")
        assert response.status_code == 200

        # Cannot create plates
        response = test_client.post(
            "/api/platestock/plates",
            json={
                "material_prefix": test_material.plaatcode_prefix,
                "quality": "3.1",
                "thickness": 10.0,
                "width": 2000,
                "length": 4000,
                "weight": 630.0,
                "location": "Hal A"
            },
            params={"aantal": 1}
        )
        assert response.status_code == 403
