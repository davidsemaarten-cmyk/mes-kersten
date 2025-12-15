# MES Kersten - Functional Overview

**VERSION:** 2.0.0
**LAST UPDATED:** December 2024
**PURPOSE:** Complete functional description of the MES Kersten system for AI developers and human stakeholders

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [User Roles & Permissions](#2-user-roles--permissions)
3. [Pages & Features by Role](#3-pages--features-by-role)
4. [Core Workflows](#4-core-workflows)
5. [Key Concepts](#5-key-concepts)
6. [Business Rules](#6-business-rules)
7. [UI Elements & Interactions](#7-ui-elements--interactions)
8. [Appendix](#8-appendix)

---

## 1. Introduction

### 1.1 What is MES Kersten?

MES Kersten is a **Manufacturing Execution System** designed specifically for M.C. Kersten Amsterdam, a high-end metalworking company. The system digitizes and streamlines the complete production workflow from project intake to delivery.

**Core hierarchy:**
```
PROJECT (e.g., "Station Groningen" - STAGR)
  └─ FASE (e.g., STAGR-001 "hekken", STAGR-002 "poorten")
      └─ ORDERS (zagen, boren, plaat snijden, etc.)
          └─ ORDERREEKS (sequence with title like "Volledig", "West", "Oost")
              └─ POSNUMMERS (part numbers, e.g., "001", "042")
                  └─ FILES (PDF drawings, STEP models, certificates)
```

### 1.2 System Users

The system serves 6 distinct user roles:

1. **Werkvoorbereider** (Work Preparation Specialist) - Main power user
2. **Werkplaats** (Workshop Worker) - Executes orders, uses checklists
3. **Logistiek** (Logistics) - Manages material intake and storage
4. **Admin** - System administration and configuration
5. **Tekenaar** (Draftsman) - View-only access to drawings
6. **Machine Operators** (Laser, Buislaser, Kantbank) - Specialized workers

### 1.3 Key Design Principles

- **Everything belongs to a Project + Fase** (except unclaimed plates)
- **Single source of truth** - No duplicate data
- **Role-based access** - Users only see what they need
- **Automatic validation** - System prevents errors proactively
- **Notification system** - Users are informed of relevant changes
- **Digital signatures** - Werkvoorbereider approval with unique signature

---

## 2. User Roles & Permissions

### 2.1 Werkvoorbereider (Work Preparation Specialist)

**Primary role:** Plans and coordinates all production work.

**Can do:**
- ✅ Create projects and fases
- ✅ Upload files (materiaallijst, tekeningen, STEP files)
- ✅ Create and manage orders
- ✅ Create and manage orderreeksen (order sequences)
- ✅ Change order sequence/priority at any time
- ✅ Add/modify posnummers (part numbers)
- ✅ Link certificates to parts
- ✅ Extend checklists per order
- ✅ Approve completed orders with digital signature
- ✅ Reopen closed orders if needed
- ✅ Split orderreeksen during production
- ✅ Export certificates per part/fase/orderreeks
- ✅ View all workshop progress
- ✅ Manage plates (add, claim, modify)

**Cannot do:**
- ❌ Modify admin settings (order types, base checklists)
- ❌ Create/delete users
- ❌ Access other werkvoorbereiders' projects (unless granted permission)

**Receives notifications for:**
- Order completion
- Plate claim changes (when someone modifies their claim)

### 2.2 Werkplaats (Workshop Worker)

**Primary role:** Executes production orders.

**Can do:**
- ✅ View assigned orders
- ✅ Open and view drawings (PDF, STEP, DXF)
- ✅ Check off completed items per order
- ✅ Fill in checklists
- ✅ Mark order as complete (with name + date)
- ✅ Add notes to orders
- ✅ Manage plates (add, edit, delete, claim)
- ✅ Upload photos and notes for plates
- ✅ View certificates linked to parts
- ✅ Claim plates for projects
- ✅ Adjust own claims

**Cannot do:**
- ❌ Create projects or fases
- ❌ Upload files (except plate photos)
- ❌ Approve orders (only werkvoorbereider can)
- ❌ Modify order sequences
- ❌ Delete completed orders
- ❌ Time registration (not in scope)

**Receives notifications for:**
- Claim modifications by others

### 2.3 Logistiek (Logistics)

**Primary role:** Manages incoming materials and storage.

**Has all Werkplaats permissions, plus:**
- ✅ Register incoming plates
- ✅ Upload material certificates (PDF)
- ✅ Manage storage locations (lade 1-10, pallet 1-5, restopslag)
- ✅ View total weight per location
- ✅ Assign plates to storage locations

**Special responsibility:**
- Primary person for material intake
- Ensures certificates are uploaded upon delivery
- Maintains accurate location data

### 2.4 Admin

**Primary role:** System configuration and user management.

**Can do:**
- ✅ Everything all other roles can do (via role-switching view)
- ✅ Create/edit/delete users
- ✅ Assign roles to users
- ✅ Configure order types
- ✅ Create base checklists per order type
- ✅ View system-wide statistics
- ✅ Access all projects regardless of owner

**Role-switching feature:**
Admin can view the system as any role:
- Werkvoorbereider view
- Werkplaats view
- Logistiek view
- Tekenaar view
- Laser operator view
- Kantbank operator view

**Manages:**
- Order types (zagen, boren, plaat snijden, etc.)
- Base checklist templates
- User accounts and permissions
- System settings

### 2.5 Tekenaar (Draftsman)

**Primary role:** View technical drawings for reference.

**Can do:**
- ✅ View all projects and fases
- ✅ View all drawings (PDF, STEP, DXF)
- ✅ Download files
- ✅ View posnummers and specifications

**Cannot do:**
- ❌ Modify anything
- ❌ Upload files
- ❌ Create projects/orders
- ❌ Access voorraad (plate stock)

**Use case:**
Technical staff who need to reference drawings but shouldn't modify production data.

### 2.6 Machine Operators (Laser, Buislaser, Kantbank)

**Primary role:** Execute specific machine operations.

**Can do:**
- ✅ View orders assigned to their machine type
- ✅ View cutting lists
- ✅ View drawings for assigned parts
- ✅ Check off completed parts
- ✅ Fill in machine-specific checklists
- ✅ Mark orders as complete

**Specialized by machine:**
- **Laser operator:** Only sees "plaat snijden" orders
- **Buislaser operator:** Only sees "profiel snijden" orders
- **Kantbank operator:** Only sees "kanten" orders

---

## 3. Pages & Features by Role

### 3.1 Dashboard (All Roles)

**What's shown:**
- Welcome message with user name and role
- Quick statistics:
  - Active projects count
  - Pending orders count (role-specific)
  - Plates in stock (if applicable to role)
  - Recent notifications (last 10)
- Quick actions (role-specific buttons)
- Recent activity feed

**Werkvoorbereider dashboard:**
- "Nieuw Project" button
- List of own projects with status
- Orders awaiting approval
- Notifications: order completions, claim changes

**Werkplaats dashboard:**
- "Mijn Orders" quick access
- Active orders with progress bars
- Today's tasks
- Quick access to frequently used parts

**Logistiek dashboard:**
- Incoming materials alert
- Storage location overview (weight per location)
- Plates needing certificates
- Recent claims

**Admin dashboard:**
- System health indicators
- User activity log
- All projects overview
- Role switcher dropdown (top right)

### 3.2 Projects Page

**URL:** `/projecten`

**Werkvoorbereider view:**

**Top section:**
- "Nieuw Project" button (primary action)
- Search bar (filter by project code or name)
- Filter dropdown: "Alle", "Actief", "Afgerond", "Gearchiveerd"
- Sort options: "Laatste update", "Project code A-Z", "Aanmaakdatum"

**Project list (cards or table):**

Each project shows:
- Project code (e.g., "STAGR") - bold, large
- Project name (e.g., "Station Groningen")
- Number of fases: "3 fases"
- Latest fase status
- Last updated: "2 dagen geleden"
- Progress indicator: "2 van 15 orders afgerond"
- Quick actions: "Open", "Nieuwe Fase"

**Click on project → Navigate to Project Detail page**

**Admin view:**
Same as werkvoorbereider, but shows ALL projects from all users.

**Other roles:**
View-only access, no "Nieuw Project" button.

### 3.3 Project Detail Page

**URL:** `/projecten/{project_code}`

**Header section:**
- Project code + name (breadcrumb: Projecten > STAGR)
- Edit button (pencil icon) - only werkvoorbereider
- Delete button (trash icon) - only admin, with confirmation
- "Nieuwe Fase" button - primary action

**Project info section:**
- Beschrijving (description field)
- Aangemaakt door: [Gebruiker naam]
- Aangemaakt op: [Datum]
- Laatste update: [Datum]
- Status badge: Actief / Afgerond / Gearchiveerd

**Fases section:**

Shows list of fases as expandable cards:

**Fase card (collapsed):**
- Fase nummer: "001"
- Beschrijving: "hekken"
- Status badge: "In uitvoering" / "Afgerond"
- Order count: "5 orders (2 open, 3 afgerond)"
- Files count: "12 PDF, 45 STEP, 1 materiaallijst"
- Last updated: "1 dag geleden"
- Expand/collapse icon

**Fase card (expanded):**
Shows additional info:
- Quick stats: posnummers count, total orders
- Recent activity timeline
- Quick actions:
  - "Open Fase Detail" button
  - "Upload Bestanden" button
  - "Nieuwe Order" button
  - "Fase Afsluiten" button (if all orders complete)

**Werkplaats view:**
- No edit/delete buttons
- Can only view fases
- Can click through to orders assigned to them

### 3.4 Fase Detail Page

**URL:** `/projecten/{project_code}/fases/{fase_number}`

**Breadcrumb:** Projecten > STAGR > Fase 001

**Header:**
- Fase titel: "STAGR-001: hekken"
- Edit button (werkvoorbereider only)
- Status indicator
- Action buttons:
  - "Upload Bestanden" (primary)
  - "Nieuwe Order"
  - "Fase Afsluiten"

**Tab navigation:**
1. **Overzicht** (default)
2. **Bestanden**
3. **Posnummers**
4. **Orders**
5. **Materiaal** (linked plates)

#### Tab 1: Overzicht

**Statistics cards:**
- Total posnummers: 45
- Total files: 58 (12 PDF, 45 STEP, 1 CSV)
- Total orders: 5 (2 actief, 3 afgerond)
- Claimed plates: 12 platen, 4.5m²

**Recent activity:**
Timeline showing last 20 actions:
- "Materiaallijst geüpload door [user]" - 3 dagen geleden
- "Tekenset geüpload door [user]" - 3 dagen geleden
- "Order 'Zagen' gestart door [user]" - 2 dagen geleden
- "Order 'Zagen' afgerond door [user]" - 1 dag geleden
- etc.

**Warnings/alerts (if any):**
- "⚠️ 3 posnummers missen STEP files"
- "⚠️ Dubbel posnummer gedetecteerd: 042"
- "✓ Alle validaties geslaagd"

#### Tab 2: Bestanden

**File upload section (werkvoorbereider only):**

Upload interface with drag-and-drop:

**Upload types (tabs or dropdown):**
1. Materiaallijst (CSV, XSR, PDF)
2. Tekenset (PDF) - "Wordt automatisch opgesplitst per pagina"
3. STEP files (één per posnummer)
4. DXF/DWG files (optioneel)

**After upload:**
- Progress bar
- Automatic processing:
  - CSV/XSR: Parse posnummers, materials, dimensions
  - PDF tekenset: Split into pages, OCR posnummer detection
  - STEP files: Auto-link to posnummers by filename

**Duplicate detection:**
If duplicate posnummer found:
- Show modal: "Posnummer 042 bestaat al"
- Side-by-side comparison:
  - Left: Existing file (uploaded 3 dagen geleden, used in order "Zagen")
  - Right: New file (just uploaded)
- Preview thumbnails
- Radio buttons: "Behoud bestaand" / "Vervang met nieuw"
- Confirm button

**Files list:**

Table showing all files:

Columns:
- Thumbnail (preview icon)
- Bestandsnaam (original filename)
- Type (PDF, STEP, DXF, CSV)
- Posnr (linked part number, clickable)
- Geüpload door
- Geüpload op
- Acties (View, Download, Delete)

**Filters:**
- Filter by type: Alle / PDF / STEP / DXF / CSV
- Filter by status: Alle / Gekoppeld / Ongekoppeld
- Search by filename or posnr

**Bulk actions:**
- Select multiple files
- "Koppel aan posnummer" (batch link)
- "Download selectie" (ZIP)
- "Verwijder selectie"

#### Tab 3: Posnummers

**Posnummers list:**

Table view:

Columns:
- Posnr (part number) - sortable, filterable
- Materiaal (material type)
- Profiel (profile type, if applicable)
- Afmetingen (dimensions: L×W×H)
- Aantal (quantity)
- Bestanden (file count: "2 PDF, 1 STEP")
- Status (Complete ✓ / Incomplete ⚠️)
- Acties

**Status logic:**
- ✓ Complete: Has at least 1 PDF drawing and 1 STEP file
- ⚠️ Incomplete: Missing required files
- Can be customized per project

**Row actions:**
- View files (opens file viewer modal)
- Edit posnummer details
- Add files
- View in order (which order uses this posnr)

**Top actions:**
- "Nieuw Posnummer" button (manual add)
- Export to CSV
- Filter by status: Alle / Complete / Incomplete
- Search by posnummer

**Add/Edit Posnummer modal:**

Fields:
- Posnummer* (required, must be unique within fase)
- Materiaal (dropdown: S235, S355, RVS 304, RVS 316, etc.)
- Profiel type (if applicable)
- Lengte (mm)
- Breedte (mm)
- Hoogte/Dikte (mm)
- Aantal (quantity, default 1)
- Notities (optional text field)
- Upload bestanden (attach files immediately)

Save button validates uniqueness before saving.

#### Tab 4: Orders

**Orderreeksen overview:**

Shows all order sequences for this fase:

**Orderreeks card:**
- Titel: "Volledig" (editable)
- Status: "In uitvoering" / "Afgerond"
- Progress: "3 van 5 orders afgerond"
- Volgorde indicator: Shows order flow with arrows

Example:
```
1. Zagen ✓ → 2. Boren ✓ → 3. Kanten [active] → 4. Lassen → 5. Afmonteren
```

**Order flow visualization:**

Each order shows:
- Order nummer
- Order type (icon + name)
- Status icon: ✓ Afgerond / ⏳ Actief / ⭕ Open / ⚠️ Blocked
- Assigned to: [User name] or "Niet toegewezen"
- Duration: "2 dagen"
- Click to expand for details

**Order detail (expanded):**
- Posnummers: List of part numbers in this order
- Checklist preview: "5 van 8 items afgevinkt"
- Start datum, Gereed datum
- Uitvoerder: [Name]
- Actions:
  - "Open Order" (full page)
  - "Heropen" (werkvoorbereider only, if closed)
  - "Verwijder" (admin only, if not started)

**Top actions:**
- "Nieuwe Orderreeks" button
- "Splits Orderreeks" button (if in progress)
- "Wijzig Volgorde" button (drag-and-drop mode)

**Create new orderreeks:**

Modal:
1. Titel: "Volledig" (default, editable - e.g., "West", "Oost", "Prio")
2. Selecteer orders: Checkboxes for order types
   - ☐ Zagen
   - ☐ Boren
   - ☐ Plaat snijden
   - ☐ Profiel snijden
   - ☐ Kanten
   - ☐ Samenstellen
   - ☐ Lassen
   - ☐ Afmonteren
   - ☐ Overig
3. Volgorde instellen: Drag-and-drop to reorder
4. Posnummers toewijzen: Select which parts go in this sequence
5. "Aanmaken" button

**After creating first order:**
- System automatically creates orderreeks with that single order
- User can add more orders with ➕ button → then it becomes a sequence

**Split orderreeks:**

Used when you want to create parallel tracks (e.g., "West" and "Oost").

Modal:
1. Current orderreeks: "Volledig"
2. Split into: "2 nieuwe reeksen" (can select 2, 3, or more)
3. For each new reeks:
   - New titel: "West", "Oost"
   - Select posnummers to move
   - Select which orders apply
4. "Splits Orderreeks" button

Result: Original reeks is closed, new reeksen are created with selected parts.

**Change order sequence:**

Drag-and-drop interface:
- Shows current order: 1 → 2 → 3 → 4 → 5
- User drags to reorder
- Warning if order X is started while order X-1 isn't complete:
  - "⚠️ Let op: Order 2 (Boren) is nog niet afgerond. Weet je zeker dat je Order 3 (Kanten) wilt starten?"
  - Buttons: "Annuleer" / "Start Toch"

#### Tab 5: Materiaal

**Claimed plates for this fase:**

Shows all plates that are claimed for this fase/project.

Table:
- Plaatcode (e.g., "S235GE-042")
- Materiaal (full description)
- Afmetingen (L×W×H mm)
- Gewicht (kg)
- Locatie (lade/pallet number)
- Geclaimd door (user name)
- Geclaimd op (date)
- Posnummers (which parts use this plate)
- Certificaat (✓ / ✗)
- Acties: View, Unclaim

**Actions:**
- "Claim Plaat" button → opens PlateStock modal
- "Bekijk Alle Voorraad" button → navigates to PlateStock module

### 3.5 Order Execution Page

**URL:** `/orders/{order_id}`

**Used by:** Werkplaats, Machine Operators

**Header:**
- Order titel: "STAGR-001: Zagen" (project-fase: order type)
- Status badge
- Assigned to: [Current user]
- Timer: "Gestart 2 uur geleden"

**Left sidebar (40% width):**

**Posnummers list:**

Shows all parts in this order:

Each part shows:
- Checkbox (for completion tracking)
- Posnummer: "042"
- Thumbnail: Small preview of drawing
- Materiaal: "S235 verzinkt"
- Afmetingen: "3000×150×10 mm"
- Aantal: "2 stuks"
- Bestanden: Icons for PDF (3), STEP (1)
- Notities icon (if notes exist)
- Status: ✓ Klaar / ⏳ Bezig / ⭕ Nog te doen

**Filters:**
- Filter by status: Alle / Nog te doen / Bezig / Klaar
- Sort: By posnummer / By material / By size

**Bottom of sidebar:**
- Progress: "12 van 45 onderdelen afgevinkt"
- "Alles Afvinken" button (bulk complete)

**Right panel (60% width):**

**Selected part viewer:**

When a part is selected from the list:

**File tabs:**
- PDF Tekening (default)
- STEP 3D Model
- DXF (if available)
- Notities

**PDF viewer:**
- Full-screen PDF renderer
- Zoom controls
- Page navigation (if multi-page)
- Download button
- Print button
- Rotate button
- Measurement tools (if advanced viewer implemented)

**STEP viewer:**
- 3D model renderer (Three.js or Babylon.js)
- Rotate, zoom, pan controls
- Wireframe/solid toggle
- View presets: Top, Front, Side, Isometric

**DXF viewer:**
- 2D drawing renderer
- Layers panel
- Measurement tools
- Zoom to extents

**Notities tab:**
- Read-only notes field
- Show creator and date
- "Toevoegen Notitie" button (adds new note)

**Bottom panel:**

**Checklist section:**

Shows checklist for this order (not per part, but per order):

Example checklist items:
- ☐ Materiaal gecontroleerd
- ☐ Zaagblad schoon
- ☐ Lengtes gemeten
- ☐ Schoonzagen uitgevoerd
- ☐ Onderdelen gelabeld
- ☐ Werkplek opgeruimd

Each item:
- Checkbox
- Description
- "Verplicht" badge (if required by admin or werkvoorbereider)
- Comment field (optional, shown on click)

**Completion flow:**

1. Worker checks off parts as they complete them
2. When all parts done, "Gereedmelden" button appears (disabled until all required checklist items are checked)
3. Click "Gereedmelden" → modal appears:

**Gereedmelding modal:**

Fields:
- Naam: [Auto-filled with current user, read-only]
- Datum gereed: [Today's date, adjustable with date picker]
- Opmerkingen: [Optional text field]
- Checklist status: Shows summary "8 van 8 items afgevinkt ✓"
- Warning if not complete: "⚠️ 2 verplichte items nog niet afgevinkt"

Buttons:
- "Annuleer"
- "Meld Gereed" (disabled if required checklist items incomplete)

**After gereedmelding:**
- Order status changes to "Afgerond"
- Notification sent to werkvoorbereider
- User redirected to Dashboard
- Next order in sequence becomes available

**Special case: Reopen order**

Only werkvoorbereider can reopen:
- Navigate to order detail
- Click "Heropen" button
- Confirmation modal: "Weet je zeker dat je deze order wil heropenen?"
- If confirmed:
  - Status changes back to "In uitvoering"
  - Checklist reset (all items unchecked)
  - Previous completion data archived (visible in history)

### 3.6 PlateStock Module

**URL:** `/voorraad`

**Used by:** Werkplaats, Logistiek, Werkvoorbereider, Admin

**Tab navigation:**
1. **Materialen** (material types)
2. **Platen** (plates in stock)
3. **Claims** (claimed plates overview)
4. **Locaties** (storage locations)

#### Tab 1: Materialen

**Purpose:** Manage material types (not individual plates).

**Material list (table or cards):**

Each material shows:
- Prefix: "S235GE" (unique identifier)
- Materiaalgroep: "S235"
- Specificatie: "-" (NULL for S235)
- Oppervlaktebewerking: "gestraald"
- Kleur: Color swatch + hex code
- Dichtheid: "7850 kg/m³"
- Aantal platen: "12 platen in voorraad"

**Actions (werkvoorbereider/logistiek/admin only):**
- "Nieuw Materiaal" button
- Edit material (pencil icon)
- Delete material (only if no plates use it)

**Add Material modal:**

Fields:
1. Materiaalgroep* (dropdown)
   - S235
   - S355
   - RVS (enables Specificatie field)
   - Aluminium (enables Specificatie field)

2. Specificatie (conditional)
   - For RVS: 304, 316
   - For Aluminium: 5083, 6061
   - For S235/S355: Hidden (NULL)

3. Oppervlaktebewerking* (dropdown, context-aware)
   - For S235/S355: zwart, gestraald, verzinkt, gebeitst+geolied
   - For RVS: geslepen, geborsteld, onbewerkt
   - For Aluminium: naturel, geanodiseerd

4. Plaatcode Prefix* (auto-suggested)
   - Example: "S235GE" for S235 gestraald
   - User can edit before saving
   - Validation: Must be unique, max 10 chars, A-Z0-9 only
   - Preview: "Eerste plaat krijgt: S235GE-001"

5. Kleur* (color picker + hex input)
   - Default colors suggested
   - User can customize

6. Dichtheid (kg/m³)* (number input)
   - Default values suggested per material type
   - Used for automatic weight calculation

Save button disabled until all required fields valid and prefix unique.

#### Tab 2: Platen

**Purpose:** View and manage individual plates in stock.

**Filter bar:**
- Materiaal filter: Dropdown with all prefixes (S235GE, RVS316GL, etc.)
- Locatie filter: Dropdown (Alle, Lade 1-10, Pallet 1-5, Restopslag)
- Status filter: Alle / Beschikbaar / Geclaimd / Bij Laser
- Zoeken: Text search by plate number

**Sort options:**
- Plaatcode (ascending/descending)
- Gewicht (heaviest/lightest)
- Datum toegevoegd (newest/oldest)
- Locatie

**Plate display (grid view):**

Each plate card shows:
- Plaatcode: "S235GE-042" (large, bold)
- Materiaal: "S235 gestraald" (color-coded border)
- Afmetingen: "3000×1500×10 mm"
- Gewicht: "353 kg" (auto-calculated)
- Locatie: "Lade 3"
- Status badge: "Beschikbaar" / "Geclaimd" / "Bij Laser"
- Thumbnail: Photo if uploaded
- Actions: View Details, Claim, Edit, Delete

**Status color coding:**
- Green: Beschikbaar
- Yellow: Geclaimd
- Blue: Bij Laser
- Gray: Consumed (hidden by default, show with filter)

**Actions (top right):**
- "Nieuwe Plaat" button (werkplaats/logistiek)
- "Bulk Import" button (CSV upload)
- View toggle: Grid / List

**Add Plate modal:**

Fields:
1. Materiaal* (dropdown: all material prefixes)
   - Selecting material auto-fills density for weight calculation

2. Afmetingen*
   - Lengte (mm): Number input
   - Breedte (mm): Number input
   - Dikte (mm): Number input
   - Gewicht (kg): **Auto-calculated and read-only**
     - Formula: (L × W × H × Density) / 1,000,000
     - Live update as dimensions change

3. Locatie* (dropdown)
   - Lade 1, Lade 2, ..., Lade 10
   - Pallet 1, Pallet 2, ..., Pallet 5
   - Restopslag
   - Shows current weight of each location: "Lade 3 (2,450 kg)"

4. Kwaliteit (text input)
   - Free text for material grade/batch number
   - Example: "EN 10025-2"

5. Barcode (optional text input)
   - If scanned or printed barcode exists

6. Notities (optional textarea)
   - Free-form notes

7. Foto's (optional file upload)
   - Multiple images supported
   - Drag-and-drop or click to browse
   - Preview thumbnails

8. Certificaat (optional PDF upload)
   - Material certificate
   - Can be added later

**Plaatcode generation:**
- System automatically generates next sequential number
- Example: If S235GE-041 exists, new plate becomes S235GE-042
- User cannot manually set plate number (prevents duplicates)

**Bulk actions:**
Multiple plates selected → action bar appears:
- "Claim Geselecteerde" (claim multiple)
- "Verplaats naar Locatie" (move to different location)
- "Export Selectie" (CSV download)

**Plate Detail modal:**

Opens when clicking "View Details" on a plate.

**Tabs:**
1. Overzicht
2. Foto's
3. Notities
4. Certificaat
5. Geschiedenis

**Tab 1: Overzicht**
- All plate properties (read-only display)
- Status timeline
- Current claims (if any)
- Parts cut from this plate (if any)
- QR code for plate (for scanning in workshop)

**Tab 2: Foto's**
- Gallery of uploaded photos
- Add more photos button
- Delete photo button
- Full-screen view

**Tab 3: Notities**
- Timeline of notes
- Add new note button
- Each note shows: Date, User, Text

**Tab 4: Certificaat**
- PDF viewer if certificate uploaded
- "Upload Certificaat" button
- "Download Certificaat" button
- "Koppel aan Onderdelen" button (links certificate to parts)

**Tab 5: Geschiedenis**
- Full audit log:
  - Created by [user] on [date]
  - Moved to Lade 3 by [user] on [date]
  - Claimed by [user] for STAGR-001 on [date]
  - Certificate uploaded by [user] on [date]
  - Consumed on [date] for order [order]

**Edit Plate:**
- Same fields as Add Plate
- Cannot change material prefix (would break plate numbering)
- Can modify all other fields

**Delete Plate:**
- Confirmation modal: "Weet je zeker dat je plaat S235GE-042 wil verwijderen?"
- Blocked if plate has active claims: "Kan plaat niet verwijderen: plaat is geclaimd voor project STAGR-001"
- Blocked if plate is consumed: Plate not shown in main list (only in archive view)

#### Tab 3: Claims

**Purpose:** Overview of all claimed plates across all projects.

**Claim list (table):**

Columns:
- Plaatcode (clickable, opens plate detail)
- Materiaal
- Afmetingen
- Gewicht
- Project (clickable, opens project)
- Fase (clickable, opens fase)
- Geclaimd door (user name)
- Geclaimd op (date)
- M² geclaimd (if partial usage)
- Acties (Edit Claim, Release Claim)

**Filter options:**
- Filter by project: Dropdown
- Filter by fase: Dropdown
- Filter by user: Dropdown (who claimed it)
- Filter by material: Dropdown

**Claim status:**
- Actief (green badge)
- Released (hidden by default, show with "Toon Alle" checkbox)

**Actions:**
- "Bulk Release" (select multiple, release all at once)
- Export to Excel

**Edit Claim modal:**

Used when claim needs adjustment (e.g., less material needed than initially claimed).

Fields:
- Plaatcode: [Read-only]
- Project/Fase: [Read-only]
- M² geclaimd: [Number input, optional]
  - If filled, tracks partial usage
  - If empty, entire plate is claimed
- Notitie: [Text area]
  - Why claim is being modified

Save button.

**Important rule:**
If user A claims a plate, and user B modifies the claim:
- User A receives notification: "Je claim op plaat S235GE-042 is aangepast door [User B]"
- Notification includes link to plate and modification details

**Release Claim:**
- Confirmation modal: "Weet je zeker dat je de claim op plaat S235GE-042 wil vrijgeven?"
- If confirmed:
  - Claim marked as released (actief = false)
  - Plate status changes back to "Beschikbaar" (if no other active claims)
  - No notification sent (releasing your own claim is normal)

#### Tab 4: Locaties

**Purpose:** Overview of storage locations with weight tracking.

**Locations grid:**

Shows cards for each location:

**Lade cards (1-10):**
- Lade nummer: "Lade 3"
- Totaal gewicht: "2,450 kg" (sum of all plates at this location)
- Aantal platen: "12 platen"
- Visuele indicator: Bar chart showing capacity
  - Green: < 2000 kg
  - Yellow: 2000-3000 kg
  - Red: > 3000 kg (overloaded warning)
- "Bekijk Platen" button → filtered plate list

**Pallet cards (1-5):**
- Similar to lade cards
- Higher capacity threshold (5000 kg)

**Restopslag card:**
- Catch-all location
- No capacity limit
- Shows count only

**Actions (logistiek only):**
- "Herindelen" button (bulk move plates between locations)
- "Capaciteit Instellen" (configure weight limits per location)

**Herindelen modal:**

Drag-and-drop interface:
- Left panel: List of all plates with their current location
- Right panel: Grid of locations (drag targets)
- Drag plates from list to locations
- Real-time weight updates
- Warning if location exceeds capacity
- "Opslaan" saves all changes at once

### 3.7 Checklist Management (Admin)

**URL:** `/admin/checklists`

**Purpose:** Configure base checklist templates per order type.

**Order type tabs:**
- Zagen
- Boren
- Plaat snijden
- Profiel snijden
- Kanten
- Samenstellen
- Lassen
- Afmonteren
- Overig

Each tab shows checklist template for that order type.

**Checklist items list:**

Each item shows:
- Drag handle (for reordering)
- Checkbox (disabled, for display only)
- Description (editable inline)
- "Verplicht" toggle switch
- Delete button (trash icon)

**Actions:**
- "Nieuw Item" button (adds blank row)
- "Opslaan" button (saves all changes)
- "Standaard Herstellen" button (resets to default template)

**Add Item:**
- Click "Nieuw Item"
- New row appears at bottom
- User types description
- Toggle "Verplicht" if needed
- Reorder with drag handle if needed

**Reorder:**
- Drag items up/down to change order
- Order is preserved when creating new orders

**Verplicht (Required) logic:**
- If item is marked "Verplicht":
  - Werkvoorbereider cannot override (cannot uncheck it in order-specific checklist)
  - Werkplaats MUST check it before completing order
- If item is NOT marked "Verplicht":
  - Werkvoorbereider can add/remove it per order
  - Werkplaats can skip it

**Werkvoorbereider override:**

When creating an order, werkvoorbereider sees the base checklist and can:
- Add extra items specific to this order
- Remove non-required items
- Cannot remove required items (grayed out with lock icon)

### 3.8 Certificate Management

**URL:** `/certificaten`

**Purpose:** Manage material certificates and link them to parts.

**Certificate list (table):**

Columns:
- Certificaat nummer (if available on PDF)
- Bestandsnaam
- Gekoppeld aan plaat (clickable plaatcode)
- Aantal onderdelen (parts using this certificate)
- Geüpload door
- Geüpload op
- Acties (View, Download, Link to Parts, Delete)

**Filters:**
- Filter by project: Shows certificates used in this project
- Filter by material: Shows certificates for specific material type
- Filter by status: Gekoppeld / Ongekoppeld

**Actions:**
- "Nieuw Certificaat" button (upload PDF)
- "Bulk Export" button (creates ZIP with certificates + metadata)

**Upload Certificate:**

Modal:
1. Plaat selecteren (dropdown: shows all plates)
   - Search by plaatcode
   - Filtered by material type for convenience
2. Certificaat uploaden (PDF file picker)
   - Drag-and-drop supported
   - File size limit: 10 MB
3. Notities (optional text area)

After upload:
- Certificate is linked to the selected plate
- All parts cut from that plate automatically inherit the certificate
- Notification NOT sent (certificates are added by logistiek proactively)

**Link Certificate to Parts:**

Used when certificate applies to specific parts, not entire plate.

Modal:
1. Select project/fase (dropdowns)
2. Select parts (multi-select checkboxes)
   - Shows posnummers with material info
   - Filter by material (only relevant parts shown)
3. Confirm linking

Result:
- Selected parts now show certificate icon
- Certificate appears in part detail view

**Export Certificates:**

Modal:
1. Export scope (radio buttons):
   - Per onderdeel (select specific posnummers)
   - Per fase (all parts in a fase)
   - Per orderreeks (all parts in an order sequence)
   - Custom selectie (multi-select)

2. Voorblad opnemen? (checkbox)
   - If checked, generates cover page with:
     - Project/fase information
     - List of posnummers
     - Export date
     - Werkvoorbereider signature

3. Format (radio buttons):
   - PDF (merged into single PDF)
   - ZIP (separate PDFs)

4. "Exporteer" button

Result:
- Downloads ZIP or PDF
- Filename: `Certificaten_STAGR-001_2024-12-10.pdf` or `.zip`

**Certificate inheritance logic:**

When a plate is consumed (cut into parts):
1. System asks which parts were cut from this plate
2. Certificate is automatically linked to those parts
3. Parts inherit certificate in their metadata
4. Certificate remains viewable from part detail view

### 3.9 Admin User Management

**URL:** `/admin/gebruikers`

**User list (table):**

Columns:
- Naam (full name)
- Email
- Rol (role badge: Admin, Werkvoorbereider, Werkplaats, etc.)
- Actief (toggle switch: green = active, gray = inactive)
- Laatste login
- Acties (Edit, Delete)

**Filters:**
- Filter by role: Alle, Admin, Werkvoorbereider, Werkplaats, Logistiek, etc.
- Filter by status: Actief / Inactief
- Search by name or email

**Actions:**
- "Nieuwe Gebruiker" button
- Export user list

**Add User modal:**

Fields:
1. Naam* (text input)
2. Email* (email input, validated)
3. Rol* (dropdown with role descriptions)
   - Admin: Volledige toegang tot systeem
   - Werkvoorbereider: Projecten aanmaken en beheren
   - Werkplaats: Orders uitvoeren
   - Logistiek: Voorraad beheren
   - Tekenaar: Alleen tekeningen bekijken
   - Laser operator: Alleen laser orders
   - Buislaser operator: Alleen buislaser orders
   - Kantbank operator: Alleen kantbank orders
4. Wachtwoord* (password input with generator button)
   - "Genereer veilig wachtwoord" button
   - Password strength indicator
5. Digitale handtekening (image upload, for werkvoorbereiders only)
   - PNG/JPG, max 1 MB
   - Preview shown
   - Used for order approvals

Save creates user and sends welcome email (if email configured).

**Edit User:**
- Same fields as Add User
- Cannot change email (unique identifier)
- Can reset password

**Delete User:**
- Confirmation modal with warning
- If user has created projects/orders: Show warning
  - "Deze gebruiker heeft 5 projecten aangemaakt. Weet je zeker dat je wilt verwijderen?"
  - Radio buttons:
    - Verwijder gebruiker en behoud projecten (projects remain, created_by becomes NULL)
    - Verwijder gebruiker en reassign projecten (select another user to take ownership)
- Cannot delete last admin user (system blocks this)

**Deactivate User (instead of delete):**
- Toggle "Actief" switch to OFF
- User cannot log in anymore
- All data remains
- Can be reactivated later
- Preferred over deleting

### 3.10 Admin Order Types Management

**URL:** `/admin/ordertypes`

**Order types list:**

Shows all order types with:
- Naam (e.g., "Zagen", "Boren")
- Icoon (display icon, e.g., saw icon for zagen)
- Actief (toggle switch)
- Volgorde (drag handle for reordering)
- Checklist items (count, e.g., "5 items")
- Acties (Edit, Checklist, Delete)

**Default order types:**
1. Zagen (saw icon)
2. Boren (drill icon)
3. Plaat snijden (laser icon)
4. Profiel snijden (pipe laser icon)
5. Kanten (bend icon)
6. Samenstellen (assembly icon)
7. Lassen (welding icon)
8. Afmonteren (finish icon)
9. Overig (generic icon)

**Actions:**
- "Nieuw Ordertype" button
- Drag to reorder (changes default sequence in order creation)

**Add Order Type modal:**

Fields:
1. Naam* (text input, e.g., "Poedercoaten")
2. Icoon (icon picker from Lucide React library)
3. Standaard checklist kopiëren van (dropdown, optional)
   - Allows copying checklist from existing order type
   - Saves time when creating similar order type

Save button.

**Edit Order Type:**
- Same fields
- Cannot edit if orders of this type exist (would break existing orders)

**Delete Order Type:**
- Blocked if any orders of this type exist
- Confirmation modal: "Weet je zeker dat je ordertype 'Zagen' wil verwijderen?"

---

## 4. Core Workflows

This section describes complete end-to-end workflows for key processes.

### 4.1 New Project Workflow

**Actors:** Werkvoorbereider

**Steps:**

1. **Navigate to Projects page** (`/projecten`)

2. **Click "Nieuw Project" button**

3. **Fill in Project form (modal):**
   - Project code*: "STAGR" (uppercase, max 10 chars)
   - Project naam: "Station Groningen" (optional long name)
   - Beschrijving: "Hekken en poorten voor station" (textarea)
   - Click "Aanmaken"

4. **System creates project**
   - Generates unique ID
   - Sets created_by to current user
   - Redirects to Project Detail page

5. **Add first fase**
   - User clicks "Nieuwe Fase" button
   - Fill in Fase form:
     - Fase nummer*: "001" (3 digits)
     - Beschrijving*: "hekken"
   - Click "Aanmaken"

6. **System creates fase**
   - Creates fase linked to project
   - Creates file storage directory: `/files/projects/STAGR/phases/001/`
   - Redirects to Fase Detail page

7. **Upload materiaallijst**
   - Navigate to "Bestanden" tab
   - Select "Materiaallijst" upload type
   - Drag-and-drop CSV or XSR file
   - System processes file:
     - Parses posnummers
     - Extracts materials, dimensions, quantities
     - Creates Part records in database
     - Shows success message: "45 posnummers geïmporteerd"

8. **Upload tekenset (PDF with all drawings)**
   - Select "Tekenset" upload type
   - Upload multi-page PDF
   - System processes PDF:
     - Splits into individual pages
     - OCR to detect posnummer on each page
     - Auto-links page to corresponding Part record
     - Shows results: "12 pagina's verwerkt, 10 posnummers automatisch gekoppeld"

9. **Review automatic linking**
   - Navigate to "Posnummers" tab
   - Check Status column:
     - ✓ Green: Has PDF and STEP
     - ⚠️ Yellow: Missing files
   - Manually link unrecognized drawings:
     - Click on part row
     - Click "Bestanden Toevoegen"
     - Select PDF page from dropdown
     - Save

10. **Upload STEP files**
    - Navigate to "Bestanden" tab
    - Select "STEP files" upload type
    - Drag-and-drop multiple .STEP files
    - Naming convention: Filename should contain posnummer (e.g., "042_bracket.STEP")
    - System auto-links based on filename
    - Show results: "32 STEP files geüpload, 30 automatisch gekoppeld"

11. **Handle duplicates (if any detected)**
    - System shows modal: "Posnummer 042 bestaat al"
    - Side-by-side comparison:
      - Left: Existing file (date, used in order X)
      - Right: New file (just uploaded)
    - Radio buttons: "Behoud bestaand" / "Vervang met nieuw"
    - Select option and confirm
    - System keeps selected file, archives other

12. **Validate completeness**
    - Navigate to "Overzicht" tab
    - Check warnings section:
      - "✓ Alle validaties geslaagd" (green)
      - OR "⚠️ 5 posnummers missen STEP files" (yellow)
    - Fix any issues before creating orders

13. **Create first order sequence**
    - Navigate to "Orders" tab
    - Click "Nieuwe Orderreeks"
    - Fill in form:
      - Titel: "Volledig" (default, or custom like "West")
      - Select order types: Check "Zagen", "Boren", "Kanten", "Lassen"
      - Order: Drag to reorder (Zagen → Boren → Kanten → Lassen)
      - Posnummers: Select all (or specific range)
    - Click "Aanmaken"

14. **System creates orderreeks**
    - Creates OrderSequence record
    - Creates 4 Order records (one per selected type)
    - Links posnummers to orders
    - Copies base checklist from admin templates
    - Shows success: "Orderreeks 'Volledig' aangemaakt met 4 orders"

15. **Review and customize checklist (optional)**
    - Expand first order (Zagen)
    - Click "Checklist Bewerken"
    - Add extra items:
      - "Let op: materiaaldikte varieert" (not required)
      - "Schoonzagen extra zorgvuldig" (required)
    - Save checklist

16. **Assign first order to werkplaats**
    - Click "Toewijzen" on first order
    - Select user from dropdown
    - Confirm
    - User receives notification

**Result:**
- Project created with 1 fase
- 45 posnummers imported with linked files
- 4 orders created in sequence
- First order assigned and ready for execution

**Duration:** ~30-45 minutes for werkvoorbereider

---

### 4.2 File Upload Workflow (Detailed)

**Actors:** Werkvoorbereider

**Steps:**

1. **Navigate to fase**
   - Go to Project → Fase → "Bestanden" tab

2. **Select upload type**
   - Materiaallijst (CSV/XSR/PDF)
   - Tekenset (PDF)
   - STEP files
   - DXF files

#### Scenario A: Upload Materiaallijst (CSV)

3. **Upload CSV**
   - Drag-and-drop CSV file
   - System validates format:
     - Required columns: Posnr, Materiaal, Lengte, Breedte, Hoogte, Aantal
     - Optional columns: Profiel, Notities

4. **System parses CSV**
   - Row-by-row parsing
   - Validation per row:
     - Posnr must be unique within fase
     - Dimensions must be numeric and > 0
     - Materiaal must exist in database (or creates warning)
   - Shows progress bar: "Verwerken... 35/45 regels"

5. **Handle errors (if any)**
   - System shows error modal:
     - "3 fouten gevonden in CSV"
     - List of errors:
       - "Regel 12: Posnr '042' bestaat al"
       - "Regel 23: Ongeldig materiaal 'XX42XX'"
       - "Regel 31: Lengte moet numeriek zijn, '3000mm' is ongeldig"
   - Options:
     - "Corrigeer en upload opnieuw" (cancel and fix CSV)
     - "Importeer valide regels" (skip error rows, import rest)

6. **Review duplicates**
   - If duplicate posnummer detected:
     - Modal: "Posnummer 042 bestaat al in deze fase"
     - Show existing: "Materiaal: S235, Lengte: 3000mm"
     - Show new: "Materiaal: S355, Lengte: 2500mm"
     - Radio buttons:
       - "Behoud bestaand en sla nieuwe over"
       - "Vervang bestaand met nieuwe"
       - "Hernoem nieuwe" (prompts for new posnr)
     - Confirm choice

7. **Confirm import**
   - Summary modal:
     - "42 posnummers succesvol geïmporteerd"
     - "3 fouten overgeslagen"
     - "1 duplicaat vervangen"
   - Click "Sluiten"

8. **Navigate to Posnummers tab**
   - See all imported parts
   - Status column shows: ⚠️ Incomplete (missing files)

#### Scenario B: Upload Tekenset (Multi-page PDF)

9. **Upload PDF**
   - Drag-and-drop PDF with 50+ pages
   - System validates:
     - File size < 100 MB
     - File type is PDF
   - Shows upload progress

10. **System processes PDF**
    - Backend worker task starts:
      - Step 1: Split PDF into individual pages (50 pages)
      - Step 2: OCR each page to detect posnummer
      - Step 3: Match detected posnummer with existing Parts
      - Step 4: Create File records and link to Parts
    - Frontend shows progress: "Verwerken pagina 23/50..."

11. **OCR detection**
    - System searches for posnummer patterns:
      - "Posnr: 042"
      - "POS 042"
      - "042" (in specific location on drawing)
    - Confidence level: High (90%+), Medium (60-90%), Low (<60%)

12. **Review automatic linking**
    - System shows results modal:
      - "50 pagina's verwerkt"
      - "42 posnummers automatisch gekoppeld (high confidence)"
      - "5 posnummers gedetecteerd met lage confidence"
      - "3 pagina's zonder posnummer gedetecteerd"
    - List of low-confidence matches:
      - Page 12: Detected "0042" → Matched to Part "042" (90% confidence) [Approve/Reject]
      - Page 23: Detected "042A" → Matched to Part "042" (65% confidence) [Approve/Reject]
    - List of unmatched pages:
      - Page 7: No posnummer detected [Manually link]
      - Page 31: Detected "XXX" (invalid) [Manually link]

13. **Manually link unmatched pages**
    - Click "Manually link" next to Page 7
    - Modal appears:
      - PDF preview (left): Shows Page 7
      - Posnummers dropdown (right): Select from list
      - Search bar to filter posnummers
    - Select correct posnummer: "015"
    - Click "Koppel"
    - Repeat for other unmatched pages

14. **Confirm all links**
    - Click "Bevestig Alle Koppelingen"
    - System saves all file-to-part links
    - Success message: "48 tekeningen gekoppeld aan posnummers"

#### Scenario C: Upload STEP files (Bulk)

15. **Upload STEP files**
    - Drag-and-drop 30 .STEP files at once
    - System validates each file:
      - File type: .STEP or .STP
      - File size < 50 MB per file
    - Shows upload progress: "Uploading 23/30 files..."

16. **Auto-linking by filename**
    - System parses filenames to extract posnummer:
      - "042_bracket.STEP" → Posnr: 042
      - "STAGR-001_015.STEP" → Posnr: 015
      - "part_023_rev3.STEP" → Posnr: 023
    - Matches with existing Part records
    - Shows results:
      - "28 STEP files automatisch gekoppeld"
      - "2 bestanden niet gekoppeld (posnr niet herkend)"

17. **Manually link unmatched STEP files**
    - List of unmatched files:
      - "assembly_main.STEP" [Manually link]
      - "test_file.STEP" [Manually link]
    - Click "Manually link"
    - Same modal as before: File preview + Posnummers dropdown
    - Link and save

18. **Handle filename conflicts**
    - If multiple STEP files match same posnummer:
      - Modal: "Posnummer 042 heeft al een STEP file"
      - Show existing: "042_bracket.STEP (uploaded 3 days ago)"
      - Show new: "042_bracket_v2.STEP (just uploaded)"
      - Radio buttons:
        - "Behoud bestaand"
        - "Vervang met nieuw"
        - "Behoud beide" (rename new file to "042_STEP_002")
    - Confirm choice

19. **Final validation**
    - Navigate to "Posnummers" tab
    - Filter: Status = "Complete"
    - Verify all parts have both PDF and STEP
    - Status indicators update:
      - ✓ Green: Complete (has PDF + STEP)
      - ⚠️ Yellow: Incomplete (missing either PDF or STEP)

**Result:**
- All files uploaded and organized
- Automatic linking reduces manual work by 80-90%
- Posnummers ready for order creation

---

### 4.3 Order Execution Workflow (Werkplaats)

**Actors:** Werkplaats medewerker

**Steps:**

1. **Receive order notification**
   - Email or in-app notification: "Order 'Zagen' is aan jou toegewezen voor STAGR-001"
   - Click notification → Navigates to Order page

2. **Open order page** (`/orders/{order_id}`)
   - See order header: "STAGR-001: Zagen"
   - See assigned user: "Toegewezen aan: Jij"
   - See posnummers count: "45 onderdelen"
   - See checklist status: "0 van 8 items afgevinkt"

3. **Start working**
   - Click "Start Order" button (changes status from "Open" to "In uitvoering")
   - Timer starts (for internal tracking, not for billing)

4. **Select first part**
   - Click on first posnummer in left sidebar: "001"
   - Right panel loads:
     - PDF drawing (Tab 1, active by default)
     - STEP 3D model (Tab 2)
     - Notities (Tab 3)

5. **View drawing**
   - PDF viewer shows full drawing
   - Zoom in/out as needed
   - Read specifications: Material S235, Length 3000mm, Quantity 2

6. **Check 3D model (optional)**
   - Click "STEP 3D Model" tab
   - 3D viewer loads model
   - Rotate, zoom, pan to understand geometry
   - Use view presets: Top, Front, Side, Isometric

7. **Perform work**
   - Go to workshop machine (saw)
   - Cut material according to specifications
   - Return to computer

8. **Mark part as complete**
   - Check checkbox next to posnummer "001"
   - Status changes: ⭕ Nog te doen → ✓ Klaar
   - Posnummer grays out in list
   - Progress updates: "1 van 45 onderdelen afgevinkt"

9. **Continue with remaining parts**
   - Repeat steps 4-8 for all 45 parts
   - Can work in any order (not sequential)
   - Can mark multiple parts at once:
     - Select checkboxes for parts 010-020
     - Bulk action: "Markeer als Klaar"

10. **Fill in checklist during work**
    - Scroll to bottom panel: Checklist section
    - Check off items as they're completed:
      - ☑ Materiaal gecontroleerd
      - ☑ Zaagblad schoon
      - ☑ Lengtes gemeten
      - ☑ Schoonzagen uitgevoerd
      - ☐ Onderdelen gelabeld (not done yet)
      - ☐ Werkplek opgeruimd (not done yet)

11. **Add comments to checklist items (optional)**
    - Click on checklist item
    - Comment field appears
    - Type: "Extra zorgvuldig gezaagd, materiaal was erg hard"
    - Save comment

12. **Complete remaining checklist items**
    - After finishing all parts:
      - ☑ Onderdelen gelabeld
      - ☑ Werkplek opgeruimd
    - All required items now checked

13. **Mark order as complete**
    - Click "Gereedmelden" button (appears when all required checklist items checked)
    - Modal appears: "Order Gereedmelding"
    - Fields:
      - Naam: "Jan de Vries" (auto-filled, read-only)
      - Datum gereed: "10-12-2024" (today, adjustable)
      - Opmerkingen: "Alles volgens plan verlopen" (optional)
      - Checklist status: "8 van 8 items afgevinkt ✓"
    - Click "Meld Gereed"

14. **System processes completion**
    - Order status changes: "In uitvoering" → "Afgerond"
    - Notification sent to werkvoorbereider: "Order 'Zagen' is afgerond door Jan de Vries"
    - Next order in sequence becomes available: "Boren" status changes to "Open"
    - User redirected to Dashboard

15. **Werkvoorbereider reviews and approves**
    - Werkvoorbereider receives notification
    - Opens order detail page
    - Reviews:
      - All parts checked: ✓
      - All checklist items complete: ✓
      - Comments (if any): "Alles volgens plan verlopen"
    - Clicks "Goedkeuren" button
    - Modal appears: "Order Goedkeuren"
    - Werkvoorbereider's digital signature shown (pre-loaded from profile)
    - Confirmation: "Ik keur deze order goed"
    - Click "Bevestig Goedkeuring"

16. **System archives order**
    - Order status changes: "Afgerond" → "Goedgekeurd"
    - Approval record created with signature and timestamp
    - Order locked (cannot be modified without reopening)

**Result:**
- Order completed and approved
- Next order in sequence ready for assignment
- Full audit trail maintained

**Edge cases:**

**If checklist incomplete when trying to complete:**
- "Gereedmelden" button disabled (grayed out)
- Tooltip: "Je moet alle verplichte checklist items afvinken"
- Required items highlighted in red

**If werkvoorbereider finds issue:**
- Click "Heropen Order" button
- Confirmation modal: "Weet je zeker dat je deze order wil heropenen?"
- Reason field: "Lengtes zijn niet correct, moet opnieuw gezaagd worden"
- Click "Heropen"
- Order status changes back to "Open"
- All checkmarks reset
- Notification sent to werkplaats: "Order 'Zagen' is heropend door [werkvoorbereider]"

---

### 4.4 Plate Claiming Workflow

**Actors:** Werkplaats or Logistiek

**Steps:**

1. **Navigate to voorraad** (`/voorraad`)
   - Go to "Platen" tab

2. **Find suitable plate**
   - Use filters:
     - Materiaal: "S235GE" (S235 gestraald)
     - Status: "Beschikbaar"
     - Sort: "Gewicht (heaviest first)"
   - See list of available plates

3. **Select plate**
   - Click on plate card: "S235GE-042"
   - See details:
     - Afmetingen: 3000×1500×10 mm
     - Gewicht: 353 kg
     - Locatie: Lade 3
     - Status: Beschikbaar ✓

4. **Claim plate**
   - Click "Claim Plaat" button
   - Modal appears: "Plaat Claimen"
   - Fields:
     - Project* (dropdown): Select "STAGR"
     - Fase* (dropdown): Select "001"
     - M² geclaimd (optional): Leave empty (claims entire plate) or enter partial amount
     - Notitie (optional): "Voor zaagorder hekken"
   - Click "Claim Plaat"

5. **System processes claim**
   - Creates Claim record in database
   - Links plate to project/fase
   - Plate status changes: "Beschikbaar" → "Geclaimd"
   - Success message: "Plaat S235GE-042 geclaimd voor STAGR-001"

6. **Plate appears in project**
   - Navigate to Project → Fase → "Materiaal" tab
   - See claimed plate in list
   - Shows: Plaatcode, Materiaal, Gewicht, Geclaimd door, Geclaimd op

7. **Later: Modify claim (if needed)**
   - Another user (werkplaats or logistiek) navigates to plate
   - Sees plate is claimed: "Geclaimd voor STAGR-001 door Jan de Vries"
   - Clicks "Claim Aanpassen"
   - Modal:
     - Current claim: "Hele plaat (353 kg)"
     - Nieuwe claim: "2.5 m²" (partial usage)
     - Reden: "We gebruiken maar de helft"
   - Click "Opslaan"

8. **System sends notification**
   - Original claimer (Jan de Vries) receives notification:
     - "Je claim op plaat S235GE-042 is aangepast door Piet Jansen"
     - Link to plate detail page
     - Shows before/after: "Hele plaat → 2.5 m²"
   - User can review change

9. **Plate consumed (after cutting)**
   - When plate is fully used, werkplaats marks it as consumed
   - Navigate to plate detail
   - Click "Consumeer Plaat" button
   - Modal: "Plaat Consumeren"
     - Onderdelen gesneden: Multi-select posnummers (which parts were cut from this plate)
     - Certificaat overnemen: Checkbox (if checked, certificate is inherited by parts)
     - Restmateriaal: "Geen" (or enter dimensions if there's leftover material)
   - Click "Consumeer Plaat"

10. **System archives plate**
    - Plate status: "Geclaimd" → "Geconsumeerd"
    - Plate removed from active voorraad
    - If restmateriaal specified: New plate created with smaller dimensions
    - Certificate inherited by selected parts
    - Claim released automatically

**Result:**
- Plate claimed for project
- Materiaal tracked through production
- Certificate inherited by cut parts
- Full traceability maintained

---

### 4.5 Certificate Export Workflow

**Actors:** Werkvoorbereider

**Purpose:** Generate PDF package with certificates for customer delivery or quality control.

**Steps:**

1. **Navigate to certificates page** (`/certificaten`)

2. **Click "Bulk Export" button**

3. **Export modal appears**

4. **Select export scope** (radio buttons):
   - ○ Per onderdeel (specific posnummers)
   - ● Per fase (all parts in fase) [SELECTED]
   - ○ Per orderreeks (all parts in order sequence)
   - ○ Custom selectie

5. **If "Per fase" selected:**
   - Dropdown: Select project: "STAGR"
   - Dropdown: Select fase: "001"
   - System pre-selects all parts in that fase (45 parts)
   - Shows summary: "45 onderdelen geselecteerd, 12 certificaten gevonden"

6. **Configure export options:**
   - ☑ Voorblad opnemen (checkbox, checked by default)
   - ☑ Lijst van posnummers opnemen
   - ○ Format: PDF (merged) [SELECTED]
   - ○ Format: ZIP (separate PDFs)

7. **Click "Genereer Export"**

8. **System generates PDF:**
   - Background worker task starts
   - Progress indicator: "Genereren... 5/12 certificaten verwerkt"

9. **PDF structure:**
   - **Page 1: Cover page**
     - Company logo (M.C. Kersten)
     - Title: "Materiaal Certificaten"
     - Project: STAGR - Station Groningen
     - Fase: 001 - hekken
     - Export datum: 10 december 2024
     - Werkvoorbereider: [Name]
     - Digital signature: [Image]

   - **Page 2: Table of contents**
     - List of all posnummers with page numbers:
       - Posnr 001 - S235 gestraald - 3000×150×10 mm - Certificaat pagina 3
       - Posnr 002 - S235 gestraald - 2500×150×10 mm - Certificaat pagina 3 (same certificate)
       - ...
       - Posnr 042 - RVS 316 geslepen - 4000×200×5 mm - Certificaat pagina 25
       - etc.

   - **Page 3-N: Certificates**
     - Each certificate PDF appended
     - Grouped by certificate (if multiple parts share same certificate)

10. **Download completes**
    - Filename: `Certificaten_STAGR-001_2024-12-10.pdf`
    - Success message: "Export gereed! 12 certificaten geëxporteerd voor 45 onderdelen"
    - "Download" button
    - "Email" button (if email configured)

11. **Review PDF (optional)**
    - Open PDF in browser
    - Verify all certificates present
    - Verify voorblad has correct signature
    - Verify all posnummers listed

12. **Deliver to customer**
    - Email PDF to customer
    - Or print and include with physical delivery
    - Or store in project documentation folder

**Edge cases:**

**If some parts missing certificates:**
- Warning modal: "⚠️ Let op: 5 onderdelen hebben geen certificaat"
- List of parts without certificates:
  - Posnr 023 - S235 verzinkt - Geen certificaat
  - Posnr 031 - RVS 304 - Geen certificaat
  - etc.
- Options:
  - "Exporteer Alleen Onderdelen Met Certificaat" (excludes these 5 parts)
  - "Exporteer Alles Met Waarschuwing" (includes placeholder page for missing certificates)
  - "Annuleer" (go back and upload missing certificates)

**If certificate file missing/corrupted:**
- Warning modal: "⚠️ Certificaat voor plaat S235GE-042 kan niet worden geladen"
- Options:
  - "Vervang Certificaat" (re-upload)
  - "Sla Over" (exclude from export)
  - "Annuleer"

---

### 4.6 Orderreeks Split Workflow

**Actors:** Werkvoorbereider

**Purpose:** Split an active orderreeks into multiple parallel tracks (e.g., "Volledig" → "West" + "Oost")

**Scenario:** Project STAGR-001 has 90 parts. Werkvoorbereider realizes 45 parts are for west side, 45 for east side. They can be built in parallel by different teams.

**Steps:**

1. **Navigate to fase**
   - Project STAGR → Fase 001 → "Orders" tab

2. **View current orderreeks**
   - See "Volledig" orderreeks
   - Status: "In uitvoering"
   - Current order: "Kanten" (order 3 of 5)
   - Orders 1-2 completed: Zagen ✓, Boren ✓
   - Orders 3-5 not started: Kanten, Lassen, Afmonteren

3. **Click "Splits Orderreeks" button**
   - Modal appears: "Orderreeks Splitsen"

4. **Configure split:**

   **Step 1: Hoeveel reeksen?**
   - Radio buttons:
     - ○ 2 reeksen
     - ○ 3 reeksen
     - ○ Custom (number input)
   - Select "2 reeksen"

   **Step 2: Geef reeksen een titel**
   - Reeks 1: "West"
   - Reeks 2: "Oost"

   **Step 3: Verdeel posnummers**
   - Left panel: List of all 90 posnummers
   - Right panel: Two columns "West" and "Oost"
   - Drag-and-drop posnummers to assign:
     - Drag 001-045 to "West"
     - Drag 046-090 to "Oost"
   - OR: Bulk assign with checkboxes and "Assign to" dropdown

   **Step 4: Selecteer orders per reeks**
   - For "West":
     - Inherit completed: Zagen ✓, Boren ✓
     - Remaining: Kanten, Lassen, Afmonteren (all selected)
   - For "Oost":
     - Inherit completed: Zagen ✓, Boren ✓
     - Remaining: Kanten, Lassen, Afmonteren (all selected)
   - Option to add/remove orders per reeks

   **Step 5: Volgorde per reeks**
   - Both reeksen have same order: Kanten → Lassen → Afmonteren
   - Can reorder with drag-and-drop if needed

5. **Preview split**
   - Summary modal:
     - "Je staat op het punt 'Volledig' te splitsen in 2 nieuwe reeksen"
     - Reeks "West": 45 onderdelen, 3 orders (Kanten, Lassen, Afmonteren)
     - Reeks "Oost": 45 onderdelen, 3 orders (Kanten, Lassen, Afmonteren)
     - Afgeronde orders (Zagen, Boren) blijven gekoppeld aan beide reeksen
     - Originele reeks "Volledig" wordt gesloten
   - Warning: "⚠️ Let op: Deze actie kan niet ongedaan worden gemaakt"
   - Buttons: "Annuleer" / "Bevestig Splitsen"

6. **Click "Bevestig Splitsen"**

7. **System processes split:**
   - Closes original orderreeks "Volledig"
   - Creates new orderreeks "West" with 45 parts
   - Creates new orderreeks "Oost" with 45 parts
   - Duplicates uncompleted orders (Kanten, Lassen, Afmonteren) for each reeks
   - Keeps link to completed orders (Zagen, Boren) for both reeksen
   - Success message: "Orderreeks gesplitst in 'West' en 'Oost'"

8. **View result:**
   - Orders tab now shows:
     - ❌ "Volledig" (gesloten)
     - ✅ "West" (actief) - 45 onderdelen, 3 orders
     - ✅ "Oost" (actief) - 45 onderdelen, 3 orders

9. **Assign orders to teams:**
   - "West" → Kanten order → Assign to "Team A"
   - "Oost" → Kanten order → Assign to "Team B"
   - Both teams can now work in parallel

10. **Track progress separately:**
    - Each orderreeks has its own progress indicator
    - "West": 1 van 3 orders afgerond
    - "Oost": 0 van 3 orders afgerond

**Result:**
- Single orderreeks split into two parallel tracks
- Both can progress independently
- Full traceability maintained (link to original reeks preserved)

**Note:** Split can happen at any point, even mid-execution. Completed orders remain completed for both new reeksen.

---

## 5. Key Concepts

### 5.1 Orderreeksen (Order Sequences)

**Definition:**
An orderreeks is a **sequence of orders** that must be executed in a specific order for a set of posnummers (parts).

**Key characteristics:**
- **Starts with 1 order:** When you create the first order, it automatically becomes an orderreeks
- **Becomes a sequence:** When you add a 2nd order, the title becomes important (e.g., "Volledig", "West", "Oost")
- **Has a titel:** Default is "Volledig", but can be renamed (e.g., "Prio", "Rest", "West", "Oost")
- **Defines order flow:** E.g., Zagen → Boren → Kanten → Lassen → Afmonteren
- **Can be split:** At any point, even during execution
- **Flexible volgorde:** Werkvoorbereider can reorder steps at any time
- **Warning system:** If you start order 3 while order 2 isn't complete, system warns (but doesn't block)

**Why orderreeksen exist:**
- **Flexibility:** Different parts might need different processes
- **Parallel execution:** West side can be built while east side is still being prepared
- **Priority management:** Urgent parts ("Prio") can be fast-tracked
- **Clear structure:** Everyone knows which order comes next

**Example:**

Project: STAGR (Station Groningen)
Fase: 001 (hekken)
Total parts: 90 posnummers

**Scenario 1: Single reeks**
- Orderreeks: "Volledig"
- Orders: Zagen → Boren → Kanten → Lassen → Afmonteren
- All 90 parts go through all 5 steps

**Scenario 2: Split reeks (geographic)**
- Orderreeks "West": 45 parts
  - Orders: Zagen → Boren → Kanten → Lassen → Afmonteren
- Orderreeks "Oost": 45 parts
  - Orders: Zagen → Boren → Kanten → Lassen → Afmonteren

**Scenario 3: Split reeks (priority)**
- Orderreeks "Prio": 10 urgent parts
  - Orders: Zagen → Kanten → Lassen (fast-track, skip Boren)
- Orderreeks "Rest": 80 normal parts
  - Orders: Zagen → Boren → Kanten → Lassen → Afmonteren

### 5.2 Ordertypes

**Definition:**
An ordertype defines a **category of work** that needs to be done.

**Standard ordertypes:**
1. **Zagen** (Sawing) - Cut profiles to length
2. **Boren** (Drilling) - Drill holes
3. **Plaat snijden** (Plate cutting) - Laser cut plates
4. **Profiel snijden** (Profile cutting) - Laser cut tubes/profiles
5. **Kanten** (Bending) - Bend sheet metal
6. **Samenstellen** (Assembly) - Assemble components
7. **Lassen** (Welding) - Weld parts together
8. **Afmonteren** (Finishing) - Final assembly, deburring
9. **Overig** (Other) - Catch-all for miscellaneous work

**Customizable:**
- Admin can add new ordertypes (e.g., "Poedercoaten", "Verzinken")
- Each ordertype has its own base checklist
- Each ordertype can have its own icon

**Per ordertype:**
- Base checklist (configured by admin)
- Icon (for visual identification)
- Name (displayed in UI)
- Active/Inactive status

### 5.3 Storage Locations (Opslaglocaties)

**Definition:**
Physical locations where plates are stored, with weight tracking.

**Location types:**
1. **Lade 1-10** (Drawers 1-10)
   - Indoor storage
   - For smaller/medium plates
   - Weight limit: ~3000 kg per lade

2. **Pallet 1-5** (Pallets 1-5)
   - Outdoor/warehouse storage
   - For large/heavy plates
   - Weight limit: ~5000 kg per pallet

3. **Restopslag** (Leftover storage)
   - Catch-all location
   - For small remnants
   - No weight limit

**Weight tracking:**
- System automatically calculates total weight per location
- Sum of all plates at that location
- Visual indicator:
  - Green: < 70% capacity
  - Yellow: 70-90% capacity
  - Red: > 90% capacity (overloaded warning)

**Logistiek responsibility:**
- Manage location assignments
- Balance weight distribution
- Relocate plates when locations get full

**Werkplaats usage:**
- Find plates by location
- Can see which lade/pallet to go to
- Can move plates if needed (with notification to logistiek)

### 5.4 Posnummers (Part Numbers)

**Definition:**
A **posnummer** (or **posnr**) is a unique identifier for a part within a fase.

**Key characteristics:**
- **Unique within fase:** Posnr "042" can exist in STAGR-001 and STAGR-002, but not twice in STAGR-001
- **Usually 3 digits:** "001", "042", "150" (but can be alphanumeric: "042A")
- **Links everything together:** One posnummer can have:
  - 1 or more PDF drawings
  - 1 STEP 3D model
  - 1 DXF file (optional)
  - Material specification
  - Dimensions (L×W×H)
  - Quantity
  - Notities
  - Certificate (inherited from plate)

**Sources:**
- Imported from materiaallijst (CSV/XSR)
- Detected on PDF drawings (OCR)
- Manually added by werkvoorbereider

**Validation:**
- Must be unique within fase
- Cannot have duplicate posnummers
- If duplicate detected → modal forces user to choose which to keep

**Lifecycle:**
1. Created (from import or manual)
2. Files linked (PDF, STEP)
3. Added to orders (included in order execution)
4. Completed (checked off in workshop)
5. Approved (by werkvoorbereider)
6. Archived (after project completion)

### 5.5 Checklists

**Definition:**
A checklist is a **list of tasks** that must be completed for an order.

**Two levels:**
1. **Base checklist** (configured by admin per ordertype)
   - Standard items that apply to all orders of this type
   - Example for "Zagen":
     - Materiaal gecontroleerd
     - Zaagblad schoon
     - Lengtes gemeten
     - Schoonzagen uitgevoerd
     - Werkplek opgeruimd

2. **Order-specific additions** (added by werkvoorbereider)
   - Extra items specific to this order/project
   - Example:
     - "Let op: materiaaldikte varieert" (not required)
     - "Extra kwaliteitscontrole voor klant X" (required)

**Required vs Optional:**
- Items can be marked "Verplicht" (required)
- Required items MUST be checked before order can be completed
- Optional items can be skipped
- Werkvoorbereider can override admin's non-required items
- Werkvoorbereider CANNOT override admin's required items

**Who uses checklists:**
- **Admin:** Creates base templates
- **Werkvoorbereider:** Adds extra items per order, cannot remove required items
- **Werkplaats:** Fills in checklist during work execution
- **Werkvoorbereider:** Reviews and approves completed checklist

**Checklist completion flow:**
1. Werkplaats checks off items during work
2. When all required items checked → "Gereedmelden" button enabled
3. Werkplaats completes order (with name + date)
4. Werkvoorbereider reviews checklist
5. Werkvoorbereider approves with digital signature
6. Order locked

### 5.6 Digital Signatures

**Definition:**
A **digital signature** is a pre-uploaded image used by werkvoorbereiders to approve orders.

**Purpose:**
- Legal/compliance requirement
- Proves werkvoorbereider reviewed and approved work
- Cannot be forged (unique per user)
- Timestamped and auditable

**How it works:**
1. **Upload:** Werkvoorbereider uploads signature image (PNG/JPG) in profile settings
2. **Storage:** Stored securely in database
3. **Usage:** When approving order, signature is automatically inserted into approval record
4. **Display:** Shown on approval certificate and order detail page

**Requirements:**
- Must be uploaded before user can approve orders
- Cannot approve without signature
- Admin can require werkvoorbereiders to update signature periodically

**Security:**
- Only werkvoorbereider can see/use their own signature
- Cannot copy or use another user's signature
- Audit log tracks every use of signature

### 5.7 Notifications

**Definition:**
In-app and/or email alerts for relevant events.

**Who receives notifications:**

**Werkvoorbereider:**
- ✉️ Order completed by werkplaats
- ✉️ Plate claim modified by others
- ✉️ File upload failed (if error during processing)

**Werkplaats:**
- ✉️ Order assigned to them
- ✉️ Their claim on plate was modified by someone else
- ✉️ Order reopened by werkvoorbereider

**Logistiek:**
- ✉️ New plate added by werkplaats (for verification)
- ✉️ Plate moved to different location

**Admin:**
- ✉️ System errors
- ✉️ User creation requests (if approval workflow enabled)

**Notification types:**
- **Info** (ℹ️ blue): General updates
- **Success** (✓ green): Task completed
- **Warning** (⚠️ yellow): Attention needed
- **Error** (✗ red): Action required

**Notification center:**
- Bell icon in top nav
- Badge with unread count
- Dropdown list of notifications
- "Mark all as read" button
- Link to notification source (e.g., order, plate)

**Email notifications:**
- Optional (user can enable/disable per notification type)
- Digest mode: Daily summary instead of immediate emails
- Configurable in user settings

### 5.8 Duplicate Detection

**Purpose:**
Prevent data corruption by catching duplicate posnummers or files within a fase.

**When triggered:**
- **Uploading materiaallijst:** If CSV contains posnummer that already exists
- **Uploading tekenset:** If PDF page auto-detected with posnummer that already has a drawing
- **Uploading STEP files:** If filename matches existing STEP file for same posnummer

**Detection modal:**

**Header:** "Dubbel Posnummer Gedetecteerd: 042"

**Left panel: Bestaand (Existing)**
- Thumbnail preview
- Bestandsnaam: "042_bracket.PDF"
- Geüpload op: 3 dagen geleden
- Gebruikt in order: "Zagen" (completed)
- Dimensions: 3000×150×10 mm
- Material: S235 gestraald

**Right panel: Nieuw (New)**
- Thumbnail preview
- Bestandsnaam: "042_bracket_v2.PDF"
- Geüpload op: Net geüpload
- Dimensions: 2500×150×10 mm (different!)
- Material: S235 verzinkt (different!)

**Radio buttons:**
- ○ Behoud bestaand en sla nieuwe over
- ○ Vervang bestaand met nieuw (archives old file)
- ○ Hernoem nieuwe (prompts for new posnr, e.g., "042A")

**Warning (if dimensions/material differ):**
"⚠️ Let op: Afmetingen en/of materiaal zijn verschillend. Controleer welk bestand correct is."

**Buttons:**
- "Annuleer" (cancels upload, no changes)
- "Bevestig Keuze" (applies selected option)

**Result:**
- Old file either kept or archived
- New file either used or discarded
- Audit log records decision
- Werkvoorbereider receives notification (if replacement happened)

### 5.9 Certificate Inheritance

**Definition:**
When a plate is consumed (cut), parts cut from that plate automatically inherit the plate's certificate.

**How it works:**

1. **Certificate uploaded to plate:**
   - Logistiek uploads material certificate PDF to plate S235GE-042
   - Certificate is now linked to plate

2. **Plate claimed for project:**
   - Werkplaats claims plate for STAGR-001
   - Certificate stays with plate

3. **Plate consumed:**
   - Werkplaats marks plate as consumed
   - Modal asks: "Welke onderdelen zijn gesneden van deze plaat?"
   - User selects: Posnrs 010, 011, 012, 013, 014 (5 parts)
   - Checkbox: "Certificaat overnemen" (checked by default)
   - Confirm

4. **System creates links:**
   - Certificate is now linked to posnrs 010-014
   - Each part's detail view shows certificate
   - When exporting certificates, these 5 parts share the same certificate PDF

5. **Certificate export:**
   - Generate certificate export for fase
   - PDF includes certificate once for all 5 parts
   - Table of contents shows: "Posnrs 010-014: Certificaat pagina 15"

**Benefits:**
- No manual linking needed
- One certificate serves multiple parts
- Automatic traceability
- Reduces risk of missing certificates

**Edge cases:**

**If certificate NOT inherited:**
- Checkbox unchecked when consuming plate
- Parts remain without certificate
- Werkvoorbereider can manually upload separate certificates per part later

**If certificate already exists for part:**
- Warning: "Posnr 010 heeft al een certificaat. Overschrijven?"
- Options: Behoud bestaand / Overschrijf met plaat-certificaat

**If plate has NO certificate:**
- System warns: "Plaat S235GE-042 heeft geen certificaat. Onderdelen krijgen geen certificaat."
- Option to upload certificate before consuming

---

## 6. Business Rules

### 6.1 Project & Fase Rules

1. **Projects can only be created by werkvoorbereiders**
   - Admin can create projects (via role-switch)
   - Other roles: view-only access

2. **Project code must be unique**
   - System validates on save
   - Error if duplicate: "Project code 'STAGR' bestaat al"

3. **Fase number must be unique within project**
   - STAGR can have 001, 002, 003
   - Cannot have two "001" fases in same project
   - Different projects can have same fase numbers (STAGR-001, APIER-001)

4. **Projects cannot be deleted if they have active orders**
   - Must close all orders first
   - Or: Admin can force-delete with confirmation

5. **Fases cannot be deleted if they have files or orders**
   - Must delete all files and orders first
   - Or: Admin can archive instead of delete

### 6.2 Posnummer Rules

1. **Posnummers must be unique within fase**
   - Posnr "042" can exist in STAGR-001 and STAGR-002
   - Cannot exist twice in STAGR-001

2. **Duplicate posnummers trigger resolution modal**
   - User must choose: Keep existing / Replace / Rename new

3. **Posnummers can be alphanumeric**
   - Valid: "042", "042A", "TEST01"
   - Invalid: "042 " (space), "042!" (special char)

4. **Posnummers cannot be deleted if used in orders**
   - Error: "Posnr 042 wordt gebruikt in order 'Zagen'"
   - Must remove from order first

5. **Posnummers without files show warning**
   - Not blocking, but flagged as "Incomplete"
   - Werkvoorbereider can proceed but is warned

### 6.3 Order Rules

1. **Orders can always be started**
   - Even if previous order isn't complete
   - But: System shows warning

2. **Warning shown when starting order out of sequence**
   - "⚠️ Let op: Order 2 (Boren) is nog niet afgerond. Weet je zeker dat je Order 3 (Kanten) wilt starten?"
   - User can proceed or cancel

3. **Orders cannot be deleted after started**
   - Can only be marked as "Geannuleerd" (status change)
   - Admin can force-delete with audit log entry

4. **Orders can be reopened by werkvoorbereider**
   - Even after completion and approval
   - Resets checklist
   - Archives previous completion data

5. **Orderreeks title defaults to "Volledig"**
   - Can be changed at any time
   - Title is just a label, doesn't affect functionality

6. **Orderreeks can be split at any point**
   - Even mid-execution
   - Completed orders remain completed for both new reeksen

### 6.4 Checklist Rules

1. **Base checklist is defined by admin per ordertype**
   - Admin creates template
   - Template applies to ALL orders of that type

2. **Werkvoorbereider can add order-specific items**
   - Extra items for this specific order
   - Can mark as "Verplicht" or optional

3. **Werkvoorbereider can remove non-required admin items**
   - If admin item is NOT marked "Verplicht"
   - Werkvoorbereider can uncheck it for this order

4. **Werkvoorbereider CANNOT remove required admin items**
   - If admin marked item as "Verplicht"
   - Werkvoorbereider cannot override (locked)

5. **All required items must be checked before order completion**
   - "Gereedmelden" button disabled until all required items checked
   - Optional items can be skipped

6. **Werkplaats fills in checklist, doesn't need to sign**
   - Only adds name + date when completing order
   - Werkvoorbereider signs with digital signature when approving

### 6.5 Plate & Material Rules

1. **Plate numbering is automatic and sequential**
   - User cannot manually set plate number
   - System generates next number per material prefix
   - E.g., S235GE-041 exists → new plate becomes S235GE-042

2. **Plate numbers are immutable**
   - Cannot be changed after creation
   - Prevents confusion and maintains audit trail

3. **Material prefix is immutable once plates exist**
   - If even one plate uses prefix S235GE, cannot edit prefix
   - Can edit other material properties (dichtheid, kleur)

4. **Plates can be claimed by multiple projects**
   - BUT: Only one active claim per plate
   - Must release claim before another project can claim it

5. **Claims can be modified by anyone**
   - Original claimer receives notification
   - Notification shows who modified and why

6. **Claimed plates cannot be deleted**
   - Error: "Kan plaat niet verwijderen: plaat is geclaimd voor STAGR-001"
   - Must release claim first

7. **Consumed plates are archived, not deleted**
   - Status changes to "Geconsumeerd"
   - Hidden from main voorraad view
   - Visible in archive view for audit

8. **Certificate uploads are optional but encouraged**
   - System doesn't block without certificate
   - But: Shows warning when exporting if certificates missing

9. **Certificates inherit from plate to parts**
   - When plate consumed, parts can inherit certificate
   - Checkbox option, checked by default

10. **Location weight limits are advisory, not enforced**
    - System shows warning if location overloaded
    - Logistiek can override (sometimes necessary)

### 6.6 File Upload Rules

1. **File size limits:**
   - PDF: 100 MB
   - STEP: 50 MB per file
   - CSV/XSR: 10 MB
   - Images (plate photos): 5 MB

2. **Supported file types:**
   - PDF: .pdf
   - STEP: .step, .stp
   - DXF: .dxf, .dwg
   - Materiaallijst: .csv, .xsr, .xlsx, .pdf
   - Images: .jpg, .jpeg, .png
   - Certificates: .pdf

3. **File naming conventions (recommended, not enforced):**
   - STEP files: "042_partname.STEP" (posnr first)
   - PDF drawings: "042.pdf" or "042_rev2.pdf"
   - Helps auto-linking

4. **Files cannot be deleted if linked to completed orders**
   - Warning: "Dit bestand wordt gebruikt in afgeronde order 'Zagen'. Weet je zeker?"
   - Admin can force-delete with reason

5. **OCR detection is probabilistic**
   - High confidence (>90%): Auto-linked without review
   - Medium confidence (60-90%): User must approve
   - Low confidence (<60%): User must manually link

6. **Duplicate files trigger resolution modal**
   - Same as duplicate posnummers
   - User must choose which file to keep

### 6.7 User & Permission Rules

1. **Only admin can create/delete users**
   - Werkvoorbereiders can request access (if workflow enabled)

2. **Users can have multiple roles**
   - E.g., "Werkvoorbereider + Werkplaats"
   - Most permissive role applies

3. **Admin can switch views**
   - Sees system as any role
   - Used for testing and troubleshooting

4. **Werkvoorbereiders can only edit own projects**
   - Unless granted explicit permission by project owner
   - Admin can edit all projects

5. **Werkplaats can only view assigned orders**
   - Cannot see orders assigned to others
   - Exception: Logistiek and admin can see all

6. **Digital signature required for werkvoorbereiders**
   - Cannot approve orders without signature
   - Must upload in profile settings before first approval

7. **Inactive users cannot log in**
   - Admin can deactivate user (doesn't delete data)
   - Can reactivate later

### 6.8 Notification Rules

1. **Werkvoorbereider receives notification when:**
   - Order completed by werkplaats
   - Plate claim modified by others (if they were original claimer)

2. **Werkplaats receives notification when:**
   - Order assigned to them
   - Their plate claim modified by others
   - Order reopened by werkvoorbereider

3. **Notifications NOT sent for:**
   - Certificate uploads (logistiek adds proactively)
   - File uploads (unless error occurs)
   - User creating own content

4. **Notification delivery:**
   - Always in-app (bell icon)
   - Optionally via email (user preference)
   - Can be configured per notification type

5. **Notifications are not blocking**
   - User can dismiss and continue
   - Do not prevent actions

6. **Notification retention:**
   - Kept for 30 days
   - Then archived (not deleted)
   - Admin can access archived notifications

---

## 7. UI Elements & Interactions

### 7.1 Common UI Patterns

**Buttons:**
- Primary action: Blue background, white text (e.g., "Opslaan", "Aanmaken")
- Secondary action: White background, gray border (e.g., "Annuleren")
- Destructive action: Red text or background (e.g., "Verwijderen")
- Icon buttons: Ghost style with icon only

**Modals:**
- Centered overlay
- Close button (X) in top-right
- Keyboard shortcut: ESC to close
- Click outside to close (unless form has unsaved changes → confirmation)

**Forms:**
- Required fields marked with asterisk (*)
- Real-time validation (on blur)
- Error messages below field in red
- Success messages at top of form in green
- Disabled submit button until form valid

**Tables:**
- Sortable columns (click header to sort)
- Filterable (filter bar above table)
- Row actions (icons on right)
- Bulk selection (checkbox column)
- Pagination (if > 50 rows)

**Status badges:**
- Green: Success, Complete, Actief, Beschikbaar
- Yellow: Warning, In Progress, Geclaimd
- Blue: Info, Bij Laser
- Red: Error, Blocked, Overdue
- Gray: Inactive, Archived, Geconsumeerd

**Notifications (toast):**
- Appear top-right
- Auto-dismiss after 5 seconds (info/success)
- Manual dismiss required (warning/error)
- Max 3 visible at once (stack)

**Drag-and-drop:**
- Hover state: Dashed border, light blue background
- Dragging: Reduced opacity, cursor changes
- Drop zones: Highlighted when dragging
- Feedback: Success message after drop

### 7.2 Navigation Structure

**Top nav (always visible):**
- Logo (left, clickable → Dashboard)
- Main menu (center):
  - Projecten
  - Voorraad
  - Certificaten (werkvoorbereiders only)
  - Admin (admin only)
- User menu (right):
  - Notifications (bell icon with badge)
  - User avatar + name (dropdown)
    - Mijn Profiel
    - Instellingen
    - Uitloggen

**Breadcrumbs (context pages):**
- Shows current location: Projecten > STAGR > Fase 001 > Orders
- Each level clickable (navigate back)

**Tab navigation (within pages):**
- Used on detail pages (Project, Fase, PlateStock)
- Horizontal tabs below page header
- Active tab underlined
- URL updates when switching tabs (deep-linkable)

### 7.3 Filter & Search Patterns

**Filter bar (above lists/tables):**
- Multiple filters can be applied simultaneously
- Filters combine with AND logic
- Clear all filters button
- Filter state persists in URL (bookmarkable)

**Search:**
- Text input with search icon
- Debounced (waits 300ms after typing stops)
- Searches across multiple fields
- Clear button (X) appears when text entered

**Sort:**
- Dropdown: "Sorteer op: [Laatste update ▼]"
- Options: Field name + direction (A-Z, Z-A, Newest, Oldest)
- Or: Click table header to sort by that column

**Pagination:**
- Show 50 items per page (configurable)
- "Vorige" / "Volgende" buttons
- Page numbers: 1 2 3 ... 10
- "Toon alles" option (if < 500 items)

### 7.4 File Viewers

**PDF Viewer:**
- Embedded in page (no download required)
- Zoom controls: +, -, Fit width, Fit page
- Page navigation: ◀ [2/12] ▶
- Rotate: 90° left/right
- Download button (top-right)
- Print button
- Full-screen mode

**STEP 3D Viewer:**
- Three.js or Babylon.js renderer
- Mouse controls:
  - Left click + drag: Rotate
  - Scroll: Zoom in/out
  - Right click + drag: Pan
- View presets: Top, Front, Side, Isometric
- Toggle wireframe/solid
- Measure tool (distance between points)
- Full-screen mode

**DXF 2D Viewer:**
- Canvas or SVG renderer
- Layers panel (toggle layer visibility)
- Zoom to extents button
- Measure tool
- Download button

**Image Gallery (plate photos):**
- Grid of thumbnails
- Click thumbnail → Full-screen lightbox
- Navigation arrows: ◀ ▶
- Zoom in/out
- ESC to close

### 7.5 Keyboard Shortcuts

**Global:**
- `Ctrl+K` or `Cmd+K`: Open command palette (quick search)
- `Ctrl+/` or `Cmd+/`: Show keyboard shortcuts help
- `ESC`: Close modal/cancel action

**Navigation:**
- `G then P`: Go to Projecten
- `G then V`: Go to Voorraad
- `G then C`: Go to Certificaten
- `G then D`: Go to Dashboard

**Actions (context-dependent):**
- `N`: New item (project, fase, order, plate, etc.)
- `E`: Edit selected item
- `Del`: Delete selected item (with confirmation)
- `Ctrl+S` or `Cmd+S`: Save form
- `Ctrl+Enter`: Submit form (e.g., complete order)

**File viewers:**
- `+`: Zoom in
- `-`: Zoom out
- `0`: Reset zoom
- `F`: Full-screen
- `R`: Rotate (PDF)
- `Arrow keys`: Navigate pages (PDF)

### 7.6 Responsive Design

**Desktop (>1024px):**
- Full sidebar navigation
- 2-column layouts (e.g., posnummers list + file viewer)
- Tables with all columns visible

**Tablet (768-1024px):**
- Collapsible sidebar (hamburger menu)
- 1-column layouts (stack vertically)
- Table columns can be hidden (priority: most important visible)

**Mobile (<768px):**
- Not primary target (workshop tablets are 10"+)
- Basic view-only functionality
- Responsive tables → Card view
- Touch-friendly button sizes

**Note:** Full editing functionality requires tablet or desktop. Mobile is for viewing only.

---

## 8. Appendix

### 8.1 All Order Types

| Ordertype | Icon | Description | Typical Duration | Common Checklist Items |
|-----------|------|-------------|------------------|------------------------|
| Zagen | 🪚 | Cut profiles to length | 1-3 days | Materiaal gecontroleerd, Zaagblad schoon, Lengtes gemeten, Schoonzagen uitgevoerd |
| Boren | 🔩 | Drill holes | 1-2 days | Boordiameter gecontroleerd, Holes gemeten, Bramen verwijderd |
| Plaat snijden | 🔷 | Laser cut plates | 2-4 days | Plaatmateriaal correct, Lasersneden gecontroleerd, Onderdelen ontbraamd |
| Profiel snijden | 〰️ | Laser cut tubes/profiles | 2-3 days | Profielen correct, Snijkwaliteit gecontroleerd, Eindafwerking gedaan |
| Kanten | 📐 | Bend sheet metal | 1-3 days | Kanthoeken gemeten, Materiaal voorbewerkt, Kwaliteit gecontroleerd |
| Samenstellen | 🔧 | Assemble components | 3-7 days | Onderdelen compleet, Montageplan gevolgd, Controle uitgevoerd |
| Lassen | 🔥 | Weld parts together | 2-5 days | Lasapparatuur gereed, Lassen uitgevoerd volgens procedure, Visuele controle |
| Afmonteren | ✅ | Finishing, deburring | 1-2 days | Bramen verwijderd, Oppervlak schoongemaakt, Eindcontrole gedaan |
| Overig | ⚙️ | Other work | Varies | Custom checklist per order |

### 8.2 All Storage Locations

| Locatie Type | Count | Capacity (kg) | Use Case |
|--------------|-------|---------------|----------|
| Lade 1-10 | 10 | ~3000 kg | Indoor, smaller/medium plates |
| Pallet 1-5 | 5 | ~5000 kg | Outdoor/warehouse, large/heavy plates |
| Restopslag | 1 | Unlimited | Catch-all for remnants |

### 8.3 All File Types

| File Type | Extension | Max Size | Purpose | Auto-Processing |
|-----------|-----------|----------|---------|-----------------|
| PDF Tekening | .pdf | 100 MB | Technical drawings | Split pages, OCR posnr |
| STEP 3D Model | .step, .stp | 50 MB | 3D models | Auto-link by filename |
| DXF/DWG | .dxf, .dwg | 50 MB | 2D laser patterns | Auto-link by filename |
| Materiaallijst | .csv, .xsr, .xlsx, .pdf | 10 MB | Parts list | Parse and import posnrs |
| Certificaat | .pdf | 10 MB | Material certificate | Link to plate |
| Foto | .jpg, .jpeg, .png | 5 MB | Plate photos | Store with plate |

### 8.4 User Roles Summary

| Role | Create Projects | Create Orders | Execute Orders | Manage Plates | Approve Orders | Admin Functions |
|------|-----------------|---------------|----------------|---------------|----------------|-----------------|
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Werkvoorbereider | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Werkplaats | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Logistiek | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Tekenaar | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Laser | ❌ | ❌ | ✅ (laser only) | ❌ | ❌ | ❌ |
| Buislaser | ❌ | ❌ | ✅ (pipe only) | ❌ | ❌ | ❌ |
| Kantbank | ❌ | ❌ | ✅ (bending only) | ❌ | ❌ | ❌ |

### 8.5 Notification Types

| Event | Werkvoorbereider | Werkplaats | Logistiek | Admin |
|-------|------------------|------------|-----------|-------|
| Order completed | ✅ | ❌ | ❌ | ❌ |
| Order assigned | ❌ | ✅ | ❌ | ❌ |
| Order reopened | ❌ | ✅ | ❌ | ❌ |
| Plate claim modified | ✅ (if original claimer) | ✅ (if original claimer) | ✅ (if original claimer) | ❌ |
| New plate added | ❌ | ❌ | ℹ️ (info only) | ❌ |
| File upload error | ✅ | ❌ | ❌ | ✅ |
| System error | ❌ | ❌ | ❌ | ✅ |

### 8.6 Status Values

**Order Status:**
- `open` - Not started yet
- `in_progress` - Currently being worked on
- `completed` - Finished by werkplaats, awaiting approval
- `approved` - Approved by werkvoorbereider
- `cancelled` - Cancelled, not executed
- `reopened` - Reopened after completion

**Plate Status:**
- `beschikbaar` - Available for claiming
- `geclaimd` - Claimed for a project
- `bij_laser` - At laser station (system-managed location)
- `geconsumeerd` - Consumed (cut into parts)

**Checklist Item Status:**
- `unchecked` - Not done
- `checked` - Done
- `n/a` - Not applicable (skipped)

**File Status:**
- `gekoppeld` - Linked to posnummer(s)
- `ongekoppeld` - Not linked to any posnummer
- `duplicate` - Duplicate detected, needs resolution

### 8.7 Measurement Units

**Length/Distance:**
- All dimensions in millimeters (mm)
- Display format: "3000 mm" or "3000×1500×10 mm"

**Weight:**
- All weights in kilograms (kg)
- Display format: "353 kg"
- Calculated from: (L × W × H × Density) / 1,000,000

**Area:**
- Square meters (m²)
- Display format: "4.5 m²"
- Calculated from: (L × W) / 1,000,000

**Density:**
- Kilograms per cubic meter (kg/m³)
- Display format: "7850 kg/m³"
- Standard values:
  - S235/S355: 7850 kg/m³
  - RVS 304/316: 8000 kg/m³
  - Aluminium 5083: 2650 kg/m³

---

**END OF FUNCTIONAL OVERVIEW**

*This document describes the complete functional behavior of MES Kersten without technical implementation details. Use this as the source of truth for understanding what the system does and how users interact with it.*

*For technical implementation, refer to:*
- `CLAUDE.md` - Technical architecture and code patterns
- `docs/master1.md` - Original technical master document
- `docs/master2.md` - Extended specifications from ChatGPT discussion
