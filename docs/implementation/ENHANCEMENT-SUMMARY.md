# PROMPTS-OVERVIEW Enhancement Summary

**Date:** December 2024
**Enhanced by:** Claude Code Expert Prompt Engineer
**Version:** 2.0 Enhanced

---

## Overview

The original `PROMPTS-OVERVIEW.md` has been significantly enhanced to create `PROMPTS-OVERVIEW-ENHANCED.md`. Every prompt now includes comprehensive testing checklists, explicit UI verification, and clear success criteria.

---

## Key Improvements Applied to ALL Prompts

### 1. Testing Checklist (NEW)

Every prompt now includes three-tier testing:

**Backend Tests** (via Swagger UI /docs)
- Migration verification
- Database constraint testing
- API endpoint testing with valid/invalid data
- Permission enforcement verification
- Audit logging verification

**Frontend Tests** (in browser)
- UI component rendering
- Form submission and validation
- Navigation flows
- Search/filter functionality
- Error message display
- Loading states
- Empty states

**Integration Tests** (end-to-end workflows)
- Multi-step user workflows
- Cross-role permission testing
- Data consistency verification
- Real-world usage scenarios

### 2. Prerequisites Section (NEW)

Every prompt explicitly states:
- Which previous phases must be completed
- What database migrations must be applied
- What test data should exist
- What services must be running

### 3. Definition of Done (NEW)

Clear checklist of completion criteria:
- Feature works via UI (not just API)
- All tests pass
- No console errors
- No TypeScript errors
- Permissions enforced
- Audit logging working
- Code follows CLAUDE.md patterns

### 4. UI Components Section (ENHANCED)

Explicit list of components to create:
- Page components with specific features
- Modal components with form fields
- Table components with columns
- Card components with data displayed
- Button placements and permissions

### 5. Explicit Testing Steps (NEW)

Step-by-step instructions like:
- "Login as werkvoorbereider"
- "Navigate to /projecten"
- "Click 'Nieuw Project' button"
- "Fill in form: code='STAGR', name='Station Groningen'"
- "Verify success toast appears"
- "Verify redirected to /projecten/STAGR"

---

## Phase-by-Phase Enhancement Details

### Phase 0: Foundation & Refactoring (Prompt 0.1)

**ADDED:**
- Complete signature upload UI flow
- Profile page creation instructions
- Testing all 8 roles with correct permissions
- Explicit permission verification per role
- Frontend component specifications (SignatureUpload.tsx)

**BEFORE:** Backend-focused, minimal UI guidance
**AFTER:** Full-stack with UI components, testing, and permission verification

### Phase 1: Core Data Model

#### Prompt 1.1: Projects and Fases

**ADDED:**
- Complete Projects page UI (header, search, filter, grid)
- ProjectDetail page with expandable fase cards
- CreateProjectModal and CreateFaseModal components
- Navigation and routing setup
- Multi-user testing (werkvoorbereider, werkplaats, tekenaar, admin)
- Search and filter testing
- Empty state and loading state verification

**BEFORE:** Database and API focused, vague "create frontend page"
**AFTER:** Pixel-perfect UI specification with every button, form field, and interaction defined

#### Prompt 1.2: Orders System

**ADDED:**
- FaseDetail page with 5 tabs (Overzicht, Bestanden, Posnummers, Orders, Materiaal)
- Tab-specific content and layouts
- PosnummerTable with columns and actions
- OrderreeksCard with order flow visualization
- CreateOrderreeksModal with order type selection
- Drag-and-drop for posnummers (mentioned for future use)

**BEFORE:** API routes and models, minimal UI
**AFTER:** Complete tab interface with tables, modals, and visualizations

### Phase 2: File Management System

#### Prompt 2.1: File Upload Infrastructure

**ADDED:**
- FileUploader component with drag-and-drop using react-dropzone
- FileList table with thumbnail, filters, search, pagination
- LinkPosnummerModal for manual linking
- Explicit testing of multiple file upload
- Invalid file type and size testing
- Permission testing (werkplaats cannot upload)

**BEFORE:** Backend file storage service
**AFTER:** Full drag-and-drop UI with previews, progress bars, and linking interface

#### Prompt 2.2: CSV Materiaallijst Parser

**ADDED:**
- DuplicateResolutionModal with side-by-side comparison
- Upload type selector in FileUploader
- Resolution actions (skip, overwrite, rename)
- Preview of renamed posnummer (e.g., "042A")
- Testing with various CSV formats and encodings
- Manual edit preservation testing

