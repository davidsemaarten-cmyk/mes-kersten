# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MES Kersten** is a Manufacturing Execution System for M.C. Kersten Amsterdam, built to optimize werkvoorbereider (production planner) workflows. The application manages production planning, plate stock inventory, project management, and cutting list optimization.

**Tech Stack:**
- Backend: Python 3.11+ with FastAPI, SQLAlchemy, PostgreSQL 15+
- Frontend: React 18 with TypeScript, Vite, TailwindCSS, shadcn/ui
- Database: PostgreSQL with UUID primary keys and SQL migrations
- Authentication: JWT tokens with role-based access (8 roles: admin, werkvoorbereider, werkplaats, logistiek, tekenaar, laser, buislaser, kantbank)

## Development Commands

### Backend Development

```bash
# Start backend server (from project root or backend/)
cd backend
python main.py

# Or using venv
venv\Scripts\python main.py

# Install dependencies
pip install -r requirements.txt

# Backend runs on: http://localhost:8000
# API docs: http://localhost:8000/docs
# Health check: http://localhost:8000/health
```

### Frontend Development

```bash
# Start frontend dev server (from project root or frontend/)
cd frontend
npm run dev

# Install dependencies
npm install

# Build for production
npm run build

# Lint
npm run lint

# Frontend runs on: http://localhost:5173
# Proxies /api requests to backend (see vite.config.ts)
```

### Database Operations

```bash
# Run specific migration
cd database
py -3.11 run_migration.py 001_core_tables.sql

# Run all migrations
py -3.11 run_migration.py --all

# Connect to database
psql -U postgres -d mes_kersten
```

**Migration files:**
- `001_core_tables.sql` - Users, roles, audit logs, auth functions
- `002_platestock_tables.sql` - Materials, plates, claims tables
- `003_refactor_materials.sql` - Material schema updates
- `004_expand_roles_system.sql` - Expand to 8 roles, digital signatures, enhanced audit logging

## Architecture Guidelines

### Backend Architecture

**Directory Structure:**
- `main.py` - FastAPI app entry point, CORS, exception handlers, router registration
- `config.py` - Pydantic settings with strict validation (requires .env)
- `database.py` - SQLAlchemy engine, session management, get_db() dependency
- `api/` - API route handlers (auth.py, platestock.py)
- `models/` - SQLAlchemy ORM models (user.py, material.py, plate.py, claim.py, user_role.py)
- `schemas/` - Pydantic request/response schemas (user.py, platestock.py)
- `services/` - Business logic layer (platestock.py)
- `utils/` - Utility functions (auth.py for JWT, audit.py for audit logging)
- `migrations/` - Migration tracking (002_make_material_prefix_nullable.py)

**Critical Patterns:**
1. **Exception Handlers First**: Exception handlers are registered BEFORE routers in main.py. This ensures validation errors (422) are properly caught and formatted.

2. **Service Layer**: Business logic belongs in `services/`, NOT in route handlers. Routes should be thin wrappers that call service methods.

3. **Role-Based Access**: Use helper functions `check_admin()` and `check_admin_or_werkvoorbereider()` from platestock.py as patterns for authorization. All 8 roles defined in `types/roles.ts`.

4. **Audit Logging**: Use `log_action()` from `utils/audit.py` to track user actions with entity references.
   - **Transaction Safety**: Default behavior does NOT auto-commit (use `auto_commit=False`)
   - Always call `log_action()` BEFORE committing the main transaction
   - Use `AuditAction` and `EntityType` enums for consistency
   - Example:
     ```python
     from utils.audit import log_action, AuditAction, EntityType

     new_project = Project(...)
     db.add(new_project)
     db.flush()  # Get ID without committing
     log_action(db, user_id, AuditAction.CREATE_PROJECT,
                EntityType.PROJECT, new_project.id)
     db.commit()  # Commits both atomically
     ```

5. **Database Sessions**: Always use `db: Session = Depends(get_db)` for automatic session cleanup.

6. **UUID Primary Keys**: All tables use UUID primary keys via PostgreSQL's gen_random_uuid().

7. **Timestamps**: Use `created_at` and `updated_at` fields with server defaults (func.now()).

### Frontend Architecture

**Directory Structure:**
- `src/main.tsx` - React entry point
- `src/App.tsx` - Router configuration, QueryClient setup, AuthProvider
- `src/pages/` - Page components (Login, Dashboard, Voorraad, Claims, Werkplaats, Admin)
- `src/components/` - Reusable UI components (shadcn/ui based)
- `src/hooks/` - Custom React hooks (useAuth.tsx, usePermissions.ts, usePlateStock.ts)
- `src/lib/` - Utilities (api.ts for axios, utils.ts for helpers)
- `src/types/` - TypeScript type definitions (roles.ts with UserRole and RolePermissions, database.ts)

