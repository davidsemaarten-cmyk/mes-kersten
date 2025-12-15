# Implementation Prompts Overview - ENHANCED
## AI-Assisted Development Guide with Testing & UI Verification

**Version:** 2.0 Enhanced
**Last Updated:** December 2024
**Purpose:** Comprehensive, testable prompts with UI verification for each implementation phase

---

## How to Use This Document

1. **Copy-paste each prompt** into Claude Code or your AI assistant
2. **Complete all prerequisite phases** before starting a new phase
3. **Test thoroughly** using the provided Testing Checklist before proceeding
4. **Verify UI** exists for every feature (no backend-only implementations)
5. **Mark tasks complete** only when Definition of Done is met

**Key Changes in Enhanced Version:**
- Added Testing Checklist (Backend + Frontend + Integration) to every prompt
- Added UI Components section where missing
- Added Prerequisites section
- Added Definition of Done criteria
- Expanded success validation steps

---

## Phase 0: Foundation & Refactoring

### Prompt 0.1: Expand Role System

```
Expand the user role system from 3 to 8 roles with digital signatures and enhanced audit logging.

PREREQUISITES:
- ✅ Phase 0 is starting phase (no prerequisites)
- Database is accessible and migrations can run
- Backend and frontend servers can start

CONTEXT:
Current roles: admin, werkvoorbereider, werkplaats
New roles to add: logistiek, tekenaar, laser, buislaser, kantbank
Migration 004_expand_roles_system.sql will be created

TASKS:

Backend (Database):
1. Create migration 004_expand_roles_system.sql:
   - Update user_roles CHECK constraint to include all 8 roles:
     ('admin', 'werkvoorbereider', 'werkplaats', 'logistiek', 'tekenaar', 'laser', 'buislaser', 'kantbank')
   - Add digital_signature_url VARCHAR(500) to users table
   - Add signature_uploaded_at TIMESTAMP to users table
   - Add entity_type VARCHAR(50) to audit_logs table
   - Add entity_id UUID to audit_logs table
   - Create index on audit_logs(entity_type, entity_id)
   - Create index on audit_logs(user_id, action)

2. Update backend/models/user.py:
   - Add digital_signature_url: Mapped[str | None]
   - Add signature_uploaded_at: Mapped[datetime | None]

3. Update backend/schemas/user.py:
   - Add digital_signature_url: str | None to UserResponse
   - Add signature_uploaded_at: datetime | None to UserResponse
   - Add UserSignatureUpdate schema with signature_url field

Backend (Utilities):
4. Create backend/utils/audit.py with:
   - AuditAction enum (CREATE_PROJECT, UPDATE_PROJECT, DELETE_PROJECT, CREATE_ORDER, etc.)
   - EntityType enum (PROJECT, FASE, ORDER, PLATE, CLAIM, etc.)
   - log_action(db, user_id, action, entity_type=None, entity_id=None, details=None, auto_commit=False)
   - Example usage in docstring showing flush() before log_action()

5. Create backend/api/users.py (if not exists) with signature upload endpoint:
   - PUT /api/users/me/signature - upload signature image
   - Validate image format (PNG, JPG, max 2MB)
   - Store in file system or cloud storage
   - Update user record with signature_url

Frontend (Types):
6. Create frontend/src/types/roles.ts:
   - UserRole type = 'admin' | 'werkvoorbereider' | 'werkplaats' | 'logistiek' | 'tekenaar' | 'laser' | 'buislaser' | 'kantbank'
   - RolePermissions interface with fields:
     * canViewProjects: boolean
     * canCreateProjects: boolean
     * canEditProjects: boolean
     * canDeleteProjects: boolean
     * canViewPlates: boolean
     * canManagePlates: boolean
     * canExecuteOrders: boolean
     * canApproveOrders: boolean
     * canManageUsers: boolean
     * canConfigureSystem: boolean
   - getRolePermissions(role: UserRole): RolePermissions function
   - Implement logic for each role (see PROJECT-FUNCTIONAL-OVERVIEW.md section 2)

7. Create frontend/src/hooks/usePermissions.ts:
   - Export usePermissions() hook
   - Returns { permissions: RolePermissions, hasPermission: (action: string) => boolean }
   - Gets current user from useAuth()
   - Calls getRolePermissions(user.role)

8. Update frontend/src/hooks/useAuth.tsx:
   - Ensure user object includes role field
   - Update UserType to include all 8 roles

Frontend (UI Components):
9. Create frontend/src/components/profile/SignatureUpload.tsx:
   - Image upload component with preview
   - Accepts PNG/JPG only
   - Max file size 2MB
   - Shows current signature if exists
   - "Upload nieuwe handtekening" button
   - Crop/resize interface (optional but recommended)
   - Save button calls PUT /api/users/me/signature

10. Add signature upload to user profile page:
    - Create frontend/src/pages/Profile.tsx (if not exists)
    - Include SignatureUpload component
    - Show signature preview
    - Show upload date if exists
    - Add route /profile to App.tsx

TESTING CHECKLIST:

Backend Tests (via Swagger UI at /docs):
- [ ] Run migration: cd database && py -3.11 run_migration.py 004_expand_roles_system.sql
- [ ] Verify migration success: psql -U postgres -d mes_kersten -c "\d users"
- [ ] Check signature fields exist: digital_signature_url, signature_uploaded_at
- [ ] Check audit_logs has entity_type and entity_id columns
- [ ] Test creating user with each new role via POST /api/auth/register or admin endpoint
- [ ] Verify CHECK constraint allows all 8 roles
- [ ] Test log_action() by adding to an existing endpoint (e.g., create material)
- [ ] Verify audit log entry created with entity_type and entity_id

Frontend Tests (in browser at http://localhost:5173):
- [ ] Login as admin user
- [ ] Navigate to /profile
- [ ] Verify SignatureUpload component renders
- [ ] Upload a PNG signature (< 2MB)
- [ ] Verify preview shows uploaded image
- [ ] Verify signature_uploaded_at displays
- [ ] Refresh page, verify signature persists
- [ ] Try uploading invalid file type (e.g., .txt) - should show error
- [ ] Try uploading file > 2MB - should show error

Integration Tests (end-to-end workflows):
- [ ] Create a new user with role 'logistiek'
- [ ] Login as that user
- [ ] Verify usePermissions() hook returns correct permissions for logistiek role
- [ ] Test that logistiek can view plates (canViewPlates = true)
- [ ] Test that logistiek cannot create projects (canCreateProjects = false)
- [ ] Create user with role 'tekenaar'
- [ ] Login as tekenaar
- [ ] Verify read-only access (cannot edit anything)
- [ ] Test each role to ensure permissions match PROJECT-FUNCTIONAL-OVERVIEW.md Section 2

DEFINITION OF DONE:
✅ Migration runs successfully without errors
✅ All 8 roles can be assigned to users
✅ Users can upload signature via Profile page
✅ Signature persists after upload
✅ usePermissions() hook works for all roles
✅ Each role has correct permissions (verified manually)
✅ Audit logging works with entity tracking
✅ No console errors in browser
✅ No TypeScript errors
✅ Code follows patterns in CLAUDE.md
```

---

## Phase 1: Core Data Model

### Prompt 1.1: Create Projects and Fases Tables

