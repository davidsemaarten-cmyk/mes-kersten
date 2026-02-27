-- =====================================================
-- MES Kersten Database Migration Script
-- File: 004_expand_roles_system.sql
-- Description: Expands user role system from 3 to 6 roles, adds digital signatures, enhances audit logging
-- Author: Claude Code
-- Date: 2024-12-10
-- Phase: 0 - Foundation & Refactoring
-- =====================================================

-- =====================================================
-- EXPAND USER ROLES
-- =====================================================

-- Drop existing CHECK constraint on user_roles table
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- Add new CHECK constraint with all 6 roles + machine operators
ALTER TABLE user_roles
ADD CONSTRAINT user_roles_role_check
CHECK (role IN (
    'admin',
    'werkvoorbereider',
    'werkplaats',
    'logistiek',
    'tekenaar',
    'laser',
    'buislaser',
    'kantbank'
));

COMMENT ON COLUMN user_roles.role IS 'User role: admin (system config), werkvoorbereider (work preparation), werkplaats (workshop), logistiek (logistics), tekenaar (draftsman view-only), laser/buislaser/kantbank (machine operators)';

-- =====================================================
-- ADD DIGITAL SIGNATURE SUPPORT
-- =====================================================

-- Add digital signature URL field to users table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'digital_signature_url'
    ) THEN
        ALTER TABLE users ADD COLUMN digital_signature_url TEXT NULL;
        COMMENT ON COLUMN users.digital_signature_url IS 'URL/path to user digital signature image for order approvals';
    END IF;
END $$;

-- Add timestamp for when signature was uploaded (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'signature_uploaded_at'
    ) THEN
        ALTER TABLE users ADD COLUMN signature_uploaded_at TIMESTAMPTZ NULL;
        COMMENT ON COLUMN users.signature_uploaded_at IS 'Timestamp when digital signature was last uploaded';
    END IF;
END $$;

-- =====================================================
-- ENHANCE AUDIT LOGGING
-- =====================================================

-- Add entity_type column (if not exists from 001_core_tables.sql)
-- This migration is backward compatible
DO $$
BEGIN
    -- Check if entity_type already has proper indexing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'audit_logs'
        AND column_name = 'entity_type'
        AND character_maximum_length = 50
    ) THEN
        -- Update column type to have explicit length
        ALTER TABLE audit_logs ALTER COLUMN entity_type TYPE VARCHAR(50);
    END IF;
END $$;

-- Add entity_id column (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'audit_logs'
        AND column_name = 'entity_id'
    ) THEN
        ALTER TABLE audit_logs ADD COLUMN entity_id UUID NULL;
    END IF;
END $$;

-- Add composite index for entity lookups (entity_type + entity_id)
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Add composite index for user action queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action);

-- Note: Index idx_user_roles_role already exists from migration 001_core_tables.sql
-- This provides efficient role-based user queries (e.g., "find all werkvoorbereiders")

COMMENT ON COLUMN audit_logs.entity_type IS 'Type of entity being audited (e.g., project, order, plate, user)';
COMMENT ON COLUMN audit_logs.entity_id IS 'UUID of the specific entity being audited';
COMMENT ON INDEX idx_audit_logs_entity IS 'Composite index for efficient entity-based audit queries';
COMMENT ON INDEX idx_audit_logs_user_action IS 'Composite index for efficient user action history queries';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- List all valid roles
COMMENT ON TABLE user_roles IS 'User role assignments. Valid roles: admin, werkvoorbereider, werkplaats, logistiek, tekenaar, laser, buislaser, kantbank';

-- Verify migration success (informational)
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Migration 004_expand_roles_system.sql complete';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Added roles: logistiek, tekenaar, laser, buislaser, kantbank';
    RAISE NOTICE 'Added users.digital_signature_url';
    RAISE NOTICE 'Added users.signature_uploaded_at';
    RAISE NOTICE 'Enhanced audit_logs with entity tracking indexes';
    RAISE NOTICE '==============================================';
END $$;
