-- =====================================================
-- MES Kersten Database Migration Script
-- File: 007_fix_test_user_passwords.sql
-- Description: Fixes incorrect password hash for test users
-- Author: Claude Code
-- Date: 2025-12-12
-- Phase: 0 - Foundation & Refactoring (Hotfix)
-- =====================================================

-- ⚠️ WARNING: This migration updates password hashes for test users
-- ⚠️ ONLY run this in DEVELOPMENT environment

-- Check if we're in a development environment
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_database WHERE datname = 'mes_kersten_prod') THEN
        RAISE EXCEPTION 'SAFETY CHECK FAILED: This migration should not run in production!';
    END IF;
END $$;

-- =====================================================
-- FIX PASSWORD HASHES FOR TEST USERS
-- =====================================================

-- Correct password hash for 'test123' (verified with bcrypt)
-- Hash: $2b$12$YhONBwviMJ2vZA4Sf.qGv.fI1M.fHu5sle1NrmSf/uycbASmfLASS

UPDATE users
SET password_hash = '$2b$12$YhONBwviMJ2vZA4Sf.qGv.fI1M.fHu5sle1NrmSf/uycbASmfLASS'
WHERE email IN (
    'werkvoorbereider@kersten.nl',
    'werkplaats@kersten.nl',
    'logistiek@kersten.nl',
    'tekenaar@kersten.nl',
    'laser@kersten.nl',
    'buislaser@kersten.nl',
    'kantbank@kersten.nl'
);

-- =====================================================
-- LOG THE FIX
-- =====================================================

INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
SELECT
    (SELECT id FROM users WHERE email = 'admin@kersten.nl'),
    'fix_test_user_passwords',
    'user',
    NULL,
    jsonb_build_object(
        'note', 'Fixed incorrect password hashes for test users',
        'affected_users', ARRAY[
            'werkvoorbereider@kersten.nl',
            'werkplaats@kersten.nl',
            'logistiek@kersten.nl',
            'tekenaar@kersten.nl',
            'laser@kersten.nl',
            'buislaser@kersten.nl',
            'kantbank@kersten.nl'
        ],
        'new_password', 'test123'
    );

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count
    FROM users
    WHERE email LIKE '%@kersten.nl'
    AND email != 'admin@kersten.nl'
    AND password_hash = '$2b$12$YhONBwviMJ2vZA4Sf.qGv.fI1M.fHu5sle1NrmSf/uycbASmfLASS';

    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Migration 007_fix_test_user_passwords.sql complete';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Updated % test user password hashes', updated_count;
    RAISE NOTICE 'All test users now use password: test123';
    RAISE NOTICE 'Admin user still uses password: admin123';
    RAISE NOTICE '==============================================';
END $$;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
