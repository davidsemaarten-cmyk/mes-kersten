# MES Kersten UI/UX Improvements Implementation Plan

## Executive Summary

This document provides a comprehensive, phase-based implementation plan for seven key improvements to the MES Kersten application. The improvements focus on access control, user experience enhancements, and modern UI patterns consistent with Linear's design system.

**Estimated Total Effort:** 16-20 hours across 7 phases

**Key Technical Considerations:**
- Existing permissions system via `usePermissions()` hook
- shadcn/ui component library for consistent UI
- React Query for data fetching and caching
- Role-based access control with 8 roles
- Backend service layer pattern for business logic

---

## Phase Overview

| Phase | Feature | Complexity | Estimated Time | Dependencies |
|-------|---------|------------|----------------|--------------|
| 1 | Remove Werkplaats Page | Low | 1-2 hours | None |
| 2 | Projects Page Access Control | Low | 1-2 hours | None |
| 3 | Reusable Project/Phase Combobox | Medium | 3-4 hours | None |
| 4 | Advanced Table Filtering (Voorraad) | Medium-High | 4-5 hours | None |
| 5 | Sortable Thickness Column | Low-Medium | 2-3 hours | Phase 4 (optional) |
| 6 | Linear-Style Modal Design | Medium | 2-3 hours | Phase 7 (for testing) |
| 7 | Move Plate to Laser (Werkplaats Role) | Medium | 3-4 hours | Phase 2, 6 |

**Recommended Execution Order:** 1 → 2 → 3 → 4 → 5 → 6 → 7

---

## Phase 1: Remove Werkplaats Page

### Prompt 1.1: Remove Werkplaats Page and Navigation

```
Remove the Werkplaats page from the MES Kersten application while preserving the Voorraad (inventory) page as the main inventory view.

REQUIREMENTS:

1. Remove Werkplaats page component:
   - Delete or archive: frontend/src/pages/Werkplaats.tsx
   - Document in git commit that this page was intentionally removed

2. Remove Werkplaats route from App.tsx:
   - File: frontend/src/App.tsx
   - Remove the route definition for /werkplaats path
   - Ensure Voorraad route at /voorraad remains intact

3. Remove Werkplaats navigation link:
   - File: frontend/src/components/Layout.tsx
   - Remove the navigation menu item/button for Werkplaats
   - Keep the Voorraad navigation item

4. Verify no broken imports:
   - Search codebase for any remaining imports of Werkplaats component
   - Remove or update any references found
   - Use: grep -r "Werkplaats" frontend/src/ to find references

5. Update permissions/navigation logic if needed:
   - Check if usePermissions() hook references Werkplaats page
   - File: frontend/src/hooks/usePermissions.ts
   - Remove any Werkplaats-specific permissions if they exist

TESTING CHECKLIST:
□ Application builds without errors (npm run build)
□ No console errors when navigating the app
□ Voorraad page still accessible at /voorraad
□ Navigation menu does not show Werkplaats option
□ Direct navigation to /werkplaats shows 404 or redirects appropriately
□ All user roles can still access Voorraad page

SAFETY CONSIDERATIONS:
- Keep Werkplaats.tsx file in git history (don't force delete)
- Ensure Voorraad page functionality is unchanged
- Test with multiple user roles (admin, werkvoorbereider, werkplaats)

FILES TO MODIFY:
- frontend/src/App.tsx (remove route)
- frontend/src/components/Layout.tsx (remove nav item)
- frontend/src/pages/Werkplaats.tsx (delete or archive)

ROLLBACK PLAN:
If issues arise, revert the commit and restore Werkplaats route and component from git history.
```

---

## Phase 2: Projects Page Access Control

### Prompt 2.1: Implement Role-Based Projects Page Visibility

