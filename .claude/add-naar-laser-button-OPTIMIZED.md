# Implementation Prompt: Add "Naar Laser" Inline Button to Voorraad Table

## Instructions for AI Implementation

**READ THIS ENTIRE DOCUMENT BEFORE STARTING IMPLEMENTATION**

When implementing this feature:
1. Read all sections completely before making any changes
2. Confirm understanding by listing the files to be modified
3. Make changes in the exact order specified
4. After each file edit, verify the change was successful (check for TypeScript errors)
5. Run the testing checklist at the end
6. Report any deviations from the plan or unexpected issues

**Expected completion time:** 20-30 minutes including testing

---

## Terminology

**Consistent terms used throughout this document:**
- **Regular view tabs:** Tabs where statusFilter !== 'bij_laser' (Alle, Beschikbaar, Geclaimd)
- **Bij Laser tab:** Special layout with fixed columns where statusFilter === 'bij_laser'
- **Actions column:** The rightmost table column containing action buttons
- **Inline button:** A button embedded directly in a table row (vs modal button)

---

## Context

**Project:** MES Kersten - Manufacturing Execution System
**Tech Stack:** React 18 + TypeScript, FastAPI backend
**Module:** PlateStock - Plate inventory management
**User Role:** werkplaats (workshop)

### Business Problem
Currently, moving a plate to laser requires:
1. Click table row → Open PlateDetailsModal (1 click)
2. Scroll to bottom of informatie tab
3. Click "Naar Laser" button in modal (1 click)
4. Modal closes, plate moves to Bij Laser tab

**Goal:** Reduce to single click directly from table row.

---

## Current State Analysis

### ✅ Already Implemented (DO NOT MODIFY)

**NaarLaserButton Component** (`frontend/src/components/NaarLaserButton.tsx`)
- Fully functional, ready to use
- Features:
  - `e.stopPropagation()` to prevent row click propagation
  - Loading states (`isLoading`, `moveToLaser.isPending`)
  - Automatic hiding when `plate.status === 'bij_laser'`
  - Orange styling (border-orange-200, hover:bg-orange-50)
  - Zap icon from lucide-react
  - Size: `sm` variant
- **Action:** Import and use as-is, DO NOT modify component

**Bij Laser Tab Layout** (`frontend/src/pages/Voorraad.tsx`)
- Fixed 5-column layout with dedicated action buttons
- Columns: Plaatnummer, Materiaal, Specificatie, Dikte, Acties
- Action buttons: LocationReturnButton, RemnantButton, ConsumeButton
- **Action:** DO NOT modify bij_laser conditional branch

### ❌ Not Yet Implemented (FOCUS HERE)

1. NaarLaserButton NOT imported in Voorraad.tsx
2. NaarLaserButton NOT rendered in regular view table rows
3. Actions column header may or may not exist in regular view
4. Empty filter cell for actions column missing in regular view
5. PlateDetailsModal still shows "Naar Laser" button (needs removal)

---

## Objective

Move "Naar Laser" functionality from PlateDetailsModal to inline table actions in regular view tabs for faster workflow.

### Expected Layout

**Regular View (Alle/Beschikbaar/Geclaimd):**
```
┌─────────────┬───────────┬─────┬───────┬──────────────────┐
│ Plaatnummer │ Materiaal │ ... │ Dikte │ Acties           │
├─────────────┼───────────┼─────┼───────┼──────────────────┤
│ S235GE-001  │ S235JR    │ ... │ 10mm  │ [→ Naar Laser]  │
│ RVS316-042  │ RVS 316   │ ... │ 5mm   │ [→ Naar Laser]  │
└─────────────┴───────────┴─────┴───────┴──────────────────┘
```

**Bij Laser View (NO CHANGES):**
```
┌─────────────┬───────────┬──────────────┬───────┬───────────────────────────────┐
│ Plaatnummer │ Materiaal │ Specificatie │ Dikte │ Acties                        │
├─────────────┼───────────┼──────────────┼───────┼───────────────────────────────┤
│ S235GE-001  │ S235JR    │ Gewalst      │ 10mm  │ [← Terug] [Restant] [Verbruikt] │
└─────────────┴───────────┴──────────────┴───────┴───────────────────────────────┘
```

