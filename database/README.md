# Database Migrations

This directory contains SQL migration scripts for the MES Kersten database.

## Structure

```
database/
├── README.md                   # This file
├── run_migration.py           # Migration runner script
└── migrations/
    ├── 001_core_tables.sql    # Initial core tables
    └── ...                     # Future migrations
```

## Running Migrations

### Prerequisites

1. PostgreSQL 15+ installed and running
2. Database 'mes_kersten' created
3. Python 3.11+ with psycopg2 installed

### Run a Specific Migration

```bash
cd database
py -3.11 run_migration.py 001_core_tables.sql
```

### Run All Migrations (in order)

```bash
cd database
py -3.11 run_migration.py --all
```

## Migration Naming Convention

Migrations should be named: `NNN_description.sql`

Examples:
- `001_core_tables.sql`
- `002_platestock_tables.sql`
- `003_project_tables.sql`

## What's in 001_core_tables.sql?

The initial migration creates:

### Tables
- **users** - User accounts with email/password
- **user_roles** - Role assignments (admin, werkvoorbereider, werkplaats)
- **audit_logs** - Action logging for compliance

### Functions
- **auth_uid()** - Get current user from JWT context
- **has_role(user_id, role_name)** - Check if user has a specific role
- **update_updated_at()** - Trigger function to auto-update timestamps

### Seed Data
- Default admin user:
  - Email: `admin@kersten.nl`
  - Password: `admin123` (change in production!)
  - Role: admin

## Verifying Migration

After running the migration, verify with:

```sql
-- Connect to database
psql -U postgres -d mes_kersten

-- Check tables
\dt

-- Check functions
\df

-- Check admin user
SELECT u.email, u.full_name, array_agg(ur.role) AS roles
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
WHERE u.email = 'admin@kersten.nl'
GROUP BY u.id, u.email, u.full_name;
```

## Troubleshooting

**"psycopg2 not installed"**
```bash
pip install psycopg2-binary
```

**"Connection refused"**
- Check PostgreSQL is running
- Verify connection settings in run_migration.py

**"Database does not exist"**
```bash
psql -U postgres
CREATE DATABASE mes_kersten;
\q
```

**"Permission denied"**
- Ensure postgres user has correct password
- Update DB_CONFIG in run_migration.py if needed
