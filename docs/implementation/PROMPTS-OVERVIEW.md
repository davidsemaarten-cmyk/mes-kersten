# Implementation Prompts Overview
## Quick Reference for AI-Assisted Development

This document provides concise, copy-paste ready prompts for each implementation phase. Use these with Claude Code or similar AI assistants.

---

## Phase 0: Foundation & Refactoring

### Prompt 0.1: Expand Role System

```
Expand the user role system from 3 to 6 roles. Current roles: admin, werkvoorbereider, werkplaats. Add: logistiek, tekenaar, laser, buislaser, kantbank.

Tasks:
1. Create migration 004_expand_roles_system.sql:
   - Update user_roles CHECK constraint to include new roles
   - Add digital_signature_url and signature_uploaded_at to users table
   - Enhance audit_logs with entity_type and entity_id columns
   - Add appropriate indexes

2. Update backend/models/user.py to include new signature fields

3. Update backend/schemas/user.py to include signature fields in UserResponse

4. Create backend/utils/audit.py with log_action() helper function that takes entity_type and entity_id

5. Create frontend/src/types/roles.ts with:
   - UserRole type (all 6 roles)
   - RolePermissions interface
   - getRolePermissions() function

6. Create frontend/src/hooks/usePermissions.ts for permission checking

7. Update frontend/src/hooks/useAuth.tsx to handle new roles

Test by creating users for each role and verifying permissions.
```

---

## Phase 1: Core Data Model

### Prompt 1.1: Create Projects and Fases Tables

```
Create the core project hierarchy: Projects → Fases.

Tasks:
1. Create migration 005_core_hierarchy.sql with:
   - projects table (id UUID, code VARCHAR(10) UNIQUE, name, description, status, created_by, is_active)
   - fases table (id UUID, project_id FK, fase_number, description, status, is_active)
   - UNIQUE constraint on (project_id, fase_number)
   - Appropriate indexes

2. Create backend/models/project.py (SQLAlchemy model)

3. Create backend/models/fase.py (SQLAlchemy model with relationship to project)

4. Create backend/schemas/project.py with ProjectCreate, ProjectUpdate, ProjectResponse

5. Create backend/schemas/fase.py with FaseCreate, FaseUpdate, FaseResponse

6. Create backend/services/project.py with:
   - create_project() - validates unique code
   - get_project_statistics() - returns fase count, order count
   - list_user_projects() - returns projects for user (or all if admin)

7. Create backend/api/projects.py with routes:
   - GET /api/projects - list projects
   - POST /api/projects - create project (werkvoorbereider only)
   - GET /api/projects/{code} - get project detail
   - PUT /api/projects/{code} - update project
   - DELETE /api/projects/{code} - soft delete (admin only)
   - POST /api/projects/{code}/fases - create fase
   - GET /api/projects/{code}/fases - list fases

8. Register router in main.py

9. Frontend: Create src/pages/Projects.tsx with project list and search/filter
10. Frontend: Create src/pages/ProjectDetail.tsx with fases section
11. Frontend: Create src/hooks/useProjects.ts with React Query hooks
12. Add route to src/App.tsx

Test: Create project "STAGR", add fase "001 - hekken", verify in UI.
```

### Prompt 1.2: Create Orders System

```
Create the orders system: Orderreeksen → Orders → Posnummers.

Tasks:
1. Extend migration 005_core_hierarchy.sql with:
   - order_types table (name, icon, is_active, sort_order)
   - orderreeksen table (fase_id FK, title, status)
   - orders table (orderreeks_id FK, order_type_id FK, sequence_position, status, assigned_to, started_at, completed_at, completed_by, approved_at, approved_by)
   - posnummers table (fase_id FK, posnr UNIQUE within fase, materiaal, profiel, dimensions, quantity, notes)
   - order_posnummers junction table (order_id, posnummer_id, is_completed, completed_at)
   - Insert default order types (Zagen, Boren, Plaat snijden, etc.)

2. Create models: order_type.py, orderreeks.py, order.py, posnummer.py

3. Create schemas for each model with Create/Update/Response variants

4. Create backend/services/order.py with:
   - create_orderreeks() - creates orderreeks with initial orders
   - split_orderreeks() - splits into multiple parallel tracks
   - get_orders_for_user() - filtered by role/assignment

5. Create backend/api/orders.py with routes for orderreeks and order CRUD

6. Frontend: Create src/pages/FaseDetail.tsx with tabs:
   - Tab 1: Overzicht (summary statistics)
   - Tab 2: Bestanden (placeholder for Phase 2)
   - Tab 3: Posnummers (table with CRUD)
   - Tab 4: Orders (orderreeks list and creation)
   - Tab 5: Materiaal (placeholder for Phase 5)

7. Frontend: Create components for orderreeks creation and visualization

Test: Create orderreeks with 3 order types, verify orders created in sequence.
```

