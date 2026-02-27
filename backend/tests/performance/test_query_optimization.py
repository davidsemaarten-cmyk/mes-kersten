"""
Performance Tests for Query Optimization
Tests N+1 query elimination and query count optimization
"""

import pytest
import uuid
from typing import List
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import event
from sqlalchemy.engine import Engine
from models.material import Material
from models.plate import Plate
from models.user import User


class QueryCounter:
    """Helper class to count SQL queries executed during a test"""

    def __init__(self):
        self.count = 0
        self.queries: List[str] = []

    def reset(self):
        """Reset counter and query list"""
        self.count = 0
        self.queries = []

    def callback(self, conn, cursor, statement, parameters, context, executemany):
        """SQLAlchemy event callback to count queries"""
        self.count += 1
        self.queries.append(statement)


@pytest.fixture
def query_counter():
    """Fixture that provides a query counter"""
    counter = QueryCounter()

    # Attach event listener
    event.listen(Engine, "before_cursor_execute", counter.callback)

    yield counter

    # Remove event listener
    event.remove(Engine, "before_cursor_execute", counter.callback)


@pytest.fixture
def many_materials_with_plates(test_db: Session, admin_user: User):
    """Create 50 test materials, some with varying numbers of plates"""
    materials = []

    for i in range(50):
        material = Material(
            id=uuid.uuid4(),
            plaatcode_prefix=f"MAT{i:03d}",
            materiaalgroep="S355" if i % 2 == 0 else "RVS",
            specificatie=f"Spec{i}" if i % 3 == 0 else None,
            oppervlaktebewerking="gestraald" if i % 2 == 0 else "geslepen",
            kleur="#cccccc",
            created_by=admin_user.id
        )
        test_db.add(material)
        materials.append(material)

    test_db.flush()

    # Create varying numbers of plates for materials
    for i, material in enumerate(materials):
        # Create 0-5 plates per material based on index
        num_plates = i % 6
        for j in range(num_plates):
            plate = Plate(
                id=uuid.uuid4(),
                plate_number=f"{material.plaatcode_prefix}-{j:03d}",
                material_prefix=material.plaatcode_prefix,
                quality="3.1",
                thickness=10.0,
                width=2000,
                length=4000,
                weight=630.0,
                location="Test Location",
                status="beschikbaar",
                is_consumed=False,
                created_by=admin_user.id
            )
            test_db.add(plate)

    test_db.commit()

    # Refresh all materials
    for material in materials:
        test_db.refresh(material)

    return materials


