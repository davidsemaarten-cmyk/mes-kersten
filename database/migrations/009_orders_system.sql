-- =====================================================
-- MES Kersten Database Migration Script
-- File: 009_orders_system.sql
-- Description: Creates orders system tables - Order Types, Orderreeksen, Orders, Posnummers
-- Author: Claude Code
-- Date: 2024-12-13
-- Phase: 1.2 - Orders System
-- =====================================================

-- =====================================================
-- ORDER TYPES TABLE (Predefined order types)
-- =====================================================

CREATE TABLE IF NOT EXISTS order_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Type information
    name VARCHAR(50) UNIQUE NOT NULL,
    icon VARCHAR(50) NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE order_types IS 'Predefined order types (Zagen, Boren, etc.)';
COMMENT ON COLUMN order_types.name IS 'Order type name (e.g., "Zagen", "Boren", "Plaat snijden")';
COMMENT ON COLUMN order_types.icon IS 'Icon identifier for UI (e.g., "saw", "drill")';
COMMENT ON COLUMN order_types.sort_order IS 'Default sort order for display';

-- Insert default order types
INSERT INTO order_types (name, icon, sort_order) VALUES
    ('Zagen', 'saw', 1),
    ('Boren', 'drill', 2),
    ('Kanten', 'edge', 3),
    ('Lassen', 'weld', 4),
    ('Afmonteren', 'assemble', 5),
    ('Plaat snijden', 'laser', 6),
    ('Profiel snijden', 'pipe', 7)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- ORDERREEKSEN TABLE (Sequences of orders)
-- =====================================================

CREATE TABLE IF NOT EXISTS orderreeksen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent relationship
    fase_id UUID NOT NULL REFERENCES fases(id) ON DELETE CASCADE,

    -- Identification
    title VARCHAR(100) NOT NULL DEFAULT 'Volledig',

    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_uitvoering', 'afgerond')),

    -- Soft delete
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE orderreeksen IS 'Order sequences (e.g., "Volledig", "West", "Oost") - groups of orders for a fase';
COMMENT ON COLUMN orderreeksen.fase_id IS 'Parent fase reference. Cascades on delete.';
COMMENT ON COLUMN orderreeksen.title IS 'Title of the order sequence (e.g., "Volledig" for all parts, or "West"/"Oost" for split production)';
COMMENT ON COLUMN orderreeksen.status IS 'Orderreeks status: open, in_uitvoering (in progress), afgerond (completed)';

-- =====================================================
-- ORDERS TABLE (Individual production steps)
-- =====================================================

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent relationships
    orderreeks_id UUID NOT NULL REFERENCES orderreeksen(id) ON DELETE CASCADE,
    order_type_id UUID NOT NULL REFERENCES order_types(id),

    -- Sequence
    sequence_position INTEGER NOT NULL,

    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_uitvoering', 'afgerond', 'blocked')),

    -- Assignment
    assigned_to UUID NULL REFERENCES users(id),

    -- Timestamps
    started_at TIMESTAMPTZ NULL,
    completed_at TIMESTAMPTZ NULL,
    completed_by UUID NULL REFERENCES users(id),
    approved_at TIMESTAMPTZ NULL,
    approved_by UUID NULL REFERENCES users(id),

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE orders IS 'Individual production orders (Zagen, Boren, etc.) within an orderreeks';
COMMENT ON COLUMN orders.orderreeks_id IS 'Parent orderreeks reference';
COMMENT ON COLUMN orders.order_type_id IS 'Type of order (Zagen, Boren, etc.)';
COMMENT ON COLUMN orders.sequence_position IS 'Position in the order sequence (1, 2, 3, ...)';
COMMENT ON COLUMN orders.status IS 'Order status: open, in_uitvoering, afgerond, blocked';
COMMENT ON COLUMN orders.assigned_to IS 'User assigned to this order (werkplaats role)';
COMMENT ON COLUMN orders.started_at IS 'Timestamp when order was started';
COMMENT ON COLUMN orders.completed_at IS 'Timestamp when order was completed';
COMMENT ON COLUMN orders.completed_by IS 'User who completed the order';
COMMENT ON COLUMN orders.approved_at IS 'Timestamp when order was approved';
COMMENT ON COLUMN orders.approved_by IS 'User who approved the order (werkvoorbereider)';

-- =====================================================
-- POSNUMMERS TABLE (Part numbers)
-- =====================================================

CREATE TABLE IF NOT EXISTS posnummers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent relationship
    fase_id UUID NOT NULL REFERENCES fases(id) ON DELETE CASCADE,

    -- Identification
    posnr VARCHAR(10) NOT NULL,

    -- Material information
    materiaal VARCHAR(100) NULL,
    profiel VARCHAR(100) NULL,

    -- Dimensions (in mm)
    length_mm INTEGER NULL,
    width_mm INTEGER NULL,
    height_mm INTEGER NULL,

    -- Quantity
    quantity INTEGER NOT NULL DEFAULT 1,

    -- Notes
    notes TEXT NULL,

    -- Soft delete
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint: posnr must be unique within a fase
    CONSTRAINT unique_posnr_per_fase UNIQUE (fase_id, posnr)
);

