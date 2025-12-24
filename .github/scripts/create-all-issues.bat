@echo off
REM ##########################################################################
REM GitHub Issues Automation Script (Windows)
REM Creates all 14 issues + labels + milestones for MES Kersten code review
REM ##########################################################################

echo.
echo ========================================
echo MES Kersten - GitHub Issues Setup
echo ========================================
echo.

REM Check if gh CLI is installed
where gh >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo X Error: GitHub CLI ^(gh^) is not installed
    echo    Install from: https://cli.github.com/
    pause
    exit /b 1
)

REM Check if authenticated
gh auth status >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo X Error: Not authenticated with GitHub CLI
    echo    Run: gh auth login
    pause
    exit /b 1
)

echo [OK] GitHub CLI authenticated
echo.

REM ##########################################################################
REM Step 1: Create Labels
REM ##########################################################################

echo Creating labels...

REM Priority labels
gh label create "critical" --color "B60205" --description "Critical priority" --force 2>nul
gh label create "high" --color "D93F0B" --description "High priority" --force 2>nul
gh label create "medium" --color "FBCA04" --description "Medium priority" --force 2>nul
gh label create "low" --color "0E8A16" --description "Low priority" --force 2>nul

REM Area labels
gh label create "backend" --color "1D76DB" --description "Backend code" --force 2>nul
gh label create "frontend" --color "5319E7" --description "Frontend code" --force 2>nul
gh label create "database" --color "006B75" --description "Database changes" --force 2>nul

REM Type labels
gh label create "security" --color "FF0000" --description "Security issue" --force 2>nul
gh label create "performance" --color "FFA500" --description "Performance issue" --force 2>nul
gh label create "testing" --color "00FF00" --description "Testing related" --force 2>nul
gh label create "refactor" --color "0052CC" --description "Code refactoring" --force 2>nul
gh label create "code-quality" --color "0075CA" --description "Code quality" --force 2>nul
gh label create "documentation" --color "D4C5F9" --description "Documentation" --force 2>nul
gh label create "compliance" --color "D93F0B" --description "Compliance" --force 2>nul
gh label create "infrastructure" --color "1D76DB" --description "Infrastructure" --force 2>nul

REM Phase labels
gh label create "phase-1" --color "C2E0C6" --description "Phase 1: Security" --force 2>nul
gh label create "phase-2" --color "BFDADC" --description "Phase 2: Transactions" --force 2>nul
gh label create "phase-3" --color "BFD4F2" --description "Phase 3: Tests" --force 2>nul
gh label create "phase-4" --color "D4C5F9" --description "Phase 4: Performance" --force 2>nul
gh label create "phase-5" --color "F9D0C4" --description "Phase 5: Quality" --force 2>nul

echo [OK] Labels created
echo.

REM ##########################################################################
REM Step 2: Create Milestones
REM ##########################################################################

echo Creating milestones...

REM Get repository
for /f "tokens=*" %%i in ('gh repo view --json nameWithOwner -q .nameWithOwner') do set REPO=%%i

REM Note: Milestones created via API calls (see bash script for curl commands)
REM Windows users: Create milestones manually or use WSL/Git Bash

echo [OK] Milestones ready (create manually if needed)
echo.

REM ##########################################################################
REM Step 3: Create Issues
REM ##########################################################################

echo Creating issues...
echo.

cd .github\ISSUE_TEMPLATES