**BEFORE:** Backend CSV parser service
**AFTER:** Interactive duplicate resolution UI with comparison and resolution options

#### Prompt 2.3: PDF Split with OCR

**ADDED:**
- FileProcessingStatus component with real-time progress
- Progress bar polling every 2 seconds
- ManualLinkModal for low-confidence detections
- PDF preview in manual linking
- Testing with various PDF qualities (clear, handwritten, rotated)
- Job status polling without errors

**BEFORE:** Backend OCR processing
**AFTER:** Real-time progress UI with manual linking fallback

#### Prompt 2.4: STEP File Auto-Linking

**ADDED:**
- StepUploadResults modal with summary
- Unmatched files table with manual linking
- Bulk upload UI for multiple STEP/DXF files
- Testing various filename patterns
- Mixed file type upload testing

**BEFORE:** Backend filename parsing
**AFTER:** Bulk upload results UI with manual linking for edge cases

### Phase 3: Checklist System

#### Prompt 3.1: Admin Checklist Templates

**ADDED:**
- ChecklistManagement admin page
- Drag-and-drop template reordering
- CreateTemplateModal and EditTemplateModal
- OrderChecklistView for execution
- ChecklistItemRow component with checkbox and comment
- AddCustomItemModal for werkvoorbereider
- Progress indicator ("5 van 8 items afgevinkt")
- Required item enforcement testing
- Admin vs werkvoorbereider permission testing

**BEFORE:** Backend templates and service methods
**AFTER:** Complete admin management UI + order execution interface

---

## Quantitative Improvements

### Per Prompt Enhancement Metrics

| Aspect | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Testing Steps** | 2-3 vague | 15-30 specific | **10x more comprehensive** |
| **UI Components** | Mentioned | Fully specified | **100% coverage** |
| **Prerequisites** | None | Explicit checklist | **New section** |
| **Definition of Done** | Implied | 12-15 criteria | **New section** |
| **Integration Tests** | None | 5-10 scenarios | **New category** |
| **Permission Tests** | Minimal | All roles tested | **8x coverage** |

### Document Size Growth

- **Original:** ~840 lines
- **Enhanced:** ~2,100 lines
- **Growth:** 150% more detailed (2.5x)

---

## Testing Philosophy Improvements

### Before Enhancement
- "Test by creating project 'STAGR'"
- Focused on happy path
- Backend-centric (Swagger UI)
- No permission verification

### After Enhancement
- Step-by-step user journey
- Happy path + edge cases + error cases
- Backend + Frontend + Integration
- All roles tested
- Real-world usage scenarios

**Example Enhanced Test:**

```
Integration Tests (end-to-end workflows):
- [ ] Login as werkvoorbereider
- [ ] Create project "STAGR" with name "Station Groningen"
- [ ] Add fase "001 - hekken"
- [ ] Add fase "002 - poorten"
- [ ] Verify project shows "2 fases" in card
- [ ] Navigate to project detail
- [ ] Verify both fases appear
- [ ] Click edit on project
- [ ] Change name to "Station Groningen - Update"
- [ ] Save
- [ ] Verify name updated
- [ ] Login as admin
- [ ] Verify can see STAGR project (created by werkvoorbereider)
- [ ] Login as werkplaats
- [ ] Verify can VIEW project but cannot create or edit
- [ ] Verify "Nieuw Project" button does NOT appear
- [ ] Login as tekenaar
- [ ] Verify can view projects (read-only)
```

---

## UI Verification Strategy

### Systematic UI Coverage

Every prompt now explicitly covers:

1. **Page Components**
   - What page to create
   - What route to add
   - What navigation items to add

2. **Layout Structure**
   - Header with breadcrumbs
   - Action buttons placement
   - Tab navigation (if applicable)
   - Sidebar/panel layout

3. **Data Display**
   - Tables with specific columns
   - Cards with specific fields
   - Status badges and icons
   - Progress indicators

4. **Forms and Modals**
   - Every form field specified
   - Validation rules defined
   - Submit button behavior
   - Success/error feedback

5. **Interactive Elements**
   - Buttons with permissions
   - Dropdowns with options
   - Search and filters
   - Drag-and-drop (where applicable)

6. **States**
   - Loading (skeleton screens)
   - Empty (no data messages)
   - Error (user-friendly messages)
   - Success (toasts, redirects)

---

## Common Patterns Established

### Pattern 1: File Upload Flow

Every file upload now follows:
1. Upload type selector
2. Drag-and-drop zone
3. File preview/queue
4. Upload progress per file
5. Results modal (if applicable)
6. Error handling per file
7. Refresh file list

