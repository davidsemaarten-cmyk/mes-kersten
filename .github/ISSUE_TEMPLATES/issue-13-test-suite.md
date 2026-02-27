---
title: "[CRITICAL] No Automated Test Suite"
labels: critical, testing, infrastructure, phase-3
milestone: Phase 3 - Test Infrastructure
assignees:
---

## 🔴 CRITICAL: No Automated Test Suite

**Issue Type:** Quality Assurance / Infrastructure
**Severity:** CRITICAL
**Effort:** 24 hours
**Phase:** Phase 3

---

## Problem Description

Zero automated tests exist:
- ❌ No pytest tests
- ❌ Only manual test scripts (`test_db.py`, `test_login_debug.py`)
- ❌ No regression testing
- ❌ High risk of breaking changes
- ❌ Difficult to refactor with confidence

---

## Impact

- **Quality:** Cannot catch regressions automatically
- **Speed:** Manual testing required for every change
- **Confidence:** Risky to refactor or add features
- **Documentation:** Tests serve as living documentation

---

## Solution

Build comprehensive pytest test suite with >70% coverage.

**Structure:**
```
backend/tests/
  conftest.py           # Fixtures & config
  unit/                 # Unit tests
    test_platestock_service.py
    test_auth.py
  integration/          # API tests
    test_platestock_api.py
  fixtures/             # Shared fixtures
    db_fixtures.py
```

---

## Acceptance Criteria

- [ ] pytest infrastructure setup
- [ ] Test database configured
- [ ] Unit tests for PlateStockService (15+ tests)
- [ ] Integration tests for API endpoints (10+ tests)
- [ ] Auth & permission tests
- [ ] Code coverage >= 70%
- [ ] CI/CD pipeline runs tests on PR
- [ ] All tests pass

---

## Coverage Goals

**Minimum 70% overall**

**Priority for 100% coverage:**
- `services/platestock.py`
- `utils/auth.py`
- `utils/permissions.py`

**Acceptable lower coverage:**
- `api/` endpoints (covered by integration tests)
- `models/` (mostly ORM definitions)

---

## Implementation Steps

See: `IMPLEMENTATION-PLAN.md` → Phase 3

**Summary:**
1. Create test directory structure
2. Setup pytest config and fixtures
3. Write unit tests for PlateStockService
4. Write integration tests for API
5. Add CI/CD pipeline (GitHub Actions)
6. Achieve 70%+ coverage

---

## Testing Checklist

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Coverage >= 70%
- [ ] CI/CD pipeline runs tests on PR
- [ ] Test database is isolated from dev database
- [ ] Fixtures cover common scenarios
- [ ] Edge cases are tested
- [ ] Error cases are tested

---

## Key Test Cases

**PlateStockService:**
- Plate number generation (first, increment, gaps, collisions)
- Prefix suggestion (basic, with spec, aluminium, max length)
- Area calculation (standard, small plates)
- Status updates (claimed, available, bij_laser guard)
- Delete validation (active claims, consumed plates)

**API Integration:**
- CRUD operations for materials, plates, claims
- Authentication & authorization
- Error responses (404, 403, 400, 500)

---

## Files to Create

- `backend/tests/conftest.py`
- `backend/tests/unit/test_platestock_service.py`
- `backend/tests/integration/test_platestock_api.py`
- `backend/tests/fixtures/db_fixtures.py`
- `backend/pyproject.toml` (pytest config)
- `.github/workflows/tests.yml` (CI/CD)

---

## Dependencies

```bash
pip install pytest pytest-cov pytest-asyncio httpx
```

---

## References

- Implementation Plan: Phase 3 (all steps)
- Code Review: Issue #13
