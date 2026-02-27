# Phase Dependencies & Execution Order

This document visualizes the dependencies between implementation phases and provides guidance on execution order.

---

## Visual Dependency Graph

```
┌──────────────────────────────────────────────────────────────────┐
│ PHASE 0: Foundation & Refactoring (1-2 weeks)                    │
│ - Expand role system (6 roles)                                   │
│ - Digital signatures                                              │
│ - Enhanced audit logging                                         │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ PHASE 1: Core Data Model (2-3 weeks)                             │
│ - Projects & Fases                                               │
│ - Orders & Orderreeksen                                          │
│ - Posnummers                                                     │
│ - Order types (admin config)                                     │
└──┬────────────────┬──────────────────┬──────────────────────────┘
   │                │                  │
   │                │                  │
   ▼                ▼                  ▼
┌────────────┐  ┌──────────────┐  ┌─────────────────────┐
│ PHASE 3:   │  │ PHASE 2:     │  │ PHASE 5:            │
│ Checklists │  │ File Mgmt    │  │ PlateStock          │
│ (1 week)   │  │ (3-4 weeks)  │  │ Integration         │
│            │  │              │  │ (1-2 weeks)         │
│ - Base     │  │ - CSV parse  │  │                     │
│   templates│  │ - PDF split  │  │ - Link claims to    │
│ - Order    │  │ - OCR detect │  │   fases             │
│   items    │  │ - STEP files │  │ - Plate consumption │
│ - Execution│  │ - Background │  │ - Certificate       │
│            │  │   jobs       │  │   inheritance       │
└──────┬─────┘  └──────┬───────┘  └──────────┬──────────┘
       │               │                     │
       └───────┬───────┘                     │
               │                             │
               ▼                             │
┌──────────────────────────────────────────┐ │
│ PHASE 4: Order Execution (2-3 weeks)     │ │
│ - Split-pane UI                          │ │
│ - PDF & STEP viewers                     │ │
│ - Checklist execution                    │ │
│ - Gereedmelding (completion)             │ │
│ - Goedkeuring (approval with signature)  │ │
│ - Reopen workflow                        │ │
└────────────────┬─────────────────────────┘ │
                 │                           │
                 └────────┬──────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│ PHASE 6: Notifications & Advanced (1-2 weeks)                    │
│ - In-app notifications with polling                              │
│ - Email notifications (optional)                                 │
│ - Orderreeks split workflow                                      │
│ - Project sharing permissions                                    │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│ PHASE 7: Certificate Export (2 weeks)                            │
│ - Cover page generation                                          │
│ - Table of contents                                              │
│ - Merged PDF export                                              │
│ - ZIP export                                                     │
│ - Background job processing                                      │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│ PHASE 8: UI/UX Polish (1-2 weeks)                                │
│ - Role-specific dashboards                                       │
│ - Keyboard shortcuts & command palette                           │
│ - Loading skeletons                                              │
│ - Error boundaries                                               │
│ - Responsive design                                              │
│ - Performance optimizations                                      │
└──────────────────────────────────────────────────────────────────┘
```

---

## Execution Order Options

### Option 1: Linear (Safest, 19-21 weeks)

**Recommended for:** Solo developer, first-time MES implementation

```
Phase 0 → Phase 1 → Phase 3 → Phase 2 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8
```

**Rationale:**
- Each phase fully complete before moving to next
- Easier to test and validate
- Minimal context switching
- Lower risk of breaking changes

### Option 2: Parallel Tracks (Faster, 14-16 weeks)

**Recommended for:** Experienced developer or small team

```
Phase 0 (week 1-2)
    ↓
Phase 1 (week 3-5)
    ↓
Phase 3 + Phase 5 in parallel (week 6-7)
    ↓
Phase 2 (week 8-11) + Phase 6 planning
    ↓
Phase 4 (week 12-14)
    ↓
Phase 6 + Phase 7 in parallel (week 15-16)
    ↓
Phase 8 (week 17-18)
```

**Rationale:**
- Phase 3 (Checklists) and Phase 5 (PlateStock) don't overlap in code
- Phase 6 (Notifications) can be planned while doing Phase 2
- Phase 7 (Certificate Export) can be built in parallel with Phase 6
- Saves 3-5 weeks

