-- =============================================================
-- Migration 017: Almacam export statusmachine + tracking
-- =============================================================
-- Vervangt de verouderde status-waarden (aangemaakt, geprogrammeerd,
-- nc_verzonden, gereed) door de nieuwe Almacam-workflow statussen.
-- Voegt ook export tracking kolommen toe aan laser_jobs.

-- 1. Verwijder oude CHECK constraint
ALTER TABLE laser_jobs DROP CONSTRAINT IF EXISTS laser_jobs_status_check;

-- 2. Migreer bestaande data: alle bestaande jobs → 'concept'
UPDATE laser_jobs SET status = 'concept';

-- 3. Nieuwe CHECK constraint + nieuwe default
ALTER TABLE laser_jobs ALTER COLUMN status SET DEFAULT 'concept';
ALTER TABLE laser_jobs ADD CONSTRAINT laser_jobs_status_check
    CHECK (status IN ('concept', 'gereed_voor_almacam', 'geexporteerd'));

-- 4. Export tracking kolommen
ALTER TABLE laser_jobs
    ADD COLUMN IF NOT EXISTS export_date  TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS exported_by  UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS export_count INTEGER NOT NULL DEFAULT 0;

-- 5. Index op exported_by FK
CREATE INDEX IF NOT EXISTS idx_laser_jobs_exported_by
    ON laser_jobs(exported_by) WHERE exported_by IS NOT NULL;