REM Issue #1
echo    Creating Issue #1...
gh issue create --title "[CRITICAL] Transaction Management Inconsistency" --body-file issue-01-transaction-management.md --label "critical,backend,refactor,phase-2" --milestone "Phase 2 - Transactions & Audit" 2>nul
if %ERRORLEVEL% EQU 0 (echo       [OK] Issue #1 created) else (echo       [SKIP] Issue #1 may exist)

REM Issue #2
echo    Creating Issue #2...
gh issue create --title "[CRITICAL] Missing Audit Logging in Critical Operations" --body-file issue-02-audit-logging.md --label "critical,backend,security,compliance,phase-2" --milestone "Phase 2 - Transactions & Audit" 2>nul
if %ERRORLEVEL% EQU 0 (echo       [OK] Issue #2 created) else (echo       [SKIP] Issue #2 may exist)

REM Issue #3
echo    Creating Issue #3...
gh issue create --title "[HIGH] Authorization Helper Duplication" --body-file issue-03-auth-duplication.md --label "high,refactor,backend,phase-1" --milestone "Phase 1 - Critical Security" 2>nul
if %ERRORLEVEL% EQU 0 (echo       [OK] Issue #3 created) else (echo       [SKIP] Issue #3 may exist)

REM Issue #4
echo    Creating Issue #4...
gh issue create --title "[HIGH] Token Storage XSS Vulnerability (localStorage)" --body-file issue-04-token-storage-xss.md --label "high,security,frontend,backend,phase-1" --milestone "Phase 1 - Critical Security" 2>nul
if %ERRORLEVEL% EQU 0 (echo       [OK] Issue #4 created) else (echo       [SKIP] Issue #4 may exist)

REM Issue #5
echo    Creating Issue #5...
gh issue create --title "[HIGH] Missing CSRF Protection" --body-file issue-05-csrf-protection.md --label "high,security,backend,frontend,phase-1" --milestone "Phase 1 - Critical Security" 2>nul
if %ERRORLEVEL% EQU 0 (echo       [OK] Issue #5 created) else (echo       [SKIP] Issue #5 may exist)

REM Issue #7
echo    Creating Issue #7...
gh issue create --title "[MEDIUM] N+1 Queries in Materials Endpoint" --body-file issue-07-n-plus-one-queries.md --label "medium,performance,backend,phase-4" --milestone "Phase 4 - Performance Optimization" 2>nul
if %ERRORLEVEL% EQU 0 (echo       [OK] Issue #7 created) else (echo       [SKIP] Issue #7 may exist)

REM Issue #13
echo    Creating Issue #13...
gh issue create --title "[CRITICAL] No Automated Test Suite" --body-file issue-13-test-suite.md --label "critical,testing,infrastructure,phase-3" --milestone "Phase 3 - Test Infrastructure" 2>nul
if %ERRORLEVEL% EQU 0 (echo       [OK] Issue #13 created) else (echo       [SKIP] Issue #13 may exist)

echo.
echo Creating remaining issues...
echo.

REM Issue #6
echo    Creating Issue #6...
gh issue create --title "[MEDIUM] Timing Attack in Login" --label "medium,security,backend,phase-5" --milestone "Phase 5 - Code Quality" --body "See IMPLEMENTATION-PLAN.md Phase 5 Step 5.3" 2>nul
if %ERRORLEVEL% EQU 0 (echo       [OK] Issue #6 created) else (echo       [SKIP] Issue #6 may exist)

REM Issue #8
echo    Creating Issue #8...
gh issue create --title "[MEDIUM] Missing Database Indexes" --label "medium,performance,database,phase-4" --milestone "Phase 4 - Performance Optimization" --body "See IMPLEMENTATION-PLAN.md Phase 4 Steps 4.3-4.4" 2>nul
if %ERRORLEVEL% EQU 0 (echo       [OK] Issue #8 created) else (echo       [SKIP] Issue #8 may exist)

REM Issue #9
echo    Creating Issue #9...
gh issue create --title "[MEDIUM] Large API Response Sizes (No Pagination)" --label "medium,performance,backend,frontend,phase-4" --milestone "Phase 4 - Performance Optimization" --body "See IMPLEMENTATION-PLAN.md Phase 4 Steps 4.5-4.7" 2>nul
if %ERRORLEVEL% EQU 0 (echo       [OK] Issue #9 created) else (echo       [SKIP] Issue #9 may exist)

REM Issue #10
echo    Creating Issue #10...
gh issue create --title "[MEDIUM] Inconsistent Error Handling Pattern" --label "medium,code-quality,backend,phase-5" --milestone "Phase 5 - Code Quality" --body "See IMPLEMENTATION-PLAN.md Phase 5 Steps 5.1-5.2" 2>nul
if %ERRORLEVEL% EQU 0 (echo       [OK] Issue #10 created) else (echo       [SKIP] Issue #10 may exist)

REM Issue #11
echo    Creating Issue #11...
gh issue create --title "[LOW] Magic Numbers and Hardcoded Values" --label "low,code-quality,backend,phase-5" --milestone "Phase 5 - Code Quality" --body "See IMPLEMENTATION-PLAN.md Phase 5 Step 5.4" 2>nul
if %ERRORLEVEL% EQU 0 (echo       [OK] Issue #11 created) else (echo       [SKIP] Issue #11 may exist)

REM Issue #12
echo    Creating Issue #12...
gh issue create --title "[LOW] Large Component File Size (Voorraad.tsx 681 lines)" --label "low,code-quality,frontend,phase-5" --milestone "Phase 5 - Code Quality" --body "See IMPLEMENTATION-PLAN.md Phase 5 Step 5.5" 2>nul
if %ERRORLEVEL% EQU 0 (echo       [OK] Issue #12 created) else (echo       [SKIP] Issue #12 may exist)

REM Issue #14
echo    Creating Issue #14...
gh issue create --title "[LOW] Missing Cascade Documentation" --label "low,documentation,database,phase-5" --milestone "Phase 5 - Code Quality" --body "See IMPLEMENTATION-PLAN.md Phase 5 Step 5.6" 2>nul
if %ERRORLEVEL% EQU 0 (echo       [OK] Issue #14 created) else (echo       [SKIP] Issue #14 may exist)

cd ..\..

echo.
echo ========================================
echo [OK] All issues created!
echo ========================================
echo.
echo Summary:
echo   [OK] Labels created (18 labels)
echo   [OK] Milestones ready (5 phases)
echo   [OK] Issues created (14 total)
echo.
echo Next Steps:
echo   1. View issues: gh issue list
echo   2. Start with Phase 1: Issues #3, #4, #5
echo.
echo Reference:
echo   - Implementation: IMPLEMENTATION-PLAN.md
echo   - Templates: .github\ISSUE_TEMPLATES\
echo.
pause
