# Phase 0 Testing Guide
## Foundation & Refactoring - Role System Expansion

**Date Completed:** December 10, 2024
**Status:** ✅ Complete

---

## Summary of Changes

Phase 0 successfully expanded the MES Kersten user role system from 3 roles to 8 roles and added digital signature support.

### Database Changes

**Migration:** `004_expand_roles_system.sql`

1. **Expanded user_roles CHECK constraint** to include:
   - Existing: `admin`, `werkvoorbereider`, `werkplaats`
   - New: `logistiek`, `tekenaar`, `laser`, `buislaser`, `kantbank`

2. **Added digital signature fields to users table:**
   - `digital_signature_url TEXT NULL` - Path/URL to signature image
   - `signature_uploaded_at TIMESTAMPTZ NULL` - Upload timestamp

3. **Enhanced audit_logs table:**
   - Updated `entity_type` to `VARCHAR(50)` for consistency
   - Added composite index `idx_audit_logs_entity` on (entity_type, entity_id)
   - Added composite index `idx_audit_logs_user_action` on (user_id, action)

### Backend Changes

1. **Updated Models:**
   - `backend/models/user.py` - Already had signature fields
   - `backend/models/user_role.py` - Updated CHECK constraint to include all 8 roles
   - `backend/models/audit_log.py` - Already had entity_type and entity_id fields

2. **New Utility:**
   - `backend/utils/audit.py` - Created `log_action()` helper function for audit logging

3. **Updated Schemas:**
   - `backend/schemas/user.py` - Already had signature fields in UserResponse

### Frontend Changes

1. **New Type Definitions:**
   - `frontend/src/types/roles.ts`:
     - `UserRole` type with all 8 roles
     - `RolePermissions` interface with 26 permission flags
     - `getRolePermissions()` function mapping roles to permissions
     - Helper functions: `canAccessAdminPages()`, `canAccessPlateStock()`, etc.

2. **New Hook:**
   - `frontend/src/hooks/usePermissions.ts`:
     - `usePermissions()` hook for accessing current user's permissions
     - `hasPermission()` helper for checking specific permissions

3. **Updated Types:**
   - `frontend/src/types/database.ts` - Added signature fields to User interface

---

## Testing Checklist

### Database Testing

- [x] Migration 004_expand_roles_system.sql executed successfully
- [ ] Verify user_roles table accepts all 8 roles
- [ ] Verify users table has digital_signature_url and signature_uploaded_at columns
- [ ] Verify audit_logs indexes created

**Test Query:**
```sql
-- Test creating user with new role
INSERT INTO users (email, password_hash, full_name)
VALUES ('test@example.com', 'hash', 'Test User');

INSERT INTO user_roles (user_id, role)
VALUES ((SELECT id FROM users WHERE email = 'test@example.com'), 'logistiek');

-- Should succeed without error
```

### Backend Testing

#### Test 1: Create Users with New Roles

Test via FastAPI docs (`http://localhost:8000/docs`):

1. **Create Logistiek User**
   - POST `/api/admin/users`
   - Body:
     ```json
     {
       "email": "logistiek@test.com",
       "full_name": "Logistiek Tester",
       "password": "testpass123",
       "role": "logistiek"
     }
     ```
   - Expected: 201 Created

2. **Create Tekenaar User**
   - Same as above with `role: "tekenaar"`

3. **Create Machine Operator Users**
   - Create users with roles: `laser`, `buislaser`, `kantbank`

4. **Test Invalid Role**
   - Try creating user with `role: "invalid_role"`
   - Expected: 422 Validation Error

#### Test 2: Audit Logging

```python
# In Python shell or test file
from backend.database import SessionLocal
from backend.utils.audit import log_action
from uuid import uuid4

db = SessionLocal()
user_id = uuid4()  # Use real user ID from database

# Test basic log
log_action(
    db=db,
    user_id=user_id,
    action="test_action",
    entity_type="test",
    entity_id=uuid4(),
    details={"test": "data"}
)

# Verify in database
# SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 1;
```

#### Test 3: Role Validation in Models

```python
# Test UserRole model
from backend.models.user_role import UserRole

# Should work for all new roles
roles_to_test = ['admin', 'werkvoorbereider', 'werkplaats', 'logistiek',
                 'tekenaar', 'laser', 'buislaser', 'kantbank']

for role in roles_to_test:
    user_role = UserRole(user_id=user_id, role=role)
    # Should create without error
```

### Frontend Testing

#### Test 1: Role Permissions

Create a test component:

```tsx
// Test component
import { getRolePermissions, UserRole } from '../types/roles'

function PermissionTest() {
  const roles: UserRole[] = [
    'admin', 'werkvoorbereider', 'werkplaats',
    'logistiek', 'tekenaar', 'laser', 'buislaser', 'kantbank'
  ]

  return (
    <div>
      {roles.map(role => {
        const perms = getRolePermissions(role)
        return (
          <div key={role}>
            <h3>{role}</h3>
            <ul>
              <li>Can create projects: {perms.canCreateProjects ? '✅' : '❌'}</li>
              <li>Can execute orders: {perms.canExecuteOrders ? '✅' : '❌'}</li>
              <li>Can approve orders: {perms.canApproveOrders ? '✅' : '❌'}</li>
              <li>Can access admin: {perms.canAccessAdmin ? '✅' : '❌'}</li>
              <li>View only: {perms.canViewOnly ? '✅' : '❌'}</li>
            </ul>
          </div>
        )
      })}
    </div>
  )
}
```

