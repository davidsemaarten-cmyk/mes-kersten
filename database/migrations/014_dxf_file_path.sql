-- Migration 014: Move DXF file content to filesystem
-- Phase 1 of 2: Add file_path column and make file_content nullable
--
-- Run BEFORE deploying the new application code and BEFORE the data migration script.
-- After this migration:
--   - New uploads will set file_path only (file_content = NULL)
--   - Existing rows still have file_content populated (data migration populates file_path later)
--
-- Followed by: 014_migrate_dxf_to_disk.py (data migration)
-- Followed by: 015_dxf_finalize.sql (make file_path NOT NULL, drop file_content)

-- Add file_path column (nullable — will be set during data migration)
ALTER TABLE laser_dxf_files
    ADD COLUMN IF NOT EXISTS file_path VARCHAR(1000);

-- Make file_content nullable so new uploads can omit it
ALTER TABLE laser_dxf_files
    ALTER COLUMN file_content DROP NOT NULL;

-- Index for path lookups
CREATE INDEX IF NOT EXISTS idx_laser_dxf_files_file_path
    ON laser_dxf_files (file_path);