**Critical Patterns:**
1. **API Client**: Use the configured `api` instance from `src/lib/api.ts`. It includes:
   - Automatic Bearer token injection from localStorage
   - 401 redirect to /login

2. **Role-Based Permissions**: Use `usePermissions()` hook to check user permissions:
   ```tsx
   const { permissions, hasPermission } = usePermissions();
   if (permissions.canCreateProjects) { /* render create button */ }
   ```
   - All 8 roles defined in `types/roles.ts`
   - getRolePermissions() returns permission object for each role

3. **React Query**: All API calls should use @tanstack/react-query with appropriate caching strategies (see App.tsx for QueryClient config).

4. **Authentication**: The AuthProvider context provides authentication state. Check `hooks/useAuth.tsx` for the auth pattern.

5. **Routing**: Uses react-router-dom v6 with future flags enabled (v7_startTransition, v7_relativeSplatPath).

6. **UI Components**: Use shadcn/ui components from `src/components/` directory. Don't add new component libraries without good reason.

7. **Toaster**: Global toast notifications via sonner (configured in App.tsx).

### Database Design Patterns

**Key Conventions:**
1. **Table Names**: Plural snake_case (users, user_roles, audit_logs, materials, plates, claims)

2. **Foreign Keys**: Use `REFERENCES table(id) ON DELETE CASCADE` pattern for dependent data, or no cascade for audit trail preservation

3. **Enums via CHECK**: Use CHECK constraints for enums (e.g., `role IN ('admin', 'werkvoorbereider', 'werkplaats')`)

4. **Indexes**: Create indexes on foreign keys and frequently queried columns

5. **Soft Deletes**: Use flags like `is_active`, `is_consumed`, `actief` rather than deleting records

6. **Timestamps**: Include `created_at` and `updated_at` on all tables

7. **Audit Trail**: The audit_logs table tracks important actions with JSONB details

### PlateStock Module Specifics

**Plate Number Generation:**
- Pattern: `PREFIX-XXX` (e.g., "S235GE-042")
- Service method: `PlateStockService.generate_plate_number()` with collision detection
- CRITICAL: Always checks if number exists before returning (prevents duplicate key errors)

**Material Prefix:**
- Pattern: MATERIAALGROEP + SPEC + FIRST_2_LETTERS_OPPERVLAKTE
- Examples: "S235GE", "RVS316GL", "ALU5083NA"
- Service method: `PlateStockService.generate_prefix_suggestion()`
- Prefix cannot be edited if plates exist with that prefix

**Plate Status Flow:**
- `beschikbaar` → `geclaimd` (when claim added) → `bij_laser` (manual move) → back to `beschikbaar`/`geclaimd`
- `is_consumed=True` is terminal state
- Service method: `PlateStockService.update_plate_status()` auto-updates based on claims

**Multi-Claim Support:**
- Multiple projects can claim the same plate
- Claim has `actief` boolean (soft delete pattern)
- Plate status = 'geclaimd' if ANY active claims exist

**Area Calculations:**
- Dimensions stored in mm (width, length)
- Area calculated in m² via `PlateStockService.calculate_plate_area()`
- Returns Decimal for precision

## Configuration & Environment

**Backend (.env required):**
```
DATABASE_URL=postgresql://user:password@localhost:5432/mes_kersten
SECRET_KEY=<secure-64-char-token>
DEBUG=False  # Never True in production
ENVIRONMENT=development
```

**Security Validations in config.py:**
- SECRET_KEY must be 32+ chars and not contain common insecure patterns
- DATABASE_URL must start with postgresql:// and not contain weak passwords
- DEBUG cannot be True in production
- CORS_ORIGINS cannot contain localhost in production

**Frontend Environment:**
- `VITE_API_URL` - Optional, defaults to http://localhost:8000

## Common Development Tasks

### Adding a New API Endpoint

1. Define Pydantic schema in `backend/schemas/`
2. Add route handler in appropriate `backend/api/` file
3. Business logic goes in `backend/services/`
4. Register router in `main.py` if new module
5. Test via FastAPI docs at /docs

### Adding a New Database Table

