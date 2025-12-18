# Linear-Inspired Design System Implementation Phases

This document outlines the phased approach to transforming the MES Kersten interface into a modern, Linear-inspired SaaS application.

## Design Values
- Rust (calm)
- Focus
- Productiviteit
- Minimale visuele ruis
- Data-first

## Style Reference
Linear.app - emphasis on whitespace, subtle colors, data readability, minimal chrome.

---

## Phase 1: Foundation & Layout Architecture

**Goal:** Create a collapsible sidebar layout system for the MES Kersten application, inspired by Linear.app's minimal design.

**Requirements:**
- Create a reusable Layout component with collapsible left sidebar
- Sidebar should be 240px expanded, 60px collapsed
- Include: Dashboard, Projecten, Voorraad, Claims navigation items
- Header with "MES Kersten" branding (left) and user profile menu (right)
- Use subtle borders, minimal shadows, focus on whitespace
- Implement smooth collapse/expand transitions
- Store collapse state in localStorage

**Tech:** React + TypeScript, TailwindCSS, shadcn/ui components

**Files to modify:**
- `frontend/src/components/Layout.tsx` (enhance existing or create new)

---

## Phase 2: Table View Component

**Goal:** Create a Linear-style data table component for the Voorraad page.

**Requirements:**
- Replace current card grid with comfortable table layout
- Columns: Plaatnummer, Status, Claims, Materiaal, Specificatie, Afmetingen, Dikte, Locatie
- Status as subtle pill badges (not bold colors)
- Claims show as compact project code labels (STAGR, SCCI, KLPRO25)
- Hover on claims shows phase tooltip
- Row hover effects (subtle background change)
- Comfortable row height (48-56px), generous padding
- Sticky header on scroll
- Use Inter or system font stack

**Styling:**
- Minimal borders (1px #e5e5e5)
- #fafafa backgrounds
- Focus on data readability

**Tech:** shadcn/ui Table component, TailwindCSS

**Files to modify:**
- `frontend/src/pages/Voorraad.tsx`
- Create new table component if needed

---

## Phase 3: Filtering System

**Goal:** Add Linear-inspired filter controls above the Voorraad table.

**Requirements:**
- Filter bar with subtle background (bg-gray-50)
- Filters: Materiaal, Specificatie, Oppervlaktebewerking, Dikte (dropdowns)
- Visual active filter indicators (pill badges with × to remove)
- Sort dropdown: Grootte, Dikte (with asc/desc toggle)
- "Clear all" button when filters active
- Minimal visual weight - focus stays on data

**Behavior:**
- Client-side filtering
- Instant feedback
- Preserve in URL query params

**Design:**
- Use shadcn/ui Select components
- Muted colors
- 2px rounded corners

**Files to modify:**
- `frontend/src/pages/Voorraad.tsx`
- Create filter components if needed

---

## Phase 4: View Toggle & Claims Display

**Goal:** Add table/card view toggle and enhance claims visualization.

**Requirements:**
- Toggle button in header (table icon vs grid icon)
- Table view (default): shows claims as inline project code chips
- Card view (optional): current grid layout as fallback
- Claims hover tooltip shows: Project naam, Fase nummer, M² geclaimd, Datum
- Keep tooltip timing snappy (100ms delay)

**Claims styling:**
- Compact chips: 24px height, 8px padding, text-xs
- Use subtle colors (blue-50 bg, blue-700 text)
- Max 3 visible, then "+X more" indicator

**Files to modify:**
- `frontend/src/pages/Voorraad.tsx`
- Create ClaimChip component if needed

---

## Phase 5: Polish & Consistency

**Goal:** Apply Linear-inspired design system site-wide to all MES pages.

**Scope:** Dashboard, Projecten, Claims, Werkplaats, Admin

**Consistency checklist:**
- All pages use new Layout component with sidebar
- Consistent spacing scale (4, 8, 12, 16, 24, 32px)
- Unified color palette (grays, one accent color)
- Typography scale (text-sm, base, lg, xl, 2xl)
- Button styles consistent (subtle default, primary for main actions)
- Form inputs uniform height and styling
- Loading states and empty states with minimal illustrations

**Values:**
- Reduce visual noise
- Maximize data density
- Fast interactions

**Files to modify:**
- All page components
- `tailwind.config.js` for design tokens
- Global CSS if needed

---

## Implementation Notes

### Typography
- Primary font: Inter or system font stack
- Font weights: 400 (regular), 500 (medium), 600 (semibold)
- Line heights: comfortable (1.5-1.6 for body text)

### Colors
- Backgrounds: white, gray-50, gray-100
- Borders: gray-200, gray-300
- Text: gray-900 (primary), gray-600 (secondary), gray-400 (tertiary)
- Accent: One primary brand color (blue/purple recommended)
- Status colors: Subtle versions (green-50/green-700, blue-50/blue-700, orange-50/orange-700)

### Spacing
- Use 4px base unit
- Common values: 4, 8, 12, 16, 24, 32, 48, 64px
- Generous whitespace between sections

### Components
- Buttons: Subtle shadows, hover state transitions
- Inputs: 40px height, subtle borders, focus rings
- Pills/Badges: Small (24px height), rounded (4px), minimal
- Modals: Centered, max 600px width, overlay with backdrop blur

### Interactions
- Transitions: 150-200ms for most interactions
- Loading states: Skeleton screens or subtle spinners
- Hover effects: Subtle background changes, no dramatic shadows
- Focus states: Clear keyboard navigation indicators
