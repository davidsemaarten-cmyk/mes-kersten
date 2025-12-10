-- Material Schema Refactoring Migration
-- Version: 1.1
-- Date: 2024-12-05
-- Purpose: Refactor materials table to support proper material classification with prefix system

-- ==================================================
-- BACKUP EXISTING DATA
-- ==================================================

-- Create temporary backup table
CREATE TEMP TABLE materials_backup AS SELECT * FROM materials;

-- ==================================================
-- DROP AND RECREATE MATERIALS TABLE
-- ==================================================

-- Drop dependent constraints first
ALTER TABLE plates DROP CONSTRAINT IF EXISTS plates_material_prefix_fkey;

-- Drop materials table (CASCADE removes dependent objects)
DROP TABLE IF EXISTS materials CASCADE;

-- Create new materials table with structured schema
CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identification (workshop code prefix)
    plaatcode_prefix TEXT NOT NULL UNIQUE,

    -- Material properties
    materiaalgroep TEXT NOT NULL,
    specificatie TEXT,
    oppervlaktebewerking TEXT NOT NULL,

    -- UI display
    kleur TEXT NOT NULL,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),

    -- Constraints
    CONSTRAINT check_prefix_length CHECK (LENGTH(plaatcode_prefix) <= 10),
    CONSTRAINT check_prefix_format CHECK (plaatcode_prefix ~ '^[A-Z0-9]+$'),
    CONSTRAINT check_materiaalgroep_not_empty CHECK (LENGTH(materiaalgroep) > 0),
    CONSTRAINT check_oppervlakte_not_empty CHECK (LENGTH(oppervlaktebewerking) > 0)
);

-- ==================================================
-- CREATE INDEXES
-- ==================================================

CREATE INDEX idx_materials_groep ON materials(materiaalgroep);
CREATE INDEX idx_materials_prefix ON materials(plaatcode_prefix);

-- ==================================================
-- SEED WITH STANDARD MATERIALS
-- ==================================================

-- Insert standard materials based on common usage at M.C. Kersten
-- Including existing materials from plates table
INSERT INTO materials (plaatcode_prefix, materiaalgroep, specificatie, oppervlaktebewerking, kleur) VALUES
    -- S235 variations
    ('S235ZW', 'S235', NULL, 'zwart', '#1F2937'),
    ('S235VZ', 'S235', NULL, 'verzinkt', '#71717A'),
    ('S235GE', 'S235', NULL, 'gestraald', '#9CA3AF'),
    ('S235BO', 'S235', NULL, 'gebeitst+geolied', '#78716C'),

    -- S355 variations
    ('S355ZW', 'S355', NULL, 'zwart', '#374151'),
    ('S355GE', 'S355', NULL, 'gestraald', '#6B7280'),

    -- RVS (stainless steel) variations
    ('RVS304GL', 'RVS', '304', 'geslepen', '#E5E7EB'),
    ('RVS304GB', 'RVS', '304', 'geborsteld', '#D1D5DB'),
    ('RVS316GL', 'RVS', '316', 'geslepen', '#F3F4F6'),
    ('RVS316GB', 'RVS', '316', 'geborsteld', '#E5E7EB'),

    -- Aluminium variations
    ('ALU5083', 'Aluminium', '5083', 'naturel', '#9CA3AF'),
    ('ALU6061', 'Aluminium', '6061', 'naturel', '#A1A1AA'),
    ('ALUANO', 'Aluminium', '5083', 'geanodiseerd', '#71717A'),
    
    -- Existing materials from old schema (for compatibility)
    ('CORTEN', 'Cortenstaal', NULL, 'naturel', '#92400E'),
    ('S567J', 'S355', NULL, 'zwart', '#374151');

-- ==================================================
-- UPDATE PLATES TABLE
-- ==================================================

-- Check if material_prefix column exists and has correct type
-- If plates already have material_prefix (which they do), just verify foreign key

-- Ensure material_prefix is NOT NULL (set default for any null values)
UPDATE plates SET material_prefix = 'S235ZW' WHERE material_prefix IS NULL;

-- Ensure material_prefix is correctly typed
ALTER TABLE plates ALTER COLUMN material_prefix TYPE TEXT;
ALTER TABLE plates ALTER COLUMN material_prefix SET NOT NULL;

-- Add foreign key constraint linking to new materials table
ALTER TABLE plates ADD CONSTRAINT fk_material_prefix
    FOREIGN KEY (material_prefix) REFERENCES materials(plaatcode_prefix) ON DELETE RESTRICT;

-- ==================================================
-- UPDATE TRIGGERS
-- ==================================================

-- Recreate update timestamp trigger for materials
DROP TRIGGER IF EXISTS update_materials_updated_at ON materials;

CREATE TRIGGER update_materials_updated_at
    BEFORE UPDATE ON materials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ==================================================
-- MIGRATION NOTES
-- ==================================================

-- Migration creates structured material classification system:
-- - materiaalgroep: Broad category (S235, RVS, Aluminium, etc.)
-- - specificatie: Specific grade within group (304, 316 for RVS; 5083, 6061 for Aluminium)
-- - oppervlaktebewerking: Surface treatment (zwart, gestraald, geslepen, etc.)
-- - plaatcode_prefix: Unique workshop code for plate numbering (S235GE, RVS316GL, etc.)
--
-- Plate identification:
-- - Full plate code = PREFIX + NUMBER
-- - Example: "S235GE-042" (S235 gestraald, plate #42)
--
-- The system now supports:
-- - Auto-suggesting prefixes based on material properties
-- - Cascading filters (materiaalgroep → specificatie → oppervlaktebewerking)
-- - Better material organization and reporting

-- ==================================================
-- COMMENTS
-- ==================================================

COMMENT ON TABLE materials IS 'Material types with structured classification and prefix system';
COMMENT ON COLUMN materials.plaatcode_prefix IS 'Unique workshop code prefix for plate numbering (max 10 chars, uppercase alphanumeric)';
COMMENT ON COLUMN materials.materiaalgroep IS 'Broad material category (S235, RVS, Aluminium, etc.)';
COMMENT ON COLUMN materials.specificatie IS 'Specific grade within group (e.g., 304/316 for RVS, 5083/6061 for Aluminium) - NULL for basic steel';
COMMENT ON COLUMN materials.oppervlaktebewerking IS 'Surface treatment (zwart, gestraald, geslepen, verzinkt, etc.)';
