# GitHub Issue Templates

This directory contains 14 issue templates for the MES Kersten code review fixes.

## How to Use

1. Go to GitHub Issues page: `https://github.com/YOUR_USERNAME/mes-kersten/issues/new`
2. Copy the contents of the issue file (e.g., `issue-01-transaction-management.md`)
3. Paste into the GitHub issue form
4. Click "Submit new issue"

## Issue List

### CRITICAL (3 issues) - Phase 1 & 2
- ✅ `issue-01-transaction-management.md` - Transaction Management Inconsistency
- ✅ `issue-02-audit-logging.md` - Missing Audit Logging
- ✅ `issue-13-test-suite.md` - No Automated Test Suite

### HIGH (3 issues) - Phase 1
- ✅ `issue-03-auth-duplication.md` - Authorization Helper Duplication
- ✅ `issue-04-token-storage-xss.md` - Token Storage XSS Vulnerability
- ✅ `issue-05-csrf-protection.md` - Missing CSRF Protection

### MEDIUM (6 issues) - Phase 4 & 5
- ⏳ `issue-06-timing-attack.md` - Timing Attack in Login
- ✅ `issue-07-n-plus-one-queries.md` - N+1 Queries in Materials
- ⏳ `issue-08-missing-indexes.md` - Missing Database Indexes
- ⏳ `issue-09-no-pagination.md` - Large API Responses (No Pagination)
- ⏳ `issue-10-error-handling.md` - Inconsistent Error Handling
- ⏳ `issue-11-magic-numbers.md` - Magic Numbers

### LOW (2 issues) - Phase 5
- ⏳ `issue-12-large-components.md` - Large Component File Size
- ⏳ `issue-14-cascade-docs.md` - Missing Cascade Documentation

## Batch Create All Issues

Run this script to create all issues at once:

```bash
# From repository root
for file in .github/ISSUE_TEMPLATES/issue-*.md; do
  echo "Creating issue from $file..."
  gh issue create --body-file "$file"
done
```

## Labels to Create

Before creating issues, create these labels in your repository:

```bash
gh label create "critical" --color "B60205" --description "Critical priority"
gh label create "high" --color "D93F0B" --description "High priority"
gh label create "medium" --color "FBCA04" --description "Medium priority"
gh label create "low" --color "0E8A16" --description "Low priority"

gh label create "backend" --color "1D76DB" --description "Backend code"
gh label create "frontend" --color "5319E7" --description "Frontend code"
gh label create "database" --color "006B75" --description "Database changes"

gh label create "security" --color "FF0000" --description "Security issue"
gh label create "performance" --color "FFA500" --description "Performance issue"
gh label create "testing" --color "00FF00" --description "Testing related"
gh label create "refactor" --color "0052CC" --description "Code refactoring"
gh label create "documentation" --color "0075CA" --description "Documentation"

gh label create "phase-1" --color "C2E0C6" --description "Phase 1: Security"
gh label create "phase-2" --color "BFDADC" --description "Phase 2: Transactions"
gh label create "phase-3" --color "BFD4F2" --description "Phase 3: Tests"
gh label create "phase-4" --color "D4C5F9" --description "Phase 4: Performance"
gh label create "phase-5" --color "F9D0C4" --description "Phase 5: Quality"
```

## Milestones to Create

```bash
gh api repos/:owner/:repo/milestones -f title="Phase 1 - Critical Security" -f description="Security fixes: httpOnly cookies, CSRF, auth consolidation"
gh api repos/:owner/:repo/milestones -f title="Phase 2 - Transactions & Audit" -f description="Transaction management and audit logging"
gh api repos/:owner/:repo/milestones -f title="Phase 3 - Test Infrastructure" -f description="Build comprehensive test suite"
gh api repos/:owner/:repo/milestones -f title="Phase 4 - Performance Optimization" -f description="Query optimization, indexes, pagination"
gh api repos/:owner/:repo/milestones -f title="Phase 5 - Code Quality" -f description="Error handling, cleanup, documentation"
```