---

## Phase 2: File Management System

### Prompt 2.1: File Upload Infrastructure

```
Create file upload infrastructure with file storage, metadata tracking, and background processing.

Tasks:
1. Create migration 006_file_management.sql with:
   - files table (fase_id FK, posnummer_id FK nullable, file_type CHECK, original_filename, stored_filename, file_path, file_size_bytes, uploaded_by, metadata JSONB)
   - file_processing_jobs table (file_id FK, job_type CHECK, status CHECK, progress_percent, result JSONB, error_message)

2. Add to requirements.txt: pypdf, pytesseract, Pillow, openpyxl, python-magic

3. Create backend/models/file.py and file_processing_job.py

4. Create backend/services/file_service.py with:
   - upload_file() - saves file, creates record
   - get_file() - retrieves file for download
   - delete_file() - marks inactive

5. Create backend/api/files.py with:
   - POST /api/fases/{fase_id}/upload - generic upload
   - GET /api/files/{file_id} - download
   - GET /api/fases/{fase_id}/files - list files

6. Frontend: Create src/components/files/FileUploader.tsx with drag-and-drop using react-dropzone

7. Frontend: Add to FaseDetail.tsx "Bestanden" tab with FileUploader component

Test: Upload PDF, verify file saved and record created.
```

### Prompt 2.2: CSV Materiaallijst Parser

```
Implement CSV materiaallijst parser that creates posnummers with duplicate detection.

Tasks:
1. Create backend/services/csv_parser.py with MaterialListParser class:
   - parse_csv() - reads CSV, validates columns, creates posnummers
   - Expected columns: Posnr, Materiaal, Profiel, Lengte, Breedte, Hoogte, Aantal
   - Detect duplicates within fase
   - Return summary: {imported: int, errors: List[str], duplicates: List[str]}

2. Update backend/api/files.py:
   - POST /api/fases/{fase_id}/upload/materiaallijst - upload CSV, trigger parse

3. Frontend: Create src/components/files/DuplicateResolutionModal.tsx:
   - Shows duplicate posnummers
   - Options: Skip, Overwrite, Rename

4. Update FileUploader to handle materiaallijst type with duplicate resolution UI

Test cases:
- Valid CSV with 10 posnummers
- CSV with 3 duplicates
- CSV with missing columns
- CSV with invalid data (non-numeric dimensions)
```

### Prompt 2.3: PDF Split with OCR

```
Implement PDF splitting for multi-page tekensets with OCR-based posnummer detection.

Tasks:
1. Create backend/services/pdf_processor.py with PDFProcessor class:
   - split_pdf() - splits multi-page PDF into individual pages
   - detect_posnummer_with_ocr() - uses Tesseract to find posnummer on page
   - Search patterns: "Posnr: XXX", "POS XXX", standalone numbers
   - Returns: {detected_posnr: str, confidence: float}

2. Create background worker function process_pdf_split():
   - Updates file_processing_job status
   - Splits PDF
   - Runs OCR on each page
   - Links to existing posnummer if found (confidence > 0.8)
   - Otherwise creates unlinked file

3. Update backend/api/files.py:
   - POST /api/fases/{fase_id}/upload/tekenset - triggers async PDF split

4. Frontend: Create src/components/files/FileProcessingStatus.tsx:
   - Shows real-time progress bar
   - Polls /api/file-jobs/{job_id}/status every 2 seconds
   - Shows detected posnummers with confidence scores

5. Frontend: Create src/components/files/ManualLinkModal.tsx:
   - For files with low confidence or no detection
   - Dropdown to select posnummer manually

Test:
- Upload 5-page PDF with clear posnummers
- Upload scanned/rotated PDF
- Upload PDF with no posnummers
```

