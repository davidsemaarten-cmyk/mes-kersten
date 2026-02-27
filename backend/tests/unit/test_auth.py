"""
Unit Tests for Authentication Utilities
Tests password hashing, JWT token operations, and user authentication
"""

import pytest
from datetime import timedelta, datetime
from fastapi import HTTPException, Request
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from utils.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    verify_token,
    get_current_user
)
from models.user import User


@pytest.mark.unit
@pytest.mark.auth
class TestPasswordHashing:
    """Test password hashing and verification"""

    def test_get_password_hash(self):
        """Test password is hashed correctly"""
        password = "secure_password_123"
        hashed = get_password_hash(password)

        assert hashed != password
        assert hashed.startswith("$2b$")  # bcrypt prefix
        assert len(hashed) > 50

    def test_get_password_hash_different_inputs(self):
        """Test different passwords produce different hashes"""
        password1 = "password1"
        password2 = "password2"

        hash1 = get_password_hash(password1)
        hash2 = get_password_hash(password2)

        assert hash1 != hash2

    def test_get_password_hash_same_input_different_hashes(self):
        """Test same password produces different hashes (salt)"""
        password = "same_password"

        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)

        # bcrypt uses salt, so same password should produce different hashes
        assert hash1 != hash2

    def test_verify_password_correct(self):
        """Test password verification succeeds with correct password"""
        password = "correct_password"
        hashed = get_password_hash(password)

        result = verify_password(password, hashed)

        assert result is True

    def test_verify_password_incorrect(self):
        """Test password verification fails with incorrect password"""
        password = "correct_password"
        wrong_password = "wrong_password"
        hashed = get_password_hash(password)

        result = verify_password(wrong_password, hashed)

        assert result is False

    def test_verify_password_empty(self):
        """Test password verification with empty password"""
        password = "secure_password"
        hashed = get_password_hash(password)

        result = verify_password("", hashed)

        assert result is False

    def test_verify_password_special_characters(self):
        """Test password verification with special characters"""
        password = "P@ssw0rd!#$%^&*()"
        hashed = get_password_hash(password)

        result = verify_password(password, hashed)

        assert result is True


@pytest.mark.unit
@pytest.mark.auth
class TestJWTTokenOperations:
    """Test JWT token creation and verification"""

    def test_create_access_token_basic(self):
        """Test basic JWT token creation"""
        data = {"sub": "user123"}
        token = create_access_token(data)

        assert isinstance(token, str)
        assert len(token) > 50
        assert "." in token  # JWT has dots separating parts

    def test_create_access_token_with_custom_expiry(self):
        """Test JWT token creation with custom expiration"""
        data = {"sub": "user123"}
        expires_delta = timedelta(minutes=15)

        token = create_access_token(data, expires_delta)

        assert isinstance(token, str)
        assert len(token) > 0

    def test_create_access_token_includes_expiry(self):
        """Test JWT token includes expiration claim"""
        data = {"sub": "user123"}
        token = create_access_token(data)

        payload = verify_token(token)

        assert "exp" in payload
        assert "sub" in payload
        assert payload["sub"] == "user123"

    def test_verify_token_valid(self):
        """Test JWT token verification with valid token"""
        data = {"sub": "user123", "role": "admin"}
        token = create_access_token(data)

        payload = verify_token(token)

        assert payload["sub"] == "user123"
        assert payload["role"] == "admin"

    def test_verify_token_invalid(self):
        """Test JWT token verification with invalid token"""
        invalid_token = "invalid.token.here"

        with pytest.raises(HTTPException) as exc_info:
            verify_token(invalid_token)

        assert exc_info.value.status_code == 401
        assert "Ongeldige authenticatie credentials" in exc_info.value.detail

    def test_verify_token_expired(self):
        """Test JWT token verification with expired token"""
        from jose import jwt
        from utils.auth import SECRET_KEY, ALGORITHM

        # Create expired token
        data = {"sub": "user123", "exp": datetime.utcnow() - timedelta(hours=1)}
        expired_token = jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

        with pytest.raises(HTTPException) as exc_info:
            verify_token(expired_token)

        assert exc_info.value.status_code == 401

    def test_verify_token_malformed(self):
        """Test JWT token verification with malformed token"""
        malformed_token = "not-a-valid-jwt-token"

        with pytest.raises(HTTPException) as exc_info:
            verify_token(malformed_token)

        assert exc_info.value.status_code == 401


