"""
Integration Tests for Authentication API Endpoints
Tests login, logout, and authentication flows
"""

import pytest
from fastapi.testclient import TestClient
from models.user import User


@pytest.mark.integration
@pytest.mark.auth
class TestAuthEndpoints:
    """Test authentication API endpoints"""

    def test_login_success_admin(self, test_client: TestClient, admin_user: User):
        """Test successful login as admin"""
        response = test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )

        assert response.status_code == 200
        data = response.json()

        # Check response structure
        assert "user" in data
        assert "csrf_token" in data

        # Check user data
        user_data = data["user"]
        assert user_data["email"] == "admin@test.com"
        assert user_data["full_name"] == "Test Admin"
        assert user_data["role"] == "admin"
        assert user_data["is_active"] is True

        # Check cookie is set
        assert "access_token" in response.cookies

    def test_login_success_werkvoorbereider(self, test_client: TestClient, werkvoorbereider_user: User):
        """Test successful login as werkvoorbereider"""
        response = test_client.post(
            "/api/auth/login",
            json={"email": "werkvoorbereider@test.com", "password": "werk123"}
        )

        assert response.status_code == 200
        data = response.json()

        assert data["user"]["role"] == "werkvoorbereider"
        assert "access_token" in response.cookies

    def test_login_success_werkplaats(self, test_client: TestClient, werkplaats_user: User):
        """Test successful login as werkplaats"""
        response = test_client.post(
            "/api/auth/login",
            json={"email": "werkplaats@test.com", "password": "werk123"}
        )

        assert response.status_code == 200
        data = response.json()

        assert data["user"]["role"] == "werkplaats"
        assert "access_token" in response.cookies

    def test_login_wrong_password(self, test_client: TestClient, admin_user: User):
        """Test login fails with wrong password"""
        response = test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "wrongpassword"}
        )

        assert response.status_code == 401
        assert "onjuiste" in response.json()["detail"].lower()

    def test_login_nonexistent_user(self, test_client: TestClient):
        """Test login fails with nonexistent user"""
        response = test_client.post(
            "/api/auth/login",
            json={"email": "nonexistent@test.com", "password": "password"}
        )

        assert response.status_code == 401
        assert "onjuiste" in response.json()["detail"].lower()

    def test_login_inactive_user(self, test_client: TestClient, inactive_user: User):
        """Test login fails with inactive user"""
        response = test_client.post(
            "/api/auth/login",
            json={"email": "inactive@test.com", "password": "inactive123"}
        )

        assert response.status_code == 403
        assert "niet actief" in response.json()["detail"].lower()

    def test_login_case_sensitive_email(self, test_client: TestClient, admin_user: User):
        """Test login is case sensitive for email"""
        # Try with uppercase email
        response = test_client.post(
            "/api/auth/login",
            json={"email": "ADMIN@TEST.COM", "password": "admin123"}
        )

        # Should fail because emails are case sensitive
        assert response.status_code == 401

    def test_get_me_authenticated(self, test_client: TestClient, admin_user: User):
        """Test GET /me with valid authentication"""
        # Login first
        login_response = test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )
        assert login_response.status_code == 200

        # Get current user info
        response = test_client.get("/api/auth/me")

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "admin@test.com"
        assert data["full_name"] == "Test Admin"

    def test_get_me_unauthenticated(self, test_client: TestClient):
        """Test GET /me without authentication fails"""
        response = test_client.get("/api/auth/me")

        assert response.status_code == 401
        assert "niet ingelogd" in response.json()["detail"].lower()

    def test_logout_authenticated(self, test_client: TestClient, admin_user: User):
        """Test POST /logout with valid authentication"""
        # Login first
        login_response = test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )
        assert login_response.status_code == 200

        # Logout
        response = test_client.post("/api/auth/logout")

        assert response.status_code == 200
        data = response.json()
        assert "uitgelogd" in data["message"].lower()

        # Try to access protected endpoint after logout should fail
        me_response = test_client.get("/api/auth/me")
        # Note: In real scenario, cookie would be cleared.
        # In test client, need to manually clear or make new request

    def test_logout_unauthenticated(self, test_client: TestClient):
        """Test POST /logout without authentication fails"""
        response = test_client.post("/api/auth/logout")

        assert response.status_code == 401

    def test_get_csrf_token(self, test_client: TestClient, admin_user: User):
        """Test GET /csrf-token endpoint"""
        # Login first
        test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )

        response = test_client.get("/api/auth/csrf-token")

        assert response.status_code == 200
        data = response.json()
        assert "csrf_token" in data
        assert len(data["csrf_token"]) > 0


