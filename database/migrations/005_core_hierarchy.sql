-- =====================================================
-- MES Kersten Database Migration Script
-- File: 005_core_hierarchy.sql
-- Description: Creates core project hierarchy - Projects and Fases tables
-- Author: Claude Code
-- Date: 2024-12-11
-- Phase: 1.1 - Core Data Model
-- =====================================================

-- =====================================================
-- PROJECTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identification
    code VARCHAR(10) UNIQUE NOT NULL,
    naam TEXT NOT NULL,
    beschrijving TEXT NULL,

    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'actief' CHECK (status IN ('actief', 'afgerond', 'geannuleerd')),

    -- Audit fields
    created_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Soft delete
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Add comments for documentation
COMMENT ON TABLE projects IS 'Projects - top level of the project hierarchy. Each project can have multiple fases.';
COMMENT ON COLUMN projects.code IS 'Unique project code (e.g., "STAGR" for Station Groningen). Max 10 characters.';
COMMENT ON COLUMN projects.naam IS 'Full project name (e.g., "Station Groningen").';
COMMENT ON COLUMN projects.beschrijving IS 'Optional detailed description of the project.';
COMMENT ON COLUMN projects.status IS 'Project status: actief (active), afgerond (completed), geannuleerd (cancelled).';
COMMENT ON COLUMN projects.created_by IS 'User who created this project (werkvoorbereider or admin).';
COMMENT ON COLUMN projects.is_active IS 'Soft delete flag. False = deleted/archived.';

-- =====================================================
-- FASES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS fases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent relationship
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Identification
    fase_nummer VARCHAR(3) NOT NULL,
    beschrijving TEXT NULL,

    -- Werkplaats notes
    opmerkingen_intern TEXT NULL,
    opmerkingen_werkplaats TEXT NULL,

    -- Planning
    montage_datum DATE NULL,

    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'actief' CHECK (status IN ('actief', 'gereed', 'gearchiveerd')),

    -- Audit fields
    created_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint: fase_nummer must be unique within a project
    CONSTRAINT unique_fase_per_project UNIQUE (project_id, fase_nummer)
);

-- Add comments for documentation
COMMENT ON TABLE fases IS 'Fases (phases) - subdivisions of a project. Each fase can have orders, files, and posnummers.';
COMMENT ON COLUMN fases.project_id IS 'Parent project reference. Cascades on delete.';
COMMENT ON COLUMN fases.fase_nummer IS '3-digit fase number (e.g., "001", "002"). Unique within project.';
COMMENT ON COLUMN fases.beschrijving IS 'Description of this fase (e.g., "hekken", "poorten").';
COMMENT ON COLUMN fases.opmerkingen_intern IS 'Internal notes for werkvoorbereider only.';
COMMENT ON COLUMN fases.opmerkingen_werkplaats IS 'Notes visible to werkplaats (workshop).';
COMMENT ON COLUMN fases.montage_datum IS 'Planned assembly/installation date.';
COMMENT ON COLUMN fases.status IS 'Fase status: actief (active), gereed (ready/completed), gearchiveerd (archived).';
COMMENT ON COLUMN fases.created_by IS 'User who created this fase.';

-- =====================================================
-- INDEXES
-- =====================================================

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_code ON projects(code);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_is_active ON projects(is_active);

COMMENT ON INDEX idx_projects_code IS 'Index for fast project lookup by code (primary access pattern).';
COMMENT ON INDEX idx_projects_status IS 'Index for filtering projects by status.';
COMMENT ON INDEX idx_projects_created_by IS 'Index for listing projects by creator (werkvoorbereider).';
COMMENT ON INDEX idx_projects_is_active IS 'Index for filtering out deleted projects.';

-- Fases indexes
CREATE INDEX IF NOT EXISTS idx_fases_project_id ON fases(project_id);
CREATE INDEX IF NOT EXISTS idx_fases_status ON fases(status);
CREATE INDEX IF NOT EXISTS idx_fases_created_by ON fases(created_by);
CREATE INDEX IF NOT EXISTS idx_fases_montage_datum ON fases(montage_datum);

COMMENT ON INDEX idx_fases_project_id IS 'Index for fast lookup of all fases in a project (most common query).';
COMMENT ON INDEX idx_fases_status IS 'Index for filtering fases by status.';
COMMENT ON INDEX idx_fases_created_by IS 'Index for listing fases by creator.';
COMMENT ON INDEX idx_fases_montage_datum IS 'Index for sorting/filtering by assembly date.';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Migration 005_core_hierarchy.sql complete';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Created tables:';
    RAISE NOTICE '  - projects (with code, naam, status)';
    RAISE NOTICE '  - fases (with project_id, fase_nummer)';
    RAISE NOTICE 'Created indexes:';
    RAISE NOTICE '  - 4 indexes on projects table';
    RAISE NOTICE '  - 4 indexes on fases table';
    RAISE NOTICE 'Constraints:';
    RAISE NOTICE '  - projects.code UNIQUE';
    RAISE NOTICE '  - fases (project_id, fase_nummer) UNIQUE';
    RAISE NOTICE '  - fases CASCADE DELETE with projects';
    RAISE NOTICE '==============================================';
END $$;