```
Restrict the Projects page navigation menu button to only admin and werkvoorbereider roles. Other roles should not see the Projects menu option.

REQUIREMENTS:

1. Update Layout navigation to check permissions:
   - File: frontend/src/components/Layout.tsx
   - Import usePermissions hook: import { usePermissions } from '@/hooks/usePermissions';
   - Get permissions: const { permissions } = usePermissions();
   - Conditionally render Projects nav item based on permissions.canCreateProjects

2. Verify permissions logic in usePermissions hook:
   - File: frontend/src/hooks/usePermissions.ts
   - Ensure canCreateProjects permission is true ONLY for admin and werkvoorbereider roles
   - Expected logic from types/roles.ts:
     - admin: canCreateProjects = true
     - werkvoorbereider: canCreateProjects = true
     - All other roles: canCreateProjects = false

3. Keep Projects page route accessible (for direct URL access):
   - File: frontend/src/App.tsx
   - Keep the /projects route definition
   - The route itself remains accessible (backend will enforce permissions if needed)
   - We're only hiding the UI navigation element

4. Add backend permission check (defensive coding):
   - File: backend/api/projects.py (if it exists, or relevant API file)
   - Add role check to project creation endpoints
   - Use pattern from platestock.py: check_admin_or_werkvoorbereider()
   - Return 403 Forbidden if user lacks permissions

5. Visual verification:
   - Projects menu button should be visible when logged in as admin
   - Projects menu button should be visible when logged in as werkvoorbereider
   - Projects menu button should be HIDDEN for: werkplaats, logistiek, tekenaar, laser, buislaser, kantbank

TESTING CHECKLIST:
□ Log in as admin → Projects menu button visible
□ Log in as werkvoorbereider → Projects menu button visible
□ Log in as werkplaats → Projects menu button NOT visible
□ Log in as other roles (logistiek, tekenaar, etc.) → Projects menu button NOT visible
□ Direct URL access to /projects shows appropriate permission error or redirects for unauthorized roles
□ No console errors when navigating with different roles
□ Page layout doesn't have visual glitches from conditional rendering

CODE EXAMPLE (Layout.tsx):

import { usePermissions } from '@/hooks/usePermissions';

function Layout() {
  const { permissions } = usePermissions();

  return (
    <nav>
      {/* Other nav items */}
      <NavItem to="/voorraad">Voorraad</NavItem>

      {permissions.canCreateProjects && (
        <NavItem to="/projects">Projects</NavItem>
      )}

      {/* Other nav items */}
    </nav>
  );
}

BACKEND PATTERN (projects.py):

from fastapi import HTTPException, Depends
from models.user import User
from api.auth import get_current_user

def check_can_create_projects(current_user: User = Depends(get_current_user)):
    allowed_roles = ['admin', 'werkvoorbereider']
    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail="Only admin and werkvoorbereider can create projects"
        )
    return current_user

# Use in route:
@router.post("/projects")
async def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(check_can_create_projects),
    db: Session = Depends(get_db)
):
    # Create project logic
    pass

FILES TO MODIFY:
- frontend/src/components/Layout.tsx (conditional rendering)
- frontend/src/hooks/usePermissions.ts (verify permissions logic)
- backend/api/projects.py (add permission check)

ROLLBACK PLAN:
Remove the conditional rendering from Layout.tsx to restore visibility for all roles.
```

---

## Phase 3: Reusable Project/Phase Combobox

### Prompt 3.1: Create Searchable Project Combobox Component

```
Create a reusable, searchable project/phase combobox component that can be used across multiple pages for selecting projects. This component should combine dropdown functionality with search/autocomplete capabilities, following shadcn/ui patterns.

REQUIREMENTS:

1. Create the base Combobox component using shadcn/ui:
   - Install shadcn/ui Combobox if not already present:
     npx shadcn-ui@latest add combobox
   - This creates: frontend/src/components/ui/combobox.tsx
   - Uses Radix UI Popover + Command components

2. Create ProjectPhaseCombobox wrapper component:
   - File: frontend/src/components/ProjectPhaseCombobox.tsx
   - Props interface:
     interface ProjectPhaseComboboxProps {
       value?: string;              // Selected project ID
       onValueChange: (value: string) => void;  // Callback when selection changes
       placeholder?: string;         // Placeholder text (default: "Selecteer project...")
       disabled?: boolean;          // Disable the combobox
       filterPhasesByProject?: boolean;  // If true, also show phases
       className?: string;          // Additional CSS classes
     }
   - Fetches project data using React Query
   - Implements search/filter logic
   - Displays projects in dropdown with search

3. Implement data fetching hook:
   - File: frontend/src/hooks/useProjects.ts (create new file)
   - Use React Query to fetch projects from backend
   - Cache strategy: staleTime: 5 minutes (projects don't change frequently)
   - API endpoint: GET /api/projects (create if doesn't exist)
   - Returns: { id: string, name: string, projectNumber: string, phases?: Phase[] }

4. Implement search/filter logic:
   - Filter by project name (case-insensitive)
   - Filter by project number
   - Show all results initially
   - Filter as user types (real-time)
   - Highlight matching text (optional enhancement)

5. Keyboard navigation:
   - Arrow keys to navigate filtered results
   - Enter to select
   - Escape to close dropdown
   - Tab to move to next field
   - This should be handled by shadcn/ui Command component

6. Visual design:
   - Consistent with existing shadcn/ui components
   - Dropdown arrow icon (chevron-down) on right side
   - Search icon inside input field
   - Max height for dropdown with scroll (e.g., max 300px)
   - Empty state message: "Geen projecten gevonden"

COMPONENT CODE STRUCTURE:

// frontend/src/hooks/useProjects.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Project {
  id: string;
  name: string;
  projectNumber: string;
  status: string;
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await api.get<Project[]>('/api/projects');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// frontend/src/components/ProjectPhaseCombobox.tsx
import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useProjects } from '@/hooks/useProjects';

interface ProjectPhaseComboboxProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ProjectPhaseCombobox({
  value,
  onValueChange,
  placeholder = "Selecteer project...",
  disabled = false,
  className,
}: ProjectPhaseComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const { data: projects = [], isLoading } = useProjects();

  const selectedProject = projects.find((p) => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className={cn("w-full justify-between", className)}
        >
          {selectedProject
            ? `${selectedProject.projectNumber} - ${selectedProject.name}`
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Zoek project..." />
          <CommandEmpty>Geen projecten gevonden.</CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-y-auto">
            {projects.map((project) => (
              <CommandItem
                key={project.id}
                value={`${project.projectNumber} ${project.name}`}
                onSelect={() => {
                  onValueChange(project.id);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === project.id ? "opacity-100" : "opacity-0"
                  )}
                />
                {project.projectNumber} - {project.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

BACKEND API ENDPOINT (if needed):

# backend/api/projects.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from api.auth import get_current_user
from typing import List

router = APIRouter(prefix="/api/projects", tags=["projects"])

@router.get("")
async def get_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[dict]:
    """Get all projects for combobox selection"""
    # TODO: Implement based on your Project model
    # Example:
    # projects = db.query(Project).filter(Project.is_active == True).all()
    # return [{"id": str(p.id), "name": p.name, "projectNumber": p.project_number, "status": p.status} for p in projects]
    return []

TESTING CHECKLIST:
□ Component renders without errors
□ Dropdown opens when clicking the button
□ Dropdown opens when clicking the chevron icon
□ Search input filters projects in real-time
□ Typing in search field shows filtered results
□ Selecting a project updates the value
□ Selected project displays in the trigger button
□ Keyboard navigation works (arrows, enter, escape)
□ Empty state shows when no projects match search
□ Loading state shows when fetching data
□ Component can be disabled
□ Component works when no projects exist
□ Multiple instances on same page work independently

INTEGRATION EXAMPLE:

// Usage in a form
import { ProjectPhaseCombobox } from '@/components/ProjectPhaseCombobox';

function ClaimForm() {
  const [selectedProject, setSelectedProject] = React.useState<string>('');

  return (
    <form>
      <div className="space-y-2">
        <label htmlFor="project">Project</label>
        <ProjectPhaseCombobox
          value={selectedProject}
          onValueChange={setSelectedProject}
          placeholder="Kies een project..."
        />
      </div>
    </form>
  );
}

FILES TO CREATE:
- frontend/src/components/ProjectPhaseCombobox.tsx (main component)
- frontend/src/hooks/useProjects.ts (data fetching hook)

FILES TO MODIFY:
- backend/api/projects.py (add GET endpoint if doesn't exist)

DEPENDENCIES:
- Ensure shadcn/ui combobox is installed
- Ensure shadcn/ui command component is installed
- lucide-react for icons

ROLLBACK PLAN:
Component is isolated and doesn't affect existing functionality. Simply remove the imports where it's used.
```

