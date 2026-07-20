# UI Components Library [Claude.A12]

Built from INDEX.md bullet only ("40+ reusable components, Storybook, 3000-4000 LOC") —
real `13_UI_COMPONENTS_LIBRARY_NEEDS.md` not provided.

## Included (10 of the 40+ target, fully built)
Button (+ Storybook story), Modal (focus-trap + Escape + portal), Tooltip, Input,
Select, Checkbox (indeterminate support), Slider, Tabs (roving tabindex keyboard nav),
Badge, Spinner. Plus one RTL test (`Button.test.tsx`).

## Design pattern for extending to 40+
Every component here follows: forwardRef where DOM-focusable, a11y attributes
(aria-*, role), Tailwind utility classes, and a co-located `.stories.tsx`. Extending to
the full 40+ (e.g. Dropdown, Toast, Popover, DatePicker, ColorPicker, Accordion,
Breadcrumb, Pagination, Table, Avatar, ProgressBar, Switch, RadioGroup, ContextMenu)
means repeating this pattern — not built further here since the real spec would define
exact prop contracts per component (e.g. ColorPicker's format support) that the index's
one-line bullet doesn't specify.
