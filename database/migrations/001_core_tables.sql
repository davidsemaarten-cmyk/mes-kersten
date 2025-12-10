-- =====================================================
-- MES Kersten Database Migration Script
-- File: 001_core_tables.sql
-- Description: Creates core tables for users, roles, and audit logging
-- Author: Claude Code
-- Date: 2024-12-03
-- =====================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);

-- User roles table
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'werkvoorbereider', 'werkplaats')),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, role)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
CREATE INDEX idx_audit_action ON audit_logs(action);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get current user from JWT context
CREATE OR REPLACE FUNCTION auth_uid()
RETURNS UUID
LANGUAGE sql STABLE
AS $$
    SELECT NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID;
$$;

-- Check if user has role
CREATE OR REPLACE FUNCTION has_role(user_id UUID, role_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = $1
        AND user_roles.role = $2
    );
END;
$$;

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Apply trigger to users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- SEED DATA
-- =====================================================

-- Default admin user
-- Email: admin@kersten.nl
-- Password: admin123
-- Password hash generated with bcrypt (cost=12)
INSERT INTO users (email, password_hash, full_name, is_active)
VALUES (
    'admin@kersten.nl',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYdVQvYrr6.',
    'Administrator',
    TRUE
);

-- Assign admin role to the default admin user
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM users
WHERE email = 'admin@kersten.nl';

-- Log the creation of admin user
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
SELECT 
    id,
    'create',
    'user',
    id,
    jsonb_build_object(
        'email', 'admin@kersten.nl',
        'full_name', 'Administrator',
        'role', 'admin',
        'note', 'Default admin user created during initial migration'
    )
FROM users
WHERE email = 'admin@kersten.nl';

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Display created tables
SELECT 'Core tables created successfully' AS status;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'user_roles', 'audit_logs')
ORDER BY table_name;

-- Display created functions
SELECT 'Helper functions created successfully' AS status;
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('auth_uid', 'has_role', 'update_updated_at')
ORDER BY routine_name;

-- Display admin user
SELECT 'Default admin user created' AS status;
SELECT u.email, u.full_name, array_agg(ur.role) AS roles
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
WHERE u.email = 'admin@kersten.nl'
GROUP BY u.id, u.email, u.full_name;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