### Prompt 3.2: Integrate ProjectPhaseCombobox in Claims and Other Forms

```
Replace existing project input fields with the new ProjectPhaseCombobox component on the Claims page and any other pages where users select projects.

REQUIREMENTS:

1. Update Claims page to use ProjectPhaseCombobox:
   - File: frontend/src/pages/Claims.tsx
   - Find the claim creation form
   - Replace project input field with <ProjectPhaseCombobox />
   - Update form state to handle project ID
   - Ensure form validation works with new component

2. Identify other pages that need the combobox:
   - Search for project selection inputs:
     grep -r "project" frontend/src/pages/ --include="*.tsx"
   - Common locations:
     - Voorraad page (when claiming material from inventory)
     - Any modals that create claims or assign work
   - Replace manual input fields with ProjectPhaseCombobox

3. Update form validation:
   - Ensure project selection is required where appropriate
   - Add validation error states to ProjectPhaseCombobox
   - Display error messages below combobox

4. Maintain backward compatibility:
   - Don't remove the project creation page inputs
   - Projects page should keep its manual input fields for creating NEW projects
   - This component is only for SELECTING existing projects

5. Test data flow:
   - Selected project ID is correctly passed to API
   - API receives correct project UUID
   - Claims are created with correct project association
   - Error handling when project is not selected

TESTING CHECKLIST:
□ Claims page shows ProjectPhaseCombobox instead of text input
□ Selecting a project from dropdown populates the form correctly
□ Form submission includes correct project ID
□ Validation prevents submission without project selection
□ Error messages display appropriately
□ Existing claims still display correctly
□ All pages with project selection use the new component
□ Projects creation page still has manual input (unchanged)

FILES TO MODIFY:
- frontend/src/pages/Claims.tsx
- frontend/src/pages/Voorraad.tsx (if has claim creation)
- Any other pages with project selection

ROLLBACK PLAN:
Revert the import and restore original input field. Form state handling should be compatible.
```

---

## Phase 4: Advanced Table Filtering on Voorraad Page

### Prompt 4.1: Implement Column-Level Search Filters for Voorraad Table

