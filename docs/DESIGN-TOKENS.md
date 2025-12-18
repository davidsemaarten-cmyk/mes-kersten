# MES Kersten Design Tokens
**Linear-Inspired Design System**

This document defines the design tokens and patterns used across the MES Kersten application for consistency and maintainability.

## Design Values
- **Rust** (calm, minimal visual noise)
- **Focus** (data-first, clear hierarchy)
- **Productiviteit** (fast interactions, efficient workflows)
- **Minimaal** (reduce chrome, maximize content)

---

## Typography

### Font Family
```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Font Weights
- **Regular**: `400` - Body text
- **Medium**: `500` - Subtle emphasis
- **Semibold**: `600` - Headings, important labels

### Type Scale
```
text-xs     12px / 16px   - Captions, tiny labels
text-sm     14px / 20px   - Body text, table cells
text-base   16px / 24px   - Default body
text-lg     18px / 28px   - Section subheadings
text-xl     20px / 28px   - Card titles
text-2xl    24px / 32px   - Page headings
text-3xl    30px / 36px   - (Reserved, rarely used)
```

### Heading Styles
```tsx
// Page Title
<h1 className="text-2xl font-semibold text-gray-900">

// Section Title
<h2 className="text-lg font-semibold text-gray-900">

// Card Title
<h3 className="text-base font-semibold text-gray-900">

// Subtitle
<p className="text-sm text-gray-600 mt-1">
```

---

## Colors

### Neutral Grays
```
gray-50   #FAFAFA   - Subtle backgrounds (filters, headers)
gray-100  #F5F5F5   - Hover states, inactive buttons
gray-200  #E5E5E5   - Borders, separators
gray-300  #D4D4D4   - Input borders, secondary borders
gray-400  #A3A3A3   - Placeholder text, disabled state
gray-500  #737373   - Icons, secondary actions
gray-600  #525252   - Secondary text
gray-700  #404040   - (Rarely used)
gray-800  #262626   - (Rarely used)
gray-900  #171717   - Primary text, headings
```

### Backgrounds
```
Page:       bg-white
Panel:      bg-gray-50
Card:       bg-white
Hover:      hover:bg-gray-50
Active:     bg-gray-100
```

### Text Colors
```
Primary:    text-gray-900
Secondary:  text-gray-600
Tertiary:   text-gray-400
Muted:      text-muted-foreground (shadcn alias)
```

### Border Colors
```
Default:    border-gray-200
Input:      border-gray-300
Divider:    border-gray-200
```

### Accent Colors (Blue)
```
blue-50   #EFF6FF   - Pill backgrounds
blue-200  #BFDBFE   - Pill borders
blue-700  #1D4ED8   - Pill text, primary actions
```

### Status Colors (Subtle)
```
Success:
  bg-green-50 border-green-200 text-green-700

Info/Claimed:
  bg-blue-50 border-blue-200 text-blue-700

Warning:
  bg-orange-50 border-orange-200 text-orange-700

Error:
  bg-red-50 border-red-200 text-red-700
```

---

## Spacing Scale

Based on 4px units:
```
gap-1    4px
gap-2    8px
gap-3    12px
gap-4    16px
gap-6    24px
gap-8    32px
gap-12   48px
gap-16   64px

p-1      4px
p-2      8px
p-3      12px
p-4      16px
p-6      24px
p-8      32px

space-y-2    8px vertical
space-y-4    16px vertical
space-y-6    24px vertical
```

### Common Patterns
```tsx
// Page container
<div className="space-y-6">

// Section spacing
<div className="space-y-4">

// Inline elements
<div className="flex gap-2">
<div className="flex gap-3">

// Card padding
<Card className="p-6">
```

---

## Components

### Buttons

**Primary Action**
```tsx
<Button>
  <Plus className="h-4 w-4 mr-2" />
  Primary Action
</Button>
// Default: bg-primary (blue), white text, hover lift
```

**Secondary Action**
```tsx
<Button variant="outline">
  <Icon className="h-4 w-4 mr-2" />
  Secondary
</Button>
// Outline, gray border, subtle hover
```

**Ghost Button**
```tsx
<Button variant="ghost">
  Action
</Button>
// No border, subtle hover background
```

**Sizes**
```tsx
size="sm"      - 32px height, text-xs
(default)      - 40px height, text-sm
size="lg"      - 48px height, text-base
```

**Icon Sizing**
```tsx
// Standard icon in button
<Icon className="h-4 w-4 mr-2" />

// Icon-only button
<Icon className="h-4 w-4" />
```

### Inputs

**Standard Input**
```tsx
<Input
  className="border-gray-300 bg-white"
  placeholder="Placeholder..."
/>
// Height: 40px (h-10)
// Border: 1px gray-300
// Focus: ring-2 ring-primary
```

**Search Input**
```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
  <Input className="pl-10 border-gray-300 bg-white" />
</div>
```

### Badges/Pills

**Status Badge** (Subtle, Outline)
```tsx
<Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50">
  Status
</Badge>
// Height: 24px (h-6)
// Padding: px-2 py-0.5
// Text: text-xs
```

**Filter Badge** (Removable)
```tsx
<Badge variant="outline" className="gap-1 px-2 py-1 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100">
  Filter Value
  <X className="h-3 w-3 cursor-pointer" />
</Badge>
```

### Cards

**Standard Card**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content
  </CardContent>
</Card>
```

**Clickable Card**
```tsx
<Card className="cursor-pointer hover:shadow-lg transition-shadow">
  Content
</Card>
```

