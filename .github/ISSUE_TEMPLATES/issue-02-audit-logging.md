---
title: "[CRITICAL] Missing Audit Logging in Critical Operations"
labels: critical, backend, security, compliance, phase-2
milestone: Phase 2 - Transactions & Audit
assignees:
---

## 🔴 CRITICAL: Missing Audit Logging

**Issue Type:** Security / Compliance
**Severity:** CRITICAL
**Effort:** 4 hours
**Phase:** Phase 2

---

## Problem Description

Critical operations lack audit trail logging:
- ❌ Plate creation, deletion, consumption NOT audited
- ❌ Material operations NOT audited
- ❌ Cannot track who did what and when
- ❌ Compliance risk for manufacturing operations

**Infrastructure exists** (`utils/audit.py`) but not used consistently.

---

## Impact

- **Compliance:** Manufacturing requires full audit trails
- **Debugging:** Cannot trace data issues to specific actions
- **Security:** No record of deletions or modifications
- **Accountability:** Cannot determine who performed critical actions

---

## Solution

Add `log_action()` calls to all critical operations BEFORE commit.

**Pattern:**
```python
db.flush()  # Get ID

log_action(
    db=db,
    user_id=user_id,
    action=AuditAction.CREATE_PLATE,
    entity_type=EntityType.PLATE,
    entity_id=plate.id,
    details={"plate_number": plate.plate_number, ...}
)

db.commit()  # Commits both entity and audit log atomically
```

---

## Acceptance Criteria

- [ ] All plate operations audited (create, delete, consume, move to/from laser, remnant)
- [ ] All material operations audited (create, update, delete)
- [ ] All claim operations audited (create, release, bulk)
- [ ] Audit actions defined in `utils/audit.py`
- [ ] Audit logs committed atomically with main operation
- [ ] Verification script passes

---

## Implementation Steps

See: `IMPLEMENTATION-PLAN.md` → Phase 2 → Issue #2

**Summary:**
1. Add missing `AuditAction` enum values in `utils/audit.py`
2. Update service methods to call `log_action()` before commit
3. Create verification script `backend/scripts/verify_audit_logs.py`
4. Test all operations create audit logs

---

## New Audit Actions Needed

```python
CREATE_PLATE, UPDATE_PLATE, DELETE_PLATE, CONSUME_PLATE
MOVE_TO_LASER, MOVE_FROM_LASER, PROCESS_REMNANT
CREATE_MATERIAL, UPDATE_MATERIAL, DELETE_MATERIAL
CREATE_CLAIM, RELEASE_CLAIM, BULK_CLAIM
```

---

## Testing Checklist

- [ ] Every plate creation has audit log entry
- [ ] Every plate deletion has audit log entry
- [ ] Every plate consumption has audit log entry
- [ ] Material operations are audited
- [ ] Claim operations are audited
- [ ] Audit logs contain correct user_id
- [ ] Audit log details are meaningful (contain entity info)
- [ ] Verification script shows all critical actions

---

## Verification Script

Create `backend/scripts/verify_audit_logs.py`:
- Checks recent audit logs exist
- Verifies critical actions have entries
- Validates log structure

---

## Files to Change

- `backend/utils/audit.py` (add enum values)
- `backend/services/platestock.py` (add log_action calls)
- `backend/scripts/verify_audit_logs.py` (NEW)

---

## Related Issues

- #1 (Transaction Management) - Audit logs must be in same transaction

---

## References

- Implementation Plan: Phase 2, Steps 2.2, 2.5-2.7
- Code Review: Issue #2
