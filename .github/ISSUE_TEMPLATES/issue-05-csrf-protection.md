---
title: "[HIGH] Missing CSRF Protection"
labels: high, security, backend, frontend, phase-1
milestone: Phase 1 - Critical Security
assignees:
---

## 🟠 HIGH: Missing CSRF Protection

**Issue Type:** Security Vulnerability
**Severity:** HIGH
**Effort:** 4 hours
**Phase:** Phase 1

---

## Problem Description

No CSRF token validation for state-changing requests (POST, PUT, DELETE).

**Attack Scenario:**
1. User is authenticated (has cookie)
2. User visits malicious site
3. Malicious site submits form to our API
4. Browser automatically sends cookie
5. Unwanted action performed as user

---

## Impact

- **Unauthorized Actions:** Attacker can perform actions as authenticated user
- **Data Modification:** Create/delete plates, materials without consent
- **CVSS Score:** 6.5 (Medium-High)

---

## Solution

Add CSRF token validation using `fastapi-csrf-protect`.

**Flow:**
1. Login sets CSRF token in separate cookie (readable by JS)
2. Frontend reads CSRF token from cookie
3. Frontend sends CSRF token in X-CSRF-Token header
4. Backend validates token matches cookie

---

## Acceptance Criteria

- [ ] fastapi-csrf-protect installed
- [ ] CSRF middleware configured
- [ ] Login sets CSRF token cookie
- [ ] All POST/PUT/DELETE endpoints validate CSRF
- [ ] Frontend sends X-CSRF-Token header
- [ ] Requests without valid CSRF token are rejected (403)
- [ ] GET requests work without CSRF token

---

## Implementation Steps

See: `IMPLEMENTATION-PLAN.md` → Phase 1 → Issue #5

1. Install `fastapi-csrf-protect` (1h)
2. Configure CSRF middleware in `main.py` (2h)
3. Add CSRF validation to endpoints (1h)
4. Frontend: Send CSRF token in requests (1h)

---

## Testing Checklist

- [ ] CSRF cookie set after login
- [ ] POST requests include X-CSRF-Token header
- [ ] Requests without CSRF token are rejected (403)
- [ ] GET requests work without CSRF token
- [ ] CSRF token refreshed on login

---

## Files to Change

- `backend/main.py` (CSRF config)
- `backend/api/platestock.py` (add CSRF validation)
- `backend/requirements.txt` (add fastapi-csrf-protect)
- `frontend/src/lib/api.ts` (send CSRF token)
- `frontend/package.json` (add js-cookie)

---

## References

- Implementation Plan: Phase 1, Steps 1.5-1.8
- Code Review: Issue #5
