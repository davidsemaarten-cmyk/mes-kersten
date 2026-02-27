#!/bin/bash

#############################################################################
# GitHub Issues Automation Script
# Creates all 14 issues + labels + milestones for MES Kersten code review
#############################################################################

set -e  # Exit on error

echo "🚀 MES Kersten - GitHub Issues Setup"
echo "===================================="
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ Error: GitHub CLI (gh) is not installed"
    echo "   Install from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Error: Not authenticated with GitHub CLI"
    echo "   Run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI authenticated"
echo ""

#############################################################################
# Step 1: Create Labels
#############################################################################

echo "📌 Creating labels..."

# Priority labels
gh label create "critical" --color "B60205" --description "Critical priority" --force 2>/dev/null || true
gh label create "high" --color "D93F0B" --description "High priority" --force 2>/dev/null || true
gh label create "medium" --color "FBCA04" --description "Medium priority" --force 2>/dev/null || true
gh label create "low" --color "0E8A16" --description "Low priority" --force 2>/dev/null || true

# Area labels
gh label create "backend" --color "1D76DB" --description "Backend code" --force 2>/dev/null || true
gh label create "frontend" --color "5319E7" --description "Frontend code" --force 2>/dev/null || true
gh label create "database" --color "006B75" --description "Database changes" --force 2>/dev/null || true

# Type labels
gh label create "security" --color "FF0000" --description "Security issue" --force 2>/dev/null || true
gh label create "performance" --color "FFA500" --description "Performance issue" --force 2>/dev/null || true
gh label create "testing" --color "00FF00" --description "Testing related" --force 2>/dev/null || true
gh label create "refactor" --color "0052CC" --description "Code refactoring" --force 2>/dev/null || true
gh label create "code-quality" --color "0075CA" --description "Code quality improvement" --force 2>/dev/null || true
gh label create "documentation" --color "D4C5F9" --description "Documentation" --force 2>/dev/null || true
gh label create "compliance" --color "D93F0B" --description "Compliance requirement" --force 2>/dev/null || true
gh label create "infrastructure" --color "1D76DB" --description "Infrastructure setup" --force 2>/dev/null || true

# Phase labels
gh label create "phase-1" --color "C2E0C6" --description "Phase 1: Security" --force 2>/dev/null || true
gh label create "phase-2" --color "BFDADC" --description "Phase 2: Transactions" --force 2>/dev/null || true
gh label create "phase-3" --color "BFD4F2" --description "Phase 3: Tests" --force 2>/dev/null || true
gh label create "phase-4" --color "D4C5F9" --description "Phase 4: Performance" --force 2>/dev/null || true
gh label create "phase-5" --color "F9D0C4" --description "Phase 5: Quality" --force 2>/dev/null || true

echo "✅ Labels created"
echo ""

#############################################################################
# Step 2: Create Milestones
#############################################################################

echo "🎯 Creating milestones..."

# Note: gh CLI doesn't have milestone create command, using API
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)

curl -s -X POST \
  -H "Authorization: token $(gh auth token)" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/${REPO}/milestones" \
  -d '{"title":"Phase 1 - Critical Security","description":"Security fixes: httpOnly cookies, CSRF, auth consolidation"}' \
  > /dev/null 2>&1 || true

curl -s -X POST \
  -H "Authorization: token $(gh auth token)" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/${REPO}/milestones" \
  -d '{"title":"Phase 2 - Transactions & Audit","description":"Transaction management and audit logging"}' \
  > /dev/null 2>&1 || true

curl -s -X POST \
  -H "Authorization: token $(gh auth token)" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/${REPO}/milestones" \
  -d '{"title":"Phase 3 - Test Infrastructure","description":"Build comprehensive test suite"}' \
  > /dev/null 2>&1 || true

curl -s -X POST \
  -H "Authorization: token $(gh auth token)" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/${REPO}/milestones" \
  -d '{"title":"Phase 4 - Performance Optimization","description":"Query optimization, indexes, pagination"}' \
  > /dev/null 2>&1 || true

curl -s -X POST \
  -H "Authorization: token $(gh auth token)" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/${REPO}/milestones" \
  -d '{"title":"Phase 5 - Code Quality","description":"Error handling, cleanup, documentation"}' \
  > /dev/null 2>&1 || true

echo "✅ Milestones created"
echo ""

#############################################################################
# Step 3: Create Issues from Templates
#############################################################################

echo "📝 Creating issues from templates..."

TEMPLATES_DIR=".github/ISSUE_TEMPLATES"