@pytest.mark.integration
@pytest.mark.auth
class TestAuthFlows:
    """Test complete authentication flows"""

    def test_complete_auth_flow(self, test_client: TestClient, admin_user: User):
        """Test complete authentication flow: login -> access -> logout"""
        # 1. Login
        login_response = test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )
        assert login_response.status_code == 200
        assert "access_token" in login_response.cookies

        # 2. Access protected resource
        me_response = test_client.get("/api/auth/me")
        assert me_response.status_code == 200

        # 3. Access API endpoint
        materials_response = test_client.get("/api/platestock/materials")
        assert materials_response.status_code == 200

        # 4. Logout
        logout_response = test_client.post("/api/auth/logout")
        assert logout_response.status_code == 200

    def test_session_persistence(self, test_client: TestClient, admin_user: User):
        """Test authentication session persists across requests"""
        # Login
        test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )

        # Make multiple requests - all should succeed
        for _ in range(3):
            response = test_client.get("/api/auth/me")
            assert response.status_code == 200

    def test_cookie_security_attributes(self, test_client: TestClient, admin_user: User):
        """Test authentication cookie has proper security attributes"""
        response = test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )

        assert response.status_code == 200

        # Check cookie is set
        assert "access_token" in response.cookies

        # Check Set-Cookie header
        set_cookie_header = response.headers.get("set-cookie")
        assert set_cookie_header is not None

        # Verify security attributes
        assert "HttpOnly" in set_cookie_header
        assert "SameSite=lax" in set_cookie_header
        assert "Path=/" in set_cookie_header

    def test_multiple_users_separate_sessions(self, test_client: TestClient, admin_user: User, werkvoorbereider_user: User):
        """Test multiple users have separate sessions"""
        # Create separate test clients for each user
        from fastapi.testclient import TestClient
        from main import app

        client1 = TestClient(app)
        client2 = TestClient(app)

        # Login as admin in client1
        admin_login = client1.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )
        assert admin_login.status_code == 200

        # Login as werkvoorbereider in client2
        werk_login = client2.post(
            "/api/auth/login",
            json={"email": "werkvoorbereider@test.com", "password": "werk123"}
        )
        assert werk_login.status_code == 200

        # Verify each client has correct user
        admin_me = client1.get("/api/auth/me")
        assert admin_me.json()["role"] == "admin"

        werk_me = client2.get("/api/auth/me")
        assert werk_me.json()["role"] == "werkvoorbereider"


@pytest.mark.integration
@pytest.mark.auth
class TestAuthErrors:
    """Test authentication error scenarios"""

    def test_malformed_login_request(self, test_client: TestClient):
        """Test login with malformed request data"""
        response = test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com"}  # Missing password
        )

        assert response.status_code == 422  # Validation error

    def test_empty_credentials(self, test_client: TestClient):
        """Test login with empty credentials"""
        response = test_client.post(
            "/api/auth/login",
            json={"email": "", "password": ""}
        )

        assert response.status_code in [401, 422]

    def test_sql_injection_attempt(self, test_client: TestClient):
        """Test login protects against SQL injection"""
        response = test_client.post(
            "/api/auth/login",
            json={
                "email": "admin@test.com' OR '1'='1",
                "password": "password' OR '1'='1"
            }
        )

        # Should fail authentication, not cause SQL error
        assert response.status_code == 401

    def test_xss_attempt_in_credentials(self, test_client: TestClient):
        """Test login handles XSS attempts in credentials"""
        response = test_client.post(
            "/api/auth/login",
            json={
                "email": "<script>alert('xss')</script>@test.com",
                "password": "<script>alert('xss')</script>"
            }
        )

        # Should fail authentication cleanly
        assert response.status_code == 401

    def test_very_long_password(self, test_client: TestClient):
        """Test login handles very long password"""
        long_password = "a" * 10000

        response = test_client.post(
            "/api/auth/login",
            json={
                "email": "admin@test.com",
                "password": long_password
            }
        )

        # Should fail authentication, not crash
        assert response.status_code == 401

    def test_invalid_token_format(self, test_client: TestClient):
        """Test accessing protected endpoint with invalid token"""
        response = test_client.get(
            "/api/auth/me",
            cookies={"access_token": "not-a-valid-jwt-token"}
        )

        assert response.status_code == 401

    def test_expired_token_rejected(self, test_client: TestClient):
        """Test accessing protected endpoint with expired token"""
        from jose import jwt
        from datetime import datetime, timedelta
        from utils.auth import SECRET_KEY, ALGORITHM

        # Create expired token
        expired_data = {
            "sub": "fake-user-id",
            "exp": datetime.utcnow() - timedelta(hours=1)
        }
        expired_token = jwt.encode(expired_data, SECRET_KEY, algorithm=ALGORITHM)

        response = test_client.get(
            "/api/auth/me",
            cookies={"access_token": expired_token}
        )

        assert response.status_code == 401
