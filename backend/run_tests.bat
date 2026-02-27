@echo off
REM Script to run MES Kersten test suite with coverage reporting

echo ========================================
echo MES Kersten Test Suite
echo ========================================
echo.

REM Check if PostgreSQL test database exists
echo Checking test database...
psql -U postgres -lqt | findstr /C:"mes_kersten_test" >nul
if errorlevel 1 (
    echo Test database not found. Creating mes_kersten_test...
    psql -U postgres -c "CREATE DATABASE mes_kersten_test;"
    if errorlevel 1 (
        echo ERROR: Failed to create test database
        echo Please ensure PostgreSQL is running and you have the correct credentials
        pause
        exit /b 1
    )
    echo Test database created successfully
) else (
    echo Test database found
)
echo.

REM Install test dependencies
echo Installing test dependencies...
pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo.

REM Run tests with coverage
echo Running test suite...
echo ========================================
pytest --cov=. --cov-report=html --cov-report=term-missing --cov-config=.coveragerc -v

if errorlevel 1 (
    echo.
    echo ========================================
    echo TESTS FAILED
    echo ========================================
    pause
    exit /b 1
)

echo.
echo ========================================
echo TESTS PASSED
echo ========================================
echo.
echo Coverage report generated in htmlcov\index.html
echo.

REM Open coverage report
set /p OPEN="Open coverage report in browser? (y/n): "
if /i "%OPEN%"=="y" (
    start htmlcov\index.html
)

pause
