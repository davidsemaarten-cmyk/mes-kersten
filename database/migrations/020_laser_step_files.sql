-- Migration 020: Laser STEP files table (3D CAD .step/.stp files)
-- One STEP file per part (posnr), stored on disk, matched by filename stem.

CREATE TABLE IF NOT EXISTS laser_step_files (
    id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    laser_job_id        UUID          NOT NULL REFERENCES laser_jobs(id) ON DELETE CASCADE,
    line_item_id        UUID          REFERENCES laser_line_items(id) ON DELETE SET NULL,
    original_filename   VARCHAR(500)  NOT NULL,
    posnr_key           VARCHAR(200)  NOT NULL DEFAULT '',
    file_path           VARCHAR(1000) NOT NULL,
    uploaded_by         UUID          REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at         TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_laser_step_files_job       ON laser_step_files(laser_job_id);
CREATE INDEX IF NOT EXISTS idx_laser_step_files_line_item ON laser_step_files(line_item_id);

-- One STEP file per posnr per job (empty posnr excluded from uniqueness)
CREATE UNIQUE INDEX IF NOT EXISTS idx_laser_step_files_job_posnr
    ON laser_step_files(laser_job_id, posnr_key)
    WHERE posnr_key <> '';