### Prompt 2.4: STEP File Auto-Linking

```
Implement STEP/DXF file bulk upload with filename-based auto-linking to posnummers.

Tasks:
1. Update backend/services/file_service.py:
   - extract_posnr_from_filename() - extracts posnr from patterns like "042_detail.STEP", "POS042.stp"
   - bulk_upload_step_files() - processes multiple files, attempts auto-link

2. Update backend/api/files.py:
   - POST /api/fases/{fase_id}/upload/step - accepts multiple files

3. Frontend: Enhance FileUploader to accept multiple STEP/DXF files
4. Frontend: Show linking results: X auto-linked, Y need manual linking

Test:
- Upload 10 STEP files with various naming conventions
- Upload files that don't match any posnummer
```

---

## Phase 3: Checklist System

### Prompt 3.1: Admin Checklist Templates

```
Create admin-configurable base checklist templates per order type.

Tasks:
1. Create migration 007_checklist_system.sql:
   - checklist_templates table (order_type_id FK, description, is_required, sort_order, is_active)
   - order_checklist_items table (order_id FK, description, is_required, sort_order, is_completed, completed_by FK, completed_at, comment)

2. Create models: checklist_template.py, order_checklist_item.py

3. Create backend/services/checklist_service.py:
   - copy_template_to_order() - copies template items to order when order created
   - add_custom_item() - werkvoorbereider adds extra item
   - can_complete_order() - validates all required items completed
   - complete_item() - marks item complete with optional comment

4. Update backend/services/order.py:
   - Modify create_orderreeks() to call copy_template_to_order() for each order

5. Create backend/api/checklists.py with admin routes:
   - GET /api/admin/checklist-templates/{order_type_id}
   - POST /api/admin/checklist-templates
   - PUT /api/admin/checklist-templates/{id}
   - DELETE /api/admin/checklist-templates/{id}

6. Create backend/api/orders.py additions:
   - GET /api/orders/{order_id}/checklist
   - POST /api/orders/{order_id}/checklist - add custom item
   - PUT /api/order-checklist-items/{item_id}/complete

7. Frontend: Create src/pages/admin/ChecklistManagement.tsx:
   - Select order type dropdown
   - List of template items with drag-to-reorder
   - Add/edit/delete items
   - Mark items as required

Test: Create template for "Zagen" with 3 required items, create order, verify checklist copied.
```

### Prompt 3.2: Checklist Execution Interface

```
Create werkplaats checklist execution interface with progress tracking.

Tasks:
1. Frontend: Create src/components/checklists/OrderChecklistView.tsx:
   - List all checklist items with checkboxes
   - Show completed count / total count
   - Highlight required items
   - Show completion date and user for completed items
   - Disable checkboxes if user doesn't have permission

2. Frontend: Create src/components/checklists/ChecklistItemRow.tsx:
   - Checkbox (disabled if not werkplaats/werkvoorbereider)
   - Item description
   - Required badge if is_required
   - Comment input field (appears when checking)
   - Completed by + date display

3. Frontend: Create src/components/checklists/AddCustomItemModal.tsx:
   - For werkvoorbereider to add items
   - Description field
   - Required checkbox

4. Add checklist section to order execution page (will be fully built in Phase 4)

Test:
- Werkplaats checks items, adds comments
- Try to complete order with missing required items (should fail)
- Werkvoorbereider adds custom required item
```

---

## Phase 4: Order Execution & Digital Signatures

### Prompt 4.1: Order Execution Page Layout

```
Create the order execution page with split-pane layout: parts list + file viewer.

Tasks:
1. Create migration 008_order_execution.sql:
   - order_completions table (order_id FK, completed_by FK, completed_at, comments, is_archived)
   - order_approvals table (order_id FK, approved_by FK, approved_at, signature_url, comments)
   - Add time_spent_seconds to orders table

2. Frontend: Create src/pages/OrderExecution.tsx:
   - Left sidebar (40% width): Parts list with checkboxes + checklist preview
   - Right panel (60% width): File viewer for selected part
   - Bottom action bar: "Gereedmelden" button
   - Top: Order info, progress bar, time tracking

3. Frontend: Create src/components/orders/PartsList.tsx:
   - List all posnummers for order
   - Checkbox for each part
   - Show dimensions, material
   - Highlight selected part
   - Count: X/Y completed

4. Add route to App.tsx: /orders/:orderId/execute

Test: Navigate to order execution page, verify layout renders correctly.
```