---

## Constraints

### DO NOT:
- Add new features beyond those specified in this document
- Modify styling beyond what's explicitly documented
- Change the bij_laser tab layout or its action buttons
- Add role-based visibility checks in frontend (handled by backend API)
- Refactor unrelated code
- Add new dependencies or packages
- Modify NaarLaserButton component itself
- Change column preferences system logic

### ONLY:
- Make the exact changes specified in the "Implementation Steps" section
- Add NaarLaserButton to regular view table rows
- Remove "Naar Laser" button from PlateDetailsModal
- Add/verify actions column infrastructure

---

## Pre-Implementation Checklist

**Verify these prerequisites before starting:**

- [ ] Backend is running at http://localhost:8000
- [ ] Frontend is running at http://localhost:5173
- [ ] `frontend/src/components/NaarLaserButton.tsx` exists and compiles without errors
- [ ] You have test user credentials with 'werkplaats' role
- [ ] Database has plates with `status !== 'bij_laser'` for testing
- [ ] Current git branch is clean (no uncommitted changes blocking testing)
- [ ] Browser DevTools console is open for monitoring errors

**If any prerequisite fails, resolve before proceeding.**

---

## Implementation Steps

### Step 1: Add NaarLaserButton Import to Voorraad.tsx

**File:** `frontend/src/pages/Voorraad.tsx`
**Location:** Around lines 28-30 (import section)

**Current state:**
```typescript
import { LocationReturnButton } from '../components/LocationReturnButton'
import { RemnantButton } from '../components/RemnantButton'
import { ConsumeButton } from '../components/ConsumeButton'
```

**Action:** Check if `NaarLaserButton` import already exists. If NOT present, add it:

```diff
import { LocationReturnButton } from '../components/LocationReturnButton'
import { RemnantButton } from '../components/RemnantButton'
import { ConsumeButton } from '../components/ConsumeButton'
+import { NaarLaserButton } from '../components/NaarLaserButton'
```

**Verify:**
- [ ] Save file
- [ ] No TypeScript errors in editor
- [ ] NaarLaserButton is recognized (hover shows component signature)

---

### Step 2: Verify/Add Actions Column Header in Regular View

**File:** `frontend/src/pages/Voorraad.tsx`
**Location:** Around lines 475-516 (table header section)

**Context:** There are TWO header rendering paths:
1. `statusFilter === 'bij_laser'` → Fixed header row (lines ~461-476)
2. Regular view → Dynamic draggable headers (lines ~478-516)

**Task:** Ensure "Acties" header exists for regular view.

**Check line 475 in bij_laser section:**
```typescript
<TableHead className="font-semibold text-gray-900 text-right">Acties</TableHead>
```

**Now check the regular view section (after line 513):**
The regular view uses `SortableContext` with draggable headers. You need to add a FIXED "Acties" header AFTER the sortable columns but BEFORE closing `</TableRow>`.

**Current structure (lines ~478-516):**
```typescript
) : (
  // Regular view: Dynamic draggable columns
  <SortableContext items={visibleColumns.map(col => col.id)} strategy={horizontalListSortingStrategy}>
    <TableRow className="hover:bg-gray-50">
      {visibleColumns.map((column) => (
        <DraggableTableHeader
          key={column.id}
          column={column}
          // ... props
        >
          {column.label}
          {column.id === 'dikte' && getSortIcon()}
        </DraggableTableHeader>
      ))}
    </TableRow>
  </SortableContext>
)}
```

**Required change:**
```diff
) : (
  // Regular view: Dynamic draggable columns
  <SortableContext items={visibleColumns.map(col => col.id)} strategy={horizontalListSortingStrategy}>
    <TableRow className="hover:bg-gray-50">
      {visibleColumns.map((column) => (
        <DraggableTableHeader
          key={column.id}
          column={column}
          // ... props
        >
          {column.label}
          {column.id === 'dikte' && getSortIcon()}
        </DraggableTableHeader>
      ))}
+     <TableHead className="font-semibold text-gray-900 text-right">Acties</TableHead>
    </TableRow>
  </SortableContext>
)}
```

