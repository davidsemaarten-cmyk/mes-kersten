# Implementation Guides

This directory contains comprehensive guides for transforming the current PlateStock module into the complete MES Kersten system as described in PROJECT-FUNCTIONAL-OVERVIEW.md.

---

## Quick Navigation

### 📋 Start Here
- **[IMPLEMENTATION-ROADMAP.md](../IMPLEMENTATION-ROADMAP.md)** - High-level overview, strategy, and phase summary
- **[PROMPTS-OVERVIEW.md](./PROMPTS-OVERVIEW.md)** - Copy-paste ready prompts for AI-assisted development
- **[PHASE-DEPENDENCIES.md](./PHASE-DEPENDENCIES.md)** - Visual dependency graph, execution order options, risk assessment

---

## What's in This Directory?

### Strategic Documents

**IMPLEMENTATION-ROADMAP.md**
- Current state vs target state analysis
- What to keep, refactor, and remove
- 8-phase breakdown with durations
- Timeline: 14-21 weeks total
- Critical success factors
- Risk mitigation strategies

**PROMPTS-OVERVIEW.md**
- 20+ actionable prompts organized by phase
- Each prompt is self-contained and copy-paste ready
- Designed for use with Claude Code or similar AI assistants
- Includes expected outputs and test cases
- Tips for effective AI-assisted development

**PHASE-DEPENDENCIES.md**
- Visual dependency graph (ASCII art)
- Three execution order options: Linear, Parallel, MVP-First
- Critical path analysis
- Risk assessment matrix
- Pre-requisites checklist for each phase
- Testing gates and success metrics
- Troubleshooting common blockers

---

## The 8 Phases

### Phase 0: Foundation & Refactoring (1-2 weeks)
**Risk:** 🟡 Medium | **Complexity:** Medium

Expand role system from 3 to 6 roles, add digital signatures, enhance audit logging.

**Key Deliverables:**
- Users can now have roles: admin, werkvoorbereider, werkplaats, logistiek, tekenaar, laser, buislaser, kantbank
- Digital signature upload for werkvoorbereiders
- Audit logging tracks entity type and ID

