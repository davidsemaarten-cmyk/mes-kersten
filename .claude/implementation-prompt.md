# Implementation Prompt: Bij Laser Page Actions & Dynamic Column Management

## Context
MES Kersten manufacturing execution system with React + TypeScript frontend, FastAPI backend, PostgreSQL database. Currently implementing Phase 8: Enhanced laser workflow with inline actions and Phase 9: Dynamic column management across all inventory tables.

## Phase 8: Bij Laser Page - Inline Action Buttons

### Requirements

#### UI Changes - "Bij Laser" Tab
**Current behavior to REMOVE:**
- Clicking on table row opens PlateDetailsModal
- Actions are inside modal

**New behavior to IMPLEMENT:**
- Table rows are NOT clickable
- Three action buttons appear inline at the end of each row
- Reduced column set: Plaatnummer | Materiaal | Specificatie | Dikte | [Action Buttons]

#### Action Button 1: Return Unchanged ("Terugleggen")
**Button text:** "Terugleggen" or "Terug naar Voorraad"

**Behavior:**
1. Click button → Dropdown/Combobox appears showing existing locations
2. User selects location from existing data (NEVER free text input)
3. Plate status changes from `bij_laser` → previous status (beschikbaar/geclaimd based on claims)
4. Plate location updates to selected location
5. Success toast: "Plaat {plate_number} teruggelegd op locatie {location}"

**Data source:** Extract unique locations from existing plates for dropdown options

**API endpoint:** POST `/api/platestock/plates/{plate_id}/van-laser` with `{ new_location: string }`

#### Action Button 2: Return Remnant ("Restant")
**Button text:** "Restant"

**Behavior:**
1. Click button → Modal/Dialog opens with form:
   - Original plate info (read-only): current dimensions, thickness
   - Input fields:
     - New width (number, mm)
     - New length (number, mm)
     - New location (dropdown from existing locations)
     - Optional notes (textarea)
2. On submit:
   - Update original plate: mark as consumed, record consumption
   - Create NEW plate with remnant dimensions at specified location
   - New plate inherits: material_prefix, quality, thickness
   - New plate number: auto-generated with same prefix
3. Success toast: "Restant {new_plate_number} aangemaakt, origineel {original_plate} verbruikt"

**API endpoint:** POST `/api/platestock/plates/{plate_id}/process-remnant`
```json
{
  "new_width": 1000,
  "new_length": 2000,
  "new_location": "A-12-3",
  "notes": "Restant na lasersnijden project X"
}
```

**Backend logic:**
- Validate: new dimensions < original dimensions
- Transaction: Update original plate + Create new plate atomically
- Audit log: Record both actions with relationship

#### Action Button 3: Mark Consumed ("Verbruikt")
**Button text:** "Verbruikt"

**Behavior:**
1. Click button → Confirmation dialog
   - "Weet je zeker dat plaat {plate_number} volledig verbruikt is?"
   - "Deze actie kan niet ongedaan worden."
2. On confirm:
   - Mark plate: `is_consumed = true`, `consumed_at = now()`, `consumed_by = current_user`
   - Plate status becomes terminal (no further actions possible)
   - All active claims are automatically released
3. Success toast: "Plaat {plate_number} geregistreerd als verbruikt"

**API endpoint:** POST `/api/platestock/plates/{plate_id}/consume`

**Existing endpoint:** Already exists, just needs UI integration

### Technical Implementation Details

**Frontend (Voorraad.tsx - "Bij Laser" tab):**
```typescript
// When statusFilter === 'bij_laser'
// Table structure:
<TableRow>
  <TableCell>{plate.plate_number}</TableCell>
  <TableCell>{plate.material?.naam || plate.material_prefix}</TableCell>
  <TableCell>{plate.quality}</TableCell>
  <TableCell>{plate.thickness} mm</TableCell>
  <TableCell>
    <div className="flex gap-2 justify-end">
      <LocationReturnButton plate={plate} />
      <RemnantButton plate={plate} />
      <ConsumeButton plate={plate} />
    </div>
  </TableCell>
</TableRow>
```

**Component structure:**
- `LocationReturnButton.tsx` - Combobox with location selection
- `RemnantModal.tsx` - Form dialog for remnant creation
- `ConsumeButton.tsx` - Confirmation dialog for consumption

**State management:**
- Use React Query mutations for all actions
- Optimistic updates for instant feedback
- Invalidate plate queries on success

**Validation:**
- Remnant: new dimensions must be < original
- Location: must select from existing locations
- All actions: require werkplaats/admin/werkvoorbereider role

### Backend API Requirements

**New endpoint:** `POST /api/platestock/plates/{plate_id}/process-remnant`

**Request schema:**
```python
class RemnantRequest(BaseModel):
    new_width: int  # mm
    new_length: int  # mm
    new_location: str
    notes: Optional[str] = None
```

**Response:** Returns both updated original plate and newly created remnant plate

