# MES Kersten Test Users Guide

This document provides login credentials and instructions for testing all 8 user roles in the MES Kersten system.

---

## Quick Reference: Default Admin User

**⚠️ IMPORTANT:** This default user is created automatically during database migration `001_core_tables.sql`.

| Field | Value |
|-------|-------|
| **Email** | `admin@kersten.nl` |
| **Password** | `admin123` |
| **Role** | `admin` |
| **Full Name** | Administrator |

**Security Note:** Change this password in production! This is a development/testing credential only.

---

## How to Login

### Via API (Programmatic Access)

```bash
# Login request
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@kersten.nl",
    "password": "admin123"
  }'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "...",
    "email": "admin@kersten.nl",
    "full_name": "Administrator",
    "role": "admin",
    "is_active": true
  }
}
```

### Via Swagger UI

1. Open http://localhost:8000/docs in your browser
2. Click "Authorize" button (top right, lock icon)
3. In the "username" field, enter: `admin@kersten.nl`
4. In the "password" field, enter: `admin123`
5. Click "Authorize"
6. You can now test all endpoints with admin permissions

---

## Creating Test Users for All 8 Roles

Since only the admin user exists by default, you need to create test users for the other 7 roles.

### Prerequisites

1. Start the backend server: `cd backend && venv\Scripts\python main.py`
2. Login as admin (see above) to get a JWT token
3. Use the token to create new users

---

## Method 1: Using Swagger UI (Easiest)

1. **Login as admin** (see above)
2. Navigate to http://localhost:8000/docs
3. Find the **POST /api/auth/register** endpoint
4. Click "Try it out"
5. Use the example requests below for each role

---

## Method 2: Using curl (Command Line)

First, login and save the token:

```bash
# Login as admin
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@kersten.nl", "password": "admin123"}' \
  | jq -r '.token')

echo "Token: $TOKEN"
```

Then create users with this token:

```bash
# Example: Create werkvoorbereider user
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "email": "werkvoorbereider@kersten.nl",
    "password": "test123",
    "full_name": "Jan de Werkvoorbereider"
  }'
```

---

## Recommended Test Users (All 8 Roles)

Copy these JSON payloads into Swagger UI or use with curl:

### 1. Admin (Already Exists)
✅ **Pre-created during migration**
- Email: `admin@kersten.nl`
- Password: `admin123`

### 2. Werkvoorbereider (Work Preparation Specialist)

```json
{
  "email": "werkvoorbereider@kersten.nl",
  "password": "test123",
  "full_name": "Jan de Werkvoorbereider",
  "role": "werkvoorbereider"
}
```

**Permissions:**
- ✅ Create/edit projects
- ✅ Approve orders (with digital signature)
- ✅ Manage plates
- ✅ Upload certificates
- ❌ Cannot access admin panel

### 3. Werkplaats (Workshop Worker)

```json
{
  "email": "werkplaats@kersten.nl",
  "password": "test123",
  "full_name": "Piet van Werkplaats",
  "role": "werkplaats"
}
```

**Permissions:**
- ✅ Execute orders
- ✅ Complete checklists
- ✅ Mark orders complete
- ✅ Manage plates
- ❌ Cannot create projects
- ❌ Cannot approve orders

### 4. Logistiek (Logistics Specialist)

```json
{
  "email": "logistiek@kersten.nl",
  "password": "test123",
  "full_name": "Marie van Logistiek",
  "role": "logistiek"
}
```

**Permissions:**
- ✅ All werkplaats permissions
- ✅ Upload material certificates
- ✅ Material intake operations
- ❌ Cannot create projects

### 5. Tekenaar (Draftsman - View Only)

```json
{
  "email": "tekenaar@kersten.nl",
  "password": "test123",
  "full_name": "Anna de Tekenaar",
  "role": "tekenaar"
}
```

**Permissions:**
- ✅ View projects and orders
- ✅ Download files and drawings
- ❌ Cannot modify anything (read-only)
- ❌ Cannot access voorraad module

### 6. Laser (Laser Operator)

```json
{
  "email": "laser@kersten.nl",
  "password": "test123",
  "full_name": "Tom de Laser Operator",
  "role": "laser"
}
```

**Permissions:**
- ✅ View assigned orders
- ✅ Execute laser operations
- ✅ Complete laser checklists
- ✅ Mark assigned orders complete
- ❌ Cannot manage plates
- ❌ Cannot create projects

### 7. Buislaser (Tube Laser Operator)

```json
{
  "email": "buislaser@kersten.nl",
  "password": "test123",
  "full_name": "Karel de Buislaser Operator",
  "role": "buislaser"
}
```

**Permissions:**
- ✅ View assigned orders
- ✅ Execute tube laser operations
- ✅ Complete buislaser checklists
- ✅ Mark assigned orders complete
- ❌ Cannot manage plates
- ❌ Cannot create projects

### 8. Kantbank (Press Brake Operator)

```json
{
  "email": "kantbank@kersten.nl",
  "password": "test123",
  "full_name": "Sophie de Kantbank Operator",
  "role": "kantbank"
}
```

**Permissions:**
- ✅ View assigned orders
- ✅ Execute press brake operations
- ✅ Complete kantbank checklists
- ✅ Mark assigned orders complete
- ❌ Cannot manage plates
- ❌ Cannot create projects

---

## Quick Setup Script (PowerShell)