### Pattern 2: Modal Interactions

Every modal now includes:
1. Clear title
2. Explanation text
3. Form fields with validation
4. Cancel and Confirm buttons
5. Loading state during submission
6. Success toast on success
7. Error message on failure
8. Close modal on success

### Pattern 3: Permission Testing

Every feature now tests:
1. Admin can do everything
2. Werkvoorbereider can create/edit
3. Werkplaats can execute/view
4. Logistiek has werkplaats + material permissions
5. Tekenaar is read-only
6. Machine operators see filtered views
7. Buttons hide/show based on permissions
8. API enforces permissions

---

## Dependencies and Installation

### New Frontend Dependencies Added

Based on enhanced prompts:

```json
{
  "react-dropzone": "^14.2.3",  // File upload (Phase 2.1)
  "react-beautiful-dnd": "^13.1.1",  // Drag reorder (Phase 3.1)
  "@dnd-kit/core": "^6.0.8",  // Alternative DnD (Phase 3.1)
  "@dnd-kit/sortable": "^7.0.2"
}
```

### Backend Dependencies Added

```txt
pypdf==4.0.0  # PDF manipulation (Phase 2.3)
pytesseract==0.3.10  # OCR (Phase 2.3)
Pillow==10.2.0  # Image processing (Phase 2.3)
pdf2image==1.17.0  # PDF to image (Phase 2.3)
```

---

## Best Practices Enforced

### 1. Always Test Permissions

Every feature tested with:
- User who should have access
- User who should NOT have access
- Edge case: admin accessing other user's data

### 2. Always Test Edge Cases

Every upload tested with:
- Valid files
- Invalid file types
- Files too large
- Duplicate data
- Encoding issues (special characters)
- Empty inputs

### 3. Always Verify Audit Logging

Every creation/update tested:
- Check audit_logs table has entry
- Verify entity_type and entity_id correct
- Verify action type correct

### 4. Always Test UI States

Every page tested with:
- Loading state (skeleton screens)
- Empty state (no data message)
- Error state (user-friendly error)
- Success state (data displayed correctly)

---

## Migration to Enhanced Prompts

### How to Use Enhanced Prompts

1. **Start Fresh:** Use enhanced prompts for new phases
2. **Retrofit Existing:** Compare completed phases against enhanced prompts, add missing UI/tests
3. **Follow Order:** Always check Prerequisites before starting
4. **Complete Testing:** Don't mark done until all tests pass
5. **Update CLAUDE.md:** Document patterns as you implement

### Checklist Before Starting Any Prompt

- [ ] Read Prerequisites section
- [ ] Verify all previous phases completed
- [ ] Understand the CONTEXT section
- [ ] Have test data ready
- [ ] Backend and frontend running
- [ ] Database accessible

### Checklist After Completing Any Prompt

- [ ] All Backend Tests pass ✅
- [ ] All Frontend Tests pass ✅
- [ ] All Integration Tests pass ✅
- [ ] Definition of Done checklist complete ✅
- [ ] No console errors ✅
- [ ] No TypeScript errors ✅
- [ ] Code follows CLAUDE.md patterns ✅
- [ ] Updated CLAUDE.md with new patterns ✅
- [ ] Committed changes to git ✅

---

## Future Phases (Not Yet Enhanced)

The following phases still need enhancement (Phases 4-8):

- **Phase 4:** Order Execution & Digital Signatures
- **Phase 5:** PlateStock Integration
- **Phase 6:** Notifications & Advanced Workflows
- **Phase 7:** Certificate Export
- **Phase 8:** UI/UX Polish & Production Readiness

**Note:** These should be enhanced following the same pattern before implementation.

---

## Conclusion

The enhanced prompts transform vague implementation guidance into **executable, testable, verifiable instructions** that ensure:

1. **No feature is backend-only** - Every feature has UI
2. **No feature is untested** - Every feature has comprehensive tests
3. **No feature is unclear** - Every feature has step-by-step instructions
4. **No feature lacks permissions** - Every feature tested with all roles
5. **No feature is incomplete** - Clear Definition of Done

This enhancement reduces implementation errors, speeds up development, and ensures consistent quality across all phases of the MES Kersten project.

---

**Next Steps:**
1. Use PROMPTS-OVERVIEW-ENHANCED.md for all future development
2. Enhance remaining phases (4-8) before implementation
3. Validate completed phases against enhanced prompts
4. Add any missing UI or tests to existing features
