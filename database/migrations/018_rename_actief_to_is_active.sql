-- Migration 018: Rename 'actief' to 'is_active' for consistency
-- Per data-model.md: soft delete flag must be 'is_active' (not 'actief')
-- Affects: claims, storage_locations

BEGIN;

-- Rename column in claims table
ALTER TABLE claims RENAME COLUMN actief TO is_active;

-- Rename column in storage_locations table
ALTER TABLE storage_locations RENAME COLUMN actief TO is_active;

COMMIT;
