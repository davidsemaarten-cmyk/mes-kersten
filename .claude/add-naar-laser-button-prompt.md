# Prompt: Add "Naar Laser" Inline Button to Voorraad Table

## Context
MES Kersten manufacturing execution system with React + TypeScript frontend, FastAPI backend. The PlateDetailsModal currently contains a "Naar Laser" button (lines 357-368) that should be moved to inline action buttons in the Voorraad table rows.

## Current State

### ✅ Already Implemented
- `NaarLaserButton.tsx` component exists and is fully functional (D:\Projecten\Web Development\mes-kersten\frontend\src\components\NaarLaserButton.tsx)
- Component includes:
  - Proper event handling with `e.stopPropagation()` to prevent row clicks
  - Loading states and disabled states
  - Conditional rendering (returns null if plate already at laser)
  - Orange styling to match "Bij Laser" theme
  - Zap icon from lucide-react

### ❌ Not Yet Implemented
- NaarLaserButton is NOT imported in Voorraad.tsx
- NaarLaserButton is NOT added to table rows in regular view
- PlateDetailsModal still shows "Naar Laser" button (lines 357-368)

## Objective
Move the "Naar Laser" functionality from the modal to inline table actions for faster workflow.

## Required Changes

### 1. Update Voorraad.tsx - Add Import
**File:** `frontend/src/pages/Voorraad.tsx`

**Current imports (lines 28-30):**
```typescript
import { LocationReturnButton } from '../components/LocationReturnButton'
import { RemnantButton } from '../components/RemnantButton'
import { ConsumeButton } from '../components/ConsumeButton'
```

**Add NaarLaserButton import:**
```typescript
import { LocationReturnButton } from '../components/LocationReturnButton'
import { RemnantButton } from '../components/RemnantButton'
import { ConsumeButton } from '../components/ConsumeButton'
import { NaarLaserButton } from '../components/NaarLaserButton'
```

### 2. Update Voorraad.tsx - Add Actions Column
**File:** `frontend/src/pages/Voorraad.tsx`

**Current behavior (lines 615-622):**
The regular view (non-bij_laser tabs) renders dynamic cells based on `visibleColumns`:
```typescript
) : (
  // Regular view: Dynamic cells
  visibleColumns.map((column) => (
    <TableCell key={column.id}>
      {column.accessor(plate)}
    </TableCell>
  ))
)}
```

**New behavior:**
Add a fixed actions column AFTER the dynamic columns for non-bij_laser views:
```typescript
) : (
  // Regular view: Dynamic cells + Actions column
  <>
    {visibleColumns.map((column) => (
      <TableCell key={column.id}>
        {column.accessor(plate)}
      </TableCell>
    ))}
    {/* Actions column - Only show NaarLaserButton if not already at laser */}
    <TableCell>
      <div className="flex gap-2 justify-end">
        <NaarLaserButton plate={plate} />
      </div>
    </TableCell>
  </>
)}
```

**IMPORTANT DETAILS:**
- Only add the actions column to the regular view (NOT bij_laser tab)
- The bij_laser tab already has its own action buttons (LocationReturnButton, RemnantButton, ConsumeButton)
- NaarLaserButton has built-in logic to hide itself if plate.status === 'bij_laser'
- Add `justify-end` to align button to the right side of the cell
- Wrap in flex container for consistent styling with bij_laser actions

### 3. Update Table Header - Add Actions Column Header
**File:** `frontend/src/pages/Voorraad.tsx`

**Find the header row for regular view** (around lines 480-515):
Currently, headers are rendered dynamically from visibleColumns only.

**Add a fixed "Acties" header column:**
After the dynamic draggable headers, add:
```typescript
{statusFilter !== 'bij_laser' && (
  <TableHead className="text-right">Acties</TableHead>
)}
```

**Also update the filter row** (around lines 517-571):
After dynamic filter columns, add empty cell for actions column:
```typescript
{statusFilter !== 'bij_laser' && (
  <TableHead className="p-2" />
)}
```

### 4. Update PlateDetailsModal - Remove "Naar Laser" Button
**File:** `frontend/src/components/PlateDetailsModal.tsx`

**Remove lines 357-368:**
```typescript
{/* Naar Laser button - Only for werkplaats role */}
{user?.role === 'werkplaats' && plate.status !== 'bij_laser' && (
  <Button
    variant="outline"
    onClick={handleNaarLaser}
    disabled={moveToLaser.isPending || plate.is_consumed}
    className="border-gray-300 hover:bg-gray-50"
  >
    <Zap className="h-4 w-4 mr-2" />
    Naar Laser
  </Button>
)}
```

**RATIONALE:**
- This button is now available inline in the table for faster access
- Keeps modal focused on viewing/editing plate details
- Reduces clicks: users don't need to open modal to move plates to laser
- "Van Laser" button can remain in modal as it's only used for bij_laser plates which have different inline actions

**Optional cleanup (can be done later):**
- Remove `useMoveToLaser` import if no longer needed
- Remove `handleNaarLaser` function (lines 90-99) if no longer needed
- Remove `Zap` icon import if no longer used

### 5. Update Empty State colspan
**File:** `frontend/src/pages/Voorraad.tsx`

**Current (line 628):**
```typescript
<TableCell colSpan={statusFilter === 'bij_laser' ? 5 : visibleColumns.length}>
```

**Updated:**
```typescript
<TableCell colSpan={statusFilter === 'bij_laser' ? 5 : visibleColumns.length + 1}>
```

**RATIONALE:**
Account for the new actions column in regular view (+1 column)

