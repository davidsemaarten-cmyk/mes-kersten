# MES Kersten Test Suite

Comprehensive automated test suite for the MES Kersten backend application.

## Overview

This test suite provides comprehensive coverage of:
- **Unit Tests**: Individual functions and methods
- **Integration Tests**: API endpoints and complete request/response cycles
- **Service Layer**: Business logic and transaction handling
- **Authentication**: Password hashing, JWT tokens, and cookie-based authentication
- **Authorization**: Role-based access control
- **Audit Logging**: Audit trail creation and retrieval

## Test Coverage Goals

- **Overall Coverage**: >70%
- **Critical Modules**: 100% coverage
  - `services/platestock.py`
  - `utils/auth.py`
  - `utils/permissions.py`

## Directory Structure

```
tests/
├── conftest.py              # Pytest configuration and shared fixtures
├── unit/                    # Unit tests
│   ├── test_platestock_service.py  # PlateStockService tests (75+ tests)
│   ├── test_auth.py                # Authentication utilities tests (30+ tests)
│   ├── test_permissions.py         # Permission utilities tests (15+ tests)
│   └── test_audit.py               # Audit logging tests (20+ tests)
└── integration/             # Integration tests
    ├── test_platestock_api.py      # PlateStock API tests (50+ tests)
    └── test_auth_api.py            # Auth API tests (25+ tests)
```

## Running Tests

### Run All Tests

```bash
cd backend
pytest
```

### Run Specific Test Categories

```bash
# Unit tests only
pytest tests/unit/

# Integration tests only
pytest tests/integration/

# Tests for specific module
pytest tests/unit/test_platestock_service.py

# Tests with specific marker
pytest -m unit
pytest -m integration
pytest -m platestock
pytest -m auth
```

### Run Tests with Coverage

```bash
# Generate coverage report
pytest --cov=. --cov-report=html --cov-report=term-missing

# View HTML coverage report
# Open htmlcov/index.html in browser
```

### Run Tests with Verbose Output

```bash
pytest -v
pytest -vv  # Extra verbose
```

### Run Specific Test

```bash
pytest tests/unit/test_platestock_service.py::TestMaterialOperations::test_create_material_success -v
```

## Test Database

Tests use a separate test database to avoid affecting development data:
- **Database**: `mes_kersten_test`
- **URL**: `postgresql://postgres:root@localhost:5432/mes_kersten_test`

### Setup Test Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create test database
CREATE DATABASE mes_kersten_test;
```

The test suite will automatically:
- Create all tables before tests
- Use transactions for test isolation (automatic rollback after each test)
- Clean up all data after test session

## Fixtures

Comprehensive fixtures are provided in `conftest.py`:

### Database Fixtures
- `test_engine` - Test database engine (session scope)
- `test_db` - Database session with automatic rollback (function scope)
- `test_client` - FastAPI TestClient with test database

### User Fixtures
- `admin_user` - Admin user for testing
- `werkvoorbereider_user` - Werkvoorbereider user
- `werkplaats_user` - Werkplaats user
- `inactive_user` - Inactive user for testing

### PlateStock Fixtures
- `test_material` - Sample material (S235GE)
- `test_material_rvs` - RVS material (RVS316GL)
- `test_plate` - Sample plate (beschikbaar)
- `test_plate_at_laser` - Plate at laser (bij_laser)
- `test_plate_consumed` - Consumed plate
- `test_claim` - Sample claim

### Authentication Fixtures
- `admin_headers` - Authentication headers for admin
- `werkvoorbereider_headers` - Authentication headers for werkvoorbereider
- `werkplaats_headers` - Authentication headers for werkplaats

## Test Markers

Tests are categorized using pytest markers:

- `@pytest.mark.unit` - Unit tests
- `@pytest.mark.integration` - Integration tests
- `@pytest.mark.platestock` - PlateStock module tests
- `@pytest.mark.auth` - Authentication/authorization tests
- `@pytest.mark.database` - Tests requiring database
- `@pytest.mark.slow` - Slow running tests

## Writing New Tests

### Unit Test Example

```python
import pytest
from services.platestock import PlateStockService