```
Add search input fields directly below each column header in the Voorraad (inventory) table, enabling real-time, multi-column filtering of plate data.

REQUIREMENTS:

1. Identify current table implementation:
   - File: frontend/src/pages/Voorraad.tsx
   - Determine if using shadcn/ui Table component or custom table
   - Note current data structure and state management
   - Check if using React Query for data fetching

2. Add filter state management:
   - Create filter state object for each column:
     interface PlateFilters {
       plaatnummer: string;      // Plate number
       status: string;           // Status (beschikbaar, geclaimd, bij_laser)
       claims: string;           // Project claims
       materiaal: string;        // Material
       specificatie: string;     // Specification
       afmeting: string;         // Dimensions (width x length)
       dikte: string;            // Thickness
       locatie: string;          // Location
     }
   - Use React useState for filter values
   - Initialize with empty strings

3. Create filter input component:
   - File: frontend/src/components/ColumnFilter.tsx (create new)
   - Small input field that fits in table header row
   - Debounced input to avoid excessive re-renders (use useDebounce hook)
   - Clear button (X icon) when field has value
   - Props: { value: string; onChange: (value: string) => void; placeholder?: string }

4. Add filter row to table:
   - Insert a new row directly below the header row
   - Each cell contains a ColumnFilter component
   - Align with respective column width
   - Sticky positioning if table header is sticky

5. Implement filtering logic:
   - Filter data client-side (if dataset is small <1000 rows)
   - OR server-side (if dataset is large, add query params to API)
   - Case-insensitive search
   - Partial match (substring search)
   - Multiple filters combine with AND logic (all must match)
   - Example: materiaal filter "s2" shows only plates where material starts with/contains "s2"

6. Performance optimization:
   - Debounce filter input by 300ms
   - Use useMemo for filtered data
   - Virtualize table if row count > 500 (use @tanstack/react-virtual)

7. Visual design:
   - Input fields: smaller height than regular inputs (h-8)
   - Border: subtle border to distinguish from header
   - Background: slightly different shade (bg-gray-50)
   - Placeholder text: light gray, shows column name
   - Clear button: only visible when filter has value

COMPONENT CODE:

// frontend/src/components/ColumnFilter.tsx
import * as React from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ColumnFilterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ColumnFilter({ value, onChange, placeholder }: ColumnFilterProps) {
  const [localValue, setLocalValue] = React.useState(value);

  // Debounce the filter value
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(localValue);
    }, 300);
    return () => clearTimeout(timeout);
  }, [localValue, onChange]);

  // Update local value when prop changes
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <div className="relative">
      <Input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="h-8 text-sm pr-8"
      />
      {localValue && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-8 w-8 p-0"
          onClick={() => {
            setLocalValue('');
            onChange('');
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

VOORRAAD PAGE UPDATES:

// frontend/src/pages/Voorraad.tsx
import { ColumnFilter } from '@/components/ColumnFilter';

function Voorraad() {
  const [filters, setFilters] = React.useState<PlateFilters>({
    plaatnummer: '',
    status: '',
    claims: '',
    materiaal: '',
    specificatie: '',
    afmeting: '',
    dikte: '',
    locatie: '',
  });

  const { data: plates = [] } = usePlateStock();

  // Filter logic
  const filteredPlates = React.useMemo(() => {
    return plates.filter((plate) => {
      const matchesPlaatnummer = plate.plaatnummer
        .toLowerCase()
        .includes(filters.plaatnummer.toLowerCase());
      const matchesStatus = plate.status
        .toLowerCase()
        .includes(filters.status.toLowerCase());
      const matchesMateriaal = plate.materiaal?.materiaalgroep
        .toLowerCase()
        .includes(filters.materiaal.toLowerCase()) ?? true;
      const matchesSpecificatie = plate.materiaal?.specificatie
        ?.toLowerCase()
        .includes(filters.specificatie.toLowerCase()) ?? true;
      // ... other filters

      return (
        matchesPlaatnummer &&
        matchesStatus &&
        matchesMateriaal &&
        matchesSpecificatie
        // ... && other filters
      );
    });
  }, [plates, filters]);

  const updateFilter = (column: keyof PlateFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [column]: value }));
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Plaatnummer</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Claims</TableHead>
          <TableHead>Materiaal</TableHead>
          <TableHead>Specificatie</TableHead>
          <TableHead>Afmeting</TableHead>
          <TableHead>Dikte</TableHead>
          <TableHead>Locatie</TableHead>
        </TableRow>
        {/* Filter row */}
        <TableRow className="bg-gray-50">
          <TableHead className="p-2">
            <ColumnFilter
              value={filters.plaatnummer}
              onChange={(v) => updateFilter('plaatnummer', v)}
              placeholder="Filter..."
            />
          </TableHead>
          <TableHead className="p-2">
            <ColumnFilter
              value={filters.status}
              onChange={(v) => updateFilter('status', v)}
              placeholder="Filter..."
            />
          </TableHead>
          {/* ... other column filters */}
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredPlates.map((plate) => (
          <TableRow key={plate.id}>
            {/* plate data */}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

TESTING CHECKLIST:
□ Filter inputs appear below each column header
□ Typing in a filter updates the table in real-time (with debounce)
□ Case-insensitive search works correctly
□ Partial matches are found (e.g., "s2" matches "s235")
□ Multiple filters work together (AND logic)
□ Clear button (X) appears when filter has text
□ Clear button removes filter and shows all rows
□ Empty result shows appropriate message ("Geen platen gevonden")
□ Filter state persists during page interaction (not on refresh)
□ Performance is acceptable with full dataset
□ Filter inputs align properly with column widths
□ Mobile responsiveness (filters work on smaller screens)

PERFORMANCE NOTES:
- If plate count > 1000, consider server-side filtering
- Add loading state during filter operations
- Virtualize table rows for large datasets

FILES TO CREATE:
- frontend/src/components/ColumnFilter.tsx

FILES TO MODIFY:
- frontend/src/pages/Voorraad.tsx (add filter row and logic)

ROLLBACK PLAN:
Remove the filter row from table header and filtering logic. Original table display will be restored.
```

---

## Phase 5: Sortable Thickness Column

### Prompt 5.1: Add Sort Functionality to Thickness (Dikte) Column

