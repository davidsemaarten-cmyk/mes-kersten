"""
Database Migration Runner for MES Kersten
==========================================

This script runs SQL migration files against the PostgreSQL database.

Usage:
    python run_migration.py 001_core_tables.sql
    
Or to run all migrations in order:
    python run_migration.py --all
"""

import sys
import os
from pathlib import Path
import psycopg2
from psycopg2 import sql

# Database connection settings
DB_CONFIG = {
    'dbname': 'mes_kersten',
    'user': 'postgres',
    'password': '7629bh5t',
    'host': 'localhost',
    'port': '5432'
}

def run_migration_file(cursor, filepath):
    """Run a single migration file"""
    print(f"\n{'='*60}")
    print(f"Running migration: {filepath.name}")
    print(f"{'='*60}\n")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    try:
        cursor.execute(sql_content)
        print(f"\nOK Migration {filepath.name} completed successfully!")
        return True
    except Exception as e:
        print(f"\nERROR Migration {filepath.name} failed!")
        print(f"Error: {e}")
        return False

def main():
    # Get migrations directory
    migrations_dir = Path(__file__).parent / 'migrations'
    
    if not migrations_dir.exists():
        print(f"Error: Migrations directory not found: {migrations_dir}")
        sys.exit(1)
    
    # Determine which migrations to run
    if len(sys.argv) > 1 and sys.argv[1] == '--all':
        # Run all migrations in order
        migration_files = sorted(migrations_dir.glob('*.sql'))
        if not migration_files:
            print(f"No migration files found in {migrations_dir}")
            sys.exit(1)
    elif len(sys.argv) > 1:
        # Run specific migration
        migration_file = migrations_dir / sys.argv[1]
        if not migration_file.exists():
            print(f"Error: Migration file not found: {migration_file}")
            sys.exit(1)
        migration_files = [migration_file]
    else:
        print("Usage: python run_migration.py <migration_file.sql>")
        print("   or: python run_migration.py --all")
        sys.exit(1)
    
    # Connect to database
    try:
        print(f"Connecting to database '{DB_CONFIG['dbname']}'...")
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = False  # Use transactions
        cursor = conn.cursor()
        print("OK Connected successfully!\n")
    except Exception as e:
        print(f"ERROR Failed to connect to database!")
        print(f"Error: {e}")
        sys.exit(1)
    
    # Run migrations
    success_count = 0
    failed_count = 0
    
    for migration_file in migration_files:
        if run_migration_file(cursor, migration_file):
            conn.commit()
            success_count += 1
        else:
            conn.rollback()
            failed_count += 1
            break  # Stop on first failure
    
    # Close connection
    cursor.close()
    conn.close()
    
    # Summary
    print(f"\n{'='*60}")
    print(f"Migration Summary")
    print(f"{'='*60}")
    print(f"Successful: {success_count}")
    print(f"Failed: {failed_count}")
    print(f"{'='*60}\n")
    
    if failed_count > 0:
        sys.exit(1)

if __name__ == '__main__':
    main()