Save this as `create-test-users.ps1` and run it:

```powershell
# Login as admin
$loginResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/login" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"email": "admin@kersten.nl", "password": "admin123"}'

$token = $loginResponse.token
$headers = @{ "Authorization" = "Bearer $token" }

# Create test users
$users = @(
  @{ email = "werkvoorbereider@kersten.nl"; password = "test123"; full_name = "Jan de Werkvoorbereider"; role = "werkvoorbereider" },
  @{ email = "werkplaats@kersten.nl"; password = "test123"; full_name = "Piet van Werkplaats"; role = "werkplaats" },
  @{ email = "logistiek@kersten.nl"; password = "test123"; full_name = "Marie van Logistiek"; role = "logistiek" },
  @{ email = "tekenaar@kersten.nl"; password = "test123"; full_name = "Anna de Tekenaar"; role = "tekenaar" },
  @{ email = "laser@kersten.nl"; password = "test123"; full_name = "Tom de Laser Operator"; role = "laser" },
  @{ email = "buislaser@kersten.nl"; password = "test123"; full_name = "Karel de Buislaser Operator"; role = "buislaser" },
  @{ email = "kantbank@kersten.nl"; password = "test123"; full_name = "Sophie de Kantbank Operator"; role = "kantbank" }
)

foreach ($user in $users) {
  try {
    $body = $user | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/register" `
      -Method Post `
      -ContentType "application/json" `
      -Headers $headers `
      -Body $body
    Write-Host "✓ Created user: $($user.email) with role $($user.role)" -ForegroundColor Green
  } catch {
    Write-Host "✗ Failed to create $($user.email): $_" -ForegroundColor Red
  }
}
```

Run with: `.\create-test-users.ps1`

---

## Testing Role-Based Permissions

### Test Matrix

Use this checklist to verify each role's permissions:

| Action | Admin | Werkvoorb. | Werkplaats | Logistiek | Tekenaar | Laser/Buis/Kant |
|--------|-------|------------|------------|-----------|----------|-----------------|
| **Login** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **View Projects** | ✅ | ✅ (own) | ✅ (own) | ✅ (own) | ✅ (own) | ✅ (assigned) |
| **Create Project** | ✅ | ✅ | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 |
| **Edit Project** | ✅ | ✅ | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 |
| **Delete Project** | ✅ | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 |
| **Create Fase** | ✅ | ✅ | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 |
| **Manage Plates** | ✅ | ✅ | ✅ | ✅ | ❌ 403 | ❌ 403 |
| **Upload Certificates** | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Admin Panel** | ✅ | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 |

### Example Test: Create Project as Werkplaats (Should Fail)

```bash
# 1. Login as werkplaats
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "werkplaats@kersten.nl", "password": "test123"}'

# 2. Try to create project (should return 403 Forbidden)
curl -X POST http://localhost:8000/api/projects \
  -H "Authorization: Bearer <werkplaats-token>" \
  -H "Content-Type: application/json" \
  -d '{"code": "TEST", "naam": "Test Project"}'

# Expected response:
# {
#   "detail": "Alleen admin en werkvoorbereider kunnen projecten aanmaken"
# }
```

---

## Troubleshooting

### "Invalid credentials" when logging in

- Check that you're using the correct email and password
- Verify the user exists in the database:
  ```sql
  SELECT email, full_name FROM users WHERE email = 'admin@kersten.nl';
  ```

### "User already exists" when creating test user

- The user was already created (this is OK)
- Login with existing credentials
- Or delete the user first (as admin):
  ```sql
  DELETE FROM user_roles WHERE user_id = (SELECT id FROM users WHERE email = '...');
  DELETE FROM users WHERE email = '...';
  ```

### Token expired

- JWT tokens expire after 24 hours (default)
- Login again to get a new token
- Check `ACCESS_TOKEN_EXPIRE_MINUTES` in `backend/config.py`

### "403 Forbidden" for allowed action

- Verify the user has the correct role:
  ```sql
  SELECT u.email, array_agg(ur.role) AS roles
  FROM users u
  LEFT JOIN user_roles ur ON ur.user_id = u.id
  GROUP BY u.email;
  ```
- Check the permission matrix in `frontend/src/types/roles.ts`

---

## Security Notes

**⚠️ IMPORTANT FOR PRODUCTION:**

1. **Change default admin password immediately**
2. **Use strong passwords** (minimum 12 characters, mixed case, numbers, symbols)
3. **Enable 2FA** (future phase)
4. **Rotate JWT secret key** regularly
5. **Never commit credentials** to version control
6. **Use environment-specific passwords** (dev, staging, production)

---

## Next Steps

After creating test users:

1. ✅ **Test login** for each role via Swagger UI
2. ✅ **Verify permissions** using the test matrix above
3. ✅ **Create sample data** (projects, fases, plates) as werkvoorbereider
4. ✅ **Test workflows** for each role
5. ✅ **Check audit logs** to verify all actions are tracked

---

## Reference Documentation

- **Role Permissions:** `frontend/src/types/roles.ts`
- **Permission Hook:** `frontend/src/hooks/usePermissions.ts`
- **User Model:** `backend/models/user.py`
- **Auth Endpoints:** `backend/api/auth.py`
- **Database Schema:** `database/migrations/001_core_tables.sql`

---

**Last Updated:** 2025-12-11 (Phase 1.1 Complete)