```
Add a clickable sort icon to the "dikte" (thickness) column header that toggles between ascending, descending, and unsorted states.

REQUIREMENTS:

1. Add sort state management:
   - File: frontend/src/pages/Voorraad.tsx
   - Create sort state:
     type SortDirection = 'asc' | 'desc' | null;
     const [thicknessSortDirection, setThicknessSortDirection] = React.useState<SortDirection>(null);
   - Toggle logic: null → desc → asc → null (cycles through 3 states)

2. Add sort icon to column header:
   - Import icons from lucide-react:
     import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
   - Display in "Dikte" column header
   - Icon changes based on sort direction:
     - null: <ArrowUpDown /> (unsorted, both arrows)
     - desc: <ArrowDown /> (thick to thin)
     - asc: <ArrowUp /> (thin to thick)
   - Make header clickable (cursor-pointer)

3. Implement sort logic:
   - Parse thickness values to numbers (handle different formats)
   - Thickness stored as decimal in database (e.g., 3.0, 5.0, 10.0, 15.0)
   - Sort numerically, not lexicographically
   - Apply sorting AFTER filtering (if Phase 4 is implemented)
   - Use array.sort() with proper numeric comparison

4. Visual feedback:
   - Highlight sorted column header (different color/weight)
   - Smooth transition when sorting changes
   - Ensure sort icon is aligned with column text
   - Icon should be small (h-4 w-4) and positioned to right of text

5. Accessibility:
   - Add aria-label to sort button
   - Keyboard accessible (Enter/Space to toggle)
   - Screen reader announces sort direction

IMPLEMENTATION CODE:

// frontend/src/pages/Voorraad.tsx
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

function Voorraad() {
  const [thicknessSortDirection, setThicknessSortDirection] = React.useState<SortDirection>(null);

  // Toggle sort direction
  const toggleThicknessSort = () => {
    setThicknessSortDirection((current) => {
      if (current === null) return 'desc';
      if (current === 'desc') return 'asc';
      return null;
    });
  };

  // Get sort icon
  const ThicknessSortIcon = () => {
    if (thicknessSortDirection === 'desc') return <ArrowDown className="h-4 w-4 ml-1" />;
    if (thicknessSortDirection === 'asc') return <ArrowUp className="h-4 w-4 ml-1" />;
    return <ArrowUpDown className="h-4 w-4 ml-1" />;
  };

  // Apply sorting (after filtering if Phase 4 implemented)
  const sortedPlates = React.useMemo(() => {
    const filtered = filteredPlates || plates; // Use filtered data if available

    if (!thicknessSortDirection) return filtered;

    return [...filtered].sort((a, b) => {
      const thicknessA = parseFloat(a.dikte) || 0;
      const thicknessB = parseFloat(b.dikte) || 0;

      if (thicknessSortDirection === 'desc') {
        return thicknessB - thicknessA; // Thick to thin
      } else {
        return thicknessA - thicknessB; // Thin to thick
      }
    });
  }, [plates, filteredPlates, thicknessSortDirection]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Plaatnummer</TableHead>
          <TableHead>Status</TableHead>
          {/* ... other headers ... */}
          <TableHead
            className="cursor-pointer select-none hover:bg-gray-100 transition-colors"
            onClick={toggleThicknessSort}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleThicknessSort();
              }
            }}
            aria-label={`Sorteer op dikte ${
              thicknessSortDirection === 'desc'
                ? 'dik naar dun'
                : thicknessSortDirection === 'asc'
                ? 'dun naar dik'
                : 'ongesorteerd'
            }`}
          >
            <div className="flex items-center">
              Dikte
              <ThicknessSortIcon />
            </div>
          </TableHead>
          <TableHead>Locatie</TableHead>
        </TableRow>
        {/* Filter row if Phase 4 implemented */}
      </TableHeader>
      <TableBody>
        {sortedPlates.map((plate) => (
          <TableRow key={plate.id}>
            {/* ... plate data ... */}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

TESTING CHECKLIST:
□ Sort icon appears next to "Dikte" header text
□ Clicking header cycles through: unsorted → desc → asc → unsorted
□ Icon changes appropriately for each state
□ First click shows thick to thin (descending, e.g., 15, 10, 5, 3)
□ Second click shows thin to thick (ascending, e.g., 3, 5, 10, 15)
□ Third click returns to original/unsorted order
□ Numeric sorting works correctly (not alphabetical)
□ Sorting applies AFTER filtering (if filters are active)
□ Visual feedback on hover over header
□ Keyboard navigation works (Enter/Space to toggle)
□ Screen reader announces sort direction
□ No performance issues with large datasets

EDGE CASES TO TEST:
□ Plates with missing/null thickness values
□ Plates with non-numeric thickness values (should handle gracefully)
□ Sorting with filters active
□ Sorting after clearing filters

FILES TO MODIFY:
- frontend/src/pages/Voorraad.tsx (add sort state and logic)

ROLLBACK PLAN:
Remove sort state and icon from header. Table displays in default/database order.
```

---

## Phase 6: Linear-Style Modal Design

### Prompt 6.1: Redesign Voorraad Modal with Linear SaaS Aesthetics