### Option 3: MVP-First (Quickest to Demo, 10-12 weeks to MVP)

**Recommended for:** Proving concept or getting early feedback

```
MVP Scope:
- Phase 0 (1-2 weeks)
- Phase 1 (2-3 weeks) - simplified: no orderreeks split
- Phase 3 (1 week) - simplified: basic checklists only
- Phase 4 (2-3 weeks) - simplified: no STEP viewer
- Phase 8 (1 week) - basic polish only

Then add:
- Phase 2 (3-4 weeks)
- Phase 5 (1-2 weeks)
- Phase 6 (1-2 weeks)
- Phase 7 (2 weeks)
- Phase 8 complete (1 week)
```

**Rationale:**
- Get core workflow (project → order → execute → approve) working quickly
- Defer complex features (file management, certificate export)
- User feedback guides remaining development
- Can deploy to production sooner for early adopters

---

## Critical Path Analysis

### Must Complete in Order (Cannot Parallelize)

1. **Phase 0 → Phase 1** - Core data model needs expanded roles
2. **Phase 1 → Phase 4** - Order execution needs orders to exist
3. **Phase 2 + Phase 3 → Phase 4** - Order execution needs files and checklists
4. **Phase 4 → Phase 6** - Notifications need order completion events
5. **Phase 5 → Phase 7** - Certificate export needs plate-posnummer links

### Can Be Parallelized

1. **Phase 3 || Phase 5** - Independent codebases, different tables
2. **Phase 2 || Phase 6 (planning)** - Can plan notifications while building file management
3. **Phase 6 || Phase 7** - Independent features, can be built simultaneously

---

## Risk Assessment by Phase

| Phase | Risk Level | Primary Risk | Mitigation |
|-------|-----------|--------------|------------|
| 0 | 🟡 Medium | Breaking existing auth | Comprehensive role testing |
| 1 | 🔴 High | Complex domain model | Thorough schema design, validation |
| 2 | 🔴 Very High | OCR accuracy, large files | Background jobs, confidence scores |
| 3 | 🟢 Low | Straightforward CRUD | Standard testing |
| 4 | 🔴 High | Complex UI, 3D rendering | Incremental UI build, performance testing |
| 5 | 🟡 Medium | Data migration | Backward compatibility, careful testing |
| 6 | 🟡 Medium | Notification spam | User preferences, digest mode |
| 7 | 🔴 High | PDF generation performance | Background jobs, streaming |
| 8 | 🟢 Low | Polish work | Standard UX testing |

**Legend:**
- 🟢 Low Risk: Standard implementation
- 🟡 Medium Risk: Some complexity, requires careful testing
- 🔴 High/Very High Risk: Novel features, performance-critical, or complex UI

---

## Pre-Requisites Checklist

### Before Phase 0
- [ ] PostgreSQL 15+ installed and running
- [ ] Python 3.11+ environment set up
- [ ] Node.js 18+ installed
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Backend dependencies installed (`pip install -r requirements.txt`)
- [ ] Database created: `mes_kersten`
- [ ] Existing migrations run (001-003)
- [ ] Test users created for current 3 roles

### Before Phase 1
- [ ] Phase 0 complete and tested
- [ ] 6 user roles working correctly
- [ ] Digital signature upload tested

### Before Phase 2
- [ ] Phase 1 complete (projects, fases, posnummers exist)
- [ ] File storage location configured (local or S3)
- [ ] Tesseract OCR installed on server
- [ ] Sample CSV, PDF, STEP files prepared for testing

### Before Phase 3
- [ ] Phase 1 complete (orders and order types exist)
- [ ] Admin user ready to configure templates

### Before Phase 4
- [ ] Phase 2 complete (files uploadable and viewable)
- [ ] Phase 3 complete (checklists functional)
- [ ] Three.js and PDF viewer dependencies installed

### Before Phase 5
- [ ] Phase 1 complete (fases and posnummers exist)
- [ ] PlateStock module still working (regression test)
- [ ] Test plates with certificates available

### Before Phase 6
- [ ] Phase 4 complete (order completion workflow functional)
- [ ] Email SMTP configured (if using email notifications)