**Start:** [Prompt 0.1 in PROMPTS-OVERVIEW.md](./PROMPTS-OVERVIEW.md#prompt-01-expand-role-system)

---

### Phase 1: Core Data Model (2-3 weeks)
**Risk:** 🔴 High | **Complexity:** Complex

Build the foundational hierarchy: PROJECT → FASE → ORDERS → ORDERREEKS → POSNUMMERS.

**Key Deliverables:**
- Projects with unique codes (e.g., "STAGR")
- Fases within projects (e.g., "001 - hekken")
- Order types configurable by admin
- Orderreeksen (order sequences like "Volledig", "West", "Oost")
- Orders with status tracking
- Posnummers (part numbers) with dimensions

**Start:** [Prompt 1.1 in PROMPTS-OVERVIEW.md](./PROMPTS-OVERVIEW.md#prompt-11-create-projects-and-fases-tables)

---

### Phase 2: File Management System (3-4 weeks)
**Risk:** 🔴 Very High | **Complexity:** Very Complex

Implement file uploads with CSV parsing, PDF splitting with OCR, and STEP file management.

**Key Deliverables:**
- CSV materiaallijst parser creates posnummers automatically
- Multi-page PDF split with OCR-based posnummer detection
- STEP/DXF file auto-linking based on filename
- Background job processing for large files
- Duplicate detection and resolution UI

**Start:** [Prompt 2.1 in PROMPTS-OVERVIEW.md](./PROMPTS-OVERVIEW.md#prompt-21-file-upload-infrastructure)

---

### Phase 3: Checklist System (1 week)
**Risk:** 🟢 Low | **Complexity:** Medium

Admin-configurable base checklists per order type, werkvoorbereider customization.

**Key Deliverables:**
- Admin creates base checklist templates for each order type
- Templates automatically copied to orders when created
- Werkvoorbereider can add custom items
- Werkplaats completes items with optional comments
- Required items block order completion

**Start:** [Prompt 3.1 in PROMPTS-OVERVIEW.md](./PROMPTS-OVERVIEW.md#prompt-31-admin-checklist-templates)

---

### Phase 4: Order Execution & Digital Signatures (2-3 weeks)
**Risk:** 🔴 High | **Complexity:** Very Complex

Full order execution UI with split-pane layout, file viewers, and approval workflow.

**Key Deliverables:**
- Order execution page: parts list (left) + file viewer (right)
- PDF viewer with zoom and navigation
- 3D STEP viewer with rotation controls
- Gereedmelding (completion) workflow for werkplaats
- Goedkeuring (approval) workflow with digital signature for werkvoorbereider
- Reopen order capability

**Start:** [Prompt 4.1 in PROMPTS-OVERVIEW.md](./PROMPTS-OVERVIEW.md#prompt-41-order-execution-page-layout)

---

### Phase 5: PlateStock Integration (1-2 weeks)
**Risk:** 🟡 Medium | **Complexity:** Medium

Connect existing PlateStock module to projects/fases, add consumption tracking.

**Key Deliverables:**
- Claims linked to specific fases
- Plate consumption workflow with posnummer linking
- Certificate inheritance from plate to parts
- Remnant plate creation
- Materiaal tab in Fase detail showing claimed plates

**Start:** [Prompt 5.1 in PROMPTS-OVERVIEW.md](./PROMPTS-OVERVIEW.md#prompt-51-link-claims-to-fases)

---

### Phase 6: Notifications & Advanced Workflows (1-2 weeks)
**Risk:** 🟡 Medium | **Complexity:** Medium

In-app notifications, orderreeks splitting, and project sharing permissions.

**Key Deliverables:**
- Notification bell in top nav with unread count
- Notifications for: order completed, claim modified, order assigned
- User notification preferences (email on/off, digest mode)
- Orderreeks split workflow with drag-and-drop UI
- Project sharing between werkvoorbereiders

**Start:** [Prompt 6.1 in PROMPTS-OVERVIEW.md](./PROMPTS-OVERVIEW.md#prompt-61-notification-system)

---

### Phase 7: Certificate Export (2 weeks)
**Risk:** 🔴 High | **Complexity:** Complex

Certificate export with cover page, table of contents, and merged PDF generation.

**Key Deliverables:**
- Export certificates per fase, orderreeks, or custom selection
- Cover page with project info and werkvoorbereider signature
- Table of contents with page numbers
- Merged PDF or ZIP of separate files
- Background job processing with progress tracking

**Start:** [Prompt 7.1 in PROMPTS-OVERVIEW.md](./PROMPTS-OVERVIEW.md#prompt-71-certificate-export-system)

---

### Phase 8: UI/UX Polish & Production Readiness (1-2 weeks)
**Risk:** 🟢 Low | **Complexity:** Medium

Role-specific dashboards, keyboard shortcuts, loading states, responsive design.

**Key Deliverables:**
- Customized dashboards for each of 6 roles
- Command palette (Ctrl+K) for quick actions
- Keyboard shortcuts (vim-style: G then P for projects)
- Loading skeletons for all async operations
- Error boundaries for graceful error handling
- Responsive design for tablet/mobile
- Performance optimizations

**Start:** [Prompt 8.1 in PROMPTS-OVERVIEW.md](./PROMPTS-OVERVIEW.md#prompt-81-role-specific-dashboards)

---

## Execution Order Recommendations

### 🐢 Linear (Safest, 19-21 weeks)
**Best for:** Solo developer, first MES implementation

Complete each phase fully before moving to next. Minimal risk, maximum testing.

```
0 → 1 → 3 → 2 → 4 → 5 → 6 → 7 → 8
```

### 🏃 Parallel Tracks (Faster, 14-16 weeks)
**Best for:** Experienced developer or small team

Parallelize independent phases. Saves 3-5 weeks.

```
0 → 1 → (3 || 5) → 2 → 4 → (6 || 7) → 8
```

### 🚀 MVP-First (Quickest to Demo, 10-12 weeks to MVP)
**Best for:** Proving concept, early feedback

Build core workflow first, add advanced features later.

```
MVP: 0 → 1(simple) → 3(basic) → 4(no 3D) → 8(basic)
Then: 2 → 5 → 6 → 7 → 8(complete)
```

See [PHASE-DEPENDENCIES.md](./PHASE-DEPENDENCIES.md) for detailed analysis.

---

## How to Use These Guides

### For AI-Assisted Development (Recommended)

1. **Read the roadmap** ([IMPLEMENTATION-ROADMAP.md](../IMPLEMENTATION-ROADMAP.md))
2. **Choose execution order** ([PHASE-DEPENDENCIES.md](./PHASE-DEPENDENCIES.md))
3. **Copy a prompt** from [PROMPTS-OVERVIEW.md](./PROMPTS-OVERVIEW.md)
4. **Paste into Claude Code** or similar AI assistant
5. **Review generated code** - AI can make mistakes!
6. **Test incrementally** - don't wait until phase end
7. **Update CLAUDE.md** - document patterns as you go
8. **Move to next prompt**

### For Manual Development

1. **Read the roadmap** ([IMPLEMENTATION-ROADMAP.md](../IMPLEMENTATION-ROADMAP.md))
2. **Understand the architecture** in each phase description
3. **Follow the prompts as specifications** - they detail exactly what to build
4. **Use code examples** in prompts as reference
5. **Test according to test cases** in each prompt

---

## Key Files to Reference

### Existing Documentation
- `/CLAUDE.md` - Current codebase architecture and patterns
- `/docs/PROJECT-FUNCTIONAL-OVERVIEW.md` - Complete target state specification (2905 lines)
- `/README.md` - Project overview and setup

### Database
- `/database/migrations/001_core_tables.sql` - Users, roles, audit logs
- `/database/migrations/002_platestock_tables.sql` - Materials, plates, claims
- `/database/migrations/003_refactor_materials.sql` - Material schema updates

### Backend
- `/backend/main.py` - FastAPI app entry, router registration
- `/backend/config.py` - Environment configuration
- `/backend/database.py` - SQLAlchemy session management
- `/backend/services/platestock.py` - Example of service layer pattern

### Frontend
- `/frontend/src/App.tsx` - Router and React Query setup
- `/frontend/src/hooks/useAuth.tsx` - Authentication pattern
- `/frontend/src/lib/api.ts` - Axios configuration with auth

---

## Testing Strategy

### After Each Prompt
- [ ] Run unit tests (if applicable)
- [ ] Test manually in browser/API docs
- [ ] Verify no regressions in PlateStock

### After Each Phase
- [ ] Complete phase-specific test cases
- [ ] Regression test all previous phases
- [ ] Deploy to staging (for Phases 1, 4, 7)
- [ ] Get user acceptance (Maarten tests core workflows)

### Before Production
- [ ] All 8 phases complete and tested
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] User training completed
- [ ] Backup and rollback procedures tested

---

## Success Metrics

### Overall Success Criteria
- [ ] All core workflows from PROJECT-FUNCTIONAL-OVERVIEW.md implemented
- [ ] PlateStock module still fully functional (backward compatible)
- [ ] All 6 user roles working with correct permissions
- [ ] Page load times < 2 seconds
- [ ] API response times < 500ms
- [ ] Zero critical bugs
- [ ] User acceptance achieved

### Phase-Specific Metrics
See [PHASE-DEPENDENCIES.md](./PHASE-DEPENDENCIES.md#success-metrics) for detailed metrics per phase.

---

## Getting Help

### If Stuck on a Prompt
1. **Ask Claude Code for clarification** - "Can you explain the split_orderreeks method in more detail?"
2. **Break it down** - Split complex prompts into smaller pieces
3. **Check existing code** - Look for similar patterns in current codebase
4. **Review PROJECT-FUNCTIONAL-OVERVIEW.md** - See how feature should work from user perspective

### If Running Behind Schedule
1. **Simplify the phase** - MVP approach (see PHASE-DEPENDENCIES.md)
2. **Skip non-critical features** - e.g., STEP viewer can be added later
3. **Parallelize** - If you have help, split independent phases

### If Tests Failing
1. **Check database migrations** - Run all migrations in order
2. **Verify test data** - Create test users for all 6 roles
3. **Check CORS settings** - Frontend/backend on different ports
4. **Review error logs** - Backend terminal and browser console

---

## Contributing to These Guides

If you find issues or improvements:

1. **Update the relevant .md file** in `docs/implementation/`
2. **Document the change** in git commit message
3. **Consider if other phases affected** - dependencies may need updating

---

## Timeline Summary

| Weeks | Milestone |
|-------|-----------|
| 2 | Phase 0 complete - Roles expanded |
| 5 | Phase 1 complete - Core hierarchy working |
| 6 | Phase 3 complete - Checklists functional |
| 10 | Phase 2 complete - File management working |
| 13 | Phase 4 complete - Order execution live (**Major milestone**) |
| 15 | Phase 5 complete - PlateStock integrated |
| 17 | Phase 6 complete - Notifications working |
| 19 | Phase 7 complete - Certificate export ready |
| 21 | Phase 8 complete - **Production ready!** 🎉 |

---

## Final Checklist Before Going Live

- [ ] All 8 phases implemented and tested
- [ ] CLAUDE.md updated with all new patterns
- [ ] Database backup procedures established
- [ ] Rollback scripts tested
- [ ] User training materials created
- [ ] Admin configures all order types and checklist templates
- [ ] Test data migrated or seeded
- [ ] Performance monitoring set up
- [ ] Error tracking configured (Sentry or similar)
- [ ] SSL certificates installed
- [ ] Environment variables configured for production
- [ ] Feature flags set correctly
- [ ] Final UAT with Maarten completed

---

**Ready to start? Head to [PROMPTS-OVERVIEW.md](./PROMPTS-OVERVIEW.md) and copy Prompt 0.1!** 🚀

Good luck with your implementation! If you have questions, refer back to these guides or ask Claude Code for help.
