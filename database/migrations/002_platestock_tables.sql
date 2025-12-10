-- PlateStock Module Tables Migration
-- Version: 1.0
-- Date: 2024-12-03

-- ==================================================
-- MATERIALS TABLE
-- ==================================================

CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prefix TEXT NOT NULL,  -- DEPRECATED: old field, keep for compatibility
    plaatcode TEXT NOT NULL UNIQUE,  -- SHORT code for plate numbering (e.g., "S235ZW")
    naam TEXT NOT NULL,  -- FULL name for UI display (e.g., "S235 zwart")
    kleur TEXT NOT NULL,  -- Hex color code (e.g., "#3B82F6")
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ==================================================
-- PLATES TABLE
-- ==================================================

CREATE TABLE IF NOT EXISTS plates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plate_number TEXT NOT NULL UNIQUE,  -- e.g., "S235ZW-042"
    material_prefix TEXT NOT NULL,  -- Links to materials.plaatcode
    quality TEXT NOT NULL,  -- e.g., "S235JR", "AISI 304"
    thickness NUMERIC(5,1) NOT NULL,  -- mm (e.g., 3.0, 12.5)
    width INTEGER NOT NULL,  -- mm
    length INTEGER NOT NULL,  -- mm
    weight NUMERIC(8,2),  -- kg (optional, calculated or measured)
    location TEXT,  -- Storage location (e.g., "Lade 3", "Pallet 1", "Bij Laser")
    notes TEXT,  -- Free-form notes
    barcode TEXT,  -- QR/barcode for scanning (future feature)
    status TEXT DEFAULT 'beschikbaar',  -- 'beschikbaar', 'geclaimd', 'bij_laser'
    bij_laser_sinds TIMESTAMP,  -- When moved to laser (if status='bij_laser')
    is_consumed BOOLEAN DEFAULT FALSE,  -- Plate fully used up
    consumed_at TIMESTAMP,
    consumed_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT check_status CHECK (status IN ('beschikbaar', 'geclaimd', 'bij_laser'))
);

-- ==================================================
-- CLAIMS TABLE
-- ==================================================

CREATE TABLE IF NOT EXISTS claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plate_id UUID NOT NULL REFERENCES plates(id) ON DELETE CASCADE,
    project_number TEXT,  -- DEPRECATED: old field
    project_naam TEXT NOT NULL,  -- e.g., "STAGR", "APIER3"
    project_fase TEXT NOT NULL,  -- 3-digit text: "001", "042", "130"
    actief BOOLEAN DEFAULT TRUE,  -- Active claim or released
    area_needed NUMERIC(8,2),  -- DEPRECATED: old field
    m2_geclaimd NUMERIC(8,2),  -- Specific m2 claimed (for partial claims)
    claimed_by UUID NOT NULL REFERENCES users(id),
    claimed_at TIMESTAMP DEFAULT NOW(),
    notes TEXT,

    CONSTRAINT check_project_fase_format CHECK (project_fase ~ '^\d{3}$')
);

-- ==================================================
-- INDEXES
-- ==================================================

-- Plates indexes
CREATE INDEX IF NOT EXISTS idx_plates_material ON plates(material_prefix);
CREATE INDEX IF NOT EXISTS idx_plates_status ON plates(status);
CREATE INDEX IF NOT EXISTS idx_plates_location ON plates(location);
CREATE INDEX IF NOT EXISTS idx_plates_consumed ON plates(is_consumed);
CREATE INDEX IF NOT EXISTS idx_plates_created_by ON plates(created_by);

-- Claims indexes
CREATE INDEX IF NOT EXISTS idx_claims_plate ON claims(plate_id);
CREATE INDEX IF NOT EXISTS idx_claims_project ON claims(project_naam, project_fase);
CREATE INDEX IF NOT EXISTS idx_claims_actief ON claims(actief);
CREATE INDEX IF NOT EXISTS idx_claims_claimed_by ON claims(claimed_by);

-- Materials indexes
CREATE INDEX IF NOT EXISTS idx_materials_plaatcode ON materials(plaatcode);

-- ==================================================
-- TRIGGERS
-- ==================================================

-- Update timestamp trigger for materials
CREATE TRIGGER update_materials_updated_at
    BEFORE UPDATE ON materials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Update timestamp trigger for plates
CREATE TRIGGER update_plates_updated_at
    BEFORE UPDATE ON plates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ==================================================
-- SEED DATA
-- ==================================================

-- Insert common materials
INSERT INTO materials (plaatcode, naam, kleur, prefix) VALUES
('S235ZW', 'S235 zwart', '#1F2937', 'S235ZW'),
('S235VZ', 'S235 verzinkt', '#71717A', 'S235VZ'),
('S355', 'S355', '#374151', 'S355'),
('RVS304', 'RVS 304', '#E5E7EB', 'RVS304'),
('RVS316', 'RVS 316', '#D1D5DB', 'RVS316'),
('ALU', 'Aluminium', '#9CA3AF', 'ALU'),
('CORTENSTAAL', 'Cortenstaal', '#92400E', 'CORTENSTAAL')
ON CONFLICT (plaatcode) DO NOTHING;

-- ==================================================
-- COMMENTS
-- ==================================================

COMMENT ON TABLE materials IS 'Material types with display names and plate codes';
COMMENT ON TABLE plates IS 'Individual plate inventory items';
COMMENT ON TABLE claims IS 'Project claims on plates (supports multiple claims per plate)';

COMMENT ON COLUMN plates.status IS 'beschikbaar=available, geclaimd=has claims, bij_laser=at laser station';
COMMENT ON COLUMN plates.bij_laser_sinds IS 'Timestamp when moved to laser (only when status=bij_laser)';
COMMENT ON COLUMN claims.actief IS 'Active claim (true) or released (false)';
COMMENT ON COLUMN claims.m2_geclaimd IS 'Specific m2 claimed for partial usage';
COMMENT ON COLUMN claims.project_fase IS 'Must be 3-digit string (001, 042, etc)';
