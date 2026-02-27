# How to Create GitHub Issues

## ✅ What's Been Created

**7 detailed GitHub Issue templates** are ready in `.github/ISSUE_TEMPLATES/`:

### CRITICAL Issues (Phase 1 & 2)
1. ✅ `issue-01-transaction-management.md` - Transaction ownership pattern
2. ✅ `issue-02-audit-logging.md` - Add comprehensive audit logging
3. ✅ `issue-13-test-suite.md` - Build pytest test suite (70%+ coverage)

### HIGH Priority Issues (Phase 1)
4. ✅ `issue-03-auth-duplication.md` - Consolidate auth helpers
5. ✅ `issue-04-token-storage-xss.md` - Migrate to httpOnly cookies
6. ✅ `issue-05-csrf-protection.md` - Add CSRF token validation

### MEDIUM Priority Issues (Phase 4)
7. ✅ `issue-07-n-plus-one-queries.md` - Fix N+1 query in materials endpoint

Each template includes:
- Clear problem description
- Impact assessment
- Detailed solution
- Acceptance criteria
- Testing checklist
- File references
- Link to implementation plan

---

## 📋 Remaining Issues to Create

For the remaining 7 issues, you can create them manually referencing `IMPLEMENTATION-PLAN.md`:

### MEDIUM Priority (Phase 4 & 5)
- **Issue #6:** Timing Attack in Login → See Phase 5, Step 5.3
- **Issue #8:** Missing Database Indexes → See Phase 4, Step 4.3-4.4
- **Issue #9:** No Pagination → See Phase 4, Step 4.5-4.7
- **Issue #10:** Inconsistent Error Handling → See Phase 5, Step 5.1-5.2
- **Issue #11:** Magic Numbers → See Phase 5, Step 5.4

### LOW Priority (Phase 5)
- **Issue #12:** Large Component File Size → See Phase 5, Step 5.5
- **Issue #14:** Missing Cascade Documentation → See Phase 5, Step 5.6

---

## 🚀 How to Create Issues on GitHub

### Option 1: Manual Copy-Paste (Recommended)

1. **Go to your repository** on GitHub
2. **Click "Issues" tab** → "New Issue"
3. **Open an issue template file** (e.g., `issue-01-transaction-management.md`)
4. **Copy the ENTIRE contents** (including the front matter `---`)
5. **Paste into GitHub** issue form
6. **Extract the title** from the `title:` field in front matter
7. **Add labels** from the `labels:` field
8. **Submit**

### Option 2: Using GitHub CLI (Fast)

```bash
# Install GitHub CLI: https://cli.github.com/
# Login first
gh auth login

# Create a single issue
cd .github/ISSUE_TEMPLATES
gh issue create --body-file issue-01-transaction-management.md \
  --title "[CRITICAL] Transaction Management Inconsistency" \
  --label "critical,backend,refactor,phase-2"

# Or create all 7 at once
for file in issue-*.md; do
  echo "Creating issue from $file..."
  # Extract title and labels from file
  TITLE=$(grep "^title:" $file | cut -d'"' -f2)
  LABELS=$(grep "^labels:" $file | cut -d':' -f2 | tr -d ' ')

  gh issue create --body-file "$file" --title "$TITLE" --label "$LABELS"
done
```

### Option 3: Create Simple Issues First

If you want to get started quickly:

```markdown
Title: [CRITICAL] Transaction Management Inconsistency

See IMPLEMENTATION-PLAN.md → Phase 2 → Issue #1 for full details.

**Summary:** Standardize transaction ownership to service layer.
**Effort:** 8 hours
**Phase:** Phase 2

Acceptance Criteria:
- [ ] Service methods own db.commit()
- [ ] API layer catches service exceptions
- [ ] Pattern documented in CLAUDE.md
```

---

## 🏷️ Labels to Create First

Before creating issues, set up these labels in your repository:

### Priority Labels
```bash
gh label create "critical" --color "B60205"
gh label create "high" --color "D93F0B"
gh label create "medium" --color "FBCA04"
gh label create "low" --color "0E8A16"
```

### Area Labels
```bash
gh label create "backend" --color "1D76DB"
gh label create "frontend" --color "5319E7"
gh label create "database" --color "006B75"
gh label create "testing" --color "00FF00"
```

### Type Labels
```bash
gh label create "security" --color "FF0000"
gh label create "performance" --color "FFA500"
gh label create "refactor" --color "0052CC"
gh label create "documentation" --color "0075CA"
```

### Phase Labels
```bash
gh label create "phase-1" --color "C2E0C6" --description "Phase 1: Security"
gh label create "phase-2" --color "BFDADC" --description "Phase 2: Transactions"
gh label create "phase-3" --color "BFD4F2" --description "Phase 3: Tests"
gh label create "phase-4" --color "D4C5F9" --description "Phase 4: Performance"
gh label create "phase-5" --color "F9D0C4" --description "Phase 5: Quality"
```

---

## 📊 Create Project Board (Optional)

Create a Kanban board to track progress:

1. **Go to repository** → "Projects" tab → "New project"
2. **Choose "Board" template**
3. **Create columns:**
   - 📋 Backlog
   - 🏗️ In Progress
   - 🧪 Testing
   - ✅ Done

4. **Add all issues** to the board
5. **Organize by phase** or priority

---

## 📝 Quick Reference

**All issues map to:**
- **Detailed specs:** `IMPLEMENTATION-PLAN.md` (2,353 lines)
- **Code review:** Check the initial comprehensive review
- **Testing:** Each phase has testing checklist

**Recommended order:**
1. Phase 1 issues (#3, #4, #5) - Security first
2. Phase 2 issues (#1, #2) - Transactions & audit
3. Phase 3 issue (#13) - Test infrastructure
4. Phase 4 issues (#7, #8, #9) - Performance
5. Phase 5 issues (#6, #10, #11, #12, #14) - Quality

---

## ✨ Summary

You now have:
- ✅ 7 detailed GitHub Issue templates ready to use
- ✅ Instructions for creating remaining 7 issues
- ✅ Label and milestone setup guides
- ✅ Project board setup guide
- ✅ Complete implementation plan reference

**Next step:** Create the issues on GitHub and start with Phase 1!

Good luck! 🚀