**CRITICAL:** The `<TableHead>` must be INSIDE the `<TableRow>` but OUTSIDE and AFTER the `visibleColumns.map()`.

**Verify:**
- [ ] Save file
- [ ] No TypeScript/React errors
- [ ] In browser, inspect regular view table header
- [ ] "Acties" column header visible at far right
- [ ] Header is NOT draggable (not in SortableContext)

---

### Step 3: Add Empty Filter Cell for Actions Column

**File:** `frontend/src/pages/Voorraad.tsx`
**Location:** Around lines 517-571 (filter row section)

**Context:** The filter row has two rendering paths:
1. `statusFilter === 'bij_laser'` → Fixed filter cells (lines ~519-555)
2. Regular view → Dynamic filter cells (lines ~556-570)

**Task:** Add empty cell for actions column in regular view.

**Current bij_laser section already has empty cell (line 554):**
```typescript
<TableHead className="p-2" />
```

**Current regular view section (lines ~556-570):**
```typescript
) : (
  // Regular view: Dynamic filter columns
  visibleColumns.map((column) => (
    <TableHead key={column.id} className="p-2">
      {column.filterable !== false ? (
        <ColumnFilter
          value={columnFilters[column.id as keyof typeof columnFilters] || ''}
          onChange={(v) => updateColumnFilter(column.id as keyof typeof columnFilters, v)}
          placeholder="Filter..."
          options={columnOptions[`${column.id}s` as keyof typeof columnOptions] || columnOptions[column.id as keyof typeof columnOptions] || []}
        />
      ) : null}
    </TableHead>
  ))
)}
```

**Required change:**
```diff
) : (
- // Regular view: Dynamic filter columns
- visibleColumns.map((column) => (
-   <TableHead key={column.id} className="p-2">
-     {column.filterable !== false ? (
-       <ColumnFilter
-         value={columnFilters[column.id as keyof typeof columnFilters] || ''}
-         onChange={(v) => updateColumnFilter(column.id as keyof typeof columnFilters, v)}
-         placeholder="Filter..."
-         options={columnOptions[`${column.id}s` as keyof typeof columnOptions] || columnOptions[column.id as keyof typeof columnOptions] || []}
-       />
-     ) : null}
-   </TableHead>
- ))
+ // Regular view: Dynamic filter columns + actions column
+ <>
+   {visibleColumns.map((column) => (
+     <TableHead key={column.id} className="p-2">
+       {column.filterable !== false ? (
+         <ColumnFilter
+           value={columnFilters[column.id as keyof typeof columnFilters] || ''}
+           onChange={(v) => updateColumnFilter(column.id as keyof typeof columnFilters, v)}
+           placeholder="Filter..."
+           options={columnOptions[`${column.id}s` as keyof typeof columnOptions] || columnOptions[column.id as keyof typeof columnOptions] || []}
+         />
+       ) : null}
+     </TableHead>
+   ))}
+   <TableHead className="p-2" />
+ </>
)}
```

**Why Fragment is needed:** We need to render both the map AND the empty cell in the same conditional branch.

**Verify:**
- [ ] Save file
- [ ] No TypeScript errors
- [ ] In browser, inspect filter row
- [ ] Empty cell visible at far right (aligned with "Acties" header)
- [ ] No layout shifts or misalignment

---

### Step 4: Add Actions Column to Regular View Table Rows

**File:** `frontend/src/pages/Voorraad.tsx`
**Location:** Around lines 615-622 (table body section)

**Context:** Table body has two rendering paths for each row:
1. `statusFilter === 'bij_laser'` → Fixed cells with bij_laser actions (lines ~582-614)
2. Regular view → Dynamic cells from visibleColumns (lines ~615-622)

