# Role System Reference Guide
## MES Kersten - User Roles & Permissions

**Last Updated:** December 10, 2024
**Phase:** 0 - Foundation & Refactoring

---

## Quick Reference

### All User Roles

| Role | Dutch Name | Primary Function | Key Permissions |
|------|------------|------------------|-----------------|
| `admin` | Administrator | System management | All permissions, role switching |
| `werkvoorbereider` | Werkvoorbereider | Work preparation | Create projects, approve orders, manage workflow |
| `werkplaats` | Werkplaats | Workshop execution | Execute orders, complete checklists, manage plates |
| `logistiek` | Logistiek | Material management | All werkplaats + upload certificates |
| `tekenaar` | Tekenaar | Drawing reference | View-only access to projects and drawings |
| `laser` | Laser Operator | Laser cutting | Execute laser orders, complete checklists |
| `buislaser` | Buislaser Operator | Tube laser cutting | Execute tube laser orders, complete checklists |
| `kantbank` | Kantbank Operator | Press brake operation | Execute press brake orders, complete checklists |

---

## Role Descriptions

### 1. Admin (Administrator)

**Purpose:** System configuration and full access

**Can:**
- Everything all other roles can do
- Create, edit, and delete users
- Configure order types
- Manage base checklist templates
- View system-wide statistics
- Switch between role views (debugging/support)

**Cannot:**
- (No restrictions)

**Use Cases:**
- System administrator
- Technical support
- Initial system setup

---

### 2. Werkvoorbereider (Work Preparation Specialist)

**Purpose:** Main power user - plans and coordinates production

**Can:**
- Create and manage projects
- Create and manage fases
- Upload files (CSV, PDF, STEP, certificates)
- Create orders and orderreeksen
- Modify order sequences anytime
- Extend checklists per order
- Approve completed orders with digital signature
- Reopen closed orders
- Split orderreeksen during production
- Export certificates
- Manage all plate stock operations
- View all workshop progress

**Cannot:**
- Modify admin settings
- Create/delete users
- Access other werkvoorbereiders' projects (unless shared)
- Execute orders (only plan them)

**Use Cases:**
- Project manager
- Production planner
- Work preparation specialist

**Receives Notifications:**
- Order completion
- Plate claim changes

---

### 3. Werkplaats (Workshop Worker)

**Purpose:** Executes production orders

**Can:**
- View assigned orders
- Open and view drawings (PDF, STEP, DXF)
- Check off completed items
- Fill in checklists
- Mark orders as complete (gereedmelding)
- Add notes to orders
- Manage plates (add, edit, delete, claim)
- Upload plate photos
- View certificates linked to parts

**Cannot:**
- Create projects or fases
- Upload project files (except plate photos)
- Approve orders
- Modify order sequences
- Delete completed orders
- Consume plates (only werkvoorbereider)

**Use Cases:**
- Workshop technician
- General machinist
- Assembly worker

**Receives Notifications:**
- Claim modifications by others

---

### 4. Logistiek (Logistics Specialist)

**Purpose:** Material intake and storage management

**Inherits:** All werkplaats permissions

**Additional Permissions:**
- Register incoming plates
- Upload material certificates (primary responsibility)
- Manage storage locations
- View total weight per location
- Assign plates to storage locations

**Special Responsibility:**
- Primary person for material intake
- Ensures certificates uploaded on delivery
- Maintains accurate location data

**Use Cases:**
- Warehouse manager
- Material handler
- Receiving clerk

**Receives Notifications:**
- Claim modifications by others

---

### 5. Tekenaar (Draftsman)

**Purpose:** View-only access to technical drawings

**Can:**
- View all projects and fases
- View all drawings (PDF, STEP, DXF)
- Download files
- View posnummers and specifications

**Cannot:**
- Modify anything
- Upload files
- Create projects/orders
- Access voorraad (plate stock)

**Use Cases:**
- Technical staff
- Engineering reference
- External consultants (limited access)

**Receives Notifications:**
- None

---

### 6. Machine Operators (Laser, Buislaser, Kantbank)

**Purpose:** Execute specific machine operations

**Can:**
- View orders assigned to their machine type
- View cutting lists
- View drawings for assigned parts
- Check off completed parts
- Fill in machine-specific checklists
- Mark orders as complete

**Cannot:**
- Create projects or fases
- Upload files
- Approve orders
- Modify order sequences
- Access plate stock
- View orders for other machines

**Specialized by Machine:**
- **Laser operator:** Only sees "plaat snijden" (plate cutting) orders
- **Buislaser operator:** Only sees "profiel snijden" (tube cutting) orders
- **Kantbank operator:** Only sees "kanten" (press brake) orders

**Use Cases:**
- Dedicated machine operators
- Specialized technicians
- CNC operators

**Receives Notifications:**
- Order assignments

---

## Permission Matrix

### Full Permission Breakdown

| Permission | Admin | Werkvoorbereider | Werkplaats | Logistiek | Tekenaar | Machine Ops |
|------------|:-----:|:----------------:|:----------:|:---------:|:--------:|:-----------:|
| **Project & Fase Management** |
| Create Projects | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Edit Projects | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Projects | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delete Projects | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Order Management** |
| Create Orders | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Execute Orders | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ |
| Approve Orders | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Modify Order Sequence | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Reopen Orders | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **File Management** |
| Upload Files | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Download Files | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Drawings | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **PlateStock** |
| Manage Plates | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Claim Plates | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Consume Plates | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Admin Functions** |
| Access Admin | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Configure Order Types | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Checklists | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Checklist & Execution** |
| Extend Checklists | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Complete Checklists | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Mark Order Complete | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ |
| **Certificates** |
| Upload Certificates | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Export Certificates | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Special** |
| View Only Mode | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Switch Roles | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Using Roles in Code