# Function to create issue from template file
create_issue_from_template() {
    local file=$1
    local title=$2
    local labels=$3
    local milestone=$4

    echo "   Creating: $title"

    # Create issue and capture URL
    ISSUE_URL=$(gh issue create \
        --title "$title" \
        --body-file "$file" \
        --label "$labels" \
        --milestone "$milestone" 2>&1)

    if [ $? -eq 0 ]; then
        echo "      ✅ Created: $ISSUE_URL"
    else
        echo "      ⚠️  Warning: Failed to create issue (may already exist)"
    fi
}

# Issue #1: Transaction Management
create_issue_from_template \
    "$TEMPLATES_DIR/issue-01-transaction-management.md" \
    "[CRITICAL] Transaction Management Inconsistency" \
    "critical,backend,refactor,phase-2" \
    "Phase 2 - Transactions & Audit"

# Issue #2: Audit Logging
create_issue_from_template \
    "$TEMPLATES_DIR/issue-02-audit-logging.md" \
    "[CRITICAL] Missing Audit Logging in Critical Operations" \
    "critical,backend,security,compliance,phase-2" \
    "Phase 2 - Transactions & Audit"

# Issue #3: Auth Duplication
create_issue_from_template \
    "$TEMPLATES_DIR/issue-03-auth-duplication.md" \
    "[HIGH] Authorization Helper Duplication" \
    "high,refactor,backend,phase-1" \
    "Phase 1 - Critical Security"

# Issue #4: Token Storage XSS
create_issue_from_template \
    "$TEMPLATES_DIR/issue-04-token-storage-xss.md" \
    "[HIGH] Token Storage XSS Vulnerability (localStorage)" \
    "high,security,frontend,backend,phase-1" \
    "Phase 1 - Critical Security"

# Issue #5: CSRF Protection
create_issue_from_template \
    "$TEMPLATES_DIR/issue-05-csrf-protection.md" \
    "[HIGH] Missing CSRF Protection" \
    "high,security,backend,frontend,phase-1" \
    "Phase 1 - Critical Security"

# Issue #7: N+1 Queries
create_issue_from_template \
    "$TEMPLATES_DIR/issue-07-n-plus-one-queries.md" \
    "[MEDIUM] N+1 Queries in Materials Endpoint" \
    "medium,performance,backend,phase-4" \
    "Phase 4 - Performance Optimization"

# Issue #13: Test Suite
create_issue_from_template \
    "$TEMPLATES_DIR/issue-13-test-suite.md" \
    "[CRITICAL] No Automated Test Suite" \
    "critical,testing,infrastructure,phase-3" \
    "Phase 3 - Test Infrastructure"

echo ""
echo "📝 Creating remaining issues (referencing IMPLEMENTATION-PLAN.md)..."

#############################################################################
# Issue #6: Timing Attack
#############################################################################

gh issue create \
    --title "[MEDIUM] Timing Attack in Login" \
    --label "medium,security,backend,phase-5" \
    --milestone "Phase 5 - Code Quality" \
    --body "## 🟡 MEDIUM: Timing Attack in Login

**Issue Type:** Security Vulnerability
**Severity:** MEDIUM
**Effort:** 1 hour
**Phase:** Phase 5

---

## Problem Description

Login endpoint has timing differences that allow email enumeration:
- User lookup is faster than password verification
- Attacker can determine valid emails by measuring response time

---

## Solution