**Current regular view section (lines ~615-622):**
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

**Required change:**
```diff
) : (
- // Regular view: Dynamic cells
- visibleColumns.map((column) => (
-   <TableCell key={column.id}>
-     {column.accessor(plate)}
-   </TableCell>
- ))
+ // Regular view: Dynamic cells + actions column
+ <>
+   {visibleColumns.map((column) => (
+     <TableCell key={column.id}>
+       {column.accessor(plate)}
+     </TableCell>
+   ))}
+   <TableCell>
+     <div className="flex gap-2 justify-end">
+       <NaarLaserButton plate={plate} />
+     </div>
+   </TableCell>
+ </>
)}
```

**Important details:**
- Fragment wraps both the map AND the new actions cell
- `justify-end` aligns button to right (matches bij_laser actions)
- `gap-2` allows for future additional buttons
- NaarLaserButton automatically hides if `plate.status === 'bij_laser'` (built-in logic)

**Verify:**
- [ ] Save file
- [ ] No TypeScript errors
- [ ] In browser, view regular tab (Alle/Beschikbaar/Geclaimd)
- [ ] "Naar Laser" button visible in rightmost column for each plate
- [ ] Button is orange-themed with Zap icon
- [ ] Button does NOT appear for plates with status 'bij_laser'

---

### Step 5: Update Empty State Colspan

**File:** `frontend/src/pages/Voorraad.tsx`
**Location:** Line 628 (empty state row)

**Current code:**
```typescript
<TableCell colSpan={statusFilter === 'bij_laser' ? 5 : visibleColumns.length}>
```

**Required change:**
```diff
-<TableCell colSpan={statusFilter === 'bij_laser' ? 5 : visibleColumns.length}>
+<TableCell colSpan={statusFilter === 'bij_laser' ? 5 : visibleColumns.length + 1}>
```

**Rationale:** Regular view now has `visibleColumns.length + 1` columns (dynamic columns + actions column).

**Verify:**
- [ ] Save file
- [ ] No TypeScript errors
- [ ] In browser, apply filters to get empty state
- [ ] Empty state message spans full table width
- [ ] No visual gaps or misalignment

---

### Step 6: Remove "Naar Laser" Button from PlateDetailsModal

**File:** `frontend/src/components/PlateDetailsModal.tsx`
**Location:** Lines 357-368 (action buttons section)

**Current code to REMOVE:**
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

**Action:** Delete lines 357-368 entirely.

**DO NOT remove (keep these):**
- "Van Laser" button (different functionality, only shows when plate.status === 'bij_laser')
- "Consumeren" button
- Other modal content

**Verify:**
- [ ] Save file
- [ ] No TypeScript errors
- [ ] In browser, open PlateDetailsModal
- [ ] "Naar Laser" button NO LONGER visible in modal
- [ ] "Van Laser" button still present (when plate at laser)
- [ ] "Consumeren" button still present

---

### Step 7: Optional Cleanup (After Testing)

**File:** `frontend/src/components/PlateDetailsModal.tsx`

**Only proceed if ALL tests pass.**

**Check if these imports/functions are still used elsewhere in PlateDetailsModal:**

1. **useMoveToLaser hook** (line ~20-30 area):
   ```typescript
   import { useMoveToLaser } from '../hooks/usePlateStock'
   ```
   - Search file for other usages of `useMoveToLaser` or `moveToLaser`
   - If NO other usage found → Remove import

2. **handleNaarLaser function** (lines ~90-99):
   ```typescript
   const handleNaarLaser = async () => {
     // ... function body
   }
   ```
   - Search file for other usages of `handleNaarLaser`
   - If NO other usage found → Remove function

3. **Zap icon** (line ~10-15 area):
   ```typescript
   import { Zap, ... } from 'lucide-react'
   ```
   - Search file for other usages of `Zap`
   - If NO other usage found → Remove from import statement

**How to verify:** Use Find in File (Ctrl+F / Cmd+F) to search for each identifier.

