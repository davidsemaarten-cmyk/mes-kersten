---
title: "[HIGH] Token Storage XSS Vulnerability (localStorage)"
labels: high, security, frontend, backend, phase-1
milestone: Phase 1 - Critical Security
assignees:
---

## 🟠 HIGH: Token Storage XSS Vulnerability

**Issue Type:** Security Vulnerability
**Severity:** HIGH
**Effort:** 6 hours
**Phase:** Phase 1

---

## Problem Description

JWT tokens stored in `localStorage` are vulnerable to XSS attacks:

```typescript
// VULNERABLE
localStorage.setItem('token', response.data.token)  // ❌ Accessible to XSS
```

**Attack Scenario:**
1. Attacker injects malicious script via XSS
2. Script reads `localStorage.getItem('token')`
3. Token sent to attacker's server
4. Attacker impersonates user

---

## Impact

- **Session Hijacking:** Attacker can steal authentication tokens
- **User Impersonation:** Complete account takeover possible
- **Data Breach:** Access to all user data
- **CVSS Score:** 7.5 (High)

---

## Solution

Migrate JWT tokens from localStorage to **httpOnly cookies**.

**Benefits:**
- ✅ Not accessible to JavaScript (XSS protection)
- ✅ Automatically sent with requests
- ✅ Can set Secure flag (HTTPS only)
- ✅ SameSite protection (CSRF mitigation)

---

## Acceptance Criteria

**Backend:**
- [ ] Login sets httpOnly cookie (no token in response body)
- [ ] Cookie has httpOnly=True flag
- [ ] Cookie has Secure=True in production
- [ ] Cookie has SameSite=Lax
- [ ] Logout endpoint clears cookie
- [ ] `/me` endpoint added to check auth status

**Frontend:**
- [ ] Remove all localStorage token usage
- [ ] Remove Authorization header interceptor
- [ ] Add `withCredentials: true` to axios
- [ ] Login/logout flow works
- [ ] Protected routes work

---

## Implementation Steps

See: `IMPLEMENTATION-PLAN.md` → Phase 1 → Issue #4

**Summary:**

**Backend (3 hours):**
1. Update `/login` to set httpOnly cookie
2. Update `get_current_user()` to read from cookie
3. Add `/logout` endpoint to clear cookie
4. Add `/me` endpoint

**Frontend (3 hours):**
1. Remove localStorage usage in `useAuth.tsx`
2. Remove token interceptor in `api.ts`
3. Add `api.defaults.withCredentials = true`
4. Update login/logout logic

---

## Testing Checklist

- [ ] Login sets cookie in browser (DevTools → Application → Cookies)
- [ ] Cookie has HttpOnly flag enabled
- [ ] Cookie has Secure flag in production
- [ ] Cookie has SameSite=Lax
- [ ] `/me` endpoint returns user when authenticated
- [ ] `/me` endpoint returns 401 when not authenticated
- [ ] Logout clears cookie
- [ ] Protected pages redirect to login when cookie expired
- [ ] No token visible in localStorage
- [ ] API requests work without Authorization header

---

## Security Verification

```bash
# Test cookie is httpOnly
curl -c cookies.txt -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}'

# Check cookie attributes
cat cookies.txt | grep httponly  # Should show TRUE

# Test authenticated request with cookie
curl -b cookies.txt http://localhost:8000/api/auth/me
```

---

## Files to Change

**Backend:**
- `backend/api/auth.py` (login, logout, /me endpoints)
- `backend/utils/auth.py` (get_current_user reads cookie)

**Frontend:**
- `frontend/src/hooks/useAuth.tsx` (remove localStorage)
- `frontend/src/lib/api.ts` (remove interceptor, add withCredentials)

---

## Related Issues

- #5 (CSRF Protection) - Cookies require CSRF protection
- #3 (Auth Consolidation) - Related to auth flow

---

## References

- Implementation Plan: Phase 1, Steps 1.1-1.4
- Code Review: Issue #4
- OWASP: https://owasp.org/www-community/HttpOnly