```
Create the core project hierarchy: Projects → Fases with full backend + frontend implementation.

PREREQUISITES:
- ✅ Phase 0.1 completed (role system expanded)
- Migrations 001-004 successfully applied
- Backend and frontend running without errors
- At least one werkvoorbereider user exists for testing

CONTEXT:
Projects are the top-level container (e.g., "Station Groningen" with code "STAGR")
Fases are phases within a project (e.g., "001 - hekken", "002 - poorten")
Each project can have multiple fases, each fase belongs to exactly one project

TASKS:

Backend (Database):
1. Create migration 005_core_hierarchy.sql with:

   Projects table:
   - id UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - code VARCHAR(10) UNIQUE NOT NULL (e.g., "STAGR")
   - name VARCHAR(200) NOT NULL (e.g., "Station Groningen")
   - description TEXT
   - status VARCHAR(20) CHECK IN ('actief', 'afgerond', 'gearchiveerd') DEFAULT 'actief'
   - created_by UUID REFERENCES users(id)
   - is_active BOOLEAN DEFAULT TRUE
   - created_at TIMESTAMP DEFAULT NOW()
   - updated_at TIMESTAMP DEFAULT NOW()
   - Indexes: (code), (created_by), (status, is_active)

   Fases table:
   - id UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - project_id UUID REFERENCES projects(id) ON DELETE CASCADE
   - fase_number VARCHAR(10) NOT NULL (e.g., "001")
   - description VARCHAR(200) NOT NULL (e.g., "hekken")
   - status VARCHAR(20) CHECK IN ('open', 'in_uitvoering', 'afgerond') DEFAULT 'open'
   - is_active BOOLEAN DEFAULT TRUE
   - created_at TIMESTAMP DEFAULT NOW()
   - updated_at TIMESTAMP DEFAULT NOW()
   - UNIQUE constraint on (project_id, fase_number)
   - Indexes: (project_id), (status, is_active)

2. Create backend/models/project.py (SQLAlchemy model):
   - All fields from projects table
   - Relationship: fases = relationship("Fase", back_populates="project")
   - Relationship: created_by_user = relationship("User")

3. Create backend/models/fase.py (SQLAlchemy model):
   - All fields from fases table
   - Relationship: project = relationship("Project", back_populates="fases")

4. Create backend/schemas/project.py:
   - ProjectCreate: code, name, description (optional)
   - ProjectUpdate: name, description, status
   - ProjectResponse: all fields + fase_count, created_by_user_name

5. Create backend/schemas/fase.py:
   - FaseCreate: fase_number, description
   - FaseUpdate: description, status
   - FaseResponse: all fields + project_code, order_count (placeholder 0 for now)

Backend (Services):
6. Create backend/services/project.py with:
   - create_project(db, user_id, data: ProjectCreate) -> Project
     * Validate unique code (case-insensitive)
     * Create project with created_by = user_id
     * Use log_action() to log CREATE_PROJECT

   - get_project_statistics(db, project_id) -> dict
     * Returns { fase_count, order_count (placeholder 0), posnummer_count (placeholder 0) }

   - list_user_projects(db, user_id, role) -> List[Project]
     * If role = 'admin': return all projects
     * Else: return projects where created_by = user_id
     * Include shared projects (Phase 6, return empty list for now)

   - update_project(db, project_code, data: ProjectUpdate) -> Project
   - soft_delete_project(db, project_code) -> bool

7. Create backend/services/fase.py with:
   - create_fase(db, project_id, data: FaseCreate) -> Fase
     * Validate unique (project_id, fase_number)
     * Use log_action() to log CREATE_FASE

   - list_fases(db, project_id) -> List[Fase]
   - update_fase(db, fase_id, data: FaseUpdate) -> Fase

Backend (API):
8. Create backend/api/projects.py with routes:
   - GET /api/projects - list projects (filtered by user permissions)
   - POST /api/projects - create project (werkvoorbereider or admin only)
   - GET /api/projects/{code} - get project detail with statistics
   - PUT /api/projects/{code} - update project
   - DELETE /api/projects/{code} - soft delete (admin only)
   - POST /api/projects/{code}/fases - create fase
   - GET /api/projects/{code}/fases - list fases for project

9. Register router in backend/main.py:
   - app.include_router(projects.router, prefix="/api/projects", tags=["projects"])

Frontend (Hooks):
10. Create frontend/src/hooks/useProjects.ts:
    - useProjects() - fetches GET /api/projects with React Query
    - useProject(code) - fetches GET /api/projects/{code}
    - useCreateProject() - mutation for POST /api/projects
    - useUpdateProject(code) - mutation for PUT /api/projects/{code}
    - useDeleteProject(code) - mutation for DELETE /api/projects/{code}
    - useFases(projectCode) - fetches GET /api/projects/{code}/fases
    - useCreateFase(projectCode) - mutation for POST /api/projects/{code}/fases

Frontend (Pages):
11. Create frontend/src/pages/Projects.tsx:
    - Header: "Projecten" + search bar + "Nieuw Project" button (if canCreateProjects)
    - Filter dropdown: Alle / Actief / Afgerond / Gearchiveerd
    - Sort dropdown: Laatste update / Project code A-Z / Aanmaakdatum
    - Grid of project cards (3 columns on desktop, 1 on mobile)
    - Each card shows:
      * Project code (large, bold)
      * Project name
      * Fase count: "3 fases"
      * Status badge
      * Last updated: "2 dagen geleden"
      * Click card → navigate to /projecten/{code}
    - Empty state: "Geen projecten" + "Maak uw eerste project" button
    - Loading state: skeleton cards

12. Create frontend/src/pages/ProjectDetail.tsx:
    - Breadcrumb: Projecten > {code}
    - Header: Project code + name
    - Edit button (if canEditProjects)
    - Delete button (if canDeleteProjects) with confirmation modal
    - "Nieuwe Fase" button (if canCreateProjects)
    - Project info section:
      * Description
      * Created by
      * Created on
      * Status badge
    - Fases section: List of fase cards (expandable)
    - Each fase card shows:
      * Fase number + description
      * Status badge
      * Order count (placeholder "0 orders")
      * File count (placeholder "0 bestanden")
      * Click → navigate to /projecten/{code}/fases/{fase_number}
    - "Nieuwe Fase" modal with form

13. Create frontend/src/components/projects/CreateProjectModal.tsx:
    - Form with fields:
      * Project code (required, max 10 chars, uppercase)
      * Project name (required)
      * Description (optional, textarea)
    - Validation: code must be unique
    - Submit calls useCreateProject()
    - Show success toast
    - Redirect to project detail page after creation

14. Create frontend/src/components/projects/CreateFaseModal.tsx:
    - Form with fields:
      * Fase nummer (required, e.g., "001")
      * Beschrijving (required)
    - Validation: fase_number unique within project
    - Submit calls useCreateFase()
    - Success toast
    - Refresh fases list

15. Add routes to frontend/src/App.tsx:
    - /projecten → Projects page
    - /projecten/:code → ProjectDetail page
    - Add "Projecten" to navigation menu

TESTING CHECKLIST:

Backend Tests (via Swagger UI at /docs):
- [ ] Run migration: cd database && py -3.11 run_migration.py 005_core_hierarchy.sql
- [ ] Verify tables exist: psql -U postgres -d mes_kersten -c "\dt projects"
- [ ] Check UNIQUE constraint on projects.code
- [ ] Check UNIQUE constraint on (project_id, fase_number) in fases
- [ ] POST /api/projects with valid data - verify 201 response
- [ ] POST /api/projects with duplicate code - verify 400 error
- [ ] GET /api/projects - verify returns list
- [ ] GET /api/projects/{code} - verify includes statistics
- [ ] POST /api/projects/{code}/fases - verify fase created
- [ ] POST same fase number twice - verify 400 error (unique constraint)
- [ ] GET /api/projects/{code}/fases - verify list returned
- [ ] PUT /api/projects/{code} - verify update works
- [ ] DELETE /api/projects/{code} as admin - verify soft delete (is_active = false)
- [ ] Verify audit_logs has entries for CREATE_PROJECT and CREATE_FASE

Frontend Tests (in browser):
- [ ] Navigate to http://localhost:5173/projecten
- [ ] Verify "Projecten" page loads
- [ ] Click "Nieuw Project" button
- [ ] Fill in form: code="STAGR", name="Station Groningen"
- [ ] Submit form
- [ ] Verify success toast appears
- [ ] Verify redirected to /projecten/STAGR
- [ ] Verify project detail page shows correct data
- [ ] Click "Nieuwe Fase" button
- [ ] Fill in form: fase_number="001", description="hekken"
- [ ] Submit
- [ ] Verify fase card appears in list
- [ ] Click fase card
- [ ] Verify redirected to /projecten/STAGR/fases/001 (may be placeholder page for now)
- [ ] Go back to /projecten
- [ ] Verify project card shows "1 fase"
- [ ] Test search bar - type "STAGR" - verify filters correctly
- [ ] Test filter dropdown - select "Actief" - verify shows only active projects

Integration Tests (end-to-end workflows):
- [ ] Login as werkvoorbereider
- [ ] Create project "STAGR" with name "Station Groningen"
- [ ] Add fase "001 - hekken"
- [ ] Add fase "002 - poorten"
- [ ] Verify project shows "2 fases" in card
- [ ] Navigate to project detail
- [ ] Verify both fases appear
- [ ] Click edit on project
- [ ] Change name to "Station Groningen - Update"
- [ ] Save
- [ ] Verify name updated
- [ ] Login as admin
- [ ] Verify can see STAGR project (created by werkvoorbereider)
- [ ] Login as werkplaats
- [ ] Verify can VIEW project but cannot create or edit
- [ ] Verify "Nieuw Project" button does NOT appear
- [ ] Login as tekenaar
- [ ] Verify can view projects (read-only)

DEFINITION OF DONE:
✅ Migration runs successfully
✅ Can create projects via UI
✅ Can create fases via UI
✅ Project list shows all projects with correct permissions
✅ Project detail shows fases
✅ Search and filter work correctly
✅ Edit and delete work (with correct permissions)
✅ Audit logging records project and fase creation
✅ Navigation between pages works
✅ No console errors
✅ No TypeScript errors
✅ Werkplaats can view but not create/edit
✅ Tekenaar has read-only access
✅ Code follows CLAUDE.md patterns
```

### Prompt 1.2: Create Orders System

