# UI Components Library Needs

## Scope
Professional Tailwind CSS component library with 40+ reusable components for the ForgeOS editor UI. All components must be responsive, accessible (WCAG 2.1 AA), and production-ready.

## Target
- 3000-4000 LOC of components
- 40+ unique component types
- 100% TypeScript with strict mode
- Comprehensive Storybook documentation
- Dark theme optimized

## Core Components (40+ total)

### 1. Layout Components (6 components, 400 LOC)

#### Panel.tsx
- Resizable container for editor panels
- Collapse/expand toggle
- Header with title
- Scrollable content area
- Dark background with border
- Usage: Left/Right/Bottom panels

```typescript
<Panel title="Layers" collapsible onToggle={() => {}}>
  {/* content */}
</Panel>
```

#### Splitter.tsx
- Horizontal/vertical divider
- Draggable to resize adjacent panels
- Double-click to auto-fit
- Min/max width constraints
- Smooth animations

#### Grid.tsx
- Responsive grid layout
- Configurable columns
- Automatic gap calculation
- Flexbox-based

#### Stack.tsx
- Vertical/horizontal flex stack
- Configurable spacing
- Alignment options
- Responsive variant

#### TabGroup.tsx
- Horizontal tabs
- Tab switching
- Lazy loading content
- Keyboard navigation
- Vertical variant

#### Modal.tsx
- Centered dialog
- Backdrop overlay
- Close button
- Responsive sizing
- Keyboard escape to close

### 2. Form Components (8 components, 600 LOC)

#### Input.tsx
- Text input field
- Placeholder support
- Error state with message
- Icon support (leading/trailing)
- Size variants (sm, md, lg)
- Validation indicators

#### Select.tsx
- Dropdown selector
- Searchable options
- Multi-select variant
- Option grouping
- Virtual scrolling for large lists

#### Checkbox.tsx
- Checkbox input
- Indeterminate state
- Label integration
- Error state
- Disabled state

#### Radio.tsx
- Radio button group
- Mutually exclusive
- Vertical/horizontal layout
- Label for each option

#### Textarea.tsx
- Multi-line text input
- Auto-expanding variant
- Character count
- Placeholder
- Error state

#### Slider.tsx
- Number range slider
- Min/max values
- Step configuration
- Range variant (dual sliders)
- Keyboard support

#### ColorPicker.tsx
- Color input field
- HEX/RGB/HSL formats
- Gradient picker variant
- Palette presets
- Eye dropper tool

#### ToggleSwitch.tsx
- Binary toggle
- On/off labels
- Disabled state
- Animated transition

### 3. Display Components (8 components, 500 LOC)

#### Badge.tsx
- Label badge
- Color variants (default, success, warning, error, info)
- Size variants
- Icon support
- Dismissible variant

#### Card.tsx
- Container card
- Shadow/border styling
- Hover effects
- Padding variants
- Header/footer sections

#### Alert.tsx
- Alert message box
- Type variants (success, error, warning, info)
- Icon included
- Dismissible option
- Action button support

#### Tooltip.tsx
- Hover tooltip
- Positioned (top, bottom, left, right)
- Dark/light variant
- Keyboard accessible

#### Separator.tsx
- Horizontal/vertical line divider
- Margin spacing
- Optional label in center

#### Skeleton.tsx
- Loading placeholder
- Animated shimmer
- Responsive sizing
- Multiple lines variant

#### LoadingSpinner.tsx
- Circular spinner
- Size variants
- Color variants
- Progress ring variant

#### EmptyState.tsx
- Empty state display
- Icon, title, description
- Action button
- Illustration support

### 4. Button & Action Components (8 components, 600 LOC)

#### Button.tsx
- Primary/secondary/tertiary variants
- Size variants (sm, md, lg)
- Icon-only variant
- Loading state with spinner
- Disabled state
- Full-width option
- Tooltip support

```typescript
<Button variant="primary" size="md" isLoading={isLoading}>
  Click Me
</Button>
```