```
Update the modal on the Voorraad page to implement a modern, clean design inspired by Linear's design system. Focus on spacing, typography, subtle animations, and visual hierarchy.

REQUIREMENTS:

1. Review existing documentation:
   - Check docs/DESIGN-TOKENS.md for existing design tokens
   - Check docs/LINEAR-DESIGN-IMPLEMENTATION.md for Linear design guidelines
   - Check docs/LINEAR-DESIGN-PHASES.md for implementation phases
   - Use these as reference for colors, spacing, and animation values

2. Update modal component structure:
   - File: frontend/src/pages/Voorraad.tsx (or separate modal component if extracted)
   - Use shadcn/ui Dialog component as base
   - Ensure modal uses proper semantic HTML

3. Apply Linear design principles:

   A. Layout & Spacing:
   - Generous whitespace (padding: 24px-32px)
   - Consistent spacing scale (4px, 8px, 12px, 16px, 24px, 32px, 48px)
   - Content sections with clear separation
   - Maximum content width for readability (~600px)

   B. Typography:
   - Clear hierarchy with size and weight
   - Modal title: text-xl font-semibold
   - Section labels: text-sm font-medium text-gray-500
   - Values: text-base font-normal text-gray-900
   - Consistent line-height for readability

   C. Colors:
   - Background: white (or very subtle gray for sections)
   - Borders: gray-200 (subtle, 1px)
   - Text primary: gray-900
   - Text secondary: gray-600
   - Text muted: gray-500
   - Interactive elements: brand color (blue-600 or as defined in design tokens)

   D. Shadows & Borders:
   - Soft, layered shadows for depth
   - Modal shadow: shadow-2xl or custom: 0 20px 25px -5px rgba(0, 0, 0, 0.1)
   - Subtle border-radius (8px-12px)
   - Minimal use of borders (only where needed for separation)

   E. Animations:
   - Smooth entrance: fade + scale (duration: 200ms)
   - Smooth exit: fade out (duration: 150ms)
   - Ease-out timing function
   - No jarring motions
   - Loading states with subtle skeleton or spinner

4. Modal structure:

   - Header:
     - Title (plate number or "Plaat Details")
     - Close button (X icon, top-right, subtle hover state)
     - Optional: Status badge

   - Body:
     - Organized sections (Material, Dimensions, Location, Claims, etc.)
     - Key-value pairs with labels above values
     - Use grid layout for multi-column data
     - Dividers between major sections (subtle 1px gray-200)

   - Footer:
     - Action buttons (right-aligned)
     - Primary action: filled button
     - Secondary action: outline or ghost button
     - Destructive action: red color with confirmation
     - Proper spacing between buttons (gap-3)

5. Component code structure:

// frontend/src/components/PlateDetailModal.tsx (extract if not already)
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PlateDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  plate: Plate | null;
  onAction?: () => void;
}

export function PlateDetailModal({ isOpen, onClose, plate, onAction }: PlateDetailModalProps) {
  if (!plate) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                {plate.plaatnummer}
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-1">Plaat Details</p>
            </div>
            <Badge variant={plate.status === 'beschikbaar' ? 'success' : 'default'}>
              {plate.status}
            </Badge>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="px-6 py-4 space-y-6">
          {/* Material Section */}
          <section>
            <h3 className="text-sm font-medium text-gray-500 mb-3">Materiaal</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Materiaalgroep</p>
                <p className="text-base text-gray-900">{plate.materiaal?.materiaalgroep}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Specificatie</p>
                <p className="text-base text-gray-900">{plate.materiaal?.specificatie}</p>
              </div>
            </div>
          </section>

          <div className="border-t border-gray-200" />

          {/* Dimensions Section */}
          <section>
            <h3 className="text-sm font-medium text-gray-500 mb-3">Afmetingen</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Breedte</p>
                <p className="text-base text-gray-900">{plate.breedte} mm</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Lengte</p>
                <p className="text-base text-gray-900">{plate.lengte} mm</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Dikte</p>
                <p className="text-base text-gray-900">{plate.dikte} mm</p>
              </div>
            </div>
          </section>

          {/* Additional sections... */}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Annuleren
          </Button>
          {onAction && (
            <Button onClick={onAction}>
              Actie
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

6. CSS customizations (if needed):

/* Add to global CSS or component-specific styles */
@keyframes modal-enter {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes modal-exit {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

.modal-content {
  animation: modal-enter 200ms ease-out;
}

.modal-content[data-state="closed"] {
  animation: modal-exit 150ms ease-in;
}

DESIGN TOKENS REFERENCE (if exists in docs/DESIGN-TOKENS.md):

// Example design tokens
const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '32px',
  '3xl': '48px',
};

const colors = {
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    500: '#6B7280',
    600: '#4B5563',
    900: '#111827',
  },
  // ...other colors
};

const shadows = {
  modal: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
};

TESTING CHECKLIST:
□ Modal has smooth entrance animation
□ Modal has smooth exit animation
□ Spacing is consistent throughout modal
□ Typography hierarchy is clear and readable
□ Colors match Linear design aesthetic
□ Shadows are subtle and create proper depth
□ Close button works and has hover state
□ Content is properly organized in sections
□ Key-value pairs are clearly labeled
□ Footer buttons are properly aligned
□ Primary/secondary button distinction is clear
□ Modal is responsive (works on mobile)
□ No visual glitches or layout shifts
□ Backdrop overlay is present and styled
□ Modal centers properly on screen
□ Content doesn't overflow (scrollable if needed)

VISUAL QA:
Compare against Linear app screenshots:
□ Similar spacing patterns
□ Similar use of gray tones
□ Similar shadow depth
□ Similar animation feel
□ Similar content organization

FILES TO MODIFY:
- frontend/src/pages/Voorraad.tsx (or extract to separate modal component)
- frontend/src/components/PlateDetailModal.tsx (create if extracting)
- Optional: Update global CSS for animations

DEPENDENCIES:
- shadcn/ui Dialog component
- shadcn/ui Badge component (for status)
- Existing design tokens from docs/

ROLLBACK PLAN:
Revert to previous modal styling. Functionality remains unchanged, only visual design is affected.
```