### Before Phase 7
- [ ] Phase 5 complete (certificates linked to posnummers)
- [ ] reportlab and PyPDF2 installed
- [ ] Test certificates prepared (multiple PDFs)

### Before Phase 8
- [ ] All previous phases complete
- [ ] User feedback collected
- [ ] Performance benchmarks established

---

## Deployment Strategy

### Staging Deployments

Deploy to staging environment after these phases:

1. **After Phase 1** - Test project/fase creation workflow
2. **After Phase 4** - Test complete order execution workflow (CRITICAL)
3. **After Phase 7** - Test certificate export (CRITICAL for compliance)

### Production Rollout

**Recommended approach: Feature Flags**

```python
# Example feature flag implementation
from backend.config import settings

if settings.FEATURE_FILE_UPLOAD_ENABLED:
    # Phase 2 features
    pass

if settings.FEATURE_CERTIFICATE_EXPORT_ENABLED:
    # Phase 7 features
    pass
```

**Rollout phases:**
1. **Phase 0-1:** Activate for all users (core functionality)
2. **Phase 2-3:** Activate for werkvoorbereiders only (test with power users)
3. **Phase 4:** Activate for werkplaats (order execution)
4. **Phase 5-8:** Gradual rollout to all users

---

## Testing Gates

Each phase must pass these gates before proceeding:

### Automated Tests
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] No regression in existing features

### Manual Tests
- [ ] Happy path tested (primary workflow works)
- [ ] Edge cases tested (empty states, invalid inputs)
- [ ] Error handling tested (network failures, validation errors)
- [ ] Performance acceptable (page loads < 2s, API calls < 500ms)

### User Acceptance
- [ ] Demo completed with stakeholder
- [ ] Critical bugs addressed
- [ ] User feedback documented

### Documentation
- [ ] CLAUDE.md updated with new patterns
- [ ] API documentation updated
- [ ] Migration documented (if schema changed)

---

## Success Metrics

### Phase 1 Success Criteria
- [ ] Can create project with 3 fases
- [ ] Can create orderreeks with 5 different order types
- [ ] Can add 20+ posnummers to fase
- [ ] Page load time < 2 seconds

### Phase 2 Success Criteria
- [ ] Can upload CSV with 50 posnummers, imports in < 10 seconds
- [ ] Can upload 20-page PDF, splits successfully
- [ ] OCR detects posnummer with > 80% accuracy on clean drawings
- [ ] Can upload 10 STEP files, auto-links correctly

### Phase 4 Success Criteria
- [ ] Order execution page loads in < 2 seconds
- [ ] PDF viewer renders 10-page drawing smoothly
- [ ] STEP 3D viewer rotates 30fps
- [ ] Can complete order with 20 parts + 10 checklist items in < 5 minutes

### Phase 7 Success Criteria
- [ ] Can export fase with 50 posnummers to merged PDF
- [ ] Export completes in < 60 seconds
- [ ] Cover page shows correct project info + signature
- [ ] TOC has correct page numbers

---

## Troubleshooting Common Blockers

### "Phase 2 is taking too long"
**Solution:** Implement in stages:
1. File upload infrastructure only (1 week)
2. CSV parsing (1 week)
3. PDF split without OCR (1 week)
4. Add OCR later (1 week)

### "Phase 4 3D viewer is too complex"
**Solution:** Start with PDF viewer only, add STEP viewer in Phase 8 polish

### "Running out of time"
**Solution:** Use MVP-First approach, deploy core workflow, add advanced features later

### "OCR accuracy is poor"
**Solution:**
- Increase confidence threshold
- Add manual linking as fallback
- Consider external OCR service (Google Vision API)

### "Background jobs not working"
**Solution:**
- Start with synchronous processing
- Add background jobs in Phase 8
- Use simple task queue (Celery + Redis)

---

## Next Steps

1. **Choose execution order** (Linear, Parallel, or MVP-First)
2. **Review Phase 0 prompt** in PROMPTS-OVERVIEW.md
3. **Create feature branch** `git checkout -b feature/phase-0-foundation`
4. **Begin implementation** following the detailed prompts
5. **Test thoroughly** before moving to Phase 1

Good luck! 🚀
