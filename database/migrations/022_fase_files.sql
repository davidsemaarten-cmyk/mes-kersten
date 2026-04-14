-- Migration 022: Fase file management
-- Adds fase_files table for general fase documents (drawings, PDFs, etc.)

CREATE TABLE IF NOT EXISTS fase_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fase_id UUID NOT NULL REFERENCES fases(id) ON DELETE CASCADE,
    filename VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fase_files_fase_id ON fase_files(fase_id);
CREATE INDEX IF NOT EXISTS idx_fase_files_uploaded_by ON fase_files(uploaded_by);