```
Create the orders system: Orderreeksen → Orders → Posnummers with full UI.

PREREQUISITES:
- ✅ Phase 1.1 completed (projects and fases work)
- Can create and view projects and fases via UI
- Migration 005 successfully applied
- At least one project with one fase exists for testing

CONTEXT:
Order hierarchy: Fase → Orderreeks → Orders → Posnummers
- Orderreeks = sequence of orders (e.g., "Volledig" for all parts, or "West"/"Oost" for split production)
- Orders = individual production steps (Zagen, Boren, Plaat snijden, etc.)
- Posnummers = part numbers (e.g., "001", "042") with material, dimensions, quantity

TASKS:

Backend (Database):
1. Extend migration 005_core_hierarchy.sql (or create 005b if 005 already applied):

   Order types table (predefined order types):
   - id UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - name VARCHAR(50) UNIQUE NOT NULL (e.g., "Zagen", "Boren")
   - icon VARCHAR(50) (e.g., "saw", "drill")
   - is_active BOOLEAN DEFAULT TRUE
   - sort_order INTEGER DEFAULT 0
   - created_at TIMESTAMP DEFAULT NOW()
   - Insert default types: Zagen, Boren, Kanten, Lassen, Afmonteren, Plaat snijden, Profiel snijden

   Orderreeksen table:
   - id UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - fase_id UUID REFERENCES fases(id) ON DELETE CASCADE
   - title VARCHAR(100) DEFAULT 'Volledig' (e.g., "West", "Oost")
   - status VARCHAR(20) CHECK IN ('open', 'in_uitvoering', 'afgerond') DEFAULT 'open'
   - is_active BOOLEAN DEFAULT TRUE
   - created_at TIMESTAMP DEFAULT NOW()
   - updated_at TIMESTAMP DEFAULT NOW()
   - Indexes: (fase_id), (status, is_active)

   Orders table:
   - id UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - orderreeks_id UUID REFERENCES orderreeksen(id) ON DELETE CASCADE
   - order_type_id UUID REFERENCES order_types(id)
   - sequence_position INTEGER NOT NULL (1, 2, 3, ...)
   - status VARCHAR(20) CHECK IN ('open', 'in_uitvoering', 'afgerond', 'blocked') DEFAULT 'open'
   - assigned_to UUID REFERENCES users(id) NULL
   - started_at TIMESTAMP NULL
   - completed_at TIMESTAMP NULL
   - completed_by UUID REFERENCES users(id) NULL
   - approved_at TIMESTAMP NULL
   - approved_by UUID REFERENCES users(id) NULL
   - created_at TIMESTAMP DEFAULT NOW()
   - updated_at TIMESTAMP DEFAULT NOW()
   - Indexes: (orderreeks_id, sequence_position), (assigned_to), (status)

   Posnummers table:
   - id UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - fase_id UUID REFERENCES fases(id) ON DELETE CASCADE
   - posnr VARCHAR(10) NOT NULL (e.g., "001", "042")
   - materiaal VARCHAR(100) (e.g., "S235", "RVS 316")
   - profiel VARCHAR(100) NULL (e.g., "IPE 200", "Rechthoekige buis 40x40x3")
   - length_mm INTEGER NULL
   - width_mm INTEGER NULL
   - height_mm INTEGER NULL
   - quantity INTEGER DEFAULT 1
   - notes TEXT NULL
   - is_active BOOLEAN DEFAULT TRUE
   - created_at TIMESTAMP DEFAULT NOW()
   - updated_at TIMESTAMP DEFAULT NOW()
   - UNIQUE constraint on (fase_id, posnr)
   - Indexes: (fase_id), (materiaal)

   Order-Posnummers junction table:
   - id UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - order_id UUID REFERENCES orders(id) ON DELETE CASCADE
   - posnummer_id UUID REFERENCES posnummers(id) ON DELETE CASCADE
   - is_completed BOOLEAN DEFAULT FALSE
   - completed_at TIMESTAMP NULL
   - created_at TIMESTAMP DEFAULT NOW()
   - UNIQUE constraint on (order_id, posnummer_id)
   - Indexes: (order_id), (posnummer_id)

2. Create backend/models/order_type.py (OrderType model)
3. Create backend/models/orderreeks.py (Orderreeks model with relationships)
4. Create backend/models/order.py (Order model with relationships to orderreeks, order_type, user)
5. Create backend/models/posnummer.py (Posnummer model with relationship to fase)
6. Create backend/models/order_posnummer.py (OrderPosnummer junction table model)

7. Create backend/schemas/order_type.py:
   - OrderTypeResponse: id, name, icon, sort_order

8. Create backend/schemas/orderreeks.py:
   - OrderreeksCreate: fase_id, title, order_type_ids (list of UUID)
   - OrderreeksResponse: all fields + orders (list of OrderResponse), fase_code

9. Create backend/schemas/order.py:
   - OrderResponse: all fields + order_type_name, assigned_to_name, posnummer_count

10. Create backend/schemas/posnummer.py:
    - PosnummerCreate: posnr, materiaal, profiel, dimensions, quantity, notes
    - PosnummerUpdate: same fields
    - PosnummerResponse: all fields + file_count (placeholder 0)

Backend (Services):
11. Create backend/services/order.py with:
    - create_orderreeks(db, fase_id, title, order_type_ids) -> Orderreeks
      * Creates orderreeks
      * Creates orders for each order_type in sequence
      * sequence_position = 1, 2, 3, ...
      * Use log_action() for CREATE_ORDERREEKS

    - split_orderreeks(db, orderreeks_id, split_config) -> List[Orderreeks]
      * Placeholder for Phase 6 (returns empty list)

    - get_orders_for_user(db, user_id, role) -> List[Order]
      * If werkvoorbereider/admin: return all orders
      * If werkplaats: return orders where assigned_to = user_id
      * If laser: return orders where order_type.name = "Plaat snijden"
      * Similar filters for buislaser, kantbank

    - link_posnummers_to_order(db, order_id, posnummer_ids) -> bool
      * Creates junction records

12. Create backend/services/posnummer.py with:
    - create_posnummer(db, fase_id, data: PosnummerCreate) -> Posnummer
      * Validate unique (fase_id, posnr)
      * Use log_action()

    - list_posnummers(db, fase_id) -> List[Posnummer]
    - update_posnummer(db, posnummer_id, data: PosnummerUpdate) -> Posnummer

Backend (API):
13. Create backend/api/order_types.py:
    - GET /api/order-types - list all active order types

14. Create backend/api/orders.py:
    - POST /api/orderreeksen - create orderreeks (werkvoorbereider only)
    - GET /api/fases/{fase_id}/orderreeksen - list orderreeksen for fase
    - GET /api/orderreeksen/{id} - get single orderreeks with orders
    - PUT /api/orderreeksen/{id} - update title
    - DELETE /api/orderreeksen/{id} - soft delete (admin only)
    - GET /api/orders - list orders (filtered by user role)
    - GET /api/orders/{id} - get single order detail
    - PUT /api/orders/{id}/assign - assign order to user (werkvoorbereider)
    - POST /api/orders/{order_id}/link-posnummers - link posnummers to order

15. Create backend/api/posnummers.py:
    - GET /api/fases/{fase_id}/posnummers - list posnummers
    - POST /api/fases/{fase_id}/posnummers - create posnummer
    - PUT /api/posnummers/{id} - update posnummer
    - DELETE /api/posnummers/{id} - soft delete

16. Register routers in main.py

Frontend (Hooks):
17. Create frontend/src/hooks/useOrders.ts:
    - useOrderTypes() - fetch order types
    - useOrderreeksen(faseId) - fetch orderreeksen for fase
    - useCreateOrderreeks() - mutation
    - useOrders(filters) - fetch orders with filters
    - useOrder(orderId) - fetch single order
    - useAssignOrder(orderId) - mutation to assign order

18. Create frontend/src/hooks/usePosnummers.ts:
    - usePosnummers(faseId) - fetch posnummers for fase
    - useCreatePosnummer(faseId) - mutation
    - useUpdatePosnummer(id) - mutation

Frontend (Pages):
19. Create frontend/src/pages/FaseDetail.tsx:
    - Breadcrumb: Projecten > {project_code} > Fase {fase_number}
    - Header: Fase title + edit button
    - Tab navigation: Overzicht, Bestanden, Posnummers, Orders, Materiaal

    Tab 1: Overzicht (placeholder with statistics cards)
    - Total posnummers: {count}
    - Total files: 0 (placeholder)
    - Total orders: {count}
    - Claimed plates: 0 (placeholder)

    Tab 2: Bestanden (placeholder)
    - Message: "Bestandsupload wordt toegevoegd in Phase 2"

    Tab 3: Posnummers
    - Table with columns: Posnr, Materiaal, Profiel, Afmetingen, Aantal, Acties
    - "Nieuw Posnummer" button (opens modal)
    - Search and filter by materiaal
    - Edit/delete actions per row

    Tab 4: Orders
    - "Nieuwe Orderreeks" button (opens modal)
    - List of orderreeks cards
    - Each card shows:
      * Title
      * Status
      * Progress bar: "X van Y orders afgerond"
      * Order flow visualization (horizontal timeline)
      * Each order shows: order type icon + name, status badge, assigned user

    Tab 5: Materiaal (placeholder)
    - Message: "Materiaal koppeling wordt toegevoegd in Phase 5"

20. Create frontend/src/components/orders/CreateOrderreeksModal.tsx:
    - Form with:
      * Title input (default: "Volledig")
      * Order type multi-select checkboxes (fetch from useOrderTypes)
      * Preview of order sequence (1. Zagen → 2. Boren → 3. Kanten)
    - Submit creates orderreeks with selected order types
    - Success toast + close modal + refresh list

21. Create frontend/src/components/orders/OrderreeksCard.tsx:
    - Displays orderreeks with order flow
    - Shows order sequence with arrows
    - Status icons: ✓ Afgerond / ⏳ Actief / ⭕ Open
    - Click order → navigate to order detail (Phase 4)
    - Edit title button
    - Delete button (admin only)

22. Create frontend/src/components/posnummers/CreatePosnummerModal.tsx:
    - Form with:
      * Posnummer (required, unique validation)
      * Materiaal dropdown (S235, S355, RVS 304, RVS 316, ALU 5083, etc.)
      * Profiel (optional, autocomplete or freetext)
      * Lengte (mm)
      * Breedte (mm)
      * Hoogte (mm)
      * Aantal (default 1)
      * Notities
    - Validation on submit
    - Success toast

23. Create frontend/src/components/posnummers/PosnummerTable.tsx:
    - Table component
    - Sortable columns
    - Edit/delete actions
    - Search functionality

24. Add route /projecten/:code/fases/:faseNumber to App.tsx

TESTING CHECKLIST:

Backend Tests (via Swagger UI):
- [ ] Run migration (005b if 005 already applied)
- [ ] Verify all tables exist: order_types, orderreeksen, orders, posnummers, order_posnummers
- [ ] GET /api/order-types - verify default types exist (Zagen, Boren, etc.)
- [ ] POST /api/orderreeksen with fase_id and order_type_ids - verify created
- [ ] GET /api/fases/{fase_id}/orderreeksen - verify list returned
- [ ] Verify orders created automatically with correct sequence_position
- [ ] POST /api/fases/{fase_id}/posnummers - create posnummer "001"
- [ ] POST same posnummer - verify 400 error (unique constraint)
- [ ] GET /api/fases/{fase_id}/posnummers - verify list
- [ ] POST /api/orders/{order_id}/link-posnummers - link posnummer to order
- [ ] Verify junction table has record
- [ ] PUT /api/orders/{id}/assign - assign to user - verify updated

Frontend Tests (in browser):
- [ ] Navigate to existing fase detail page
- [ ] Verify tabs render: Overzicht, Bestanden, Posnummers, Orders, Materiaal
- [ ] Click "Posnummers" tab
- [ ] Click "Nieuw Posnummer"
- [ ] Fill form: posnr="001", materiaal="S235", length=1000, width=500, quantity=2
- [ ] Submit
- [ ] Verify posnummer appears in table
- [ ] Try creating duplicate posnummer - verify error message
- [ ] Click edit on posnummer
- [ ] Change quantity to 3
- [ ] Save - verify updated
- [ ] Click "Orders" tab
- [ ] Click "Nieuwe Orderreeks"
- [ ] Enter title "Volledig"
- [ ] Select order types: Zagen, Boren, Kanten
- [ ] Submit
- [ ] Verify orderreeks card appears
- [ ] Verify shows "3 orders" with sequence: 1. Zagen → 2. Boren → 3. Kanten
- [ ] Verify all orders have status "Open"

Integration Tests:
- [ ] Create project "TESTORD"
- [ ] Create fase "001"
- [ ] Create 5 posnummers: 001, 002, 003, 004, 005
- [ ] Create orderreeks "Volledig" with 4 order types
- [ ] Verify 4 orders created automatically
- [ ] Link all 5 posnummers to first order (Zagen)
- [ ] Verify posnummer count in order shows 5
- [ ] Login as werkplaats user
- [ ] Verify cannot create orderreeks (button not visible)
- [ ] Verify can view orders
- [ ] Login as admin
- [ ] Assign order to werkplaats user
- [ ] Login as werkplaats
- [ ] Verify assigned order appears in "Mijn Orders" (Dashboard or Orders page)

DEFINITION OF DONE:
✅ Can create posnummers via UI
✅ Posnummer table shows all posnummers with correct data
✅ Can create orderreeks with multiple order types
✅ Orders automatically created in correct sequence
✅ Order flow visualization renders correctly
✅ Can link posnummers to orders
✅ Fase detail tabs all render (even if placeholder)
✅ Audit logging records orderreeks and posnummer creation
✅ No console errors
✅ No TypeScript errors
✅ Werkplaats has correct view/edit permissions
✅ Code follows CLAUDE.md patterns
```