1. Create migration file: `database/migrations/NNN_description.sql`
2. Define table with UUID primary key, timestamps, indexes
3. Create SQLAlchemy model in `backend/models/`
4. Run migration: `py -3.11 run_migration.py NNN_description.sql`
5. Update relevant service classes

### Adding a New Frontend Page

1. Create page component in `src/pages/`
2. Add route in `src/App.tsx`
3. Create API hooks in `src/hooks/` if needed
4. Use React Query for data fetching
5. Use shadcn/ui components for UI

## Testing Approach

**Backend:**
- Manual testing via FastAPI docs (/docs) during development
- Test files exist: test_db.py, test_login_debug.py, test_password.py
- Use pytest for automated tests (pytest installed in requirements.txt)

**Frontend:**
- Manual testing in browser during development
- React component testing (future: add testing-library)

**Database:**
- Test migrations in development database first
- Verify with psql queries
- Check constraints and indexes are created

## Common Pitfalls & Solutions

### Backend Issues

**"Configuration Error" on startup:**
- Missing .env file or required environment variables
- Check config.py validation messages
- Generate SECRET_KEY: `python -c "import secrets; print(secrets.token_urlsafe(64))"`

**"Validation error" (422) not formatted:**
- Exception handlers must be registered BEFORE routers in main.py
- See main.py:74-90 for validation_exception_handler pattern

**Duplicate plate numbers:**
- Use PlateStockService.generate_plate_number() which includes collision detection
- Never manually construct plate numbers

### Frontend Issues

**API calls fail with CORS error:**
- Check backend CORS_ORIGINS in main.py (ports 5173-5177 allowed)
- Ensure Vite proxy is configured (see vite.config.ts)

**Token expiration:**
- Tokens expire after 24 hours (ACCESS_TOKEN_EXPIRE_MINUTES in config.py)
- api.ts interceptor auto-redirects to /login on 401

**TypeScript errors with shadcn/ui:**
- Check tsconfig.json has proper path alias: `"@/*": ["./src/*"]`
- Verify vite.config.ts has matching alias

### Database Issues

**Migration fails:**
- Check PostgreSQL is running
- Verify database exists: `psql -U postgres -l`
- Check connection credentials in run_migration.py

**Constraint violations:**
- Review CHECK constraints (especially role enums)
- Ensure foreign key relationships exist before inserting

## Module Status

### ✅ PlateStock (Implemented)
Fully functional plate inventory management system with materials, plates, claims, statistics, and role-based access.

**API Endpoints:** `/api/platestock/`
**Frontend Pages:** Voorraad, Claims, Werkplaats, Admin
**Database Tables:** materials, plates, claims

### 🔨 Future Modules (Planned)
- Project Management - Projects and phases with permissions
- File Handling - Upload/storage of STEP, DXF, PDF, XSR files
- Order Management - Purchase orders and delivery tracking
- Cutting Lists - Optimized saw lists for profiles and plates
- Planning - Gantt charts and calendar for project planning

## Conventions & Style

**Python:**
- Use type hints for function parameters and returns
- Docstrings for all public functions (Google style)
- snake_case for variables, functions, files
- PascalCase for classes
- Import order: stdlib, third-party, local

**TypeScript:**
- Strict mode enabled (tsconfig.json)
- camelCase for variables and functions
- PascalCase for components and types
- Use functional components with hooks
- Export types alongside functions

**SQL:**
- SQL keywords in UPPERCASE
- Table/column names in lowercase snake_case
- Comments explaining complex logic
- Migrations are immutable once applied

**Commit Messages:**
- Descriptive, focus on "why" not "what"
- Reference module/feature (e.g., "PlateStock: fix duplicate plate numbers")

## Security Considerations

1. **Never commit secrets:** .env files are gitignored
2. **Password hashing:** Uses bcrypt via passlib (see utils/auth.py)
3. **JWT tokens:** HS256 algorithm with secure SECRET_KEY
4. **SQL injection:** SQLAlchemy ORM prevents injection
5. **XSS protection:** React escapes by default
6. **CORS:** Strictly configured for localhost in development
7. **Role checks:** Enforce authorization in every protected endpoint
8. **Audit logging:** Use audit_logs table for compliance-critical actions

## Getting Help

**Error messages are your friend:**
- Backend: Check terminal running `python main.py`
- Frontend: Check browser console and Vite terminal
- Database: Check psql output or backend logs

**API Documentation:**
- Interactive API docs always available at http://localhost:8000/docs
- Try endpoints directly in the browser

**Module Documentation:**
- Check `/docs/modules/` for detailed feature specifications
- Additional documentation may exist in README.md and other markdown files in the root