@pytest.mark.unit
@pytest.mark.platestock
class TestNewFeature:
    def test_feature_success(self, test_db, admin_user):
        """Test feature succeeds with valid input"""
        result = PlateStockService.some_method(
            db=test_db,
            user_id=admin_user.id,
            param="value"
        )

        assert result is not None
        assert result.field == "expected_value"
```

### Integration Test Example

```python
import pytest
from fastapi.testclient import TestClient

@pytest.mark.integration
@pytest.mark.platestock
class TestNewEndpoint:
    def test_endpoint_success(self, test_client, admin_user):
        """Test endpoint returns expected response"""
        # Login
        test_client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )

        # Make request
        response = test_client.get("/api/new-endpoint")

        assert response.status_code == 200
        data = response.json()
        assert "field" in data
```

## Test Patterns

### Arrange-Act-Assert (AAA)

All tests follow the AAA pattern:

```python
def test_example(self, test_db, admin_user):
    # Arrange: Setup test data
    material = create_test_material(test_db, admin_user)

    # Act: Perform action
    result = PlateStockService.update_material(
        db=test_db,
        user_id=admin_user.id,
        material_id=material.id,
        update_data={"kleur": "blauw"}
    )

    # Assert: Verify result
    assert result.kleur == "blauw"
```

### Testing Exceptions

```python
def test_operation_fails(self, test_db, admin_user):
    """Test operation raises expected exception"""
    with pytest.raises(MaterialNotFoundError):
        PlateStockService.update_material(
            db=test_db,
            user_id=admin_user.id,
            material_id=uuid.uuid4(),  # Non-existent ID
            update_data={"kleur": "blauw"}
        )
```

### Testing Authorization

```python
def test_admin_only_endpoint(self, test_client, werkplaats_user):
    """Test endpoint requires admin role"""
    # Login as non-admin
    test_client.post(
        "/api/auth/login",
        json={"email": "werkplaats@test.com", "password": "werk123"}
    )

    # Attempt admin-only action
    response = test_client.delete("/api/admin-only-endpoint")

    assert response.status_code == 403
    assert "admin" in response.json()["detail"].lower()
```

## Continuous Integration

Tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: |
    cd backend
    pip install -r requirements.txt
    pytest --cov=. --cov-report=xml

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage.xml
```

## Coverage Configuration

Coverage settings are configured in `.coveragerc`:
- **Source**: All backend code
- **Omit**: Tests, migrations, cache files
- **Fail under**: 70% coverage threshold

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Descriptive Names**: Test names describe what they test
3. **Single Assertion**: Test one thing at a time (when possible)
4. **Edge Cases**: Test both happy path and error cases
5. **Fixtures**: Use fixtures for common test data
6. **Cleanup**: Tests automatically clean up via transaction rollback
7. **Performance**: Unit tests should be fast (<100ms each)

## Troubleshooting

### Tests Fail with Database Connection Error

```bash
# Ensure PostgreSQL is running
# Ensure mes_kersten_test database exists
psql -U postgres -c "CREATE DATABASE mes_kersten_test;"
```

### Tests Fail with Import Errors

```bash
# Install test dependencies
pip install -r requirements.txt
```

### Coverage Report Not Generated

```bash
# Ensure pytest-cov is installed
pip install pytest-cov

# Run with coverage flags
pytest --cov=. --cov-report=html
```

### Slow Test Execution

```bash
# Run tests in parallel (requires pytest-xdist)
pip install pytest-xdist
pytest -n auto
```

## Test Statistics

- **Total Tests**: 200+
- **Unit Tests**: 140+
- **Integration Tests**: 75+
- **Expected Coverage**: >70%
- **Critical Module Coverage**: 100%

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure tests cover happy path and error cases
3. Maintain >70% overall coverage
4. Update this README if adding new test categories
5. Run full test suite before committing

## Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [SQLAlchemy Testing](https://docs.sqlalchemy.org/en/20/orm/session_transaction.html#joining-a-session-into-an-external-transaction-such-as-for-test-suites)