## Implementation Checklist

- [ ] Import NaarLaserButton in Voorraad.tsx
- [ ] Add actions column header "Acties" to regular view table header
- [ ] Add empty filter cell for actions column in filter row
- [ ] Add actions column with NaarLaserButton to regular view table rows
- [ ] Update empty state colspan calculation (+1 for actions column)
- [ ] Remove "Naar Laser" button from PlateDetailsModal (lines 357-368)
- [ ] Test workflow: Click NaarLaserButton in table → plate moves to "Bij Laser" tab
- [ ] Verify row click still opens modal (button has stopPropagation)
- [ ] Verify button only shows when plate.status !== 'bij_laser'

## Acceptance Criteria

### Functional Requirements
✅ **Regular Tabs (Alle, Beschikbaar, Geclaimd):**
- "Acties" column appears at the right end of the table
- NaarLaserButton visible for plates not at laser
- Clicking button moves plate to laser WITHOUT opening modal
- Row click still opens PlateDetailsModal (button stops event propagation)

✅ **Bij Laser Tab:**
- Keeps existing action buttons (Terugleggen, Restant, Verbruikt)
- No "Acties" column header in bij_laser view (uses fixed 5-column layout)

✅ **PlateDetailsModal:**
- "Naar Laser" button REMOVED from informatie tab action section
- "Van Laser" button remains (only shows when plate.status === 'bij_laser')
- Modal still accessible by clicking table rows in regular views

### Visual Requirements
✅ **Styling consistency:**
- Actions column aligned to the right (`justify-end`)
- NaarLaserButton uses orange theme (border-orange-200, hover:bg-orange-50)
- Button size consistent with other inline actions (size="sm")
- Flex gap-2 between multiple action buttons (if more added later)

### Performance Requirements
✅ **No layout shifts:**
- Table width adjusts naturally for new column
- Horizontal scroll container (ScrollableTable) handles overflow
- Column preferences system unaffected (actions column is fixed, not customizable)

## User Experience Flow

### Before (Current):
1. User sees plate in Voorraad table
2. Clicks row → PlateDetailsModal opens
3. Scrolls to bottom of informatie tab
4. Clicks "Naar Laser" button
5. Modal closes, plate moves to Bij Laser tab

### After (Desired):
1. User sees plate in Voorraad table
2. Clicks "Naar Laser" button directly in row
3. Plate instantly moves to Bij Laser tab
4. ✅ **3 steps eliminated, no modal required**

## Error Handling

The NaarLaserButton component already handles:
- Loading states (`isLoading` and `moveToLaser.isPending`)
- Error handling (delegated to useMoveToLaser mutation)
- Disabled state when already processing
- Toast notifications via mutation

No additional error handling needed.

## Technical Notes

### Why Actions Column is NOT in Column Preferences System
- Actions are core functionality, not optional data
- Always visible for consistent UX
- Fixed position at right end of table
- Similar to how "Bij Laser" tab has fixed column layout

### Event Propagation
- NaarLaserButton includes `e.stopPropagation()` (line 28)
- Prevents table row onClick from triggering when clicking button
- Modal only opens when clicking row itself, NOT when clicking button

### Role-Based Visibility
- NaarLaserButton component itself does NOT check user role
- Backend API endpoint enforces role-based access control
- Frontend shows button to all users, but API returns 403 if unauthorized
- Future enhancement: Hide button based on user role (check useAuth hook)

## Testing Scenarios

### Manual Testing Checklist
1. **Regular tabs (Alle, Beschikbaar, Geclaimd):**
   - [ ] "Acties" column visible at right end
   - [ ] NaarLaserButton shows for plates with status !== 'bij_laser'
   - [ ] Clicking button moves plate to Bij Laser tab
   - [ ] Success toast appears
   - [ ] Row click opens modal (button doesn't interfere)

2. **Bij Laser tab:**
   - [ ] Existing action buttons still present (Terugleggen, Restant, Verbruikt)
   - [ ] No "Acties" column in header
   - [ ] Layout unchanged from current implementation

3. **PlateDetailsModal:**
   - [ ] "Naar Laser" button REMOVED from modal
   - [ ] "Van Laser" button still visible when plate.status === 'bij_laser'
   - [ ] Consumeren button still visible

4. **Edge cases:**
   - [ ] Empty table state shows correct colspan
   - [ ] Horizontal scroll works with new column
   - [ ] Column reordering doesn't affect actions column (it's fixed)
   - [ ] Search/filter doesn't affect actions column visibility

## Success Metrics

- **Reduced clicks:** Moving plate to laser: 5 clicks → 1 click
- **Faster workflow:** No modal opening required for common action
- **Consistency:** Inline actions pattern matches "Bij Laser" tab
- **Discoverability:** Action visible immediately, no need to open modal

## Files Modified Summary

```
frontend/src/pages/Voorraad.tsx
  - Add NaarLaserButton import
  - Add "Acties" column header (regular view only)
  - Add empty filter cell for actions column
  - Add actions column to table rows with NaarLaserButton
  - Update empty state colspan (+1)

frontend/src/components/PlateDetailsModal.tsx
  - Remove "Naar Laser" button (lines 357-368)
  - Optional: Remove handleNaarLaser function
  - Optional: Remove useMoveToLaser and Zap imports if unused
```

## Implementation Time Estimate
**Total: ~20 minutes**
- Import and table row changes: 5 min
- Header and filter row updates: 5 min
- Modal cleanup: 5 min
- Testing: 5 min
