---
title: "[HIGH] Authorization Helper Duplication"
labels: high, refactor, backend, phase-1
milestone: Phase 1 - Critical Security
assignees:
---

## 🟠 HIGH: Authorization Helper Duplication

**Issue Type:** Code Quality / Refactoring
**Severity:** HIGH
**Effort:** 2 hours
**Phase:** Phase 1

---

## Problem Description

Authorization logic duplicated between `platestock.py` and `utils/permissions.py`:

```python
# platestock.py:40-68 (DUPLICATE)
def check_admin(current_user: User):
    user_roles = [role.role for role in current_user.roles]
    if 'admin' not in user_roles: raise HTTPException(...)

# utils/permissions.py:11-30 (CANONICAL)
def require_admin(current_user: User = Depends(get_current_user)) -> User:
    user_roles = [role.role for role in current_user.roles]
    if 'admin' not in user_roles: raise HTTPException(...)
```

---

## Impact

- **DRY Violation:** Same logic in multiple places
- **Maintenance:** Must update in multiple locations
- **Inconsistency:** Error messages differ
- **Bug Risk:** Easy to update one but forget the other

---

## Solution

Remove all duplicate auth helpers. Use `utils/permissions.py` consistently via dependency injection.

---

## Acceptance Criteria

- [ ] All duplicate `check_admin()` functions removed
- [ ] All duplicate `check_admin_or_werkvoorbereider()` removed
- [ ] All endpoints use dependencies from `utils/permissions.py`
- [ ] No manual role checks in API layer
- [ ] All auth tests pass
- [ ] Role-based access still works correctly

---

## Implementation Steps

See: `IMPLEMENTATION-PLAN.md` → Phase 1 → Issue #3

1. Remove duplicates from `platestock.py` (lines 40-68)
2. Remove duplicates from `storage_locations.py` (lines 23-32)
3. Replace with `Depends(require_admin)` or `Depends(require_admin_or_werkvoorbereider)`

---

## Example Refactor

**Before:**
```python
@router.post("/materials")
async def create_material(..., current_user: User = Depends(get_current_user)):
    check_admin(current_user)  # Manual check
    ...
```

**After:**
```python
@router.post("/materials")
async def create_material(..., current_user: User = Depends(require_admin)):
    # No manual check - dependency enforces it
    ...
```

---

## Testing Checklist

- [ ] Admin can access admin-only endpoints
- [ ] Werkvoorbereider can access shared endpoints
- [ ] Werkplaats cannot access admin endpoints (403)
- [ ] Unauthenticated requests return 401
- [ ] Error messages are consistent

---

## Files to Change

- `backend/api/platestock.py` (remove check_admin, use dependencies)
- `backend/api/storage_locations.py` (remove check_admin, use dependencies)
- All other API files with duplicate checks

---

## References

- Implementation Plan: Phase 1, Steps 1.9-1.10
- Code Review: Issue #3