---

## Phase 7: Move Plate to Laser (Werkplaats Role)

### Prompt 7.1: Add "Move to Laser" Button for Werkplaats Role

```
Add a role-specific action button in the plate detail modal that allows users with the "werkplaats" role to move plates to the laser cutting station by updating the plate status to "bij_laser".

REQUIREMENTS:

1. Add permission check for werkplaats role:
   - Use existing usePermissions() hook or useAuth() hook
   - Check if current user has role === 'werkplaats'
   - Only show button if user has werkplaats role

2. Add "Verplaats naar Laser" button to modal:
   - File: frontend/src/components/PlateDetailModal.tsx (or Voorraad.tsx if not extracted)
   - Location: Modal footer, alongside other action buttons
   - Visibility: Only visible for werkplaats role
   - Conditions to show button:
     - User role is 'werkplaats'
     - Plate status is NOT already 'bij_laser'
     - Plate is not consumed (is_consumed === false)

3. Implement status update API call:
   - Endpoint: PATCH /api/platestock/plates/{plate_id}/status
   - Request body: { status: 'bij_laser' }
   - Use React Query mutation for optimistic updates
   - Show toast notification on success/error

4. Backend API endpoint (if doesn't exist):
   - File: backend/api/platestock.py
   - Create or update endpoint to handle status changes
   - Validate status transition (only certain statuses can change to bij_laser)
   - Log action in audit_logs table
   - Check user permissions (werkplaats can update status)

5. Update PlateStockService:
   - File: backend/services/platestock.py
   - Add method: update_plate_status_to_laser(plate_id, user_id)
   - Validate plate exists and is not consumed
   - Update status to 'bij_laser'
   - Log audit action using log_action() from utils/audit.py

6. Confirmation dialog (optional but recommended):
   - Show confirmation before moving plate
   - Message: "Weet je zeker dat je deze plaat naar de laser wilt verplaatsen?"
   - Prevents accidental status changes

7. UI feedback:
   - Loading state on button while API call is in progress
   - Success toast: "Plaat succesvol verplaatst naar laser"
   - Error toast: "Fout bij verplaatsen plaat: {error message}"
   - Close modal after successful move (optional)
   - Refresh plate list to show updated status

BACKEND IMPLEMENTATION:

# backend/api/platestock.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from api.auth import get_current_user
from services.platestock import PlateStockService
from utils.audit import log_action, AuditAction, EntityType

router = APIRouter(prefix="/api/platestock", tags=["platestock"])

@router.patch("/plates/{plate_id}/status")
async def update_plate_status_to_laser(
    plate_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update plate status to bij_laser (werkplaats role only)"""

    # Check user role
    if current_user.role != 'werkplaats':
        raise HTTPException(
            status_code=403,
            detail="Only werkplaats role can move plates to laser"
        )

    # Update status
    service = PlateStockService(db)
    try:
        plate = service.update_plate_status_to_laser(plate_id, str(current_user.id))

        # Log action
        log_action(
            db,
            str(current_user.id),
            AuditAction.UPDATE_PLATE,
            EntityType.PLATE,
            plate_id,
            details={"new_status": "bij_laser", "action": "moved_to_laser"}
        )

        db.commit()

        return {
            "success": True,
            "message": "Plate moved to laser successfully",
            "plate_id": plate_id,
            "new_status": "bij_laser"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update plate status")

# backend/services/platestock.py
class PlateStockService:
    def update_plate_status_to_laser(self, plate_id: str, user_id: str) -> Plate:
        """Update plate status to bij_laser"""
        plate = self.db.query(Plate).filter(Plate.id == plate_id).first()

        if not plate:
            raise ValueError("Plate not found")

        if plate.is_consumed:
            raise ValueError("Cannot move consumed plate to laser")

        if plate.status == 'bij_laser':
            raise ValueError("Plate is already at laser")

        plate.status = 'bij_laser'
        self.db.flush()

        return plate

FRONTEND IMPLEMENTATION:

// frontend/src/hooks/usePlateStock.ts (add mutation)
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export function useMovePlateToLaser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (plateId: string) => {
      const response = await api.patch(`/api/platestock/plates/${plateId}/status`, {
        status: 'bij_laser',
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Plaat succesvol verplaatst naar laser');
      queryClient.invalidateQueries({ queryKey: ['platestock'] });
    },
    onError: (error: any) => {
      toast.error(
        `Fout bij verplaatsen plaat: ${error.response?.data?.detail || 'Onbekende fout'}`
      );
    },
  });
}

// frontend/src/components/PlateDetailModal.tsx
import { useAuth } from '@/hooks/useAuth';
import { useMovePlateToLaser } from '@/hooks/usePlateStock';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function PlateDetailModal({ isOpen, onClose, plate }: PlateDetailModalProps) {
  const { user } = useAuth();
  const movePlateToLaser = useMovePlateToLaser();
  const [showConfirmation, setShowConfirmation] = React.useState(false);

  const canMoveToLaser =
    user?.role === 'werkplaats' &&
    plate?.status !== 'bij_laser' &&
    !plate?.is_consumed;

  const handleMoveToLaser = () => {
    if (!plate) return;

    movePlateToLaser.mutate(plate.id, {
      onSuccess: () => {
        setShowConfirmation(false);
        onClose(); // Close modal after successful move
      },
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          {/* ... modal content ... */}

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Sluiten
            </Button>

            {canMoveToLaser && (
              <Button
                onClick={() => setShowConfirmation(true)}
                disabled={movePlateToLaser.isPending}
              >
                {movePlateToLaser.isPending ? 'Bezig...' : 'Verplaats naar Laser'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Plaat verplaatsen naar laser?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je plaat {plate?.plaatnummer} naar de laser wilt verplaatsen?
              De status wordt aangepast naar "bij_laser".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleMoveToLaser}>
              Bevestigen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

TESTING CHECKLIST:
□ Button visible when logged in as werkplaats role
□ Button NOT visible for other roles (admin, werkvoorbereider, etc.)
□ Button NOT visible when plate status is already 'bij_laser'
□ Button NOT visible when plate is consumed
□ Confirmation dialog appears when button is clicked
□ Canceling confirmation closes dialog without action
□ Confirming moves plate to laser status
□ Success toast appears after successful move
□ Error toast appears if API call fails
□ Plate list refreshes to show updated status
□ Modal closes after successful move (if implemented)
□ Loading state shows during API call
□ Button is disabled during loading
□ Audit log entry is created in database
□ API enforces werkplaats role permission

API TESTING:
□ PATCH request succeeds with werkplaats role
□ PATCH request fails (403) with non-werkplaats role
□ PATCH request fails (400) if plate already bij_laser
□ PATCH request fails (400) if plate is consumed
□ PATCH request fails (404) if plate doesn't exist
□ Audit log contains correct action details

FILES TO CREATE/MODIFY:
- backend/api/platestock.py (add endpoint)
- backend/services/platestock.py (add service method)
- frontend/src/hooks/usePlateStock.ts (add mutation)
- frontend/src/components/PlateDetailModal.tsx (add button and confirmation)

DEPENDENCIES:
- Phase 2 (role permissions system)
- Phase 6 (modal design for UI integration)
- shadcn/ui AlertDialog component for confirmation

ROLLBACK PLAN:
Remove the button and mutation. No impact on existing plate status functionality.
```

