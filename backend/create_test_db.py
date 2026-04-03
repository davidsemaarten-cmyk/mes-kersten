"""
Create test database for MES Kersten
Run this script once to setup the test database
"""

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Connection parameters
DB_USER = "postgres"
DB_PASSWORD = "7629bh5t"
DB_HOST = "localhost"
DB_PORT = "5432"
TEST_DB_NAME = "mes_kersten_test"

try:
    # Connect to PostgreSQL server (default 'postgres' database)
    print(f"Connecting to PostgreSQL server at {DB_HOST}:{DB_PORT}...")
    conn = psycopg2.connect(
        dbname="postgres",
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()

    # Check if database exists
    cursor.execute(
        "SELECT 1 FROM pg_database WHERE datname = %s",
        (TEST_DB_NAME,)
    )
    exists = cursor.fetchone()

    if exists:
        print(f"[OK] Test database '{TEST_DB_NAME}' already exists")
    else:
        # Create test database
        print(f"Creating test database '{TEST_DB_NAME}'...")
        cursor.execute(f"CREATE DATABASE {TEST_DB_NAME}")
        print(f"[OK] Test database '{TEST_DB_NAME}' created successfully")

    cursor.close()
    conn.close()

    print("\n" + "="*60)
    print("Test database setup complete!")
    print("="*60)
    print(f"\nDatabase: {TEST_DB_NAME}")
    print(f"Host: {DB_HOST}:{DB_PORT}")
    print(f"User: {DB_USER}")
    print("\nYou can now run the test suite with:")
    print("  cd backend")
    print("  pytest --cov=. --cov-report=html")
    print("="*60)

except psycopg2.Error as e:
    print(f"\n[ERROR] {e}")
    print("\nPossible issues:")
    print("  - PostgreSQL server not running")
    print("  - Incorrect password")
    print("  - Connection refused")
    exit(1)

except Exception as e:
    print(f"\n[ERROR] Unexpected error: {e}")
    exit(1)