**Implementation:**
```python
async def process_remnant(plate_id: str, request: RemnantRequest, ...):
    # Check permissions (werkplaats/admin/werkvoorbereider)
    check_laser_access(current_user)

    # Validate plate is bij_laser
    # Validate dimensions
    # Start transaction
    # Mark original as consumed
    # Create new plate with remnant dimensions
    # Log audit trail
    # Commit transaction
```

---

## Phase 9: Dynamic Column Management (All Tables)

### Requirements

#### Drag-and-Drop Column Reordering
**Behavior:**
- Users can drag column headers left/right to reorder
- Visual feedback during drag (ghost column, drop indicators)
- Order preference persists per user (localStorage)
- Applies to: Voorraad table, Bij Laser table, Claims table, all other inventory tables

#### Show/Hide Columns
**UI:**
- Button/dropdown: "Kolommen" with checkboxes
- List all available columns with checkbox to show/hide
- Minimum 3 columns always visible (enforced)
- Show count: "4 van 12 kolommen getoond"

#### New Column Options
**Add separate columns for:**
- **Breedte** (width) - currently only in combined "Afmeting"
- **Lengte** (length) - currently only in combined "Afmeting"
- **Afmeting** (combined width × length) - keep existing

**All available columns for Voorraad/Bij Laser:**
1. Plaatnummer
2. Status
3. Claims
4. Materiaal
5. Specificatie
6. Breedte (NEW)
7. Lengte (NEW)
8. Afmeting (existing combined)
9. Dikte
10. Gewicht
11. Oppervlakte
12. Locatie

### Technical Implementation

**Column Configuration System:**
```typescript
interface ColumnConfig {
  id: string
  label: string
  accessor: (plate: PlateWithRelations) => React.ReactNode
  visible: boolean
  order: number
  minWidth?: number
  resizable?: boolean
}

// User preferences stored in localStorage
interface UserColumnPreferences {
  voorraad: ColumnConfig[]
  bij_laser: ColumnConfig[]
  claims: ColumnConfig[]
}
```

**Recommended library:** `@dnd-kit/core` + `@dnd-kit/sortable` for drag-and-drop

**Implementation approach:**
1. Define default column configurations
2. Load user preferences from localStorage on mount
3. Merge preferences with defaults (handle new columns)
4. Render table headers based on column order and visibility
5. Save preferences on every change
6. Provide "Reset to Default" button

**Column visibility UI:**
```typescript
<Popover>
  <PopoverTrigger>
    <Button variant="outline">
      <Settings /> Kolommen ({visibleCount} van {totalCount})
    </Button>
  </PopoverTrigger>
  <PopoverContent>
    <div className="space-y-2">
      {columns.map(col => (
        <label key={col.id} className="flex items-center gap-2">
          <Checkbox
            checked={col.visible}
            onCheckedChange={() => toggleColumn(col.id)}
            disabled={visibleCount === 3 && col.visible}
          />
          <span>{col.label}</span>
        </label>
      ))}
    </div>
    <Button variant="ghost" onClick={resetToDefault}>
      Reset naar standaard
    </Button>
  </PopoverContent>
</Popover>
```

**Drag-and-drop implementation:**
```typescript
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'

function SortableTableHeader({ column }: { column: ColumnConfig }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: column.id
  })

  return (
    <TableHead
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
    >
      {column.label}
    </TableHead>
  )
}
```

**Horizontal scroll implementation:**
```typescript
// Wrap table in scrollable container when columns exceed viewport width
<div className="overflow-x-auto">
  <Table className="min-w-full">
    {/* Table content */}
  </Table>
</div>
```

**Key requirements:**
- Table container must have `overflow-x-auto` for horizontal scrolling
- Table should maintain `min-w-full` to prevent shrinking
- Sticky first column (Plaatnummer) optional for better UX
- Scroll shadows/indicators to show more content available
- Mobile: Always scrollable, touch-friendly scroll behavior

**Enhanced scroll implementation with shadows:**
```typescript
function ScrollableTable({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftShadow, setShowLeftShadow] = useState(false)
  const [showRightShadow, setShowRightShadow] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollRef.current) return
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current

      setShowLeftShadow(scrollLeft > 0)
      setShowRightShadow(scrollLeft + clientWidth < scrollWidth - 1)
    }

    const container = scrollRef.current
    container?.addEventListener('scroll', handleScroll)
    handleScroll() // Initial check

    return () => container?.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="relative">
      {/* Left shadow */}
      {showLeftShadow && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
      )}

      {/* Scrollable container */}
      <div ref={scrollRef} className="overflow-x-auto">
        <Table className="min-w-full">
          {children}
        </Table>
      </div>

      {/* Right shadow */}
      {showRightShadow && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
      )}
    </div>
  )
}
```