### Prompt 4.2: PDF and STEP Viewers

```
Implement PDF viewer and 3D STEP viewer in the file viewer panel.

Tasks:
1. Install dependencies: npm install react-pdf three @react-three/fiber @react-three/drei

2. Frontend: Create src/components/orders/PDFViewer.tsx:
   - Uses react-pdf to render PDF
   - Zoom controls (+/-)
   - Page navigation if multi-page
   - Full-screen toggle

3. Frontend: Create src/components/orders/StepViewer.tsx:
   - Uses Three.js + @react-three/fiber
   - Load STEP file (converted to STL on backend)
   - OrbitControls for rotation
   - Zoom controls
   - Grid and axis helper

4. Frontend: Create src/components/orders/FileViewer.tsx:
   - Switches between PDFViewer and StepViewer based on file type
   - Shows "No files" message if part has no linked files
   - File selector if multiple files for one part

5. Backend: Add STEP-to-STL conversion endpoint (optional, or use existing STEP)

Test:
- Select part with PDF, verify PDF renders
- Select part with STEP, verify 3D model loads and rotates
- Test zoom, pan, full-screen
```

### Prompt 4.3: Order Completion Workflow

```
Implement order completion (gereedmelding) and approval (goedkeuring) workflows.

Tasks:
1. Update backend/services/order.py:
   - start_order() - sets status to in_progress, assigns user
   - complete_part_in_order() - updates order_posnummers junction
   - complete_order() - creates OrderCompletion record, validates checklist, sends notification
   - approve_order() - creates OrderApproval with signature, updates status to approved
   - reopen_order() - archives previous completion, resets checklist and parts

2. Create backend/api/orders.py additions:
   - POST /api/orders/{order_id}/start
   - PUT /api/orders/{order_id}/parts/{posnummer_id}/complete
   - POST /api/orders/{order_id}/complete - gereedmelding
   - POST /api/orders/{order_id}/approve - goedkeuring (werkvoorbereider)
   - POST /api/orders/{order_id}/reopen

3. Frontend: Create src/components/orders/CompleteOrderModal.tsx:
   - Shows checklist completion status
   - Comments field
   - "Meld Gereed" button
   - Shows completed by name + date

4. Frontend: Create src/components/orders/ApproveOrderModal.tsx:
   - Shows order summary
   - Shows werkplaats who completed it
   - Comments field
   - Shows werkvoorbereider signature preview
   - "Keur Goed" button

5. Frontend: Create src/components/orders/ReopenOrderModal.tsx:
   - Reason field (required)
   - Warning: checklist will be reset
   - "Heropen Order" button

6. Frontend: Create src/components/profile/SignatureUpload.tsx:
   - Image upload for digital signature
   - Preview
   - Save to user.digital_signature_url

Test workflow:
1. Werkplaats starts order
2. Checks all parts
3. Completes all checklist items
4. Clicks "Gereedmelden"
5. Werkvoorbereider approves with signature
6. Verify order status = approved
```

---

## Phase 5: PlateStock Integration

### Prompt 5.1: Link Claims to Fases

```
Integrate PlateStock claims with project fases.

Tasks:
1. Create migration 009_platestock_integration.sql:
   - ALTER TABLE claims ADD COLUMN fase_id UUID FK fases(id)
   - CREATE TABLE plate_consumptions (plate_id FK, consumed_by FK, consumed_at, notes)
   - CREATE TABLE plate_posnummers junction (plate_id FK, posnummer_id FK)
   - ALTER TABLE files ADD COLUMN plate_id UUID FK plates(id) - for certificates

2. Update backend/services/platestock.py:
   - claim_plate_for_fase() - enhanced to link claim to fase
   - consume_plate() - marks plate consumed, links to posnummers, inherits certificate
   - get_claimed_plates_for_fase() - returns plates for specific fase

3. Update backend/api/platestock.py:
   - POST /api/platestock/claim-for-fase
   - POST /api/platestock/plates/{plate_id}/consume
   - GET /api/fases/{fase_id}/claimed-plates

4. Frontend: Create src/components/plates/ClaimForFaseModal.tsx:
   - Project dropdown
   - Fase dropdown (filtered by selected project)
   - M² claimed (optional)
   - Notes field

5. Frontend: Update src/pages/FaseDetail.tsx "Materiaal" tab:
   - Show claimed plates table
   - "Claim Plaat" button opens enhanced modal

Test: Claim plate for fase, consume plate with posnummer linking, verify certificate inherited.
```