### Tables

**Table Structure**
```tsx
<Table>
  <TableHeader className="bg-gray-50 sticky top-0 z-10">
    <TableRow className="hover:bg-gray-50">
      <TableHead className="font-semibold text-gray-900">Column</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="cursor-pointer hover:bg-gray-50 transition-colors h-14">
      <TableCell className="font-medium text-gray-900">Data</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

**Row Height**: 56px (h-14) for comfortable spacing
**Header**: Sticky, gray-50 background
**Hover**: Subtle gray-50 background

### Loading States

**Spinner (Primary)**
```tsx
<div className="flex flex-col items-center justify-center py-12">
  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
  <p className="text-sm text-gray-600">Loading...</p>
</div>
```

**Inline Spinner**
```tsx
<Loader2 className="h-4 w-4 animate-spin text-gray-400" />
```

### Empty States

**Standard Empty State**
```tsx
<Card>
  <CardContent className="flex flex-col items-center justify-center py-12">
    <Icon className="h-12 w-12 text-gray-400 mb-4" />
    <h3 className="text-lg font-semibold mb-2 text-gray-900">No items found</h3>
    <p className="text-sm text-gray-600 mb-4">
      Description or suggestion
    </p>
    {/* Optional CTA */}
    <Button>
      <Plus className="h-4 w-4 mr-2" />
      Add First Item
    </Button>
  </CardContent>
</Card>
```

**Icon Size**: 48px (h-12 w-12)
**Icon Color**: text-gray-400
**Title**: text-lg font-semibold
**Description**: text-sm text-gray-600

### Filter Bars

```tsx
<div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
  <div className="flex flex-wrap items-center gap-3">
    {/* Filters */}
  </div>

  {/* Active filter badges (conditional) */}
  {hasActiveFilters && (
    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-200">
      {/* Badges */}
    </div>
  )}
</div>
```

---

## Layout Patterns

### Page Structure
```tsx
<Layout>
  <div className="space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Page Title</h1>
        <p className="text-sm text-gray-600 mt-1">Subtitle</p>
      </div>
      <div className="flex gap-2">
        {/* Actions */}
      </div>
    </div>

    {/* Search/Filters */}
    {/* Content */}
  </div>
</Layout>
```

### Grid Layouts

**Responsive Cards**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards */}
</div>
```

**Stats Grid**
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  {/* Stat cards */}
</div>
```

---

## Interactions

### Transitions
```
Duration: 150-200ms
Easing: ease-in-out (default)

transition-colors   - Color changes
transition-shadow   - Shadow changes
transition-all      - Multiple properties
```

### Hover States
```
Cards:      hover:shadow-lg transition-shadow
Buttons:    hover:bg-gray-100 (outline), automatic for default
Rows:       hover:bg-gray-50 transition-colors
Badges:     hover:bg-blue-100 transition-colors
```

### Focus States
```
Inputs:     focus:ring-2 focus:ring-primary focus:border-primary
Buttons:    focus:outline-none focus:ring-2 focus:ring-offset-2
Links:      focus:outline-none focus:ring-2 focus:ring-primary
```

---

## Accessibility

### Keyboard Navigation
- All interactive elements must be keyboard accessible
- Visible focus indicators on all focusable elements
- Logical tab order

### ARIA Labels
```tsx
// Icon-only buttons
<button aria-label="Close modal">
  <X className="h-4 w-4" />
</button>

// Toggles
<button
  aria-pressed={isActive}
  aria-label="Toggle view mode"
>
  <Icon />
</button>
```

### Color Contrast
- Text on white: minimum 4.5:1 (gray-900, gray-600 meet this)
- Interactive elements: minimum 3:1
- Status badges: tested for sufficient contrast

---

## Best Practices

### Do's ✅
- Use consistent spacing from the scale
- Stick to the gray palette for neutral elements
- Use semibold (600) for headings, medium (500) for subtle emphasis
- Keep button text concise
- Use icons to enhance, not replace, text labels
- Maintain generous whitespace between sections
- Use subtle hover states
- Implement loading and empty states

### Don'ts ❌
- Don't use arbitrary spacing values
- Don't use bold colors for neutral UI elements
- Don't stack too many visual effects (shadow + border + background)
- Don't use small touch targets (<40px height for interactive elements)
- Don't use color alone to convey information
- Don't animate excessively
- Don't use multiple accent colors

---

## Usage Examples

### Complete Page Example
```tsx
export function ExamplePage() {
  const [loading, setLoading] = useState(false)
  const { data, isLoading } = useQuery()

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Page Title</h1>
            <p className="text-sm text-gray-600 mt-1">
              {data ? `${data.length} items` : 'Loading...'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Icon className="h-4 w-4 mr-2" />
              Secondary
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Primary Action
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search..."
              className="pl-10 border-gray-300 bg-white"
            />
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-sm text-gray-600">Loading data...</p>
          </div>
        )}

        {/* Content */}
        {!isLoading && data && data.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Cards or Table */}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && data && data.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-gray-900">No items found</h3>
              <p className="text-sm text-gray-600 mb-4">
                Get started by adding your first item
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  )
}
```

---

## Maintenance

This design system should be updated when:
- New components are added
- Color palette changes
- Typography scale evolves
- New interaction patterns emerge

All changes should be documented here and communicated to the team.

**Last Updated:** 2025-01-15
**Version:** 1.0.0
**Status:** Active
