-- Migration 013: DXF file linking for laser line items
-- Stores uploaded DXF files with pre-generated SVG thumbnails.
-- Each DXF is optionally matched to a specific laser_line_item.

CREATE TABLE laser_dxf_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    laser_job_id UUID NOT NULL REFERENCES laser_jobs(id) ON DELETE CASCADE,
    csv_import_id UUID REFERENCES laser_csv_imports(id) ON DELETE SET NULL,
    line_item_id UUID REFERENCES laser_line_items(id) ON DELETE SET NULL,

    original_filename VARCHAR(500) NOT NULL,
    -- filename without extension, used for matching (lowercase)
    posnr_key VARCHAR(500) NOT NULL DEFAULT '',

    file_content TEXT NOT NULL,
    thumbnail_svg TEXT,

    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_laser_dxf_files_job_id     ON laser_dxf_files(laser_job_id);
CREATE INDEX idx_laser_dxf_files_line_item  ON laser_dxf_files(line_item_id);
CREATE INDEX idx_laser_dxf_files_import     ON laser_dxf_files(csv_import_id);