### Prompt 5.2: Plate Consumption Workflow

```
Implement plate consumption with remnant creation and certificate inheritance.

Tasks:
1. Frontend: Create src/components/plates/ConsumePlateModal.tsx:
   - List all posnummers in fase (checkboxes to select which parts were cut)
   - "Inherit certificate" checkbox (default true if plate has certificate)
   - "Remnant exists" checkbox
   - If remnant: dimensions fields (length, width, thickness)
   - Notes field
   - "Consumeer Plaat" button

2. Enhance backend/services/platestock.py consume_plate():
   - Validate plate is claimed for fase
   - Update plate.is_consumed = True
   - Create PlateConsumption record
   - Link plate to selected posnummers via plate_posnummers junction
   - If inherit_certificate: link certificate to all selected posnummers
   - If remnant_dimensions: create new plate with those dimensions

3. Frontend: Add "Consumeer" button to claimed plates table in FaseDetail Materiaal tab

4. Frontend: Update posnummers table to show inherited certificate icon

Test:
- Consume plate with 3 posnummers selected
- Enable certificate inheritance, verify posnummers receive certificate link
- Create remnant, verify new plate appears in voorraad
```

---

## Phase 6: Notifications & Advanced Workflows

### Prompt 6.1: Notification System

```
Implement in-app notification system with polling and email delivery (optional).

Tasks:
1. Create migration 010_notifications_and_permissions.sql:
   - notifications table (user_id FK, type CHECK, title, message, link_url, link_entity_type, link_entity_id, is_read, is_emailed)
   - user_notification_preferences table (user_id PK FK, order_completed_email, order_assigned_email, claim_modified_email, digest_mode)

2. Create backend/services/notification_service.py:
   - create_notification() - creates in-app notification, optionally sends email
   - notify_order_completed() - called when order completed
   - notify_claim_modified() - called when claim changed by another user
   - notify_order_assigned() - called when order assigned

3. Create backend/api/notifications.py:
   - GET /api/notifications - list user notifications (paginated)
   - PUT /api/notifications/{id}/read - mark as read
   - PUT /api/notifications/mark-all-read
   - GET /api/users/me/notification-preferences
   - PUT /api/users/me/notification-preferences

4. Frontend: Create src/hooks/useNotifications.ts:
   - Fetches notifications with React Query
   - Polls every 30 seconds
   - Returns unreadCount

5. Frontend: Create src/components/notifications/NotificationBell.tsx:
   - Bell icon in top nav
   - Badge with unread count
   - Dropdown with notification list
   - Click notification → navigate to entity

6. Frontend: Add NotificationBell to App.tsx header

Test: Complete order, verify werkvoorbereider receives notification, click to navigate to order.
```

### Prompt 6.2: Orderreeks Split Workflow

```
Implement orderreeks splitting for parallel production tracks.

Tasks:
1. Update backend/services/order.py:
   - split_orderreeks() method:
     - Takes orderreeks_id and list of new reeks configs [{title, posnummer_ids}]
     - Creates N new orderreeksen
     - Copies orders to each new reeks
     - Links specified posnummers to each reeks
     - Soft-deletes original orderreeks (is_active = false)
     - Returns list of new orderreeksen

2. Create backend/api/orders.py addition:
   - POST /api/orderreeksen/{id}/split - accepts split configuration

3. Frontend: Create src/components/orders/SplitOrderreeksModal.tsx:
   - "Number of new reeksen" selector (2-5)
   - Title input for each new reeks
   - Drag-and-drop interface to assign posnummers to reeksen
   - Uses react-beautiful-dnd or similar
   - "Split Orderreeks" button

4. Frontend: Add "Split Orderreeks" button to FaseDetail Orders tab

Test:
- Split orderreeks into 2 tracks: "West" and "Oost"
- Assign different posnummers to each
- Verify both new orderreeksen created with correct orders and posnummers
```