---

## Phase 2: File Management System

### Prompt 2.1: File Upload Infrastructure

```
Create file upload infrastructure with file storage, metadata tracking, and drag-and-drop UI.

PREREQUISITES:
- ✅ Phase 1.2 completed (projects, fases, posnummers, orderreeksen work)
- Can create and view fases and posnummers via UI
- At least one fase with posnummers exists for testing

CONTEXT:
File management supports:
- Uploading files (PDF, STEP, DXF, CSV, images)
- Storing file metadata (original filename, upload date, user)
- Linking files to fases and posnummers
- Background processing for CSV parsing and PDF splitting (Phase 2.2, 2.3)

TASKS:

Backend (Database):
1. Create migration 006_file_management.sql:

   Files table:
   - id UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - fase_id UUID REFERENCES fases(id) ON DELETE CASCADE
   - posnummer_id UUID REFERENCES posnummers(id) NULL (nullable, linked later)
   - file_type VARCHAR(20) CHECK IN ('pdf', 'step', 'dxf', 'csv', 'image', 'other')
   - original_filename VARCHAR(500) NOT NULL
   - stored_filename VARCHAR(500) NOT NULL (unique filename on disk)
   - file_path VARCHAR(1000) NOT NULL (full path)
   - file_size_bytes BIGINT NOT NULL
   - uploaded_by UUID REFERENCES users(id)
   - metadata JSONB DEFAULT '{}'::jsonb (e.g., {page_count, detected_posnr})
   - is_active BOOLEAN DEFAULT TRUE
   - created_at TIMESTAMP DEFAULT NOW()
   - Indexes: (fase_id), (posnummer_id), (file_type), (uploaded_by)

   File processing jobs table (for async processing):
   - id UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - file_id UUID REFERENCES files(id) ON DELETE CASCADE
   - job_type VARCHAR(50) CHECK IN ('pdf_split', 'csv_parse', 'ocr_detect') NOT NULL
   - status VARCHAR(20) CHECK IN ('pending', 'processing', 'completed', 'failed') DEFAULT 'pending'
   - progress_percent INTEGER DEFAULT 0
   - result JSONB DEFAULT '{}'::jsonb
   - error_message TEXT NULL
   - created_at TIMESTAMP DEFAULT NOW()
   - updated_at TIMESTAMP DEFAULT NOW()
   - Indexes: (file_id), (status), (job_type)

2. Create backend/models/file.py (File model with relationships)
3. Create backend/models/file_processing_job.py (FileProcessingJob model)

4. Create backend/schemas/file.py:
   - FileUploadResponse: id, original_filename, file_type, file_size_bytes, created_at
   - FileResponse: all fields + uploaded_by_name, posnummer_posnr
   - FileListResponse: id, original_filename, file_type, file_size_bytes, posnummer_posnr

5. Create backend/schemas/file_processing_job.py:
   - JobStatusResponse: id, job_type, status, progress_percent, result, error_message

Backend (Services):
6. Create backend/services/file_service.py:

   - upload_file(db, fase_id, uploaded_file, user_id, file_type) -> File
     * Generate unique stored_filename (UUID + extension)
     * Determine file_path (e.g., "uploads/{fase_id}/{stored_filename}")
     * Save file to disk (create directory if not exists)
     * Create File record
     * Use log_action() for UPLOAD_FILE
     * Return File object

   - get_file(db, file_id) -> File
     * Return File object (for download)

   - delete_file(db, file_id) -> bool
     * Soft delete (is_active = false)
     * Optionally delete physical file
     * Use log_action()

   - link_file_to_posnummer(db, file_id, posnummer_id) -> File
     * Update file.posnummer_id

   - list_files_for_fase(db, fase_id, file_type=None) -> List[File]
     * Filter by fase_id and optionally file_type

Backend (API):
7. Create backend/api/files.py:

   - POST /api/fases/{fase_id}/upload
     * Accepts multipart/form-data
     * Parameter: file (UploadFile)
     * Parameter: file_type (optional, auto-detect from extension)
     * Calls upload_file()
     * Returns FileUploadResponse
     * Authorization: werkvoorbereider or admin only

   - GET /api/files/{file_id}
     * Returns file content for download
     * Sets Content-Disposition header
     * Authorization: any authenticated user

   - GET /api/fases/{fase_id}/files
     * Query params: file_type (optional filter)
     * Returns List[FileListResponse]

   - DELETE /api/files/{file_id}
     * Soft deletes file
     * Authorization: werkvoorbereider or admin

   - PUT /api/files/{file_id}/link-posnummer
     * Body: { posnummer_id: UUID }
     * Links file to posnummer
     * Returns FileResponse

8. Register router in main.py

Frontend (Components):
9. Create frontend/src/components/files/FileUploader.tsx:

   - Drag-and-drop zone using react-dropzone (install: npm install react-dropzone)
   - "Klik om bestanden te selecteren" or drag files
   - Multiple file support
   - Show upload progress bar for each file
   - Preview uploaded files (name, size, status)
   - Accept file types: .pdf, .step, .stp, .dxf, .dwg, .csv, .xsr, .jpg, .png
   - Max file size: 50MB per file
   - Shows error for invalid files
   - Upload button triggers upload_file() for each file
   - Success/error feedback per file

   Props:
   - faseId: string (required)
   - onUploadComplete?: (files: File[]) => void
   - acceptedFileTypes?: string[]
   - maxFileSize?: number

10. Create frontend/src/components/files/FileList.tsx:

    - Table showing uploaded files
    - Columns: Thumbnail (icon based on type), Bestandsnaam, Type, Posnr (if linked), Geüpload door, Datum, Acties
    - Thumbnail: PDF icon, STEP icon, etc.
    - Acties: View, Download, Link to posnummer, Delete
    - Filter by file type (dropdown)
    - Filter by link status: Alle / Gekoppeld / Ongekoppeld
    - Search by filename
    - Pagination if > 50 files

    Props:
    - faseId: string (required)
    - onFileLinked?: () => void

11. Create frontend/src/components/files/LinkPosnummerModal.tsx:

    - Dropdown to select posnummer (fetched via usePosnummers)
    - Preview of file being linked (name, type)
    - "Koppel" button
    - Calls PUT /api/files/{id}/link-posnummer
    - Success toast

    Props:
    - fileId: string
    - faseId: string
    - onClose: () => void
    - onLinked: () => void

Frontend (Hooks):
12. Create frontend/src/hooks/useFiles.ts:

    - useFiles(faseId, fileType?) - fetch files for fase
    - useUploadFile(faseId) - mutation to upload file
    - useDeleteFile(fileId) - mutation to delete file
    - useLinkFileToPosnummer(fileId) - mutation to link file
    - useDownloadFile(fileId) - trigger download

Frontend (Page Updates):
13. Update frontend/src/pages/FaseDetail.tsx:

    - In Tab 2 "Bestanden":
      * Replace placeholder with FileUploader component
      * Below uploader, render FileList component
      * Both components use faseId from route params

14. Update PosnummerTable.tsx to show file count per posnummer:
    - Add "Bestanden" column showing count: "2 PDF, 1 STEP" (clickable)
    - Click opens file viewer modal with files linked to that posnummer

TESTING CHECKLIST:

Backend Tests (via Swagger UI):
- [ ] Run migration 006_file_management.sql
- [ ] Verify files and file_processing_jobs tables exist
- [ ] POST /api/fases/{fase_id}/upload - upload a PDF file
- [ ] Verify file saved to disk in uploads/{fase_id}/ directory
- [ ] Verify File record created in database
- [ ] GET /api/fases/{fase_id}/files - verify file appears in list
- [ ] GET /api/files/{file_id} - verify downloads file correctly
- [ ] PUT /api/files/{file_id}/link-posnummer with posnummer_id - verify linked
- [ ] GET /api/fases/{fase_id}/files - verify file now shows posnummer_posnr
- [ ] DELETE /api/files/{file_id} - verify soft delete (is_active = false)
- [ ] Verify audit_logs has UPLOAD_FILE entry

Frontend Tests (in browser):
- [ ] Navigate to fase detail page → Bestanden tab
- [ ] Verify FileUploader component renders
- [ ] Drag a PDF file onto upload zone - verify file added to queue
- [ ] Click "Upload" - verify progress bar shows
- [ ] Verify success message appears
- [ ] Verify file appears in FileList below
- [ ] Click "Download" icon - verify file downloads
- [ ] Click "Koppel aan posnummer" - verify modal opens
- [ ] Select posnummer from dropdown
- [ ] Click "Koppel" - verify success toast
- [ ] Verify file now shows posnummer in "Posnr" column
- [ ] Upload multiple files at once (3 PDFs) - verify all upload
- [ ] Try uploading invalid file type (.exe) - verify error message
- [ ] Try uploading file > 50MB - verify error message
- [ ] Filter files by type (PDF only) - verify filters correctly
- [ ] Search for file by name - verify search works
- [ ] Click delete on file - verify confirmation modal
- [ ] Confirm delete - verify file removed from list

Integration Tests:
- [ ] Create new fase
- [ ] Upload 5 PDF files
- [ ] Create 5 posnummers
- [ ] Link each PDF to a different posnummer
- [ ] Navigate to Posnummers tab
- [ ] Verify "Bestanden" column shows "1 PDF" for each posnummer
- [ ] Click on file count - verify opens viewer showing correct file
- [ ] Upload 5 STEP files
- [ ] Link STEP files to same posnummers
- [ ] Verify Bestanden column now shows "1 PDF, 1 STEP"
- [ ] Test as werkplaats user - verify cannot upload files
- [ ] Test as tekenaar - verify cannot upload files but can download

DEFINITION OF DONE:
✅ File upload works via drag-and-drop UI
✅ Multiple files can be uploaded simultaneously
✅ Files are stored on disk with unique filenames
✅ File metadata saved to database
✅ Can link files to posnummers
✅ Can download files
✅ Can delete files (soft delete)
✅ File list shows all uploaded files with filters
✅ Search and filter work correctly
✅ File type validation works
✅ File size validation works
✅ Audit logging records file uploads
✅ No console errors
✅ No TypeScript errors
✅ Permissions enforced (only werkvoorbereider can upload)
✅ Code follows CLAUDE.md patterns
```

