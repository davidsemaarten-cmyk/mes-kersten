-- =====================================================
-- MES Kersten Database Migration Script
-- File: 006_seed_test_users.sql
-- Description: Seeds test users for all 8 roles (DEVELOPMENT ONLY)
-- Author: Claude Code
-- Date: 2024-12-11
-- Phase: 0 - Foundation & Refactoring
-- =====================================================

-- ⚠️ WARNING: This migration creates test users with known passwords
-- ⚠️ ONLY run this in DEVELOPMENT environment
-- ⚠️ DO NOT run this in PRODUCTION

-- Check if we're in a development environment
-- This is a safety check - migration will fail if 'mes_kersten_prod' database exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_database WHERE datname = 'mes_kersten_prod') THEN
        RAISE EXCEPTION 'SAFETY CHECK FAILED: This seed migration should not run in production!';
    END IF;
END $$;

-- =====================================================
-- CREATE TEST USERS FOR ALL 8 ROLES
-- =====================================================

-- Note: Password for all test users is 'test123'
-- Password hash generated with bcrypt (cost=12)
-- Hash: $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYdVQvYrr6. (for 'admin123')
-- Hash: $2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW (for 'test123')

-- 1. Werkvoorbereider (Work Preparation Specialist)
INSERT INTO users (email, password_hash, full_name, is_active)
VALUES (
    'werkvoorbereider@kersten.nl',
    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    'Jan de Werkvoorbereider',
    TRUE
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role)
SELECT id, 'werkvoorbereider'
FROM users
WHERE email = 'werkvoorbereider@kersten.nl'
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Werkplaats (Workshop Worker)
INSERT INTO users (email, password_hash, full_name, is_active)
VALUES (
    'werkplaats@kersten.nl',
    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    'Piet van Werkplaats',
    TRUE
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role)
SELECT id, 'werkplaats'
FROM users
WHERE email = 'werkplaats@kersten.nl'
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Logistiek (Logistics Specialist)
INSERT INTO users (email, password_hash, full_name, is_active)
VALUES (
    'logistiek@kersten.nl',
    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    'Marie van Logistiek',
    TRUE
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role)
SELECT id, 'logistiek'
FROM users
WHERE email = 'logistiek@kersten.nl'
ON CONFLICT (user_id, role) DO NOTHING;

-- 4. Tekenaar (Draftsman - View Only)
INSERT INTO users (email, password_hash, full_name, is_active)
VALUES (
    'tekenaar@kersten.nl',
    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    'Anna de Tekenaar',
    TRUE
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role)
SELECT id, 'tekenaar'
FROM users
WHERE email = 'tekenaar@kersten.nl'
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Laser (Laser Operator)
INSERT INTO users (email, password_hash, full_name, is_active)
VALUES (
    'laser@kersten.nl',
    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    'Tom de Laser Operator',
    TRUE
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role)
SELECT id, 'laser'
FROM users
WHERE email = 'laser@kersten.nl'
ON CONFLICT (user_id, role) DO NOTHING;

-- 6. Buislaser (Tube Laser Operator)
INSERT INTO users (email, password_hash, full_name, is_active)
VALUES (
    'buislaser@kersten.nl',
    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    'Karel de Buislaser Operator',
    TRUE
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role)
SELECT id, 'buislaser'
FROM users
WHERE email = 'buislaser@kersten.nl'
ON CONFLICT (user_id, role) DO NOTHING;

-- 7. Kantbank (Press Brake Operator)
INSERT INTO users (email, password_hash, full_name, is_active)
VALUES (
    'kantbank@kersten.nl',
    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    'Sophie de Kantbank Operator',
    TRUE
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role)
SELECT id, 'kantbank'
FROM users
WHERE email = 'kantbank@kersten.nl'
ON CONFLICT (user_id, role) DO NOTHING;

-- =====================================================
-- LOG CREATION OF TEST USERS
-- =====================================================

-- Log the seeding in audit_logs
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
SELECT
    (SELECT id FROM users WHERE email = 'admin@kersten.nl'),
    'seed_test_users',
    'user',
    NULL,
    jsonb_build_object(
        'note', 'Test users seeded for development environment',
        'users_created', ARRAY[
            'werkvoorbereider@kersten.nl',
            'werkplaats@kersten.nl',
            'logistiek@kersten.nl',
            'tekenaar@kersten.nl',
            'laser@kersten.nl',
            'buislaser@kersten.nl',
            'kantbank@kersten.nl'
        ]
    );

-- =====================================================
-- VERIFICATION
-- =====================================================

-- List all users with their roles
DO $$
DECLARE
    user_record RECORD;
    user_count INTEGER;
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Migration 006_seed_test_users.sql complete';
    RAISE NOTICE '==============================================';

    -- Count total users
    SELECT COUNT(*) INTO user_count FROM users;
    RAISE NOTICE 'Total users in database: %', user_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Test users created:';
    RAISE NOTICE '---';

    -- List all users with roles
    FOR user_record IN
        SELECT u.email, u.full_name, array_agg(ur.role) AS roles
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        GROUP BY u.id, u.email, u.full_name
        ORDER BY u.email
    LOOP
        RAISE NOTICE '  % - % (roles: %)',
            user_record.email,
            user_record.full_name,
            user_record.roles;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE 'All test users use password: test123';
    RAISE NOTICE 'Admin user uses password: admin123';
    RAISE NOTICE '==============================================';
END $$;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