COMMENT ON TABLE posnummers IS 'Part numbers (posnummers) - individual parts/components within a fase';
COMMENT ON COLUMN posnummers.fase_id IS 'Parent fase reference. Cascades on delete.';
COMMENT ON COLUMN posnummers.posnr IS 'Part number (e.g., "001", "042"). Unique within fase.';
COMMENT ON COLUMN posnummers.materiaal IS 'Material specification (e.g., "S235", "RVS 316")';
COMMENT ON COLUMN posnummers.profiel IS 'Profile specification (e.g., "IPE 200", "Rechthoekige buis 40x40x3")';
COMMENT ON COLUMN posnummers.length_mm IS 'Length in millimeters';
COMMENT ON COLUMN posnummers.width_mm IS 'Width in millimeters';
COMMENT ON COLUMN posnummers.height_mm IS 'Height in millimeters';
COMMENT ON COLUMN posnummers.quantity IS 'Number of pieces';
COMMENT ON COLUMN posnummers.notes IS 'Additional notes or specifications';

-- =====================================================
-- ORDER_POSNUMMERS JUNCTION TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS order_posnummers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relationships
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    posnummer_id UUID NOT NULL REFERENCES posnummers(id) ON DELETE CASCADE,

    -- Status tracking
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ NULL,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint: same posnummer can't be linked to same order twice
    CONSTRAINT unique_order_posnummer UNIQUE (order_id, posnummer_id)
);

COMMENT ON TABLE order_posnummers IS 'Junction table linking orders to posnummers';
COMMENT ON COLUMN order_posnummers.order_id IS 'Order reference';
COMMENT ON COLUMN order_posnummers.posnummer_id IS 'Posnummer reference';
COMMENT ON COLUMN order_posnummers.is_completed IS 'Whether this posnummer has been completed for this order';
COMMENT ON COLUMN order_posnummers.completed_at IS 'When this posnummer was completed for this order';

-- =====================================================
-- INDEXES
-- =====================================================

-- Order types indexes
CREATE INDEX IF NOT EXISTS idx_order_types_is_active ON order_types(is_active);
CREATE INDEX IF NOT EXISTS idx_order_types_sort_order ON order_types(sort_order);

-- Orderreeksen indexes
CREATE INDEX IF NOT EXISTS idx_orderreeksen_fase_id ON orderreeksen(fase_id);
CREATE INDEX IF NOT EXISTS idx_orderreeksen_status ON orderreeksen(status);
CREATE INDEX IF NOT EXISTS idx_orderreeksen_is_active ON orderreeksen(is_active);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_orderreeks_id ON orders(orderreeks_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_type_id ON orders(order_type_id);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_to ON orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_sequence ON orders(orderreeks_id, sequence_position);

-- Posnummers indexes
CREATE INDEX IF NOT EXISTS idx_posnummers_fase_id ON posnummers(fase_id);
CREATE INDEX IF NOT EXISTS idx_posnummers_materiaal ON posnummers(materiaal);
CREATE INDEX IF NOT EXISTS idx_posnummers_is_active ON posnummers(is_active);

-- Order_posnummers indexes
CREATE INDEX IF NOT EXISTS idx_order_posnummers_order_id ON order_posnummers(order_id);
CREATE INDEX IF NOT EXISTS idx_order_posnummers_posnummer_id ON order_posnummers(posnummer_id);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Migration 009_orders_system.sql complete';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Created tables:';
    RAISE NOTICE '  - order_types (7 default types inserted)';
    RAISE NOTICE '  - orderreeksen (order sequences)';
    RAISE NOTICE '  - orders (individual production steps)';
    RAISE NOTICE '  - posnummers (part numbers)';
    RAISE NOTICE '  - order_posnummers (junction table)';
    RAISE NOTICE 'Created indexes:';
    RAISE NOTICE '  - 2 indexes on order_types';
    RAISE NOTICE '  - 3 indexes on orderreeksen';
    RAISE NOTICE '  - 5 indexes on orders';
    RAISE NOTICE '  - 3 indexes on posnummers';
    RAISE NOTICE '  - 2 indexes on order_posnummers';
    RAISE NOTICE 'Constraints:';
    RAISE NOTICE '  - order_types.name UNIQUE';
    RAISE NOTICE '  - posnummers (fase_id, posnr) UNIQUE';
    RAISE NOTICE '  - order_posnummers (order_id, posnummer_id) UNIQUE';
    RAISE NOTICE '  - CASCADE DELETE on all foreign keys';
    RAISE NOTICE '==============================================';
END $$;
