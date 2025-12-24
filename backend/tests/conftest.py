"""
Pytest Configuration and Shared Fixtures
Provides test database, test client, and user fixtures
"""

import pytest
import os
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
import uuid

# Set test environment before imports
os.environ["ENVIRONMENT"] = "test"
os.environ["DEBUG"] = "True"
os.environ["DATABASE_URL"] = "postgresql://postgres:root@localhost:5432/mes_kersten_test"
os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only-min-32-chars-long-secure"

from database import Base, get_db
from main import app
from models.user import User
from models.user_role import UserRole
from models.material import Material
from models.plate import Plate
from models.claim import Claim
from utils.auth import get_password_hash


# Test database URL
TEST_DATABASE_URL = "postgresql://postgres:root@localhost:5432/mes_kersten_test"


@pytest.fixture(scope="session")
def test_engine():
    """
    Create test database engine (session scope)

    Uses separate test database to avoid affecting development data
    """
    engine = create_engine(
        TEST_DATABASE_URL,
        echo=False,
        pool_pre_ping=True
    )

    # Create all tables
    Base.metadata.create_all(bind=engine)

    yield engine

    # Cleanup: Drop all tables after all tests
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture(scope="function")
def test_db(test_engine) -> Generator[Session, None, None]:
    """
    Create test database session with automatic rollback

    Each test gets a clean database state via transaction rollback.
    This is faster than recreating tables for each test.
    """
    connection = test_engine.connect()
    transaction = connection.begin()

    TestSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=connection
    )

    session = TestSessionLocal()

    yield session

    # Rollback transaction to clean up test data
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def test_client(test_db: Session) -> TestClient:
    """
    Create FastAPI test client with test database

    Overrides the get_db dependency to use test database
    """
    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)

    yield client

    app.dependency_overrides.clear()


# ============================================================
# USER FIXTURES
# ============================================================

@pytest.fixture
def admin_user(test_db: Session) -> User:
    """Create admin user for testing"""
    user = User(
        id=uuid.uuid4(),
        email="admin@test.com",
        password_hash=get_password_hash("admin123"),
        full_name="Test Admin",
        is_active=True
    )
    test_db.add(user)
    test_db.flush()

    # Add admin role
    role = UserRole(user_id=user.id, role="admin")
    test_db.add(role)
    test_db.commit()
    test_db.refresh(user)

    return user


@pytest.fixture
def werkvoorbereider_user(test_db: Session) -> User:
    """Create werkvoorbereider user for testing"""
    user = User(
        id=uuid.uuid4(),
        email="werkvoorbereider@test.com",
        password_hash=get_password_hash("werk123"),
        full_name="Test Werkvoorbereider",
        is_active=True
    )
    test_db.add(user)
    test_db.flush()

    # Add werkvoorbereider role
    role = UserRole(user_id=user.id, role="werkvoorbereider")
    test_db.add(role)
    test_db.commit()
    test_db.refresh(user)

    return user


@pytest.fixture
def werkplaats_user(test_db: Session) -> User:
    """Create werkplaats user for testing"""
    user = User(
        id=uuid.uuid4(),
        email="werkplaats@test.com",
        password_hash=get_password_hash("werk123"),
        full_name="Test Werkplaats",
        is_active=True
    )
    test_db.add(user)
    test_db.flush()

    # Add werkplaats role
    role = UserRole(user_id=user.id, role="werkplaats")
    test_db.add(role)
    test_db.commit()
    test_db.refresh(user)

    return user


@pytest.fixture
def inactive_user(test_db: Session) -> User:
    """Create inactive user for testing"""
    user = User(
        id=uuid.uuid4(),
        email="inactive@test.com",
        password_hash=get_password_hash("inactive123"),
        full_name="Test Inactive",
        is_active=False
    )
    test_db.add(user)
    test_db.flush()

    # Add role
    role = UserRole(user_id=user.id, role="werkvoorbereider")
    test_db.add(role)
    test_db.commit()
    test_db.refresh(user)

    return user


# ============================================================
# PLATESTOCK FIXTURES
# ============================================================

@pytest.fixture
def test_material(test_db: Session, admin_user: User) -> Material:
    """Create test material"""
    material = Material(
        id=uuid.uuid4(),
        plaatcode_prefix="S235GE",
        materiaalgroep="S235",
        specificatie=None,
        oppervlaktebewerking="gestraald",
        kleur=None,
        created_by=admin_user.id
    )
    test_db.add(material)
    test_db.commit()
    test_db.refresh(material)

    return material


