---
title: "[CRITICAL] Transaction Management Inconsistency"
labels: critical, backend, refactor, phase-2
milestone: Phase 2 - Transactions & Audit
assignees:
---

## 🔴 CRITICAL: Transaction Management Inconsistency

**Issue Type:** Architecture / Refactoring
**Severity:** CRITICAL
**Effort:** 8 hours
**Phase:** Phase 2

---

## Problem Description

Mixed patterns for database transaction commits across the codebase:
- Some endpoints commit in service layer
- Some endpoints commit in API layer
- Some use flush without clear commit ownership
- Inconsistent rollback handling

This creates:
- ❌ Confusion about transaction boundaries
- ❌ Potential for partial commits on errors
- ❌ Difficult to compose service methods
- ❌ Risk of data integrity issues

**Example of inconsistency:**

```python
# Pattern 1: API commits (platestock.py:280-327)
@router.post("/plates")
async def create_plates(...):
    for i in range(aantal):
        plate = Plate(...)
        db.add(plate)
        db.flush()  # Service flushes
    db.commit()  # API commits

# Pattern 2: Service returns, API commits (projects.py)
async def create_project(...):
    project = ProjectService.create_project(...)  # No commit
    db.commit()  # API commits
```

---

## Impact

- **Data Integrity:** Risk of partial commits if exceptions occur between flush and commit
- **Maintainability:** Unclear where to add rollback logic
- **Composability:** Cannot safely compose multiple service calls in one transaction

---

## Solution

**Standardize on: Service Layer Owns Transactions**

**Rationale:**
- Service methods are atomic units of work
- Easier to compose service methods
- Clear rollback boundaries
- API layer becomes thin orchestration

---

## Acceptance Criteria

- [ ] All service methods own db.commit()
- [ ] All service methods handle db.rollback()
- [ ] API layer NEVER calls db.commit() or db.rollback()
- [ ] Service exceptions created in `backend/services/exceptions.py`
- [ ] Pattern documented in `CLAUDE.md`
- [ ] All existing functionality still works
- [ ] Transaction tests pass

---

## Implementation Steps

See: `IMPLEMENTATION-PLAN.md` → Phase 2 → Issue #1

**Summary:**
1. Create `backend/services/exceptions.py` with exception hierarchy
2. Refactor `PlateStockService` methods to own transactions
3. Update API endpoints to use service methods
4. Document pattern in `CLAUDE.md`
5. Test atomic commits and rollbacks

---

## Testing Checklist

- [ ] Create plate commits atomically with audit log
- [ ] Failed plate creation rolls back completely (no partial data)
- [ ] Delete with active claims is rejected (no deletion)
- [ ] Service exceptions propagate to API with correct HTTP codes
- [ ] Multiple operations in sequence work correctly

---

## Files to Change

- `backend/services/exceptions.py` (NEW)
- `backend/services/platestock.py` (refactor all methods)
- `backend/api/platestock.py` (remove commits, catch exceptions)
- `CLAUDE.md` (add transaction pattern documentation)

---

## Related Issues

- #2 (Audit Logging) - Must be added before commit
- #10 (Error Handling) - Depends on service exceptions

---

## References

- Implementation Plan: Phase 2, Steps 2.1-2.4
- Code Review: Issue #1