@pytest.mark.unit
@pytest.mark.auth
class TestGetCurrentUser:
    """Test get_current_user dependency"""

    def test_get_current_user_valid_cookie(self, test_client: TestClient, admin_user: User):
        """Test get_current_user with valid authentication cookie"""
        # Login to get cookie
        response = test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )
        assert response.status_code == 200

        # Make authenticated request
        response = test_client.get("/api/auth/me")
        assert response.status_code == 200

        data = response.json()
        assert data["email"] == "admin@test.com"
        assert data["full_name"] == "Test Admin"

    def test_get_current_user_no_cookie(self, test_client: TestClient):
        """Test get_current_user without authentication cookie"""
        response = test_client.get("/api/auth/me")

        assert response.status_code == 401
        assert "niet ingelogd" in response.json()["detail"].lower()

    def test_get_current_user_invalid_token(self, test_client: TestClient):
        """Test get_current_user with invalid token in cookie"""
        response = test_client.get(
            "/api/auth/me",
            cookies={"access_token": "invalid.token.here"}
        )

        assert response.status_code == 401

    def test_get_current_user_inactive_user(self, test_client: TestClient, inactive_user: User):
        """Test get_current_user with inactive user"""
        # Try to login as inactive user
        response = test_client.post(
            "/api/auth/login",
            json={"email": "inactive@test.com", "password": "inactive123"}
        )

        assert response.status_code == 403
        assert "niet actief" in response.json()["detail"].lower()

    def test_get_current_user_nonexistent_user(self, test_client: TestClient):
        """Test get_current_user with token for nonexistent user"""
        import uuid

        # Create token for user that doesn't exist
        fake_user_id = str(uuid.uuid4())
        token = create_access_token({"sub": fake_user_id})

        response = test_client.get(
            "/api/auth/me",
            cookies={"access_token": token}
        )

        assert response.status_code == 401
        assert "niet gevonden" in response.json()["detail"].lower()

    def test_get_current_user_token_without_sub(self, test_client: TestClient):
        """Test get_current_user with token missing sub claim"""
        # Create token without sub claim
        token = create_access_token({"role": "admin"})  # Missing 'sub'

        response = test_client.get(
            "/api/auth/me",
            cookies={"access_token": token}
        )

        assert response.status_code == 401


@pytest.mark.unit
@pytest.mark.auth
class TestAuthIntegration:
    """Test authentication integration scenarios"""

    def test_full_auth_flow_admin(self, test_client: TestClient, admin_user: User):
        """Test complete authentication flow for admin user"""
        # 1. Login
        login_response = test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )

        assert login_response.status_code == 200
        data = login_response.json()
        assert "user" in data
        assert data["user"]["email"] == "admin@test.com"
        assert data["user"]["role"] == "admin"
        assert "csrf_token" in data

        # Cookie should be set
        assert "access_token" in login_response.cookies

        # 2. Access protected endpoint
        me_response = test_client.get("/api/auth/me")
        assert me_response.status_code == 200

        # 3. Logout
        logout_response = test_client.post("/api/auth/logout")
        assert logout_response.status_code == 200

    def test_full_auth_flow_werkvoorbereider(self, test_client: TestClient, werkvoorbereider_user: User):
        """Test complete authentication flow for werkvoorbereider user"""
        login_response = test_client.post(
            "/api/auth/login",
            json={"email": "werkvoorbereider@test.com", "password": "werk123"}
        )

        assert login_response.status_code == 200
        data = login_response.json()
        assert data["user"]["role"] == "werkvoorbereider"

        me_response = test_client.get("/api/auth/me")
        assert me_response.status_code == 200

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

    def test_cookie_security_attributes(self, test_client: TestClient, admin_user: User):
        """Test authentication cookie has proper security attributes"""
        response = test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )

        assert response.status_code == 200

        # Check cookie attributes
        set_cookie_header = response.headers.get("set-cookie")
        assert set_cookie_header is not None
        assert "HttpOnly" in set_cookie_header
        assert "SameSite=lax" in set_cookie_header
        assert "Path=/" in set_cookie_header
