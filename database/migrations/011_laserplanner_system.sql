-- Migration 011: Laserplanner System
-- Creates tables for laser job planning and CSV material list management
-- Author: Claude Code
-- Date: 2026-02-26

-- ============================================================
-- TABLE: laser_jobs
-- ============================================================

CREATE TABLE laser_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identification
    naam VARCHAR(255) NOT NULL,
    beschrijving TEXT NULL,

    -- Project/Fase linkage
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    fase_id UUID REFERENCES fases(id) ON DELETE SET NULL,

    -- Status tracking
    status VARCHAR(30) NOT NULL DEFAULT 'aangemaakt'
        CHECK (status IN ('aangemaakt', 'geprogrammeerd', 'nc_verzonden', 'gereed')),

    -- CSV metadata (stored from first 4 rows)
    csv_metadata JSONB NULL,

    -- Audit fields
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Soft delete
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_laser_jobs_status ON laser_jobs(status);
CREATE INDEX idx_laser_jobs_project_id ON laser_jobs(project_id);
CREATE INDEX idx_laser_jobs_fase_id ON laser_jobs(fase_id);
CREATE INDEX idx_laser_jobs_created_by ON laser_jobs(created_by);
CREATE INDEX idx_laser_jobs_is_active ON laser_jobs(is_active);

COMMENT ON TABLE laser_jobs IS 'Laser planner jobs - each job contains CSV line items for laser cutting';
COMMENT ON COLUMN laser_jobs.status IS 'Job status: aangemaakt → geprogrammeerd → nc_verzonden → gereed';
COMMENT ON COLUMN laser_jobs.csv_metadata IS 'Metadata from CSV rows 1-4 (title, tekenaar, opdrachtgever)';

-- ============================================================
-- TABLE: laser_line_items
-- ============================================================

CREATE TABLE laser_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent job
    laser_job_id UUID NOT NULL REFERENCES laser_jobs(id) ON DELETE CASCADE,

    -- CSV row data (columns from row 5+)
    projectcode VARCHAR(50) NULL,
    fasenr VARCHAR(10) NULL,
    posnr VARCHAR(50) NULL,
    profiel VARCHAR(100) NULL,
    aantal INTEGER NULL,
    lengte INTEGER NULL,  -- in mm
    kwaliteit VARCHAR(100) NULL,
    gewicht DECIMAL(10, 2) NULL,  -- in kg
    zaag VARCHAR(100) NULL,
    opmerkingen TEXT NULL,

    -- Row ordering (preserve original CSV order)
    row_number INTEGER NOT NULL,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_laser_line_items_job_id ON laser_line_items(laser_job_id);
CREATE INDEX idx_laser_line_items_row_number ON laser_line_items(laser_job_id, row_number);

COMMENT ON TABLE laser_line_items IS 'Line items from uploaded CSV files, one row per CSV data row';
COMMENT ON COLUMN laser_line_items.row_number IS 'Original row number from CSV (starting from 1 for first data row)';