### Backend (Python)

```python
# Check user role
from models.user_role import UserRole

def check_werkvoorbereider(current_user):
    """Check if user has werkvoorbereider role"""
    return any(role.role == 'werkvoorbereider' for role in current_user.roles)

# Audit logging with new utility
from utils.audit import log_action

log_action(
    db=db,
    user_id=current_user.id,
    action="approve_order",
    entity_type="order",
    entity_id=order.id,
    details={"order_number": order.number}
)
```

### Frontend (TypeScript/React)

```tsx
// Import types and hooks
import { usePermissions } from '@/hooks/usePermissions'
import { getRolePermissions, UserRole } from '@/types/roles'

// In component
function ProjectPage() {
  const { permissions, role, hasPermission } = usePermissions()

  if (!permissions.canViewProjects) {
    return <div>Access denied</div>
  }

  return (
    <div>
      <h1>Projects</h1>

      {/* Conditional rendering based on permission */}
      {permissions.canCreateProjects && (
        <button>Create Project</button>
      )}

      {/* Check specific permission */}
      {hasPermission('canApproveOrders') && (
        <button>Approve Orders</button>
      )}

      {/* View-only indicator */}
      {permissions.canViewOnly && (
        <div className="alert">You have view-only access</div>
      )}
    </div>
  )
}

// Get permissions for any role
const adminPerms = getRolePermissions('admin')
const tekenaarsPerms = getRolePermissions('tekenaar')
```

---

## Database Schema

### user_roles Table

```sql
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN (
        'admin',
        'werkvoorbereider',
        'werkplaats',
        'logistiek',
        'tekenaar',
        'laser',
        'buislaser',
        'kantbank'
    )),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, role)
);
```

### users Table (with digital signatures)

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    digital_signature_url TEXT NULL,  -- New in Phase 0
    signature_uploaded_at TIMESTAMPTZ NULL,  -- New in Phase 0
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Common Patterns

### Multi-Role Support

Users can have multiple roles (e.g., both `werkplaats` and `laser`):

```sql
-- User with multiple roles
INSERT INTO user_roles (user_id, role)
VALUES
    ('user-uuid', 'werkplaats'),
    ('user-uuid', 'laser');
```

In frontend, combine permissions:
```tsx
// TODO: Implement in future if needed
function getCombinedPermissions(roles: UserRole[]): RolePermissions {
  // Combine permissions from all roles (OR logic)
  // Most permissive wins
}
```

### Role Hierarchy

Implicit hierarchy (for permission inheritance):
1. **Admin** - Full access
2. **Werkvoorbereider** - Planning & approval
3. **Logistiek** - Werkplaats + material intake
4. **Werkplaats** - Execution
5. **Machine Operators** - Specialized execution
6. **Tekenaar** - View only

---

## Migration Notes

### From 3 Roles to 8 Roles

**Backward Compatibility:**
- ✅ Existing users with `admin`, `werkvoorbereider`, `werkplaats` roles continue to work
- ✅ No data migration needed
- ✅ Existing permissions unchanged

**New Features:**
- Digital signature fields available for all users
- Enhanced audit logging with entity tracking
- Permission system ready for future features

---

## Future Enhancements

### Planned for Future Phases

1. **Digital Signature Upload** (Phase 4)
   - UI for uploading signature image
   - Signature preview in order approval
   - Signature on certificate exports

2. **User Management UI** (Phase 8)
   - Admin page for creating users
   - Role assignment interface
   - Bulk role changes

3. **Permission Groups** (Optional)
   - Custom permission sets
   - Fine-grained access control
   - Department-based permissions

4. **Multi-Role UI** (If needed)
   - Role switcher for users with multiple roles
   - Combined permission calculation
   - Context-aware role selection

---

## Troubleshooting

### Common Issues

**Issue:** User cannot access expected features
- **Solution:** Check user's role in database, verify permissions in `getRolePermissions()`

**Issue:** Permission denied for werkvoorbereider
- **Solution:** Ensure role is spelled correctly: `werkvoorbereider` not `werkvorbereider`

**Issue:** Cannot create user with new role
- **Solution:** Run migration 004_expand_roles_system.sql

**Issue:** Frontend doesn't recognize new role
- **Solution:** Ensure `frontend/src/types/roles.ts` is imported and used

---

## Reference Files

- **Migration:** `database/migrations/004_expand_roles_system.sql`
- **Backend Model:** `backend/models/user_role.py`
- **Backend Audit:** `backend/utils/audit.py`
- **Frontend Types:** `frontend/src/types/roles.ts`
- **Frontend Hook:** `frontend/src/hooks/usePermissions.ts`
- **Testing Guide:** `docs/implementation/PHASE-0-TESTING.md`
- **Functional Overview:** `docs/PROJECT-FUNCTIONAL-OVERVIEW.md`

---

**Questions?** Refer to `docs/IMPLEMENTATION-ROADMAP.md` for overall system architecture.