#### IconButton.tsx
- Icon-only button
- Circular variant
- Size variants
- Hover effects

#### ButtonGroup.tsx
- Multiple buttons grouped
- Segmented control variant
- Exclusive selection
- Flexible layout

#### Dropdown.tsx
- Dropdown menu
- Menu items with icons
- Keyboard navigation
- Hierarchical menus
- Searchable variant

#### Breadcrumb.tsx
- Navigation breadcrumb trail
- Separator customization
- Click handlers
- Current page indicator

#### Menu.tsx
- Context menu (right-click)
- Programmatic open/close
- Item actions
- Keyboard shortcuts display
- Icons in menu items

#### Link.tsx
- Text link
- Internal/external
- Underline variants
- Icon support
- Active state

#### Popover.tsx
- Content popover
- Positioned (top, bottom, left, right)
- Click to open/close
- Arrow indicator
- Click outside to close

### 5. List Components (4 components, 400 LOC)

#### List.tsx
- Vertical list container
- Bordered/borderless
- Hover effects

#### ListItem.tsx
- Single list item
- Icon/avatar support
- Multi-line content
- Actions (buttons, menu)
- Selection state

#### Virtualized List.tsx
- Virtual scrolling for 10K+ items
- Efficient rendering
- Smooth scrolling
- Dynamic item heights

#### Table.tsx
- Data table
- Sortable columns
- Filterable rows
- Pagination
- Selection (checkbox column)
- Expandable rows

### 6. Input Values (4 components, 400 LOC)

#### NumberInput.tsx
- Number input field
- Up/down arrows
- Min/max validation
- Step configuration
- Format options

#### FileInput.tsx
- File picker
- Drag-and-drop support
- File type filtering
- Multiple files
- Preview thumbnails

#### DateInput.tsx
- Date picker
- Calendar popup
- Range selection
- Time selection
- Format options

#### TimeInput.tsx
- Time picker
- Hour/minute/second
- 12/24 hour format
- Keyboard input support

### 7. Navigation Components (3 components, 300 LOC)

#### Sidebar.tsx
- Collapsible sidebar
- Navigation items with icons
- Active state highlighting
- Sub-navigation groups
- Customizable width

#### TopNav.tsx
- Horizontal top navigation
- Logo/brand area
- Nav items center/right aligned
- User menu dropdown
- Mobile hamburger toggle

#### CommandPalette.tsx (already exists)
- Fuzzy search interface
- Category grouping
- Keyboard shortcuts display
- Recently used items

### 8. Data Visualization (3 components, 300 LOC)

#### Progress.tsx
- Progress bar
- Percentage display
- Indeterminate variant
- Color variants
- Animated

#### ProgressRing.tsx
- Circular progress indicator
- Percentage display
- Size variants
- Color variants

#### Timeline.tsx
- Vertical timeline
- Items with status
- Timestamps
- Icons/avatars
- Alternate layout

### 9. Modals & Dialogs (4 components, 400 LOC)

#### Modal.tsx
- Centered dialog box
- Backdrop overlay
- Close button
- Large/small sizes
- Scrollable content

#### Drawer.tsx
- Side drawer/sidebar
- Positioned (left/right)
- Close button
- Overlay backdrop
- Animation smooth slide

#### Toast.tsx
- Notification toast
- Auto-dismiss (configurable)
- Position (top/bottom, left/right/center)
- Type variants (success, error, warning, info)
- Action button

#### Dialog.tsx
- Confirmation dialog
- Title, description, actions
- Cancel/OK buttons
- Optional checkbox
- Centered on screen

### 10. Media Components (2 components, 200 LOC)

#### Image.tsx
- Responsive image
- Lazy loading
- Error state
- Placeholder
- Aspect ratio lock

#### Video.tsx
- HTML5 video player
- Play/pause controls
- Volume control
- Progress bar
- Fullscreen button

## Component File Structure