@pytest.mark.performance
@pytest.mark.platestock
class TestMaterialsEndpointPerformance:
    """Performance tests for materials endpoint"""

    def test_materials_endpoint_no_n_plus_one(
        self,
        test_client: TestClient,
        test_db: Session,
        admin_user: User,
        many_materials_with_plates: List[Material],
        query_counter: QueryCounter
    ):
        """
        Test that materials endpoint doesn't have N+1 query problem

        With 50 materials, should execute 1-3 queries max (not 51!)
        - 1 query for authentication/session
        - 1 query for materials + plate counts (optimized JOIN)
        - Possibly 1 more for transaction management

        Before optimization: 51 queries (1 materials query + 50 count queries)
        After optimization: ≤3 queries
        """
        # Login first
        login_response = test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )
        assert login_response.status_code == 200

        # Reset counter after login
        query_counter.reset()

        # Make request to materials endpoint
        response = test_client.get("/api/platestock/materials")

        # Verify response is successful
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 50

        # CRITICAL: Query count should be ≤3, NOT 51!
        # Allow small margin for transaction/session management
        print(f"\n=== PERFORMANCE TEST RESULTS ===")
        print(f"Total queries executed: {query_counter.count}")
        print(f"Expected: ≤3 queries (optimized)")
        print(f"Before optimization would be: 51 queries (N+1 problem)")
        print(f"\nQueries executed:")
        for i, query in enumerate(query_counter.queries, 1):
            print(f"{i}. {query[:100]}...")

        assert query_counter.count <= 3, (
            f"N+1 query problem detected! "
            f"Expected ≤3 queries, but got {query_counter.count} queries. "
            f"This indicates the optimization is not working."
        )

    def test_materials_endpoint_plate_counts_accurate(
        self,
        test_client: TestClient,
        admin_user: User,
        many_materials_with_plates: List[Material]
    ):
        """
        Test that optimized query returns accurate plate counts

        Verifies that the JOIN optimization doesn't break functionality
        """
        # Login
        test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )

        # Get materials
        response = test_client.get("/api/platestock/materials")
        assert response.status_code == 200

        data = response.json()

        # Verify plate counts match expected pattern
        # We created i % 6 plates for each material (0-5 plates)
        for i, material_data in enumerate(sorted(data, key=lambda x: x['plaatcode_prefix'])):
            expected_count = i % 6
            actual_count = material_data.get('plate_count', 0)

            assert actual_count == expected_count, (
                f"Material {material_data['plaatcode_prefix']} should have "
                f"{expected_count} plates, but has {actual_count}"
            )

    def test_materials_endpoint_includes_zero_plate_materials(
        self,
        test_client: TestClient,
        admin_user: User,
        many_materials_with_plates: List[Material]
    ):
        """
        Test that materials with 0 plates are included (OUTER JOIN)

        Critical: Must use LEFT OUTER JOIN, not INNER JOIN
        Otherwise materials without plates would be excluded
        """
        # Login
        test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )

        # Get materials
        response = test_client.get("/api/platestock/materials")
        assert response.status_code == 200

        data = response.json()

        # Count materials with 0 plates
        zero_plate_materials = [m for m in data if m.get('plate_count', -1) == 0]

        # Based on our fixture: i % 6 == 0 means 0 plates
        # So materials 0, 6, 12, 18, 24, 30, 36, 42, 48 should have 0 plates
        expected_zero_count = len([i for i in range(50) if i % 6 == 0])

        assert len(zero_plate_materials) == expected_zero_count, (
            f"Expected {expected_zero_count} materials with 0 plates, "
            f"but got {len(zero_plate_materials)}. "
            f"This might indicate INNER JOIN instead of OUTER JOIN."
        )

    def test_materials_endpoint_filters_still_work(
        self,
        test_client: TestClient,
        admin_user: User,
        many_materials_with_plates: List[Material],
        query_counter: QueryCounter
    ):
        """
        Test that filters still work with optimized query

        Ensures optimization doesn't break existing functionality
        """
        # Login
        test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )

        query_counter.reset()

        # Filter by materiaalgroep
        response = test_client.get("/api/platestock/materials?materiaalgroep=S355")
        assert response.status_code == 200

        data = response.json()

        # All returned materials should be S355
        assert all(m['materiaalgroep'] == 'S355' for m in data)

        # Should still be efficient (≤3 queries)
        assert query_counter.count <= 3

        # Based on fixture: even indices (0, 2, 4, ..., 48) = 25 materials
        assert len(data) == 25


@pytest.mark.performance
@pytest.mark.integration
class TestUpdateMaterialPerformance:
    """Performance tests for update material endpoint"""

    def test_update_material_optimized_count_query(
        self,
        test_client: TestClient,
        test_db: Session,
        admin_user: User,
        test_material: Material,
        query_counter: QueryCounter
    ):
        """
        Test that update material uses optimized count query

        Should use scalar() instead of count(), which is more efficient
        """
        # Create some plates for the material
        for i in range(5):
            plate = Plate(
                id=uuid.uuid4(),
                plate_number=f"{test_material.plaatcode_prefix}-{i:03d}",
                material_prefix=test_material.plaatcode_prefix,
                quality="3.1",
                thickness=10.0,
                width=2000,
                length=4000,
                status="beschikbaar",
                is_consumed=False,
                created_by=admin_user.id
            )
            test_db.add(plate)
        test_db.commit()

        # Login
        test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )

        query_counter.reset()

        # Update material
        response = test_client.put(
            f"/api/platestock/materials/{test_material.id}",
            json={"kleur": "#ff0000"}
        )

        assert response.status_code == 200
        data = response.json()

        # Verify plate count is correct
        assert data['plate_count'] == 5

        # Query count should be reasonable (not excessive)
        # Expect: SELECT material, UPDATE material, SELECT COUNT(plates)
        print(f"\nUpdate material queries: {query_counter.count}")
        assert query_counter.count <= 5, (
            f"Update material is inefficient: {query_counter.count} queries"
        )