**Verify after cleanup:**
- [ ] No TypeScript errors after removing unused imports
- [ ] No ESLint warnings about unused variables
- [ ] Modal still functions normally

---

## Testing Checklist

### Functional Testing

**1. Regular View Tabs (Alle, Beschikbaar, Geclaimd):**
- [ ] "Acties" column header visible at far right
- [ ] "Acties" column aligned right
- [ ] NaarLaserButton visible for plates with status !== 'bij_laser'
- [ ] Button shows orange styling (border-orange-200, hover:bg-orange-50)
- [ ] Button shows Zap icon + "Naar Laser" text
- [ ] Clicking button moves plate to Bij Laser tab
- [ ] Success toast notification appears
- [ ] Button shows loading state during API call
- [ ] Button does NOT open PlateDetailsModal when clicked
- [ ] Clicking table row (NOT button) opens PlateDetailsModal

**2. Bij Laser Tab:**
- [ ] Existing action buttons unchanged (Terugleggen, Restant, Verbruikt)
- [ ] "Acties" column header present (from existing implementation)
- [ ] No "Naar Laser" button visible (plates already at laser)
- [ ] Layout identical to pre-implementation state

**3. PlateDetailsModal:**
- [ ] Modal opens when clicking table row
- [ ] "Naar Laser" button NO LONGER visible in modal
- [ ] "Van Laser" button still visible when plate.status === 'bij_laser'
- [ ] "Consumeren" button still visible
- [ ] All other modal functionality unchanged

**4. Edge Cases:**
- [ ] Empty table state shows correct colspan (no gaps)
- [ ] Horizontal scroll works with new column (if table overflows)
- [ ] Column reordering via drag-and-drop doesn't affect actions column
- [ ] Actions column remains fixed at right
- [ ] Search/filter doesn't affect actions column visibility
- [ ] Switching between tabs preserves actions column in regular views

**5. Column Preferences Integration:**
- [ ] Open Column Visibility Popover
- [ ] Verify "Acties" is NOT in the preferences list
- [ ] Toggle several columns on/off
- [ ] Verify "Acties" column remains visible regardless of preferences
- [ ] Verify actions column stays at rightmost position

### Visual Regression Testing

- [ ] Table alignment correct (no shifted columns)
- [ ] Button size consistent (size="sm")
- [ ] Button styling matches design system
- [ ] No layout shifts when button appears/disappears
- [ ] Responsive behavior intact (mobile/tablet/desktop)

### Performance Testing

- [ ] No console errors or warnings
- [ ] No network errors in DevTools Network tab
- [ ] Table renders smoothly with 100+ plates
- [ ] Button interactions feel instant (no lag)

---

## Acceptance Criteria

### Must Have (Blocking):
✅ NaarLaserButton appears in actions column for regular view tabs
✅ Clicking button moves plate to laser WITHOUT opening modal
✅ Row click still opens modal (button stops propagation)
✅ "Naar Laser" button removed from PlateDetailsModal
✅ Bij Laser tab layout unchanged
✅ No console errors or TypeScript warnings

### Should Have (Important):
✅ Actions column aligned to right
✅ Orange theme styling consistent
✅ Loading states work correctly
✅ Success/error toasts display
✅ Empty state colspan correct

### Nice to Have (Optional):
✅ Unused imports cleaned up
✅ Code comments updated
✅ No ESLint warnings

---

## User Experience Flow Comparison

### Before (Current - 5 steps):
1. User sees plate in Voorraad table
2. Clicks row → PlateDetailsModal opens
3. Waits for modal animation
4. Scrolls to bottom of informatie tab
5. Clicks "Naar Laser" button
6. Modal closes, plate moves to Bij Laser tab

**Total: ~3-5 seconds, 2 clicks, 1 scroll**

### After (Desired - 1 step):
1. User sees plate in Voorraad table
2. Clicks "Naar Laser" button directly in row
3. Plate instantly moves to Bij Laser tab

**Total: ~1 second, 1 click, 0 scrolls**

**Improvement: 60-80% faster, 50% fewer clicks**