@pytest.fixture
def test_material_rvs(test_db: Session, admin_user: User) -> Material:
    """Create test RVS material"""
    material = Material(
        id=uuid.uuid4(),
        plaatcode_prefix="RVS316GL",
        materiaalgroep="RVS",
        specificatie="316",
        oppervlaktebewerking="geslepen",
        kleur=None,
        created_by=admin_user.id
    )
    test_db.add(material)
    test_db.commit()
    test_db.refresh(material)

    return material


@pytest.fixture
def test_plate(test_db: Session, test_material: Material, admin_user: User) -> Plate:
    """Create test plate"""
    plate = Plate(
        id=uuid.uuid4(),
        plate_number="S235GE-001",
        material_prefix=test_material.plaatcode_prefix,
        quality="3.1",
        thickness=10.0,
        width=2000,
        length=4000,
        weight=630.0,
        location="Hal A - Rek 1",
        heatnummer="HN123456",
        notes="Test plate",
        barcode="BC001",
        status="beschikbaar",
        is_consumed=False,
        created_by=admin_user.id
    )
    test_db.add(plate)
    test_db.commit()
    test_db.refresh(plate)

    return plate


@pytest.fixture
def test_plate_at_laser(test_db: Session, test_material: Material, admin_user: User) -> Plate:
    """Create test plate at laser"""
    from datetime import datetime

    plate = Plate(
        id=uuid.uuid4(),
        plate_number="S235GE-002",
        material_prefix=test_material.plaatcode_prefix,
        quality="3.1",
        thickness=10.0,
        width=2000,
        length=4000,
        weight=630.0,
        location="Bij Laser",
        status="bij_laser",
        bij_laser_sinds=datetime.utcnow(),
        is_consumed=False,
        created_by=admin_user.id
    )
    test_db.add(plate)
    test_db.commit()
    test_db.refresh(plate)

    return plate


@pytest.fixture
def test_plate_consumed(test_db: Session, test_material: Material, admin_user: User) -> Plate:
    """Create consumed test plate"""
    from datetime import datetime

    plate = Plate(
        id=uuid.uuid4(),
        plate_number="S235GE-003",
        material_prefix=test_material.plaatcode_prefix,
        quality="3.1",
        thickness=10.0,
        width=2000,
        length=4000,
        weight=630.0,
        location="Hal A - Rek 1",
        status="beschikbaar",
        is_consumed=True,
        consumed_at=datetime.utcnow(),
        consumed_by=admin_user.id,
        created_by=admin_user.id
    )
    test_db.add(plate)
    test_db.commit()
    test_db.refresh(plate)

    return plate


@pytest.fixture
def test_claim(test_db: Session, test_plate: Plate, werkvoorbereider_user: User) -> Claim:
    """Create test claim"""
    from decimal import Decimal

    claim = Claim(
        id=uuid.uuid4(),
        plate_id=test_plate.id,
        project_naam="Project X",
        project_fase="Productie",
        m2_geclaimd=Decimal("8.0"),
        notes="Test claim",
        actief=True,
        claimed_by=werkvoorbereider_user.id
    )
    test_db.add(claim)

    # Update plate status
    test_plate.status = "geclaimd"

    test_db.commit()
    test_db.refresh(claim)

    return claim


# ============================================================
# AUTHENTICATION HELPERS
# ============================================================

@pytest.fixture
def admin_headers(test_client: TestClient, admin_user: User) -> dict:
    """Get authentication headers for admin user"""
    response = test_client.post(
        "/api/auth/login",
        json={"email": "admin@test.com", "password": "admin123"}
    )
    assert response.status_code == 200

    # Extract cookies from response
    cookies = response.cookies

    return {"Cookie": f"access_token={cookies.get('access_token')}"}


@pytest.fixture
def werkvoorbereider_headers(test_client: TestClient, werkvoorbereider_user: User) -> dict:
    """Get authentication headers for werkvoorbereider user"""
    response = test_client.post(
        "/api/auth/login",
        json={"email": "werkvoorbereider@test.com", "password": "werk123"}
    )
    assert response.status_code == 200

    cookies = response.cookies
    return {"Cookie": f"access_token={cookies.get('access_token')}"}


@pytest.fixture
def werkplaats_headers(test_client: TestClient, werkplaats_user: User) -> dict:
    """Get authentication headers for werkplaats user"""
    response = test_client.post(
        "/api/auth/login",
        json={"email": "werkplaats@test.com", "password": "werk123"}
    )
    assert response.status_code == 200

    cookies = response.cookies
    return {"Cookie": f"access_token={cookies.get('access_token')}"}