### Prompt 2.2: CSV Materiaallijst Parser

```
Implement CSV materiaallijst parser that creates posnummers with duplicate detection and resolution UI.

PREREQUISITES:
- ✅ Phase 2.1 completed (file upload works)
- Can upload files via UI and see them in file list
- At least one fase exists for testing

CONTEXT:
CSV materiaallijst (material list) contains posnummers with materials, dimensions, and quantities.
Expected columns: Posnr, Materiaal, Profiel, Lengte, Breedte, Hoogte, Aantal
System should parse CSV, detect duplicates, and let user resolve conflicts.

TASKS:

Backend (Services):
1. Install CSV parsing library (already in Python stdlib: csv module)

2. Create backend/services/csv_parser.py with MaterialListParser class:

   - parse_csv(file_path: str, fase_id: UUID, db: Session) -> dict
     * Reads CSV file
     * Validates required columns: Posnr (required), Materiaal, Profiel, Lengte, Breedte, Hoogte, Aantal
     * For each row:
       - Extract data
       - Validate: Posnr not empty, dimensions are numeric (if provided)
       - Check if posnummer already exists in fase
       - If exists: add to duplicates list with comparison data
       - If new: add to import list
     * Returns:
       {
         "total_rows": int,
         "new_posnummers": List[dict],  # Ready to import
         "duplicates": List[dict],      # Need resolution: {posnr, existing_data, new_data}
         "errors": List[str]             # Validation errors
       }

   - import_posnummers(db, fase_id, posnummers: List[dict], user_id: UUID) -> List[Posnummer]
     * Creates Posnummer records
     * Uses log_action() for each CREATE_POSNUMMER
     * Returns created Posnummers

   - resolve_duplicate(db, posnummer_id, action: str, new_data: dict) -> Posnummer
     * action = "skip" | "overwrite" | "rename"
     * If "skip": do nothing
     * If "overwrite": update existing posnummer with new data
     * If "rename": create new posnummer with incremented number (e.g., "042" → "042A")

Backend (API):
3. Update backend/api/files.py with new endpoint:

   - POST /api/fases/{fase_id}/upload/materiaallijst
     * Accepts CSV file upload
     * Saves file via upload_file()
     * Calls parse_csv()
     * If duplicates found:
       - Return 409 Conflict with duplicate list
       - Include file_id for resolution
     * If no duplicates:
       - Auto-import all posnummers
       - Return 201 Created with summary
     * Response: {
         file_id: UUID,
         total_rows: int,
         imported: int,
         duplicates: List[{posnr, existing, new}],
         errors: List[str]
       }

   - POST /api/files/{file_id}/resolve-duplicates
     * Body: {
         resolutions: List[{
           posnummer_id: UUID,
           action: "skip" | "overwrite" | "rename",
           new_data: dict
         }]
       }
     * Calls resolve_duplicate() for each
     * Imports remaining new posnummers
     * Returns summary: { imported: int, skipped: int, overwritten: int }

Frontend (Components):
4. Create frontend/src/components/files/DuplicateResolutionModal.tsx:

   - Props:
     * duplicates: Array<{posnr, existing, new}>
     * faseId: string
     * fileId: string
     * onResolve: () => void
     * onCancel: () => void

   - UI:
     * Title: "Dubbele posnummers gedetecteerd"
     * Subtitle: "X posnummers bestaan al. Kies voor elke hoe verder te gaan."
     * Table with rows per duplicate:
       - Posnr column
       - Existing data column (materiaal, afmetingen, aantal)
       - New data column (materiaal, afmetingen, aantal) - highlight differences
       - Action column: Radio buttons for "Behoud bestaand" / "Vervang met nieuw" / "Hernoem nieuw"
       - Preview column: if "Hernoem", show suggested new posnr (e.g., "042A")
     * Bottom buttons:
       - "Annuleer" (close modal, no import)
       - "Importeer" (proceed with resolutions)

   - On "Importeer":
     * Collect resolutions
     * POST /api/files/{file_id}/resolve-duplicates
     * Show success toast with summary
     * Call onResolve()

5. Update frontend/src/components/files/FileUploader.tsx:

   - Add "Upload type" selector (tabs or dropdown):
     * Algemeen (generic file upload - existing behavior)
     * Materiaallijst (CSV) - uses new endpoint

   - When "Materiaallijst" selected:
     * Accept only .csv, .xsr files
     * After upload, check response:
       - If duplicates.length > 0: open DuplicateResolutionModal
       - If no duplicates: show success toast with import summary

Frontend (Hooks):
6. Create frontend/src/hooks/useMaterialList.ts:

   - useUploadMaterialList(faseId) - mutation for CSV upload
   - useResolveDuplicates(fileId) - mutation for duplicate resolution

Frontend (Page Updates):
7. Update FileUploader to support materiaallijst upload type
8. Integrate DuplicateResolutionModal into upload flow

TESTING CHECKLIST:

Backend Tests (via Swagger UI):
- [ ] Create test CSV file with 10 posnummers (valid data)
- [ ] POST /api/fases/{fase_id}/upload/materiaallijst with CSV
- [ ] Verify 201 response with summary: { imported: 10, duplicates: 0, errors: 0 }
- [ ] GET /api/fases/{fase_id}/posnummers - verify 10 posnummers created
- [ ] Create another CSV with 3 new + 3 duplicate posnummers
- [ ] POST /api/fases/{fase_id}/upload/materiaallijst
- [ ] Verify 409 response with duplicates list
- [ ] POST /api/files/{file_id}/resolve-duplicates with resolutions:
  * 1 skip, 1 overwrite, 1 rename
- [ ] Verify response: { imported: 3, skipped: 1, overwritten: 1 }
- [ ] GET /api/fases/{fase_id}/posnummers - verify counts match
- [ ] Create CSV with invalid data (non-numeric length)
- [ ] POST upload - verify errors list returned

Frontend Tests (in browser):
- [ ] Navigate to fase Bestanden tab
- [ ] Click FileUploader
- [ ] Select "Materiaallijst" upload type
- [ ] Upload CSV with 10 new posnummers
- [ ] Verify success toast: "10 posnummers geïmporteerd"
- [ ] Go to Posnummers tab - verify 10 posnummers exist
- [ ] Return to Bestanden tab
- [ ] Upload CSV with 5 new + 5 duplicate posnummers
- [ ] Verify DuplicateResolutionModal opens
- [ ] Verify shows 5 duplicate rows with side-by-side comparison
- [ ] Verify differences are highlighted (e.g., different quantity)
- [ ] Select "Behoud bestaand" for first duplicate
- [ ] Select "Vervang met nieuw" for second duplicate
- [ ] Select "Hernoem nieuw" for third duplicate
- [ ] Verify preview shows "042A" for renamed posnummer
- [ ] Click "Importeer"
- [ ] Verify success toast with summary
- [ ] Go to Posnummers tab - verify correct posnummers exist
- [ ] Verify renamed posnummer appears as "042A"
- [ ] Upload invalid CSV (missing Posnr column)
- [ ] Verify error message shows in FileUploader

Integration Tests:
- [ ] Create new fase
- [ ] Prepare CSV with 20 posnummers (various materials: S235, RVS, ALU)
- [ ] Upload CSV as materiaallijst
- [ ] Verify all 20 imported
- [ ] Edit one posnummer manually via UI (change quantity)
- [ ] Upload same CSV again
- [ ] Verify duplicate modal shows changed posnummer
- [ ] Select "Behoud bestaand" for the edited one
- [ ] Verify after import, manual edit is preserved
- [ ] Upload CSV with encoding issues (special characters)
- [ ] Verify handles correctly or shows clear error

DEFINITION OF DONE:
✅ CSV upload via materiaallijst type works
✅ Valid CSV imports all posnummers automatically
✅ Duplicate detection works correctly
✅ DuplicateResolutionModal shows duplicates with comparison
✅ Can skip, overwrite, or rename duplicates
✅ Resolution actions work as expected
✅ Success toast shows import summary
✅ Invalid CSV shows clear error messages
✅ Audit logging records posnummer creation
✅ No console errors
✅ No TypeScript errors
✅ Code follows CLAUDE.md patterns
```

