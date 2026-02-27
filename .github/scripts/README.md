# GitHub Issue Automation Scripts

**Automatically create all 14 issues + labels + milestones for the MES Kersten code review fixes.**

---

## 🚀 Quick Start

### Windows (Recommended)

```cmd
cd .github\scripts
create-all-issues.bat
```

### Mac/Linux/WSL

```bash
cd .github/scripts
chmod +x create-all-issues.sh
./create-all-issues.sh
```

---

## 📋 What the Script Does

The automation script will:

1. ✅ **Create 18 labels**
   - Priority: critical, high, medium, low
   - Area: backend, frontend, database
   - Type: security, performance, testing, refactor, etc.
   - Phase: phase-1 through phase-5

2. ✅ **Create 5 milestones**
   - Phase 1 - Critical Security
   - Phase 2 - Transactions & Audit
   - Phase 3 - Test Infrastructure
   - Phase 4 - Performance Optimization
   - Phase 5 - Code Quality

3. ✅ **Create 14 issues**
   - 7 from detailed templates (Issues #1-5, #7, #13)
   - 7 with references to IMPLEMENTATION-PLAN.md (Issues #6, #8-12, #14)
   - Each with proper title, labels, and milestone

---

## 📦 Prerequisites

### Install GitHub CLI

**Windows:**
```cmd
winget install GitHub.cli
```
Or download from: https://cli.github.com/

**Mac:**
```bash
brew install gh
```

**Linux:**
```bash
sudo apt install gh  # Debian/Ubuntu
sudo dnf install gh  # Fedora
```

### Authenticate

```bash
gh auth login
```

Follow the prompts to authenticate with your GitHub account.

---

## 🎯 What Gets Created

### Issues by Priority

**CRITICAL (3 issues):**
- #1: Transaction Management Inconsistency
- #2: Missing Audit Logging
- #13: No Automated Test Suite

**HIGH (3 issues):**
- #3: Authorization Helper Duplication
- #4: Token Storage XSS Vulnerability
- #5: Missing CSRF Protection

**MEDIUM (6 issues):**
- #6: Timing Attack in Login
- #7: N+1 Queries in Materials
- #8: Missing Database Indexes
- #9: Large API Response Sizes (No Pagination)
- #10: Inconsistent Error Handling
- #11: Magic Numbers

**LOW (2 issues):**
- #12: Large Component File Size
- #14: Missing Cascade Documentation

### Issues by Phase

**Phase 1 - Critical Security (3 issues):**
- #3, #4, #5

**Phase 2 - Transactions & Audit (2 issues):**
- #1, #2

**Phase 3 - Test Infrastructure (1 issue):**
- #13

**Phase 4 - Performance Optimization (3 issues):**
- #7, #8, #9

**Phase 5 - Code Quality (5 issues):**
- #6, #10, #11, #12, #14

---

## 🔍 Troubleshooting

### Script Says "Not Authenticated"

**Fix:**
```bash
gh auth login
```

### Script Says "gh not found"

**Fix:** Install GitHub CLI from https://cli.github.com/

### Issues Already Exist

The script will skip existing issues. Safe to run multiple times.

### Milestones Not Created (Windows)

**Workaround:** Create milestones manually:
1. Go to GitHub → Issues → Milestones
2. Create 5 milestones as listed above

Or use Git Bash/WSL to run the bash script.

---

## 📊 After Running the Script

### View Created Issues

```bash
gh issue list
```

### View by Label

```bash
gh issue list --label "critical"
gh issue list --label "phase-1"
```

### View by Milestone

```bash
gh issue list --milestone "Phase 1 - Critical Security"
```

---

## 🎨 Optional: Create Project Board

After creating issues, set up a Kanban board:

### Via GitHub Web UI

1. Go to repository → Projects → New project
2. Choose "Board" template
3. Name it "Code Review Fixes"
4. Create columns:
   - 📋 Backlog
   - 🏗️ In Progress
   - 🧪 Testing
   - ✅ Done
5. Add all issues to the board
6. Drag issues to organize by phase

### Via GitHub CLI

```bash
# Create project
gh project create --title "Code Review Fixes" --body "Tracking 14 code review fixes"

# Add issues to project (interactive)
gh project item-add PROJECT_NUMBER --url ISSUE_URL
```

---

## 📖 Manual Alternative

If you prefer not to use the script, manually create issues:

1. Go to: https://github.com/YOUR_USERNAME/mes-kersten/issues/new
2. Copy content from `.github/ISSUE_TEMPLATES/issue-XX-*.md`
3. Paste into GitHub issue form
4. Extract title from `title:` field
5. Extract labels from `labels:` field
6. Submit

See `.github/ISSUE_TEMPLATES/HOW-TO-CREATE-ISSUES.md` for details.

---

## 🔄 Re-running the Script

**Safe to run multiple times.** The script:
- Uses `--force` for labels (updates existing)
- Skips existing milestones (API returns error, ignored)
- Skips existing issues (gh CLI returns error, ignored)

---

## 📁 Script Files

- `create-all-issues.sh` - Bash script (Mac/Linux/WSL)
- `create-all-issues.bat` - Windows batch script
- `README.md` - This file

---

## 🎯 Next Steps After Running

1. **View issues:** `gh issue list`
2. **Start Phase 1:** Issues #3, #4, #5 (Security)
3. **Reference:** `IMPLEMENTATION-PLAN.md` for detailed steps
4. **Track progress:** Use project board or labels

---

## ✨ Summary

**Total Created:**
- 18 labels
- 5 milestones
- 14 issues

**Estimated Total Effort:** 60-80 hours
**Recommended Timeline:** 6 weeks (1 phase per week)

**Ready to start implementing!** 🚀
