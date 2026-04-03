-- Migration 019: Laser NC files table (DSTV .nc1 files from Tekla Structures)
-- One NC file per part (posnr), stored on disk, matched by filename stem.

CREATE TABLE IF NOT EXISTS laser_nc_files (
    id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    laser_job_id        UUID          NOT NULL REFERENCES laser_jobs(id) ON DELETE CASCADE,
    line_item_id        UUID          REFERENCES laser_line_items(id) ON DELETE SET NULL,
    original_filename   VARCHAR(500)  NOT NULL,
    posnr_key           VARCHAR(200)  NOT NULL DEFAULT '',
    file_path           VARCHAR(1000) NOT NULL,
    uploaded_by         UUID          REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at         TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_laser_nc_files_job       ON laser_nc_files(laser_job_id);
CREATE INDEX IF NOT EXISTS idx_laser_nc_files_line_item ON laser_nc_files(line_item_id);

-- One NC file per posnr per job (empty posnr excluded from uniqueness)
CREATE UNIQUE INDEX IF NOT EXISTS idx_laser_nc_files_job_posnr
    ON laser_nc_files(laser_job_id, posnr_key)
    WHERE posnr_key <> '';