**CSS for smooth scrolling:**
```css
.overflow-x-auto {
  overflow-x: auto;
  overflow-y: visible;
  -webkit-overflow-scrolling: touch; /* Smooth scroll on iOS */
  scroll-behavior: smooth;
}

/* Optional: Custom scrollbar styling */
.overflow-x-auto::-webkit-scrollbar {
  height: 8px;
}

.overflow-x-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.overflow-x-auto::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.overflow-x-auto::-webkit-scrollbar-thumb:hover {
  background: #555;
}
```

### Acceptance Criteria

**Phase 8 - Bij Laser Actions:**
- ✅ "Bij Laser" tab shows only 4 columns + action buttons
- ✅ Table rows are NOT clickable (no modal)
- ✅ "Terugleggen" button shows location dropdown with existing locations only
- ✅ "Restant" button opens modal with dimension inputs and location dropdown
- ✅ "Verbruikt" button shows confirmation before consuming
- ✅ All actions have proper loading states and error handling
- ✅ Backend creates remnant plates with correct auto-generated numbers
- ✅ Success/error toasts appear for all actions
- ✅ Only werkplaats/admin/werkvoorbereider users see action buttons

**Phase 9 - Column Management:**
- ✅ Users can drag column headers to reorder columns
- ✅ Column order persists across page refreshes (localStorage)
- ✅ "Kolommen" button shows/hides column visibility panel
- ✅ Minimum 3 columns enforced (can't hide below 3)
- ✅ Breedte and Lengte available as separate columns
- ✅ All column preferences save automatically
- ✅ "Reset naar standaard" button restores default column configuration
- ✅ Column management works consistently across Voorraad, Bij Laser, and Claims tables
- ✅ Table becomes horizontally scrollable when columns exceed viewport width
- ✅ Scroll behavior is smooth and touch-friendly on mobile devices
- ✅ Visual indicators show when more content is available (scroll shadows/gradients)

### User Experience Notes

**Bij Laser workflow:**
1. Werkplaats user finishes laser cutting
2. Switches to "Bij Laser" tab
3. Sees simplified table with only essential info
4. Quick actions directly in table:
   - Full plate unused → "Terugleggen" → select location → done
   - Partial plate used → "Restant" → enter dimensions → select location → done
   - Full plate used → "Verbruikt" → confirm → done
5. No clicking through modals, everything inline

**Column management workflow:**
1. User finds table cluttered or missing needed columns
2. Clicks "Kolommen" button
3. Checks/unchecks desired columns
4. Drags column headers to preferred order
5. Preferences automatically save
6. Next visit: table appears exactly as configured

### Error Handling

**Remnant validation errors:**
- "Nieuwe afmetingen moeten kleiner zijn dan origineel"
- "Breedte moet tussen 1 en {original_width} mm zijn"
- "Locatie moet geselecteerd worden"

**Permission errors:**
- "Alleen werkplaats, admin en werkvoorbereider mogen laser acties uitvoeren"

**State errors:**
- "Deze plaat staat niet bij de laser"
- "Deze plaat is al verbruikt"

### Performance Considerations

- Column reordering: Use CSS transforms (no layout recalc)
- Column preferences: Debounce localStorage writes
- Drag preview: Use lightweight ghost element
- Location dropdown: Cache locations list, refresh on mutations
- Horizontal scroll: Use native `overflow-x-auto` for hardware acceleration
- Scroll performance: Avoid fixed/sticky positioning on many columns (performance hit)
- Large tables: Consider virtual scrolling if >1000 rows (react-window/react-virtual)
- Scroll shadows: Use CSS gradients with scroll position detection (IntersectionObserver)

### Backward Compatibility

- Users without saved preferences get default column configuration
- New columns (Breedte, Lengte) default to hidden
- Existing saved preferences are migrated to include new columns
- PlateDetailsModal still accessible from other tabs (keep modal for non-laser tabs)

## Implementation Order

1. **Backend: Process Remnant endpoint** (45 min)
2. **Frontend: Bij Laser tab - Remove modal trigger** (15 min)
3. **Frontend: Inline action buttons component structure** (30 min)
4. **Frontend: LocationReturnButton with combobox** (30 min)
5. **Frontend: RemnantModal with form validation** (60 min)
6. **Frontend: ConsumeButton with confirmation** (20 min)
7. **Frontend: Column configuration system** (45 min)
8. **Frontend: Column visibility UI** (30 min)
9. **Frontend: Drag-and-drop integration** (60 min)
10. **Frontend: Horizontal scroll container with shadows** (30 min)
11. **Frontend: localStorage persistence** (30 min)
12. **Testing: All workflows end-to-end** (60 min)

**Total estimated effort:** ~7.5 hours

## Success Metrics

- Werkplaats users can process laser returns in <30 seconds
- Zero navigation to modals required for laser actions
- Column preferences persist 100% across sessions
- Users can customize table to show exactly what they need
- Reduced cognitive load: fewer clicks, clearer workflow
- Table remains usable with 12+ columns visible (horizontal scroll)
- Users can see scroll shadows indicating more content (98% visibility)
- Mobile/tablet devices have smooth touch scrolling experience