### Prompt 6.3: Project Sharing Permissions

```
Implement project sharing so werkvoorbereiders can share projects with colleagues.

Tasks:
1. Add to migration 010_notifications_and_permissions.sql:
   - project_permissions table (project_id FK, user_id FK, permission_level CHECK ('view', 'edit', 'admin'), granted_by FK)

2. Update backend/services/project.py:
   - share_project() - grants permission to user
   - remove_permission() - revokes permission
   - get_user_projects() - returns owned + shared projects

3. Create backend/api/projects.py additions:
   - POST /api/projects/{code}/share - share with user
   - GET /api/projects/{code}/permissions - list permissions
   - DELETE /api/projects/{code}/permissions/{user_id} - remove sharing

4. Frontend: Create src/components/projects/ShareProjectModal.tsx:
   - User selector dropdown
   - Permission level radio: View / Edit / Admin
   - List current permissions with remove buttons

5. Frontend: Add "Share" button to ProjectDetail page (owner only)

Test: Share project with another werkvoorbereider, verify they can view/edit based on permission level.
```

---

## Phase 7: Certificate Export

### Prompt 7.1: Certificate Export System

```
Implement certificate export with cover page, TOC, and merged PDF generation.

Tasks:
1. Create migration 011_certificate_export.sql:
   - certificate_export_jobs table (created_by FK, export_scope CHECK, scope_entity_id, include_cover_page, include_toc, format CHECK, status CHECK, output_file_path, error_message, completed_at)

2. Install dependencies: reportlab, PyPDF2

3. Create backend/services/certificate_export_service.py:
   - generate_export() - creates job, queues background worker
   - process_export() - background worker function
   - _get_posnummers_for_scope() - collects posnummers based on scope
   - _get_certificates_for_posnummers() - collects unique certificates
   - _generate_merged_pdf() - creates single PDF with cover + TOC + certs
   - _generate_cover_page() - uses reportlab to create cover with project info + signature
   - _generate_toc() - generates table of contents page

4. Create backend/api/certificates.py:
   - POST /api/certificates/export - create export job
   - GET /api/certificate-export-jobs/{job_id} - get job status
   - GET /api/certificate-export-jobs/{job_id}/download - download PDF

5. Frontend: Create src/components/certificates/CertificateExportModal.tsx:
   - Export scope radio: Fase / Orderreeks / Custom
   - "Include cover page" checkbox
   - "Include table of contents" checkbox
   - Format radio: PDF / ZIP
   - Progress bar with polling
   - Download button when complete

6. Frontend: Add "Exporteer Certificaten" button to FaseDetail page

Test:
- Export all certificates for fase with 10 posnummers
- Verify cover page has project info and signature
- Verify TOC lists all parts with page numbers
- Verify each unique certificate included once
```

---

## Phase 8: UI/UX Polish & Production Readiness

### Prompt 8.1: Role-Specific Dashboards

```
Create customized dashboards for each user role.

Tasks:
1. Frontend: Refactor src/pages/Dashboard.tsx:
   - Switch based on user.role
   - Render role-specific dashboard component

2. Frontend: Create src/components/dashboards/WerkvoorbereiderDashboard.tsx:
   - Stat cards: Active Projects, Pending Approvals, Plates in Stock
   - "Mijn Projecten" card with project list
   - "Orders Wachten op Goedkeuring" table
   - "Recente Activiteit" timeline

3. Frontend: Create src/components/dashboards/WerkplaatsDashboard.tsx:
   - Stat cards: Active Orders, Today's Tasks
   - "Mijn Orders" table with progress bars
   - Quick access to frequently used parts

4. Frontend: Create src/components/dashboards/LogistiekDashboard.tsx:
   - Stat cards: Storage Overview, Recent Claims
   - "Incoming Materials" alert
   - "Plates Needing Certificates" list
   - Weight per location chart

5. Frontend: Create src/components/dashboards/AdminDashboard.tsx:
   - System health indicators
   - All projects overview
   - User activity log
   - Role switcher dropdown

6. Create similar dashboards for other roles

Test: Login as each role, verify dashboard shows relevant information.
```

