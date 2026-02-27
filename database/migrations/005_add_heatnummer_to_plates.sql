-- Migration: 005_add_heatnummer_to_plates.sql
-- Description: Add heat number tracking to plates table
-- Date: 2024-12-19

BEGIN;

-- Add heatnummer column (nullable, optional field)
ALTER TABLE plates
ADD COLUMN IF NOT EXISTS heatnummer VARCHAR(100);

-- Add index for filtering/searching by heat number
CREATE INDEX IF NOT EXISTS idx_plates_heatnummer ON plates(heatnummer)
WHERE heatnummer IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN plates.heatnummer IS 'Heat/batch certification number for material traceability';

COMMIT;
