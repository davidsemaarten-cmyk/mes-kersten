"""
Data migration 014: Copy DXF file_content TEXT → local filesystem, populate file_path.

Run AFTER:  database/migrations/014_dxf_file_path.sql
Run BEFORE: database/migrations/015_dxf_finalize.sql

Usage:
    cd backend
    python migrations/014_migrate_dxf_to_disk.py
"""
import sys
from pathlib import Path

# Make sure we can import from backend/
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

import psycopg2
from config import settings
from services.file_storage import DXFStorage


def migrate() -> None:
    conn = psycopg2.connect(settings.DATABASE_URL)
    cur = conn.cursor()

    # Fetch all DXF records that still need to be written to disk
    cur.execute("""
        SELECT
            d.id,
            d.file_content,
            d.original_filename,
            d.posnr_key,
            j.project_id,
            j.fase_id,
            j.id AS job_id
        FROM laser_dxf_files d
        JOIN laser_jobs j ON j.id = d.laser_job_id
        WHERE d.file_path IS NULL
          AND d.file_content IS NOT NULL
        ORDER BY d.uploaded_at
    """)
    rows = cur.fetchall()
    total = len(rows)

    if total == 0:
        print("Nothing to migrate — all DXF records already have file_path set.")
        cur.close()
        conn.close()
        return

    print(f"Migrating {total} DXF records to disk...")
    errors = 0

    for i, (dxf_id, content, filename, posnr, project_id, fase_id, job_id) in enumerate(rows, start=1):
        try:
            rel_path = DXFStorage._build_relative_path(
                project_id=project_id,
                fase_id=fase_id,
                job_id=job_id,
                posnr=posnr,
                filename=filename or f"{dxf_id}.dxf",
            )
            DXFStorage.save(rel_path, content)
            cur.execute(
                "UPDATE laser_dxf_files SET file_path = %s WHERE id = %s",
                (rel_path, dxf_id),
            )
            print(f"  [{i}/{total}] {filename} -> {rel_path}")
        except Exception as e:
            errors += 1
            print(f"  [{i}/{total}] ERROR migrating {dxf_id} ({filename}): {e}")

    conn.commit()
    cur.close()
    conn.close()

    if errors:
        print(f"\nCompleted with {errors} error(s). Fix errors before running 015_dxf_finalize.sql.")
        sys.exit(1)
    else:
        print(f"\nDone. {total} files written to disk.")
        print("You may now run: database/migrations/015_dxf_finalize.sql")


if __name__ == "__main__":
    migrate()
