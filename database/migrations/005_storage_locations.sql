-- =====================================================
-- Migration 005: Storage Locations Table
-- =====================================================
-- Purpose: Normalize storage location data from free-text to relational table
-- Migration Strategy:
--   1. Create storage_locations table
--   2. Extract and migrate existing distinct locations from plates table
--   3. Add foreign key relationship to plates table
--   4. Keep old locatie column for backward compatibility during transition
--
-- Author: MES Kersten Development Team
-- Date: 2025-12-18
-- Rollback: See rollback script at bottom of file
-- =====================================================

BEGIN;

-- =====================================================
-- Step 1: Create storage_locations table
-- =====================================================

CREATE TABLE IF NOT EXISTS storage_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    naam VARCHAR(100) NOT NULL,
    beschrijving TEXT,
    actief BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Ensure unique location names (case-insensitive)
    CONSTRAINT storage_locations_naam_unique UNIQUE (naam)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_storage_locations_actief
    ON storage_locations(actief);

CREATE INDEX IF NOT EXISTS idx_storage_locations_naam
    ON storage_locations(LOWER(naam));

-- Add table comment
COMMENT ON TABLE storage_locations IS 'Opslaglocaties voor platen - genormaliseerde tabel om vrije tekstinvoer te vervangen';
COMMENT ON COLUMN storage_locations.naam IS 'Unieke naam van de opslaglocatie (bijv. "Hal A-1", "Rek 5")';
COMMENT ON COLUMN storage_locations.beschrijving IS 'Optionele beschrijving van de locatie';
COMMENT ON COLUMN storage_locations.actief IS 'Soft delete flag - false betekent locatie is verwijderd';

-- =====================================================
-- Step 2: Migrate existing location data
-- =====================================================

-- Insert all distinct non-null, non-empty locations from plates table
INSERT INTO storage_locations (naam, beschrijving, actief)
SELECT
    DISTINCT TRIM(location) AS naam,
    NULL AS beschrijving,
    true AS actief
FROM plates
WHERE
    location IS NOT NULL
    AND TRIM(location) != ''
ON CONFLICT (naam) DO NOTHING;  -- Skip duplicates if migration runs multiple times

-- Log migration results
DO $$
DECLARE
    location_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO location_count FROM storage_locations;
    RAISE NOTICE 'Migrated % unique storage locations from plates table', location_count;
END $$;

-- =====================================================
-- Step 3: Add foreign key column to plates table
-- =====================================================

-- Add new column for foreign key relationship (nullable during transition)
ALTER TABLE plates
    ADD COLUMN IF NOT EXISTS locatie_id UUID;

-- Add foreign key constraint with SET NULL on delete
ALTER TABLE plates
    DROP CONSTRAINT IF EXISTS fk_plates_storage_location;

ALTER TABLE plates
    ADD CONSTRAINT fk_plates_storage_location
    FOREIGN KEY (locatie_id)
    REFERENCES storage_locations(id)
    ON DELETE SET NULL;

-- Create index on foreign key for performance
CREATE INDEX IF NOT EXISTS idx_plates_locatie_id
    ON plates(locatie_id);

-- =====================================================
-- Step 4: Populate locatie_id based on existing locatie text
-- =====================================================

-- Link existing plates to storage_locations via text matching
UPDATE plates
SET locatie_id = sl.id
FROM storage_locations sl
WHERE
    plates.location IS NOT NULL
    AND TRIM(plates.location) != ''
    AND LOWER(TRIM(plates.location)) = LOWER(sl.naam);

-- Log update results
DO $$
DECLARE
    updated_count INTEGER;
    unmatched_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count
    FROM plates
    WHERE locatie_id IS NOT NULL;

    SELECT COUNT(*) INTO unmatched_count
    FROM plates
    WHERE location IS NOT NULL
        AND TRIM(location) != ''
        AND locatie_id IS NULL;

    RAISE NOTICE 'Updated % plates with locatie_id', updated_count;
    IF unmatched_count > 0 THEN
        RAISE WARNING '% plates have locatie text but no matching locatie_id - check for case/whitespace differences', unmatched_count;
    END IF;
END $$;

-- =====================================================
-- Step 5: Add comments and document transition strategy
-- =====================================================

COMMENT ON COLUMN plates.location IS 'DEPRECATED: Oude vrije tekst locatie - wordt vervangen door locatie_id. Blijft tijdelijk voor backward compatibility.';
COMMENT ON COLUMN plates.locatie_id IS 'Foreign key naar storage_locations tabel - nieuwe genormaliseerde locatie referentie';

-- =====================================================
-- Migration complete
-- =====================================================

COMMIT;

-- =====================================================
-- Verification Queries (run after migration)
-- =====================================================

-- Check how many storage locations were created
-- SELECT COUNT(*) AS total_locations FROM storage_locations;

-- Check how many plates have locatie_id populated
-- SELECT
--     COUNT(*) AS total_plates,
--     COUNT(locatie_id) AS plates_with_locatie_id,
--     COUNT(location) AS plates_with_old_location,
--     COUNT(*) - COUNT(locatie_id) AS missing_locatie_id
-- FROM plates;

-- Find any plates with location text but no locatie_id (data quality check)
-- SELECT id, plate_number, location, locatie_id
-- FROM plates
-- WHERE location IS NOT NULL
--   AND TRIM(location) != ''
--   AND locatie_id IS NULL;

-- List all storage locations with plate counts
-- SELECT
--     sl.naam,
--     sl.actief,
--     COUNT(p.id) AS plate_count
-- FROM storage_locations sl
-- LEFT JOIN plates p ON p.locatie_id = sl.id
-- GROUP BY sl.id, sl.naam, sl.actief
-- ORDER BY plate_count DESC;

-- =====================================================
-- Rollback Script (use if migration needs to be reversed)
-- =====================================================

-- To rollback this migration, run the following in a new transaction:

-- BEGIN;
--
-- -- Remove foreign key constraint
-- ALTER TABLE plates DROP CONSTRAINT IF EXISTS fk_plates_storage_location;
--
-- -- Remove locatie_id column
-- ALTER TABLE plates DROP COLUMN IF EXISTS locatie_id;
--
-- -- Drop indexes
-- DROP INDEX IF EXISTS idx_storage_locations_naam;
-- DROP INDEX IF EXISTS idx_storage_locations_actief;
-- DROP INDEX IF EXISTS idx_plates_locatie_id;
--
-- -- Drop storage_locations table
-- DROP TABLE IF EXISTS storage_locations;
--
-- COMMIT;