### Prompt 2.3: PDF Split with OCR

```
Implement PDF splitting for multi-page tekensets (drawing sets) with OCR-based posnummer detection.

PREREQUISITES:
- ✅ Phase 2.2 completed (CSV upload and duplicate resolution work)
- File upload infrastructure working
- At least one fase with posnummers exists for testing

CONTEXT:
Tekensets are multi-page PDFs where each page is a drawing for a specific posnummer.
System should:
- Split PDF into individual pages
- Use OCR to detect posnummer on each page
- Auto-link page to detected posnummer (if confidence high)
- Allow manual linking for low-confidence or undetected pages

TASKS:

Backend (Dependencies):
1. Add to requirements.txt:
   - pypdf==4.0.0 (PDF manipulation)
   - pytesseract==0.3.10 (OCR wrapper for Tesseract)
   - Pillow==10.2.0 (image processing)
   - pdf2image==1.17.0 (convert PDF to images for OCR)

   Note: Tesseract OCR must be installed on system separately
   - Windows: Download installer from GitHub
   - Mac: brew install tesseract
   - Linux: apt-get install tesseract-ocr

2. Install dependencies: pip install -r requirements.txt

Backend (Services):
3. Create backend/services/pdf_processor.py with PDFProcessor class:

   - split_pdf(file_path: str, output_dir: str) -> List[str]
     * Uses PyPDF to split multi-page PDF
     * Saves each page as separate PDF: page_001.pdf, page_002.pdf, ...
     * Returns list of output file paths

   - detect_posnummer_with_ocr(pdf_path: str) -> dict
     * Converts PDF page to image using pdf2image
     * Runs Tesseract OCR on image
     * Searches OCR text for posnummer patterns:
       - "Posnr: XXX"
       - "POS XXX"
       - "Posnummer: XXX"
       - Standalone 3-digit numbers in top-right corner
     * Returns: {
         "detected_posnr": str | None,
         "confidence": float (0.0 - 1.0),
         "ocr_text": str (full text, for debugging)
       }

   - process_pdf_split_job(db: Session, job_id: UUID) -> None
     * Background worker function
     * Gets FileProcessingJob by ID
     * Gets associated File
     * Updates job status to "processing"
     * Calls split_pdf()
     * For each page:
       - Saves page as new File record (linked to same fase)
       - Calls detect_posnummer_with_ocr()
       - If confidence > 0.8 and posnummer exists in fase:
         * Auto-links file to posnummer
       - Stores detection result in file.metadata
     * Updates job status to "completed"
     * Updates job.result with summary: { pages_processed, auto_linked, manual_required }
     * If error: updates status to "failed", stores error_message

Backend (API):
4. Update backend/api/files.py with new endpoint:

   - POST /api/fases/{fase_id}/upload/tekenset
     * Accepts PDF file upload
     * Validates: must be PDF, max 100 pages
     * Saves file via upload_file()
     * Creates FileProcessingJob with job_type = 'pdf_split'
     * Triggers background worker: process_pdf_split_job()
       (For now, call synchronously; async queue in production)
     * Returns: {
         job_id: UUID,
         status: "pending" | "processing"
       }

   - GET /api/file-jobs/{job_id}/status
     * Returns FileProcessingJob status
     * Response: {
         id: UUID,
         job_type: string,
         status: "pending" | "processing" | "completed" | "failed",
         progress_percent: int,
         result: {
           pages_processed: int,
           auto_linked: int,
           manual_required: int,
           pages: List[{
             file_id: UUID,
             detected_posnr: str | None,
             confidence: float,
             posnummer_id: UUID | None
           }]
         },
         error_message: str | None
       }

Frontend (Components):
5. Create frontend/src/components/files/FileProcessingStatus.tsx:

   - Props:
     * jobId: string
     * onComplete: (result) => void

   - UI:
     * Title: "Bestand wordt verwerkt..."
     * Progress bar showing progress_percent
     * Status message: "Pagina X van Y verwerkt"
     * If completed:
       - Show summary: "X pagina's automatisch gekoppeld, Y vereisen handmatige koppeling"
       - List pages requiring manual linking
       - "Sluiten" button

   - Behavior:
     * Polls GET /api/file-jobs/{job_id}/status every 2 seconds
     * Updates progress bar
     * When status = "completed": stops polling, shows summary
     * When status = "failed": shows error message

6. Create frontend/src/components/files/ManualLinkModal.tsx:

   - Props:
     * files: Array<{ file_id, detected_posnr, confidence }>
     * faseId: string
     * onComplete: () => void

   - UI:
     * Title: "Handmatige koppeling vereist"
     * For each file needing manual link:
       - PDF thumbnail (or icon)
       - Detected text (if any): "Mogelijk posnummer: 042 (lage zekerheid)"
       - Dropdown to select correct posnummer
       - Preview button (opens PDF in viewer)
     * "Koppel" button at bottom

   - Behavior:
     * For each file, user selects posnummer from dropdown
     * On "Koppel": calls PUT /api/files/{file_id}/link-posnummer for each
     * Shows success toast
     * Calls onComplete()

7. Update frontend/src/components/files/FileUploader.tsx:

   - Add "Tekenset (PDF)" upload type
   - When selected:
     * Accept only .pdf files
     * After upload to /upload/tekenset endpoint:
       - Get job_id from response
       - Open FileProcessingStatus component with job_id
       - Poll for completion
       - When complete, if manual_required > 0:
         * Open ManualLinkModal with pages needing linking
       - If all auto-linked:
         * Show success toast

Frontend (Hooks):
8. Create frontend/src/hooks/useFileProcessing.ts:

   - useUploadTekenset(faseId) - mutation for tekenset upload
   - useJobStatus(jobId) - query with polling every 2s
   - useLinkFiles(files) - mutation to link multiple files

TESTING CHECKLIST:

Backend Tests (via Swagger UI):
- [ ] Install Tesseract OCR on system
- [ ] Verify pytesseract works: python -c "import pytesseract; print(pytesseract.get_tesseract_version())"
- [ ] Create test PDF with 3 pages, each with clear "Posnr: XXX" text
- [ ] Create fase with 3 posnummers matching the PDF (001, 002, 003)
- [ ] POST /api/fases/{fase_id}/upload/tekenset with test PDF
- [ ] Verify job_id returned
- [ ] GET /api/file-jobs/{job_id}/status - verify processing
- [ ] Wait for completion (poll every 2s)
- [ ] Verify status = "completed"
- [ ] Verify result shows { auto_linked: 3, manual_required: 0 }
- [ ] GET /api/fases/{fase_id}/files - verify 3 new files created (one per page)
- [ ] Verify each file has posnummer_id set (auto-linked)
- [ ] Create PDF with low-quality scan (hard to read text)
- [ ] Upload as tekenset
- [ ] Verify some pages have low confidence, need manual linking

Frontend Tests (in browser):
- [ ] Navigate to fase Bestanden tab
- [ ] Select "Tekenset (PDF)" upload type
- [ ] Upload 3-page PDF
- [ ] Verify FileProcessingStatus modal opens
- [ ] Verify progress bar shows progress
- [ ] Wait for completion
- [ ] Verify summary shows: "3 pagina's automatisch gekoppeld"
- [ ] Click "Sluiten"
- [ ] Verify FileList shows 3 new PDF files
- [ ] Verify each has correct posnummer linked
- [ ] Upload PDF with 5 pages where 2 have unclear posnummers
- [ ] Verify FileProcessingStatus shows: "3 automatisch, 2 handmatig"
- [ ] Verify ManualLinkModal opens automatically
- [ ] Verify shows 2 files needing manual link
- [ ] For first file, select posnummer from dropdown
- [ ] For second file, click preview (verify PDF viewer opens)
- [ ] Select correct posnummer
- [ ] Click "Koppel"
- [ ] Verify success toast
- [ ] Verify files now linked correctly in FileList

Integration Tests:
- [ ] Create fase with 10 posnummers
- [ ] Create 10-page PDF with varying quality:
  * Pages 1-5: clear "Posnr: XXX" text
  * Pages 6-8: handwritten posnummer (harder to detect)
  * Pages 9-10: no posnummer text
- [ ] Upload as tekenset
- [ ] Verify 5 auto-linked, 5 manual required
- [ ] Manually link the 5 remaining pages
- [ ] Go to Posnummers tab
- [ ] Verify each posnummer shows "1 PDF" in Bestanden column
- [ ] Click on one to view - verify correct PDF opens
- [ ] Upload PDF with rotated pages (90 degrees)
- [ ] Verify OCR still works (Tesseract handles rotation)

DEFINITION OF DONE:
✅ PDF splitting works for multi-page PDFs
✅ OCR detects posnummers with reasonable accuracy
✅ High-confidence detections auto-link to posnummers
✅ FileProcessingStatus shows real-time progress
✅ Low-confidence detections open manual linking modal
✅ Manual linking works correctly
✅ Split PDF pages saved as individual files
✅ Metadata stores OCR results
✅ Job status polling works without errors
✅ Handles edge cases (no text, rotated pages, handwritten)
✅ Audit logging records file creation
✅ No console errors
✅ No TypeScript errors
✅ Code follows CLAUDE.md patterns
```

### Prompt 2.4: STEP File Auto-Linking

