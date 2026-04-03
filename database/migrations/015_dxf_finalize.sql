-- Migration 015: Finalize DXF filesystem migration
-- Phase 2 of 2: Enforce file_path NOT NULL, drop file_content column
--
-- Run AFTER the data migration script (014_migrate_dxf_to_disk.py) has
-- successfully populated file_path for ALL existing rows.
--
-- Preceded by: 014_dxf_file_path.sql + 014_migrate_dxf_to_disk.py

-- Safety check: abort if any row still has NULL file_path
DO $$
DECLARE
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count
    FROM laser_dxf_files
    WHERE file_path IS NULL;

    IF null_count > 0 THEN
        RAISE EXCEPTION
            'Cannot finalize: % row(s) still have NULL file_path. '
            'Run 014_migrate_dxf_to_disk.py first.',
            null_count;
    END IF;
END $$;

-- Enforce file_path is always present
ALTER TABLE laser_dxf_files
    ALTER COLUMN file_path SET NOT NULL;

-- Drop the old TEXT column (data now lives on disk)
ALTER TABLE laser_dxf_files
    DROP COLUMN IF EXISTS file_content;
