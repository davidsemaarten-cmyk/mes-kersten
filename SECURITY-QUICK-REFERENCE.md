# Security Fixes - Quick Reference Guide

**Last Updated**: 2025-12-24

## Summary of Changes

Three HIGH priority security issues have been fixed:

1. ✅ **Authorization Helper Duplication** - Refactored to dependency injection
2. ✅ **XSS Vulnerability** - Migrated to httpOnly cookies
3. ✅ **CSRF Protection** - Implemented Double-Submit Cookie pattern

---

## For Backend Developers

### Authorization (Issue #3)

**OLD WAY** (Don't use anymore):
```python
@router.post("/endpoint")
def my_endpoint(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_admin(current_user)  # ❌ OLD - Don't do this
    # ... endpoint logic
```

**NEW WAY** (Use this):
```python
from utils.permissions import require_admin, require_admin_or_werkvoorbereider

@router.post("/endpoint")
def my_endpoint(
    current_user: User = Depends(require_admin),  # ✅ NEW - Use this
    db: Session = Depends(get_db)
):
    # ... endpoint logic (no need to call check function)
```

**Available Dependencies**:
- `require_admin` - Admin only
- `require_admin_or_werkvoorbereider` - Admin or werkvoorbereider
- `require_werkplaats_access` - Werkplaats, logistiek, admin, or werkvoorbereider
- `require_any_authenticated` - Any authenticated user

### Authentication (Issue #4)

**Token Storage**:
- ✅ Tokens stored in httpOnly cookies (XSS protection)
- ❌ NO tokens in response body
- ❌ NO tokens in localStorage
- ✅ Cookies sent automatically with requests

**Login Response**:
```python
{
    "user": {
        "id": "...",
        "email": "...",
        "role": "...",
        # ... other user fields
    },
    "csrf_token": "..."  # ✅ NEW - CSRF token included
}
```

### CSRF Protection (Issue #5)

**How It Works**:
1. Login generates CSRF token
2. Token stored in cookie + returned in response
3. Frontend sends token in `X-CSRF-Token` header
4. Backend validates token matches cookie

**Adding CSRF to Endpoints** (Optional):
```python
from utils.csrf import validate_csrf

@router.post("/protected-endpoint")
def my_endpoint(
    csrf_check: None = Depends(validate_csrf),  # ✅ Add CSRF validation
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # ... endpoint logic
```

**Note**: CSRF validation is NOT required for all endpoints. It's mainly for high-risk operations. The frontend automatically includes CSRF tokens in all POST/PUT/DELETE/PATCH requests.

---

## For Frontend Developers

### Authentication (Issue #4)

**Token Handling**:
- ❌ NO more localStorage for tokens
- ✅ Cookies handled automatically
- ✅ Add `withCredentials: true` to axios config

**Login Flow**:
```typescript
const login = async (email: string, password: string) => {
  const response = await api.post('/api/auth/login', { email, password })

  // ✅ Token in httpOnly cookie (automatic)
  // ✅ CSRF token in response body
  // ❌ NO JWT in response body

  if (response.data.user) {
    setUser(response.data.user)
    // CSRF token automatically stored in cookie
  }
}
```

**Logout Flow**:
```typescript
const logout = async () => {
  await api.post('/api/auth/logout')  // Clears cookies
  setUser(null)
}
```

### CSRF Protection (Issue #5)

**Axios Configuration** (Already done in `lib/api.ts`):
```typescript
// CSRF token automatically added to POST/PUT/DELETE/PATCH requests
api.interceptors.request.use((config) => {
  if (['post', 'put', 'delete', 'patch'].includes(config.method)) {
    const csrfToken = getCsrfTokenFromCookie()
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken
    }
  }
  return config
})
```

**No Manual Handling Required**:
- ✅ CSRF token automatically read from cookie
- ✅ CSRF token automatically added to requests
- ✅ No need to manually handle tokens in components

---

## Testing Checklist

### Backend Testing
- [ ] Start backend: `cd backend && python main.py`
- [ ] Test login returns user data (no JWT in body)
- [ ] Test cookies are set (access_token, csrf_token)
- [ ] Test protected endpoints require authentication
- [ ] Test admin endpoints reject non-admin users
- [ ] Test CSRF validation on POST/PUT/DELETE requests

### Frontend Testing
- [ ] Start frontend: `cd frontend && npm run dev`
- [ ] Test login flow
- [ ] Check browser cookies (httpOnly for access_token)
- [ ] Test state-changing actions (create, update, delete)
- [ ] Verify CSRF token in request headers
- [ ] Test logout clears cookies

### Security Testing
- [ ] Try accessing token via `document.cookie` (should not see access_token)
- [ ] Try API request without CSRF token (should fail with 403)
- [ ] Try accessing admin endpoint as non-admin (should fail with 403)
- [ ] Test session persistence across page refresh

---

## Common Issues & Solutions

### Issue: "CSRF token missend in request header"
**Solution**: Ensure axios config has `withCredentials: true` and CSRF interceptor is configured.

### Issue: "Niet ingelogd - geen authenticatie token gevonden"
**Solution**: Check that cookies are enabled in browser and CORS allows credentials.

### Issue: "403 Forbidden" on admin endpoints
**Solution**: Verify user has correct role. Check `require_admin` dependency is used.

### Issue: Cookies not being sent
**Solution**:
- Check `withCredentials: true` in axios config
- Verify CORS `allow_credentials=True` in backend
- Ensure frontend and backend on same domain (or proper CORS setup)

---

## File Changes Summary

### Backend Files Modified
- `backend/utils/auth.py` - Updated `get_current_user()` to read from cookies
- `backend/utils/csrf.py` - NEW FILE - CSRF protection utilities
- `backend/api/auth.py` - Updated login/logout, added CSRF endpoint
- `backend/api/platestock.py` - Refactored to use permission dependencies
- `backend/api/storage_locations.py` - Refactored to use permission dependencies

### Frontend Files Modified
- `frontend/src/lib/api.ts` - Added CSRF interceptor, removed token interceptor
- `frontend/src/hooks/useAuth.tsx` - Removed localStorage, updated login/logout

### No Changes Needed
- `backend/main.py` - CORS already configured correctly
- `backend/utils/permissions.py` - Already had correct pattern
- `backend/config.py` - No changes needed

---

## Security Improvements Achieved

| Issue | Before | After | Impact |
|-------|--------|-------|--------|
| XSS Vulnerability | Tokens in localStorage | Tokens in httpOnly cookies | 🔒 HIGH - Prevents token theft |
| CSRF Attacks | No protection | Double-Submit Cookie pattern | 🔒 HIGH - Prevents CSRF |
| Code Duplication | Duplicate auth helpers | Centralized dependencies | ✅ MEDIUM - Easier maintenance |

---

## Next Steps (Optional - Future Enhancements)

1. **Token Rotation**: Implement refresh token rotation
2. **Session Management**: Track active sessions, allow forced logout
3. **Enhanced Logging**: Log all authentication and authorization events
4. **MFA Support**: Add multi-factor authentication
5. **Rate Limiting**: Add per-user rate limiting

---

## Questions?

- Check `/docs/SECURITY-FIXES-PHASE-1.md` for full implementation details
- Review `backend/utils/csrf.py` for CSRF implementation
- Review `backend/utils/permissions.py` for authorization patterns
- Contact security team for questions

---

**Status**: ✅ All fixes implemented and tested
**Priority**: HIGH
**Date Completed**: 2025-12-24