---

## Troubleshooting

### Issue: Button doesn't appear in table

**Possible causes:**
- [ ] NaarLaserButton not imported → Check imports section
- [ ] plate.status === 'bij_laser' → Button intentionally hidden
- [ ] Viewing bij_laser tab → Actions column different in that tab
- [ ] Actions column not added to table row → Check Step 4

**Debug:**
```typescript
// Temporarily add to table row to debug:
<TableCell>
  <div className="flex gap-2 justify-end">
    DEBUG: {plate.status} / {plate.id}
    <NaarLaserButton plate={plate} />
  </div>
</TableCell>
```

### Issue: Clicking button opens modal

**Possible causes:**
- [ ] NaarLaserButton missing `e.stopPropagation()` → Check component code (should have it)
- [ ] onClick handler on wrong element → Verify button has onClick, not wrapper div
- [ ] Event bubbling override → Check for other event handlers in parent chain

**Debug:**
```typescript
// Add to NaarLaserButton onClick:
const handleMoveToLaser = async (e: React.MouseEvent) => {
  console.log('Button clicked, event:', e.type)
  e.stopPropagation()
  console.log('Propagation stopped')
  // ... rest of handler
}
```

### Issue: Layout misaligned (columns don't line up)

**Possible causes:**
- [ ] Missing empty filter cell → Check Step 3
- [ ] colspan calculation wrong → Check Step 5
- [ ] Actions column added to bij_laser tab by mistake → Check conditional rendering
- [ ] Header row missing actions column → Check Step 2

**Debug:**
- Open browser DevTools
- Inspect table structure
- Count `<th>` elements in header row
- Count `<td>` elements in data row
- Counts should match

### Issue: TypeScript errors about PlateWithRelations

**Possible causes:**
- [ ] Type not imported → Add: `import type { PlateWithRelations } from '../types/database'`
- [ ] Type definition missing in database.ts → Check if PlateWithRelations exists
- [ ] Props passed incorrectly → Verify `plate={plate}` syntax

**Fix:**
```typescript
// Verify NaarLaserButton.tsx has correct import:
import type { PlateWithRelations } from '../types/database'
```

### Issue: Button always disabled or shows loading

**Possible causes:**
- [ ] useMoveToLaser mutation stuck → Check React Query DevTools
- [ ] isLoading state not reset → Check button component state management
- [ ] API endpoint returning error → Check Network tab in DevTools

**Debug:**
```typescript
// Add to NaarLaserButton:
console.log('Button state:', {
  isLoading,
  isPending: moveToLaser.isPending,
  disabled: isLoading || moveToLaser.isPending
})
```

### Issue: Actions column appears in bij_laser tab

**Possible causes:**
- [ ] Conditional check wrong → Verify `statusFilter !== 'bij_laser'` logic
- [ ] Added to wrong code branch → Review Step 2 and Step 4 carefully

**Fix:**
- Actions column should ONLY be in the `} : (` branch (regular view)
- NOT in the `{statusFilter === 'bij_laser' ? (` branch

---

## Rollback Plan

**If critical issues occur and immediate rollback is needed:**

### Option 1: Git Revert (Recommended)
```bash
# From project root
cd frontend
git checkout HEAD -- src/pages/Voorraad.tsx
git checkout HEAD -- src/components/PlateDetailsModal.tsx
npm run dev
```

### Option 2: Manual Revert
1. **Voorraad.tsx:**
   - Remove NaarLaserButton import
   - Remove actions column from table rows (remove Fragment and actions cell)
   - Remove "Acties" header from regular view
   - Remove empty filter cell for actions column
   - Revert colspan to `visibleColumns.length`

2. **PlateDetailsModal.tsx:**
   - Restore "Naar Laser" button (lines 357-368 from git history)
   - Restore handleNaarLaser function if removed
   - Restore useMoveToLaser and Zap imports if removed

3. **Verify:**
   - Backend still running
   - Frontend recompiles without errors
   - Navigate to Voorraad page
   - Open PlateDetailsModal
   - Verify "Naar Laser" button appears in modal

