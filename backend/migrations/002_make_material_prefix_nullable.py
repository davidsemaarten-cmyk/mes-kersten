"""
Migration: Make material.prefix column nullable
The prefix field is deprecated, should be nullable
"""

import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def run_migration():
    """Make material.prefix column nullable"""

    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://mes_user:mes_password@localhost:5432/mes_kersten_db")
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("Making material.prefix column nullable...")

        # Alter column to allow NULL
        cur.execute("""
            ALTER TABLE materials
            ALTER COLUMN prefix DROP NOT NULL;
        """)

        conn.commit()
        print("[OK] Migration completed successfully")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    run_migration()
