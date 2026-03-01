-- Migration 012: Laser CSV version history
-- Each CSV import for a laser job is stored separately,
-- with the original filename, raw content, and upload timestamp.
-- Line items are linked to the specific import that produced them.

-- ============================================================
-- TABLE: laser_csv_imports
-- ============================================================

CREATE TABLE laser_csv_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    laser_job_id UUID NOT NULL REFERENCES laser_jobs(id) ON DELETE CASCADE,

    original_filename VARCHAR(500) NOT NULL DEFAULT '',
    raw_content TEXT NOT NULL DEFAULT '',
    csv_metadata JSONB,

    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_laser_csv_imports_job_id ON laser_csv_imports(laser_job_id);
CREATE INDEX idx_laser_csv_imports_uploaded_at ON laser_csv_imports(laser_job_id, uploaded_at DESC);

-- ============================================================
-- ALTER: laser_line_items — add csv_import_id
-- ============================================================

ALTER TABLE laser_line_items
    ADD COLUMN csv_import_id UUID REFERENCES laser_csv_imports(id) ON DELETE CASCADE;

CREATE INDEX idx_laser_line_items_csv_import_id ON laser_line_items(csv_import_id);

-- ============================================================
-- DATA MIGRATION: create synthetic import records for existing
-- jobs that already have csv_metadata and line items.
-- raw_content is empty for these legacy records.
-- ============================================================

INSERT INTO laser_csv_imports (id, laser_job_id, original_filename, raw_content, csv_metadata, uploaded_by, uploaded_at)
SELECT
    gen_random_uuid(),
    j.id,
    '(historisch importbestand)',
    '',
    j.csv_metadata,
    j.created_by,
    j.created_at
FROM laser_jobs j
WHERE j.csv_metadata IS NOT NULL
  AND j.is_active = TRUE
  AND EXISTS (
      SELECT 1 FROM laser_line_items li
      WHERE li.laser_job_id = j.id
  );

-- Link existing line items to the synthetic import record
UPDATE laser_line_items li
SET csv_import_id = ci.id
FROM laser_csv_imports ci
WHERE ci.laser_job_id = li.laser_job_id
  AND li.csv_import_id IS NULL;