```
components/ui/
├── layout/
│   ├── Panel.tsx
│   ├── Splitter.tsx
│   ├── Grid.tsx
│   ├── Stack.tsx
│   ├── TabGroup.tsx
│   └── Modal.tsx
├── form/
│   ├── Input.tsx
│   ├── Select.tsx
│   ├── Checkbox.tsx
│   ├── Radio.tsx
│   ├── Textarea.tsx
│   ├── Slider.tsx
│   ├── ColorPicker.tsx
│   └── ToggleSwitch.tsx
├── display/
│   ├── Badge.tsx
│   ├── Card.tsx
│   ├── Alert.tsx
│   ├── Tooltip.tsx
│   ├── Separator.tsx
│   ├── Skeleton.tsx
│   ├── LoadingSpinner.tsx
│   └── EmptyState.tsx
├── button/
│   ├── Button.tsx
│   ├── IconButton.tsx
│   ├── ButtonGroup.tsx
│   ├── Dropdown.tsx
│   ├── Breadcrumb.tsx
│   ├── Menu.tsx
│   ├── Link.tsx
│   └── Popover.tsx
├── list/
│   ├── List.tsx
│   ├── ListItem.tsx
│   ├── VirtualizedList.tsx
│   └── Table.tsx
├── input/
│   ├── NumberInput.tsx
│   ├── FileInput.tsx
│   ├── DateInput.tsx
│   └── TimeInput.tsx
├── nav/
│   ├── Sidebar.tsx
│   ├── TopNav.tsx
│   └── CommandPalette.tsx
├── visualization/
│   ├── Progress.tsx
│   ├── ProgressRing.tsx
│   └── Timeline.tsx
├── modal/
│   ├── Dialog.tsx
│   ├── Drawer.tsx
│   ├── Toast.tsx
│   └── ConfirmDialog.tsx
├── media/
│   ├── Image.tsx
│   └── Video.tsx
├── hooks/
│   ├── useClickOutside.ts
│   ├── useKeyboard.ts
│   ├── useMediaQuery.ts
│   ├── useTimeout.ts
│   └── useDebounce.ts
├── utils/
│   ├── classNames.ts
│   ├── positioning.ts
│   └── keyboard.ts
└── types.ts (shared interfaces)
```

## Component Guidelines

### All Components Must Have:
1. TypeScript types with Props interface
2. JSDoc documentation
3. Default props
4. Accessibility (aria-labels, role, keyboard nav)
5. Responsive design
6. Dark mode support
7. Proper error handling
8. Loading states where applicable
9. [ComponentName] tag in code comments
10. Storybook stories

### Accessibility Checklist (WCAG 2.1 AA)
- Keyboard navigation (Tab, Enter, Escape, Arrow keys)
- Focus indicators (visible outline)
- Semantic HTML (button, nav, main, etc.)
- ARIA labels/roles where needed
- Color contrast (4.5:1 for normal text)
- Alternative text for images
- Screen reader tested

### TypeScript Requirements
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "tertiary";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  isLoading = false,
  ...props
}) => {
  // Implementation
};
```

## Storybook Documentation

Every component needs:
1. Basic story
2. All prop variations
3. States (loading, error, disabled)
4. Interactive examples
5. Accessibility checklist
6. Code example
7. Design notes

## Testing Requirements

- Unit tests for all components (70%+ coverage)
- Snapshot tests for UI
- Accessibility tests (axe-core)
- Visual regression tests
- Interactive state tests

## Performance Targets (Hard SLAs)
- Component render: < 5ms
- Event handlers: < 10ms
- Re-render on prop change: < 16ms
- Animation frames: 60 FPS

## Quality Standards
- 100% TypeScript strict mode
- Zero ESLint warnings
- 70%+ test coverage
- Storybook stories for all components
- JSDoc on all exports
- [ComponentName] tags mandatory
- Responsive tested (mobile/tablet/desktop)
- Dark mode fully functional

## Deliverables
- 40+ components fully implemented
- TypeScript types for all
- Storybook with all stories
- 100+ unit tests
- Accessibility audit passed
- Documentation complete
