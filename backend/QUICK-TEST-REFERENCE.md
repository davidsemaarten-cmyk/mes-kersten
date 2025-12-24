# Quick Test Reference Card

Quick reference for running tests in the MES Kersten application.

## Quick Start

```bash
# Windows
cd backend
run_tests.bat

# Linux/Mac
cd backend
chmod +x run_tests.sh
./run_tests.sh
```

## Common Commands

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html --cov-report=term-missing

# Run specific test file
pytest tests/unit/test_platestock_service.py

# Run specific test class
pytest tests/unit/test_platestock_service.py::TestMaterialOperations

# Run specific test
pytest tests/unit/test_platestock_service.py::TestMaterialOperations::test_create_material_success

# Run with verbose output
pytest -v

# Run tests with marker
pytest -m unit
pytest -m integration
pytest -m platestock
pytest -m auth
```

## Test Categories

```bash
# Unit tests only
pytest tests/unit/

# Integration tests only
pytest tests/integration/

# PlateStock tests
pytest -m platestock

# Auth tests
pytest -m auth

# Database tests
pytest -m database
```

## Coverage

```bash
# Generate HTML report
pytest --cov=. --cov-report=html

# View in browser
start htmlcov\index.html  # Windows
open htmlcov/index.html   # Mac
xdg-open htmlcov/index.html  # Linux

# Show missing lines in terminal
pytest --cov=. --cov-report=term-missing

# Fail if coverage below 70%
pytest --cov=. --cov-fail-under=70
```

## Debug

```bash
# Show print statements
pytest -s

# Stop on first failure
pytest -x

# Show local variables on failure
pytest -l

# Run last failed tests
pytest --lf

# Drop into debugger on failure
pytest --pdb
```

## Test Database

```bash
# Create test database
psql -U postgres -c "CREATE DATABASE mes_kersten_test;"

# Drop test database
psql -U postgres -c "DROP DATABASE mes_kersten_test;"

# Recreate test database
psql -U postgres -c "DROP DATABASE IF EXISTS mes_kersten_test;"
psql -U postgres -c "CREATE DATABASE mes_kersten_test;"
```

## Test Files

- `tests/unit/test_platestock_service.py` - PlateStock service (75+ tests)
- `tests/unit/test_auth.py` - Authentication utilities (30+ tests)
- `tests/unit/test_permissions.py` - Permission utilities (15+ tests)
- `tests/unit/test_audit.py` - Audit logging (20+ tests)
- `tests/integration/test_platestock_api.py` - PlateStock API (50+ tests)
- `tests/integration/test_auth_api.py` - Auth API (25+ tests)

## Markers

- `@pytest.mark.unit` - Unit tests
- `@pytest.mark.integration` - Integration tests
- `@pytest.mark.platestock` - PlateStock module
- `@pytest.mark.auth` - Authentication/authorization
- `@pytest.mark.database` - Database tests
- `@pytest.mark.slow` - Slow tests

## Fixtures

**Database:** test_engine, test_db, test_client

**Users:** admin_user, werkvoorbereider_user, werkplaats_user, inactive_user

**PlateStock:** test_material, test_material_rvs, test_plate, test_plate_at_laser, test_plate_consumed, test_claim

**Auth:** admin_headers, werkvoorbereider_headers, werkplaats_headers

## Coverage Goals

- Overall: >70%
- PlateStockService: 100%
- Auth utilities: 100%
- Permission utilities: 100%

## Troubleshooting

**Tests fail with database connection error:**
```bash
# Ensure PostgreSQL is running
net start postgresql-x64-15  # Windows
sudo systemctl start postgresql  # Linux
brew services start postgresql  # Mac
```

**Test database not found:**
```bash
psql -U postgres -c "CREATE DATABASE mes_kersten_test;"
```

**Import errors:**
```bash
pip install -r requirements.txt
```

For full documentation, see `tests/README.md` or `TESTING-GUIDE.md`.