```
Implement STEP/DXF file bulk upload with filename-based auto-linking to posnummers.

PREREQUISITES:
- ✅ Phase 2.3 completed (PDF split and OCR work)
- File upload infrastructure supports various file types
- At least one fase with posnummers exists for testing

CONTEXT:
STEP and DXF files often follow naming conventions that include the posnummer:
- "042_detail.STEP"
- "POS042.stp"
- "hek_042.dxf"
System should extract posnummer from filename and auto-link when possible.

TASKS:

Backend (Services):
1. Update backend/services/file_service.py with new functions:

   - extract_posnr_from_filename(filename: str) -> str | None
     * Searches filename for posnummer patterns:
       - "042", "POS042", "posnr042", "042_detail", "hek_042", etc.
       - Regex patterns to match:
         * r'(?:pos|posnr)?[ _-]?(\d{3})' (case-insensitive)
         * r'(\d{3})(?:[ _-]|\.)'
       - Extract 3-digit number (most common pattern)
       - Return first match or None
     * Examples:
       - "042_detail.STEP" → "042"
       - "POS042.stp" → "042"
       - "hek_042.dxf" → "042"
       - "random.step" → None

   - bulk_upload_step_files(db, fase_id, files: List[UploadFile], user_id) -> dict
     * For each file:
       - Save file via upload_file()
       - Call extract_posnr_from_filename()
       - If posnr detected:
         * Check if posnummer exists in fase
         * If exists: auto-link via link_file_to_posnummer()
         * If not exists: add to unmatched list
       - If no posnr detected: add to unmatched list
     * Returns: {
         "total_files": int,
         "auto_linked": int,
         "unmatched": List[{
           file_id: UUID,
           filename: str,
           detected_posnr: str | None,
           reason: "no_posnr_detected" | "posnr_not_found"
         }]
       }
     * Use log_action() for bulk upload

Backend (API):
2. Update backend/api/files.py with new endpoint:

   - POST /api/fases/{fase_id}/upload/step
     * Accepts multiple files (multipart/form-data with array)
     * Parameter: files (List[UploadFile])
     * Accept file types: .step, .stp, .dxf, .dwg
     * Calls bulk_upload_step_files()
     * Returns: {
         total_files: int,
         auto_linked: int,
         unmatched: List[{file_id, filename, detected_posnr, reason}]
       }
     * Authorization: werkvoorbereider or admin only

Frontend (Components):
3. Create frontend/src/components/files/StepUploadResults.tsx:

   - Props:
     * result: { total_files, auto_linked, unmatched }
     * faseId: string
     * onClose: () => void

   - UI:
     * Title: "STEP bestanden geüpload"
     * Summary: "X van Y bestanden automatisch gekoppeld"
     * If unmatched.length > 0:
       - Section: "Bestanden vereisen handmatige koppeling"
       - Table with columns:
         * Bestandsnaam
         * Gedetecteerd posnr (if any)
         * Reden (no detection / posnr not found)
         * Koppel (dropdown + button)
       - For each unmatched file:
         * Dropdown to select posnummer
         * "Koppel" button calls PUT /api/files/{file_id}/link-posnummer
     * "Sluiten" button at bottom

4. Update frontend/src/components/files/FileUploader.tsx:

   - Add "STEP/DXF bestanden" upload type
   - When selected:
     * Accept multiple files: .step, .stp, .dxf, .dwg
     * Drag-and-drop supports multiple files
     * After upload to /upload/step endpoint:
       - Show StepUploadResults modal with result
       - User can manually link unmatched files
       - Close modal refreshes FileList

Frontend (Hooks):
5. Update frontend/src/hooks/useFiles.ts:

   - useBulkUploadStep(faseId) - mutation for STEP bulk upload
   - Returns result with auto_linked and unmatched lists

TESTING CHECKLIST:

Backend Tests (via Swagger UI):
- [ ] Create test STEP files with various naming conventions:
  * 001_detail.STEP
  * POS002.stp
  * hek_003.dxf
  * random_name.step (no posnr)
- [ ] Create fase with posnummers 001, 002, 003
- [ ] POST /api/fases/{fase_id}/upload/step with 4 files
- [ ] Verify response: { total_files: 4, auto_linked: 3, unmatched: 1 }
- [ ] Verify unmatched list includes "random_name.step" with reason "no_posnr_detected"
- [ ] GET /api/fases/{fase_id}/files - verify 4 files created
- [ ] Verify 3 files have posnummer_id set
- [ ] Verify 1 file has posnummer_id = null
- [ ] Upload file "042_part.step" but posnummer 042 doesn't exist in fase
- [ ] Verify unmatched with reason "posnr_not_found"

Frontend Tests (in browser):
- [ ] Navigate to fase Bestanden tab
- [ ] Create 3 posnummers: 001, 002, 003
- [ ] Select "STEP/DXF bestanden" upload type
- [ ] Select 4 STEP files:
  * 001_detail.STEP
  * POS002.stp
  * hek_003.dxf
  * random_name.step
- [ ] Click upload or drag into zone
- [ ] Verify upload completes
- [ ] Verify StepUploadResults modal opens
- [ ] Verify summary: "3 van 4 automatisch gekoppeld"
- [ ] Verify unmatched section shows "random_name.step"
- [ ] Select posnummer "003" from dropdown for unmatched file
- [ ] Click "Koppel"
- [ ] Verify success toast
- [ ] Verify file now linked
- [ ] Click "Sluiten"
- [ ] Verify FileList shows all 4 files with correct links
- [ ] Go to Posnummers tab
- [ ] Verify posnummer 001 shows "1 STEP"
- [ ] Verify posnummer 002 shows "1 STEP"
- [ ] Verify posnummer 003 shows "1 DXF, 1 STEP" (if random_name was linked to 003)

Integration Tests:
- [ ] Create fase with 10 posnummers (001-010)
- [ ] Prepare 10 STEP files with various naming patterns:
  * Mix of POS_XXX, XXX_detail, part_XXX formats
  * Include 2 files with no detectable posnr
  * Include 1 file with posnr that doesn't exist (050)
- [ ] Upload all 10 files via bulk upload
- [ ] Verify correct number auto-linked
- [ ] Verify unmatched list shows 3 files
- [ ] Manually link all 3 unmatched files
- [ ] Verify all files now linked correctly
- [ ] Click on posnummer in Posnummers tab
- [ ] Verify file viewer opens with correct STEP file
- [ ] Test with DXF files - verify same behavior
- [ ] Test mixed upload (STEP + DXF together) - verify works

DEFINITION OF DONE:
✅ STEP/DXF bulk upload works
✅ Filename parsing extracts posnummer correctly for common patterns
✅ Auto-linking works for detected posnummers
✅ Unmatched files list shows reason (no detection vs not found)
✅ Manual linking works for unmatched files
✅ StepUploadResults modal shows clear summary
✅ Multiple files can be uploaded simultaneously
✅ FileList updates after upload
✅ Posnummer file count updates correctly
✅ Audit logging records bulk upload
✅ No console errors
✅ No TypeScript errors
✅ Code follows CLAUDE.md patterns
```

---

## Phase 3: Checklist System

### Prompt 3.1: Admin Checklist Templates