### Prompt 8.2: Keyboard Shortcuts & Command Palette

```
Implement keyboard shortcuts and command palette (Ctrl+K).

Tasks:
1. Install dependency: npm install cmdk

2. Frontend: Create src/hooks/useKeyboardShortcuts.ts:
   - Listen for global shortcuts:
     - Ctrl/Cmd+K → open command palette
     - Escape → close modals
     - G then P → navigate to projects
     - G then V → navigate to voorraad
     - N (when not in input) → create new item (context-dependent)

3. Frontend: Create src/components/CommandPalette.tsx:
   - Uses cmdk library
   - Command registry with label, action, icon
   - Filter commands by query
   - Keyboard navigation (arrow keys, Enter)
   - Commands: "Nieuw Project", "Nieuwe Plaat", "Zoek Posnummers", etc.

4. Add CommandPalette to App.tsx

5. Create keyboard shortcuts help modal (Shift+?)

Test: Press Ctrl+K, type "nieuw", select "Nieuw Project", verify navigation.
```

### Prompt 8.3: Loading States & Error Handling

```
Add loading skeletons and error boundaries throughout the app.

Tasks:
1. Frontend: Create src/components/common/Skeleton.tsx:
   - ProjectListSkeleton
   - TableSkeleton
   - CardSkeleton
   - FormSkeleton

2. Update all pages to show skeleton while loading:
   - if (isLoading) return <ProjectListSkeleton />

3. Frontend: Create src/components/ErrorBoundary.tsx:
   - Catches React errors
   - Shows user-friendly error page
   - "Reload Page" button
   - Logs to error tracking service

4. Wrap App.tsx in ErrorBoundary

5. Add error states to all mutations:
   - Show toast on error
   - Reset form state
   - Log error details

6. Add global error handler in src/lib/api.ts:
   - Intercept 500 errors
   - Show generic error message
   - Log to console (or Sentry in production)

Test: Throttle network, verify skeletons. Trigger error, verify boundary catches.
```

### Prompt 8.4: Responsive Design & Mobile Support

```
Improve responsive design for tablet and mobile devices.

Tasks:
1. Audit all pages for mobile breakpoints

2. Update src/index.css with responsive utilities:
   - .hide-mobile - hide on screens < 768px
   - .table-responsive - horizontal scroll
   - .table-card-view - transform table to card layout on mobile

3. Update critical components for mobile:
   - ProjectCard: Stack elements vertically
   - PartsList: Single column layout
   - FileViewer: Collapsible panel
   - Navigation: Hamburger menu

4. Test on mobile/tablet sizes:
   - Order execution page should be usable on tablet
   - Dashboard cards should stack on mobile
   - Tables should scroll or transform to cards

5. Add touch-friendly controls:
   - Larger touch targets (min 44x44px)
   - Swipe gestures for panels

Test: Open in responsive mode, test all core workflows on mobile viewport.
```

---

## Quick Start Checklist

Before starting implementation:

- [ ] Read IMPLEMENTATION-ROADMAP.md
- [ ] Review current codebase (CLAUDE.md)
- [ ] Understand target state (PROJECT-FUNCTIONAL-OVERVIEW.md)
- [ ] Set up development environment
- [ ] Create feature branch for Phase 0
- [ ] Have test data ready (users, sample files)

For each phase:

- [ ] Read detailed phase guide
- [ ] Copy relevant prompt(s)
- [ ] Implement step-by-step
- [ ] Test thoroughly
- [ ] Update CLAUDE.md
- [ ] Commit and push
- [ ] Move to next prompt/phase

---

## Tips for Using These Prompts

1. **Copy-paste each prompt** into Claude Code or your AI assistant
2. **Review generated code** before applying - AI can make mistakes
3. **Test incrementally** - don't implement an entire phase without testing
4. **Adjust as needed** - these prompts are guides, not rigid requirements
5. **Ask follow-up questions** - if something is unclear, ask the AI to clarify
6. **Keep CLAUDE.md updated** - document changes as you go

Good luck! 🚀