**Expected Results:**
- **Admin:** All permissions enabled
- **Werkvoorbereider:** Can create/approve, cannot execute
- **Werkplaats:** Can execute, cannot create/approve
- **Logistiek:** Like werkplaats + can upload certificates
- **Tekenaar:** View only = true, all others false
- **Machine Operators:** Can execute + complete checklists only

#### Test 2: usePermissions Hook

```tsx
// Test in existing component
import { usePermissions } from '../hooks/usePermissions'

function TestComponent() {
  const { permissions, role, hasPermission } = usePermissions()

  console.log('Current role:', role)
  console.log('Permissions:', permissions)
  console.log('Can create projects:', hasPermission('canCreateProjects'))

  return <div>Check console for permissions</div>
}
```

#### Test 3: Permission-Based UI

Test that UI elements show/hide based on permissions:

```tsx
function ProjectList() {
  const { permissions } = usePermissions()

  return (
    <div>
      <h1>Projects</h1>
      {permissions.canCreateProjects && (
        <button>Create Project</button>  {/* Should only show for admin/werkvoorbereider */}
      )}
      {permissions.canViewOnly && (
        <div className="alert">You have view-only access</div>  {/* Only for tekenaar */}
      )}
    </div>
  )
}
```

---

## Regression Testing

Ensure existing functionality still works:

### PlateStock Module

- [ ] Login as werkvoorbereider - can access Voorraad page
- [ ] Login as werkplaats - can access Voorraad page
- [ ] Login as admin - can access Admin page
- [ ] Create new material - succeeds
- [ ] Create new plate - succeeds
- [ ] Claim plate - succeeds
- [ ] View Claims page - displays correctly

### Authentication

- [ ] Login with existing users still works
- [ ] Token is still stored correctly
- [ ] 401 redirect to /login still works
- [ ] Logout clears token

---

## Expected Permission Matrix

| Permission | Admin | Werkvoorbereider | Werkplaats | Logistiek | Tekenaar | Machine Ops |
|------------|-------|------------------|------------|-----------|----------|-------------|
| Create Projects | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Execute Orders | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ |
| Approve Orders | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Plates | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Upload Certificates | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Access Admin | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View Only | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |

---

## Known Issues / Limitations

1. **Multiple Roles Per User:**
   - Current implementation assumes one role per user
   - User model and auth system support multiple roles via user_roles junction table
   - Frontend `usePermissions` hook needs enhancement to combine permissions from multiple roles
   - TODO: Implement in future phase if needed

2. **Role Assignment UI:**
   - No UI yet for assigning roles to users
   - Admin must create users with roles via API
   - TODO: Build user management UI in Phase 8

3. **Digital Signature Upload:**
   - Backend fields exist
   - No upload endpoint yet
   - No frontend upload component yet
   - TODO: Implement in Phase 4 (Order Execution & Digital Signatures)

---

## Next Steps

1. ✅ Phase 0 complete - All role infrastructure in place
2. ➡️ Begin Phase 1: Core Data Model
   - Create projects, fases, orders, orderreeksen tables
   - Implement project and fase CRUD
   - Build project management UI
3. 📋 Before Phase 1:
   - Test Phase 0 changes thoroughly
   - Create test users for all roles
   - Verify permissions work as expected

---

## Files Modified/Created

### Database
- ✅ `database/migrations/004_expand_roles_system.sql` (created)

### Backend
- ✅ `backend/models/user_role.py` (updated CHECK constraint)
- ✅ `backend/utils/audit.py` (created)

### Frontend
- ✅ `frontend/src/types/roles.ts` (created)
- ✅ `frontend/src/hooks/usePermissions.ts` (created)
- ✅ `frontend/src/types/database.ts` (updated User interface)

### Documentation
- ✅ `docs/implementation/PHASE-0-TESTING.md` (this file)

---

## Verification Commands

```bash
# Run migration
cd database
py -3.11 run_migration.py 004_expand_roles_system.sql

# Start backend
cd ../backend
python main.py

# Start frontend (in separate terminal)
cd ../frontend
npm run dev

# Access application
# Backend: http://localhost:8000
# Frontend: http://localhost:5173
# API Docs: http://localhost:8000/docs
```

---

## Success Criteria

Phase 0 is considered complete when:

- [x] Migration 004_expand_roles_system.sql runs without errors
- [x] All 8 roles defined in database constraint
- [x] Digital signature fields added to users table
- [x] Audit logging enhanced with entity tracking
- [x] Backend models updated
- [x] Audit utility created and functional
- [x] Frontend role types defined
- [x] Frontend permissions hook created
- [ ] All tests pass (manual testing required)
- [ ] No regressions in existing PlateStock functionality
- [ ] Documentation complete

**Status:** Implementation Complete ✅ | Testing In Progress 🔄

---

## Contact

For questions about Phase 0 implementation, refer to:
- `docs/IMPLEMENTATION-ROADMAP.md` - Overall roadmap
- `docs/implementation/PROMPTS-OVERVIEW.md` - Implementation prompts
- `docs/PROJECT-FUNCTIONAL-OVERVIEW.md` - Role definitions
