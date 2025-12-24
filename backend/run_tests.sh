#!/bin/bash
# Script to run MES Kersten test suite with coverage reporting

echo "========================================"
echo "MES Kersten Test Suite"
echo "========================================"
echo ""

# Check if PostgreSQL test database exists
echo "Checking test database..."
if ! psql -U postgres -lqt | grep -q "mes_kersten_test"; then
    echo "Test database not found. Creating mes_kersten_test..."
    psql -U postgres -c "CREATE DATABASE mes_kersten_test;" || {
        echo "ERROR: Failed to create test database"
        echo "Please ensure PostgreSQL is running and you have the correct credentials"
        exit 1
    }
    echo "Test database created successfully"
else
    echo "Test database found"
fi
echo ""

# Install test dependencies
echo "Installing test dependencies..."
pip install -r requirements.txt --quiet || {
    echo "ERROR: Failed to install dependencies"
    exit 1
}
echo ""

# Run tests with coverage
echo "Running test suite..."
echo "========================================"
pytest --cov=. --cov-report=html --cov-report=term-missing --cov-config=.coveragerc -v

if [ $? -ne 0 ]; then
    echo ""
    echo "========================================"
    echo "TESTS FAILED"
    echo "========================================"
    exit 1
fi

echo ""
echo "========================================"
echo "TESTS PASSED"
echo "========================================"
echo ""
echo "Coverage report generated in htmlcov/index.html"
echo ""

# Ask to open coverage report
read -p "Open coverage report in browser? (y/n): " OPEN
if [ "$OPEN" = "y" ] || [ "$OPEN" = "Y" ]; then
    xdg-open htmlcov/index.html 2>/dev/null || open htmlcov/index.html 2>/dev/null
fi