Implement constant-time comparison:
1. Always verify password (even if user doesn't exist)
2. Use dummy hash for non-existent users
3. Add deterministic delay based on email hash

---

## Implementation

See: \`IMPLEMENTATION-PLAN.md\` → Phase 5 → Step 5.3

---

## Acceptance Criteria

- [ ] Login delay is deterministic per email
- [ ] Same email always gets same delay
- [ ] Invalid user and wrong password indistinguishable by timing

---

## Files to Change

- \`backend/api/auth.py\` (update login endpoint)" \
    2>/dev/null || echo "   ⚠️  Issue #6 may already exist"

#############################################################################
# Issue #8: Missing Indexes
#############################################################################

gh issue create \
    --title "[MEDIUM] Missing Database Indexes" \
    --label "medium,performance,database,phase-4" \
    --milestone "Phase 4 - Performance Optimization" \
    --body "## 🟡 MEDIUM: Missing Database Indexes

**Issue Type:** Performance
**Severity:** MEDIUM
**Effort:** 2 hours
**Phase:** Phase 4

---

## Problem Description

Frequently filtered columns lack indexes, causing slow queries:
- Claims filtered by project + fase + active
- Plates filtered by material + status
- Audit logs queried by date (DESC)
- Materials filtered by group + surface

---

## Solution

Add composite indexes via migration \`010_add_performance_indexes.sql\`:
- \`idx_claims_project_fase_active\`
- \`idx_plates_material_status\`
- \`idx_audit_logs_created_desc\`
- \`idx_materials_group_surface\`

---

## Implementation

See: \`IMPLEMENTATION-PLAN.md\` → Phase 4 → Steps 4.3-4.4

---

## Acceptance Criteria

- [ ] Migration created and run successfully
- [ ] All indexes created
- [ ] EXPLAIN ANALYZE shows index usage
- [ ] No performance regression

---

## Files to Change

- \`database/migrations/010_add_performance_indexes.sql\` (NEW)" \
    2>/dev/null || echo "   ⚠️  Issue #8 may already exist"

#############################################################################
# Issue #9: No Pagination
#############################################################################

gh issue create \
    --title "[MEDIUM] Large API Response Sizes (No Pagination)" \
    --label "medium,performance,backend,frontend,phase-4" \
    --milestone "Phase 4 - Performance Optimization" \
    --body "## 🟡 MEDIUM: No Pagination

**Issue Type:** Performance / Scalability
**Severity:** MEDIUM
**Effort:** 6 hours
**Phase:** Phase 4

---

## Problem Description

All list endpoints return full datasets without pagination:
- Plates endpoint returns all plates (could be 500+)
- Large JSON payloads slow down page loads
- High memory usage in browser

---

## Solution

Implement pagination for all list endpoints:
1. Create \`PaginationParams\` and \`PaginatedResponse\` schemas
2. Add \`page\` and \`page_size\` query parameters
3. Return metadata: total count, pages, current page
4. Frontend pagination UI with Previous/Next buttons

---

## Implementation

See: \`IMPLEMENTATION-PLAN.md\` → Phase 4 → Steps 4.5-4.7

---

## Acceptance Criteria

- [ ] Plates endpoint supports pagination
- [ ] Frontend displays pagination controls
- [ ] Total count is accurate
- [ ] Filter + pagination works together
- [ ] Page size configurable (max 500)

---

## Files to Change

- \`backend/schemas/pagination.py\` (NEW)
- \`backend/api/platestock.py\` (add pagination)
- \`frontend/src/hooks/usePlateStock.ts\` (handle pagination)
- \`frontend/src/pages/Voorraad.tsx\` (pagination UI)" \
    2>/dev/null || echo "   ⚠️  Issue #9 may already exist"

#############################################################################
# Issue #10: Inconsistent Error Handling
#############################################################################

gh issue create \
    --title "[MEDIUM] Inconsistent Error Handling Pattern" \
    --label "medium,code-quality,backend,phase-5" \
    --milestone "Phase 5 - Code Quality" \
    --body "## 🟡 MEDIUM: Inconsistent Error Handling

**Issue Type:** Code Quality
**Severity:** MEDIUM
**Effort:** 4 hours
**Phase:** Phase 5

---

## Problem Description

Mixed error handling patterns across endpoints:
- Some use try/except, some don't
- Inconsistent rollback handling
- Some expose internal errors (security risk)
- Different error response formats

---

## Solution

Standardize on single pattern:
\`\`\`python
try:
    result = Service.method(...)
    return result
except NotFoundException as e:
    raise HTTPException(404, str(e))
except ServiceException as e:
    raise HTTPException(400, str(e))
except Exception as e:
    logger.exception(...)
    raise HTTPException(500, \"An unexpected error occurred\")
\`\`\`

---

## Implementation

See: \`IMPLEMENTATION-PLAN.md\` → Phase 5 → Steps 5.1-5.2

---

## Acceptance Criteria

- [ ] All endpoints use standard pattern
- [ ] Error responses have consistent format
- [ ] No internal errors exposed to users
- [ ] Documentation in \`ERROR_HANDLING.md\`

---

## Files to Change

- \`backend/docs/ERROR_HANDLING.md\` (NEW)
- \`backend/api/*.py\` (refactor all endpoints)" \
    2>/dev/null || echo "   ⚠️  Issue #10 may already exist"

#############################################################################
# Issue #11: Magic Numbers
#############################################################################

gh issue create \
    --title "[LOW] Magic Numbers and Hardcoded Values" \
    --label "low,code-quality,backend,phase-5" \
    --milestone "Phase 5 - Code Quality" \
    --body "## 🟢 LOW: Magic Numbers and Hardcoded Values

**Issue Type:** Code Quality
**Severity:** LOW
**Effort:** 2 hours
**Phase:** Phase 5

---

## Problem Description

Hardcoded values scattered throughout code:
- \`time.sleep(0.01)\` - magic number
- \`pool_size=10\` - should be configurable
- \`staleTime: 5 * 60 * 1000\` - magic calculation

---

## Solution

Move to configuration in \`config.py\`:
\`\`\`python
class Settings:
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    PLATE_NUMBER_RETRY_DELAY_MS: int = 10
    DEFAULT_PAGE_SIZE: int = 50
\`\`\`

---

## Implementation

See: \`IMPLEMENTATION-PLAN.md\` → Phase 5 → Step 5.4

---

## Acceptance Criteria

- [ ] All magic numbers moved to config.py
- [ ] Settings can be overridden via .env
- [ ] Default values are sensible

---

## Files to Change

- \`backend/config.py\` (add settings)
- \`backend/database.py\`, \`backend/services/platestock.py\` (use settings)" \
    2>/dev/null || echo "   ⚠️  Issue #11 may already exist"

#############################################################################
# Issue #12: Large Components
#############################################################################

gh issue create \
    --title "[LOW] Large Component File Size (Voorraad.tsx 681 lines)" \
    --label "low,code-quality,frontend,phase-5" \
    --milestone "Phase 5 - Code Quality" \
    --body "## 🟢 LOW: Large Component File Size

**Issue Type:** Code Quality
**Severity:** LOW
**Effort:** 3 hours
**Phase:** Phase 5

---

## Problem Description

\`Voorraad.tsx\` is 681 lines - violates Single Responsibility Principle.

---

## Solution

Split into smaller components:
\`\`\`
pages/Voorraad.tsx (orchestrator, ~200 lines)
components/voorraad/PlateTable.tsx
components/voorraad/PlateFilters.tsx
components/voorraad/PaginationControls.tsx
hooks/usePlateFilters.ts
\`\`\`

---

## Implementation

See: \`IMPLEMENTATION-PLAN.md\` → Phase 5 → Step 5.5

---

## Acceptance Criteria

- [ ] Voorraad.tsx under 300 lines
- [ ] Components are reusable
- [ ] Logic extracted to hooks
- [ ] No functionality lost

---

## Files to Change

- \`frontend/src/pages/Voorraad.tsx\` (refactor)
- \`frontend/src/components/voorraad/\` (NEW directory)
- \`frontend/src/hooks/usePlateFilters.ts\` (NEW)" \
    2>/dev/null || echo "   ⚠️  Issue #12 may already exist"

#############################################################################
# Issue #14: Cascade Documentation
#############################################################################

gh issue create \
    --title "[LOW] Missing Cascade Documentation" \
    --label "low,documentation,database,phase-5" \
    --milestone "Phase 5 - Code Quality" \
    --body "## 🟢 LOW: Missing Cascade Documentation

**Issue Type:** Documentation
**Severity:** LOW
**Effort:** 1 hour
**Phase:** Phase 5

---

## Problem Description

Cascade behavior not documented in migration files. Unclear what happens when entities are deleted.

---

## Solution

Add comments documenting cascade behavior:
\`\`\`sql
-- Materials table
-- NOTE: Materials CANNOT be deleted if plates exist
-- Enforced in API layer (see platestock.py:delete_material)

-- Claims table
-- ON DELETE CASCADE: When plate deleted, all claims deleted
CREATE TABLE claims (
    plate_id UUID REFERENCES plates(id) ON DELETE CASCADE,
    ...
);
\`\`\`

---

## Implementation

See: \`IMPLEMENTATION-PLAN.md\` → Phase 5 → Step 5.6

---

## Acceptance Criteria

- [ ] All foreign keys have cascade documentation
- [ ] Migration comments explain deletion behavior
- [ ] API validation documented

---

## Files to Change

- \`database/migrations/002_platestock_tables.sql\` (add comments)" \
    2>/dev/null || echo "   ⚠️  Issue #14 may already exist"

echo ""
echo "✅ All issues created!"
echo ""

#############################################################################
# Summary
#############################################################################

echo "📊 Summary"
echo "=========="
echo ""
echo "✅ Labels created (18 labels)"
echo "✅ Milestones created (5 phases)"
echo "✅ Issues created (14 total)"
echo ""
echo "🎯 Next Steps:"
echo "   1. View issues: gh issue list"
echo "   2. Create project board (optional)"
echo "   3. Start with Phase 1 issues (#3, #4, #5)"
echo ""
echo "📖 Reference:"
echo "   - Implementation plan: IMPLEMENTATION-PLAN.md"
echo "   - Issue templates: .github/ISSUE_TEMPLATES/"
echo ""
echo "🚀 Ready to start implementing!"