```
Create admin-configurable base checklist templates per order type with full management UI.

PREREQUISITES:
- ✅ Phase 2.4 completed (all file management works)
- Order types exist in database
- Can create orders and orderreeksen
- At least one admin user exists for testing

CONTEXT:
Checklist templates are predefined sets of tasks per order type (Zagen, Boren, etc.)
Admin configures base templates, which are copied to orders when created.
Werkvoorbereider can add custom items to specific orders.
Werkplaats executes checklists during order execution.

TASKS:

Backend (Database):
1. Create migration 007_checklist_system.sql:

   Checklist templates table:
   - id UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - order_type_id UUID REFERENCES order_types(id) ON DELETE CASCADE
   - description TEXT NOT NULL
   - is_required BOOLEAN DEFAULT FALSE
   - sort_order INTEGER DEFAULT 0
   - is_active BOOLEAN DEFAULT TRUE
   - created_at TIMESTAMP DEFAULT NOW()
   - updated_at TIMESTAMP DEFAULT NOW()
   - Indexes: (order_type_id, sort_order), (is_active)

   Order checklist items table:
   - id UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - order_id UUID REFERENCES orders(id) ON DELETE CASCADE
   - description TEXT NOT NULL
   - is_required BOOLEAN DEFAULT FALSE
   - sort_order INTEGER DEFAULT 0
   - is_completed BOOLEAN DEFAULT FALSE
   - completed_by UUID REFERENCES users(id) NULL
   - completed_at TIMESTAMP NULL
   - comment TEXT NULL
   - is_custom BOOLEAN DEFAULT FALSE (true if added by werkvoorbereider, not from template)
   - created_at TIMESTAMP DEFAULT NOW()
   - updated_at TIMESTAMP DEFAULT NOW()
   - Indexes: (order_id, sort_order), (is_completed), (completed_by)

2. Create backend/models/checklist_template.py (ChecklistTemplate model)
3. Create backend/models/order_checklist_item.py (OrderChecklistItem model)

4. Create backend/schemas/checklist_template.py:
   - ChecklistTemplateCreate: description, is_required, sort_order
   - ChecklistTemplateUpdate: description, is_required, sort_order
   - ChecklistTemplateResponse: all fields + order_type_name

5. Create backend/schemas/order_checklist_item.py:
   - OrderChecklistItemCreate: description, is_required, sort_order
   - OrderChecklistItemUpdate: is_completed, comment
   - OrderChecklistItemResponse: all fields + completed_by_name

Backend (Services):
6. Create backend/services/checklist_service.py:

   - copy_template_to_order(db, order_id, order_type_id) -> List[OrderChecklistItem]
     * Fetches all active templates for order_type_id
     * For each template:
       - Creates OrderChecklistItem with is_custom=False
     * Returns created items

   - add_custom_item(db, order_id, data: OrderChecklistItemCreate, user_id) -> OrderChecklistItem
     * Creates OrderChecklistItem with is_custom=True
     * Assigns sort_order (max + 1)
     * Use log_action()

   - complete_item(db, item_id, user_id, comment: str = None) -> OrderChecklistItem
     * Updates is_completed=True, completed_by=user_id, completed_at=NOW()
     * Optionally sets comment
     * Use log_action()

   - can_complete_order(db, order_id) -> bool
     * Checks if all required checklist items are completed
     * Returns True if all required items complete, else False

   - get_checklist_progress(db, order_id) -> dict
     * Returns { total: int, completed: int, required_total: int, required_completed: int }

7. Update backend/services/order.py:

   - Modify create_orderreeks() to call copy_template_to_order() for each created order
   - Add after order creation:
     ```python
     for order in orders:
         checklist_service.copy_template_to_order(db, order.id, order.order_type_id)
     ```

Backend (API - Admin):
8. Create backend/api/checklists.py with ADMIN routes:

   - GET /api/admin/checklist-templates
     * Query param: order_type_id (filter by order type)
     * Returns List[ChecklistTemplateResponse]
     * Authorization: admin only

   - POST /api/admin/checklist-templates
     * Body: { order_type_id, description, is_required, sort_order }
     * Creates template
     * Authorization: admin only

   - PUT /api/admin/checklist-templates/{id}
     * Body: ChecklistTemplateUpdate
     * Updates template
     * Authorization: admin only

   - DELETE /api/admin/checklist-templates/{id}
     * Soft deletes template (is_active=False)
     * Authorization: admin only

   - PUT /api/admin/checklist-templates/reorder
     * Body: { template_ids: List[UUID] }
     * Updates sort_order for batch reordering
     * Authorization: admin only

Backend (API - Orders):
9. Update backend/api/orders.py with checklist endpoints:

   - GET /api/orders/{order_id}/checklist
     * Returns List[OrderChecklistItemResponse]
     * Authorization: any authenticated user who can view order

   - POST /api/orders/{order_id}/checklist
     * Body: OrderChecklistItemCreate
     * Adds custom checklist item
     * Authorization: werkvoorbereider or admin

   - PUT /api/order-checklist-items/{item_id}/complete
     * Body: { comment?: string }
     * Marks item as complete
     * Authorization: werkplaats, werkvoorbereider, or admin

   - PUT /api/order-checklist-items/{item_id}/uncomplete
     * Marks item as incomplete (reopen)
     * Authorization: werkvoorbereider or admin

10. Register checklists router in main.py

Frontend (Pages - Admin):
11. Create frontend/src/pages/admin/ChecklistManagement.tsx:

    - Header: "Checklist Beheer"
    - Order type selector (dropdown)
    - When order type selected:
      * Shows list of templates for that type
      * "Nieuwe Template" button
    - Template list:
      * Drag-and-drop to reorder (react-beautiful-dnd or @dnd-kit)
      * Each item shows:
        - Description
        - "Verplicht" badge if is_required
        - Edit button (opens modal)
        - Delete button (confirmation)
      * Save order button after reordering
    - Empty state: "Nog geen templates voor dit order type"

12. Create frontend/src/components/admin/CreateTemplateModal.tsx:

    - Form:
      * Description (textarea, required)
      * Is verplicht (checkbox)
    - Submit creates template via useCreateTemplate()
    - Success toast

13. Create frontend/src/components/admin/EditTemplateModal.tsx:

    - Same as create but pre-fills data
    - Submit updates via useUpdateTemplate()

14. Add route /admin/checklists to App.tsx
15. Add "Checklists" link to admin navigation menu

Frontend (Hooks - Admin):
16. Create frontend/src/hooks/useChecklists.ts:

    - useChecklistTemplates(orderTypeId) - fetch templates for order type
    - useCreateTemplate() - mutation
    - useUpdateTemplate(id) - mutation
    - useDeleteTemplate(id) - mutation
    - useReorderTemplates() - mutation for bulk reorder

Frontend (Hooks - Orders):
17. Update frontend/src/hooks/useOrders.ts:

    - useOrderChecklist(orderId) - fetch checklist items for order
    - useAddCustomChecklistItem(orderId) - mutation
    - useCompleteChecklistItem(itemId) - mutation
    - useUncompleteChecklistItem(itemId) - mutation

Frontend (Components - Order Execution):
18. Create frontend/src/components/checklists/OrderChecklistView.tsx:

    - Props: orderId: string
    - Shows list of checklist items
    - Progress indicator: "5 van 8 items afgevinkt (3 verplicht items nog open)"
    - Each item:
      * Checkbox (disabled if already completed by someone else)
      * Description
      * "Verplicht" badge if required
      * Comment input (appears when checking)
      * Completed info: "Afgevinkt door {name} op {date}"
    - "Voeg item toe" button (werkvoorbereider only)
    - Empty state: "Geen checklist items"

19. Create frontend/src/components/checklists/ChecklistItemRow.tsx:

    - Single checklist item component
    - Checkbox with onChange handler
    - If checking: shows comment input before completing
    - If unchecking (reopen): confirmation modal
    - Shows completed_by and completed_at if completed

20. Create frontend/src/components/checklists/AddCustomItemModal.tsx:

    - Form:
      * Description (textarea)
      * Is verplicht (checkbox)
    - Submit adds item via useAddCustomChecklistItem()

TESTING CHECKLIST:

Backend Tests (via Swagger UI):
- [ ] Run migration 007_checklist_system.sql
- [ ] Verify tables exist: checklist_templates, order_checklist_items
- [ ] GET /api/order-types - get first order type ID (e.g., Zagen)
- [ ] POST /api/admin/checklist-templates - create 3 templates for Zagen:
  * "Materiaal gecontroleerd" (required)
  * "Zaagblad geïnstalleerd" (required)
  * "Veiligheidsbril gedragen" (not required)
- [ ] GET /api/admin/checklist-templates?order_type_id={id} - verify 3 templates returned
- [ ] Create new orderreeks with order type Zagen
- [ ] GET /api/orders/{order_id}/checklist - verify 3 items copied from templates
- [ ] PUT /api/order-checklist-items/{item_id}/complete - complete first item
- [ ] Verify is_completed=True, completed_by set, completed_at set
- [ ] POST /api/orders/{order_id}/checklist - add custom item "Extra controle"
- [ ] GET checklist - verify 4 items now (3 from template + 1 custom)
- [ ] Try completing order without all required items - should fail validation

Frontend Tests (in browser - Admin):
- [ ] Login as admin
- [ ] Navigate to /admin/checklists
- [ ] Select order type "Zagen" from dropdown
- [ ] Verify 3 templates appear
- [ ] Click "Nieuwe Template"
- [ ] Enter description: "Maatvoering gecontroleerd"
- [ ] Check "Verplicht"
- [ ] Submit
- [ ] Verify template appears in list
- [ ] Drag template to reorder (move to top)
- [ ] Click "Volgorde opslaan"
- [ ] Refresh page - verify order persisted
- [ ] Click edit on template
- [ ] Change description
- [ ] Save - verify updated
- [ ] Click delete on template
- [ ] Confirm - verify removed from list

Frontend Tests (in browser - Order Execution):
- [ ] Navigate to fase with orderreeks
- [ ] Click on first order (details page or execution page - placeholder for now)
- [ ] Render OrderChecklistView component (may need to add to order detail page)
- [ ] Verify shows 4 checklist items (3 from template + 1 custom)
- [ ] Verify progress shows "0 van 4 afgevinkt"
- [ ] Click checkbox on first item
- [ ] Verify comment input appears
- [ ] Enter comment "Materiaal goed"
- [ ] Confirm
- [ ] Verify item marked complete with checkmark
- [ ] Verify shows "Afgevinkt door {your name}"
- [ ] Verify progress updates to "1 van 4 afgevinkt"
- [ ] Login as werkvoorbereider
- [ ] Click "Voeg item toe" on checklist
- [ ] Enter custom item
- [ ] Submit - verify appears in list
- [ ] Login as admin
- [ ] Uncheck (reopen) a completed item
- [ ] Confirm - verify item unchecked

Integration Tests:
- [ ] Admin creates template for order type "Boren" with 5 items (3 required)
- [ ] Werkvoorbereider creates orderreeks with "Boren" order
- [ ] Verify 5 checklist items auto-created for order
- [ ] Werkplaats completes 2 required + 1 optional item
- [ ] Try to complete order - should fail (1 required item remaining)
- [ ] Complete final required item
- [ ] Verify can now complete order (Phase 4 will implement full completion)
- [ ] Werkvoorbereider adds custom required item
- [ ] Verify order completion now blocked again
- [ ] Complete custom item
- [ ] Verify can complete order again

DEFINITION OF DONE:
✅ Admin can create checklist templates per order type
✅ Templates show in management UI with drag-and-drop reordering
✅ Templates automatically copied to new orders
✅ Checklist view shows all items with progress
✅ Can complete/uncomplete checklist items
✅ Can add custom items to orders (werkvoorbereider)
✅ Required items enforced (cannot complete order without them)
✅ Comments can be added when completing items
✅ Completed items show who and when
✅ Audit logging records template and item changes
✅ No console errors
✅ No TypeScript errors
✅ Permissions enforced correctly
✅ Code follows CLAUDE.md patterns
```

---

## Summary of Enhancements by Phase

**Phase 0: Foundation & Refactoring**
- Added: Complete UI for signature upload, profile page integration
- Added: Testing checklist with backend, frontend, and integration tests
- Added: Prerequisites section, Definition of Done
- Enhanced: Clear step-by-step UI testing instructions

**Phase 1: Core Data Model**
- Added: Comprehensive UI components (Projects page, ProjectDetail, modals)
- Added: Testing checklist covering all CRUD operations via UI
- Added: Integration tests for multi-user scenarios
- Added: Permission verification tests for each role
- Enhanced: Explicit routing and navigation testing

**Phase 2: File Management**
- Added: Complete UI verification for every file feature
- Added: Drag-and-drop testing instructions
- Added: Duplicate resolution UI flow testing
- Added: OCR processing real-time status testing
- Added: Bulk upload result verification
- Enhanced: Edge case testing (invalid files, large files, encoding issues)

**Phase 3: Checklist System**
- Added: Admin UI for template management
- Added: Drag-and-drop reordering UI
- Added: Order execution checklist UI components
- Added: Custom item addition workflow
- Enhanced: Required item enforcement testing

All prompts now include:
1. **Prerequisites** - What must be done first
2. **Testing Checklist** - Backend + Frontend + Integration tests
3. **UI Components** - Explicit list of pages/components to create
4. **Definition of Done** - Clear completion criteria

**File to create:** `docs/implementation/PROMPTS-OVERVIEW-ENHANCED.md`

