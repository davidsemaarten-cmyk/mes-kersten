-- Migration 016: Laser PDF files table
-- Stores individual drawing pages extracted from Tekla "ONDERDELEN POSNR" PDF exports.
-- Each row represents one page (= one part drawing) from a multi-page PDF.

CREATE TABLE laser_pdf_files (
    id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    laser_job_id            UUID          NOT NULL REFERENCES laser_jobs(id) ON DELETE CASCADE,
    line_item_id            UUID          REFERENCES laser_line_items(id) ON DELETE SET NULL,
    original_pdf_filename   VARCHAR(500)  NOT NULL,
    page_number             INTEGER       NOT NULL,
    posnr_key               VARCHAR(200)  NOT NULL DEFAULT '',
    file_path               VARCHAR(1000) NOT NULL,
    thumbnail_png           TEXT,          -- base64-encoded PNG thumbnail (pre-generated)
    uploaded_by             UUID          REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at             TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Index for quick lookup by job
CREATE INDEX idx_laser_pdf_files_job        ON laser_pdf_files(laser_job_id);
CREATE INDEX idx_laser_pdf_files_line_item  ON laser_pdf_files(line_item_id);

-- Enforce one drawing per Posnr per job (empty posnr_key rows are excluded from the constraint)
CREATE UNIQUE INDEX idx_laser_pdf_files_job_posnr
    ON laser_pdf_files(laser_job_id, posnr_key)
    WHERE posnr_key <> '';