### Option 3: Stash Changes
```bash
git stash push -m "WIP: Naar Laser inline button - needs debugging"
# Later, to restore:
git stash pop
```

---

## Success Metrics

**Quantitative:**
- Clicks to move plate to laser: **5 → 1 (80% reduction)**
- Time to move plate to laser: **3-5s → 1s (70% reduction)**
- User actions required: **3 (click, scroll, click) → 1 (click)**

**Qualitative:**
- Faster workflow for werkplaats users
- Reduced cognitive load (no modal context switch)
- Consistent pattern with bij_laser tab actions
- Better discoverability (action visible immediately)

---

## Files Modified Summary

```
frontend/src/pages/Voorraad.tsx
  ✓ Add NaarLaserButton import
  ✓ Add "Acties" column header to regular view (verify/add)
  ✓ Add empty filter cell for actions column
  ✓ Add actions column to table rows with NaarLaserButton
  ✓ Update empty state colspan (+1)

frontend/src/components/PlateDetailsModal.tsx
  ✓ Remove "Naar Laser" button (lines 357-368)
  ✓ Optional: Remove handleNaarLaser function
  ✓ Optional: Remove useMoveToLaser and Zap imports
```

**Lines modified:** ~30-40 lines
**Files touched:** 2 files
**New files:** 0
**Dependencies added:** 0

---

## Post-Implementation Tasks

**After successful implementation and testing:**

1. **Code Review:**
   - [ ] Self-review changes in git diff
   - [ ] Verify no unintended changes
   - [ ] Check for console.log statements to remove
   - [ ] Verify code formatting (Prettier)

2. **Documentation:**
   - [ ] Update component documentation if needed
   - [ ] Add comments for complex logic
   - [ ] Update user guide if exists

3. **Commit:**
   - [ ] Stage changes: `git add frontend/src/pages/Voorraad.tsx frontend/src/components/PlateDetailsModal.tsx`
   - [ ] Commit with descriptive message:
     ```bash
     git commit -m "Phase 8: Add inline 'Naar Laser' button to Voorraad table

     - Move Naar Laser functionality from modal to table rows
     - Add actions column to regular view tabs
     - Remove Naar Laser button from PlateDetailsModal
     - Reduce workflow from 5 steps to 1 click

     Improves werkplaats user efficiency by 80%"
     ```

4. **Deploy/Test:**
   - [ ] Test in production-like environment
   - [ ] Verify with actual werkplaats users
   - [ ] Monitor for errors in production logs

---

## References

**Related Components:**
- `NaarLaserButton.tsx` - Main component being integrated
- `LocationReturnButton.tsx` - Similar inline action pattern
- `RemnantButton.tsx` - Similar inline action pattern
- `ConsumeButton.tsx` - Similar inline action pattern

**Related Hooks:**
- `useMoveToLaser()` - API mutation for moving plates to laser
- `usePlateStock()` - Main data fetching hook

**Related Files:**
- `backend/api/platestock.py` - API endpoint: `POST /api/platestock/plates/{id}/naar-laser`
- `frontend/src/hooks/usePlateStock.ts` - React Query mutations

**Design System:**
- Orange theme for laser-related actions (border-orange-200, hover:bg-orange-50)
- Button size: `sm` for inline actions
- Icon size: `h-3 w-3` for small buttons

---

## Questions or Issues?

**If you encounter issues not covered in troubleshooting:**

1. Check browser console for errors
2. Check backend logs for API errors
3. Review git diff to verify changes match this document
4. Test in clean browser session (clear cache/cookies)
5. Verify prerequisites in pre-implementation checklist

**Common gotchas:**
- Forgetting Fragment wrapper when adding actions cell
- Adding actions column to bij_laser tab by mistake
- Not updating colspan for empty state
- Removing wrong button from modal (keep "Van Laser")

---

**END OF IMPLEMENTATION PROMPT**

*Last updated: 2025-12-18*
*Version: 2.0 (Optimized)*
