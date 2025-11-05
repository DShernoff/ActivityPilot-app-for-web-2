# Task Scheduler Frontend Design Guidelines

## Design Approach: Utility-First System Design

**Selected Approach**: Design System - Linear/Notion-inspired productivity interface
**Rationale**: This is a utility-focused productivity tool where clarity, efficiency, and data visualization are paramount. Drawing from Linear's modern aesthetic, Notion's organizational flexibility, and Todoist's task management patterns.

**Core Design Principles**:
- Information hierarchy over decoration
- Instant visual feedback for scheduling actions
- Scannable task lists with clear priority indicators
- Seamless dark/light mode consistency

---

## Color Palette

**Dark Mode (Primary)**:
- Background Base: 222 20% 12%
- Surface Elevated: 222 18% 16%
- Surface Interactive: 222 16% 20%
- Border Subtle: 222 12% 28%
- Text Primary: 220 15% 95%
- Text Secondary: 220 10% 70%
- Text Tertiary: 220 8% 55%

**Accent & Status Colors**:
- Primary Brand: 250 70% 62% (Purple-blue for primary actions)
- Success/Completed: 142 76% 36%
- Warning/Urgent: 25 95% 53%
- High Priority: 340 82% 52%
- Low Priority: 200 18% 46%

**Light Mode**:
- Background Base: 0 0% 100%
- Surface Elevated: 220 20% 98%
- Surface Interactive: 220 15% 95%
- Border Subtle: 220 13% 91%
- Text Primary: 222 47% 11%
- Text Secondary: 222 25% 35%

---

## Typography

**Font Families**:
- Primary: 'Inter' (Google Fonts) - UI elements, body text
- Monospace: 'JetBrains Mono' - timestamps, duration displays

**Type Scale**:
- Heading 1: text-3xl font-semibold (task list headers, page titles)
- Heading 2: text-xl font-semibold (section headers)
- Body Large: text-base font-medium (task names)
- Body Regular: text-sm (task metadata, descriptions)
- Caption: text-xs (timestamps, helper text)

---

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, 16, 20
- Component padding: p-4 to p-6
- Section gaps: gap-6 to gap-8
- Card spacing: p-6
- Tight groupings: gap-2 to gap-4

**Grid Structure**:
- Sidebar navigation: 280px fixed width (hidden on mobile)
- Main content area: flex-1 with max-w-7xl container
- Two-column split: Task input (40%) + Schedule view (60%) on desktop
- Mobile: Single column stack

---

## Component Library

### Navigation
- **Top Bar**: Logo, quick actions (Add Task, Settings), profile
- **Sidebar**: Task categories, filters (All, Today, Urgent, By Category)
- Sticky positioning with backdrop blur

### Task Management
- **Task Input Form**: 
  - Floating card design with subtle elevation
  - Inline fields: Name, Duration slider, Category dropdown
  - Collapsible advanced section: Urgency/Importance/Enjoyment sliders (0-1 scale with visual indicators)
  - Date/time pickers for earliest_start and latest_finish
  
- **Task List Item**:
  - Left border accent indicating priority (color-coded by urgency × importance)
  - Checkbox for completion
  - Task name (truncated with tooltip)
  - Inline metadata badges: Duration, Category, Urgency dot
  - Hover actions: Edit, Delete (slide-in from right)

### Schedule Visualization
- **Timeline View** (Primary):
  - Hour-based grid with current time indicator (animated pulse)
  - Scheduled blocks: Task cards with start/end times, drag-to-reschedule placeholder
  - Color-coded by category with opacity based on priority
  - Visual gaps for unscheduled time

- **Day Selector**: 
  - Horizontal date picker (today ± 7 days)
  - Active day highlighted with primary accent
  
### Data Display
- **Statistics Cards**: 
  - Total tasks, Scheduled hours, Completion rate
  - Icon + number + label in compact grid (grid-cols-3)
  - Subtle gradient background from primary color

- **Priority Indicators**:
  - Dot system: Filled circle (high), ring (medium), small dot (low)
  - Colors match urgency scale (red → yellow → blue)

### Forms & Inputs
- All inputs with consistent dark mode styling
- Focus states: 2px primary accent ring
- Sliders: Custom thumb with value tooltip on hover
- Dropdowns: Floating menu with search capability
- Date/time: Modal picker with calendar grid

### Overlays
- **Modals**: Centered, max-w-2xl, backdrop blur
- **Toasts**: Top-right notifications for actions (task added, schedule updated)
- **Tooltips**: Appear on hover for truncated text and icon explanations

---

## Animations

Use sparingly, only for meaningful feedback:
- Task addition: Fade-in + slide-down (200ms)
- Schedule update: Timeline items smoothly reposition (300ms ease-out)
- Hover states: Subtle scale (1.02) on cards
- Loading: Skeleton screens for schedule rendering

---

## Images

**No hero images required** - This is a utility application focused on task data and schedule visualization. All visual interest comes from the interface design itself.

**Icons**: Use Heroicons (CDN) for all UI elements - calendar, clock, priority flags, categories, actions

---

## Key Layout Sections

1. **Main Dashboard** (default view):
   - Top: Statistics cards (3-column grid)
   - Left: Task input form + Unscheduled tasks list
   - Right: Timeline schedule view with day selector
   
2. **Task List View**:
   - Filters sidebar (category, urgency range, date range)
   - Main area: Sortable/filterable task table
   - Bulk actions toolbar when items selected

3. **Schedule Overview**:
   - Week calendar grid showing all scheduled blocks
   - Daily capacity visualization (bar chart of scheduled vs available time)

**Mobile Adaptations**:
- Bottom navigation (Tasks, Schedule, Add)
- Stack all sections vertically
- Swipe gestures for task actions
- Floating "Add Task" button (bottom-right)