---

## Implementation Dependencies Graph

```
Phase 1 (Remove Werkplaats Page)
  └─ No dependencies

Phase 2 (Projects Page Access Control)
  └─ No dependencies

Phase 3 (Project/Phase Combobox)
  └─ No dependencies

Phase 4 (Advanced Table Filtering)
  └─ No dependencies

Phase 5 (Sortable Thickness Column)
  └─ Optional: Phase 4 (for filtering + sorting)

Phase 6 (Linear-Style Modal)
  └─ No dependencies (but should be done before Phase 7 for visual consistency)

Phase 7 (Move Plate to Laser)
  ├─ Phase 2 (for role permissions understanding)
  └─ Phase 6 (for modal UI to add button to)
```

---

## Testing Strategy

### Unit Testing
- Test each component in isolation
- Mock API responses for frontend components
- Test permission checks with different user roles
- Test edge cases (null values, empty lists, etc.)

### Integration Testing
- Test data flow from frontend through API to database
- Test role-based access control end-to-end
- Test filtering + sorting combinations
- Test combobox with real project data

### User Acceptance Testing
- Test with actual werkvoorbereider users
- Test with werkplaats role users
- Verify all roles see appropriate UI elements
- Test on different screen sizes

### Regression Testing
After each phase:
- Verify existing functionality still works
- Check no new console errors
- Verify performance hasn't degraded
- Test backward compatibility

---

## Rollback Procedures

Each phase is designed to be independently reversible:

1. **Immediate Rollback**: Revert the git commit for that phase
2. **Partial Rollback**: Comment out new code while keeping imports
3. **Database Rollback**: No schema changes in these phases, only data updates
4. **Feature Flags**: Consider adding feature flags for risky changes (especially Phase 7)

---

## Post-Implementation Checklist

After completing all phases:

□ All tests passing
□ No console errors or warnings
□ Performance benchmarks met
□ Documentation updated (if needed)
□ User guide updated for new features
□ Accessibility review completed
□ Mobile responsiveness verified
□ Cross-browser testing completed
□ Security review for role-based features
□ Audit logging verified for sensitive actions
□ Backup created before production deployment

---

## Notes for Implementation

1. **Order Matters**: While most phases are independent, following the recommended order (1-7) ensures the smoothest implementation experience.

2. **Testing Between Phases**: Test thoroughly after each phase before moving to the next. This makes debugging easier.

3. **Git Commits**: Create separate commits for each phase with descriptive messages referencing the phase number.

4. **Documentation**: Update inline comments and component documentation as you implement.

5. **Performance**: Monitor bundle size and runtime performance, especially after Phase 4 (filtering) and Phase 5 (sorting).

6. **Design Consistency**: Refer to docs/DESIGN-TOKENS.md and docs/LINEAR-DESIGN-IMPLEMENTATION.md throughout implementation to maintain visual consistency.

7. **User Feedback**: Consider implementing these phases on a staging environment first to gather user feedback before production deployment.
