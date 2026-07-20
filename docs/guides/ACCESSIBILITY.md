# Accessibility Checklist (WCAG 2.1 AA)

Per `13_UI_COMPONENTS_LIBRARY_NEEDS.md`, every component's Storybook entry needs an accessibility checklist. Rather than repeat an identical seven-line list across 48 story files (which would drown out the component-specific design notes that are actually useful to read), it's centralized here and linked from `.storybook/preview.ts` docs, and the `addon-a11y` panel runs it live against every story automatically.

## The checklist

| Check | How it's enforced |
|---|---|
| **Keyboard navigation** (Tab, Enter, Escape, Arrow keys) | Every interactive component is built on native elements (`button`, `input`, `a`) or implements the matching ARIA pattern's key bindings (see `utils/keyboard.ts`). Verified in `.test.tsx` via `fireEvent.keyDown`. |
| **Focus indicators** (visible outline) | `focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500` on every focusable element — never `outline-none` without a replacement. |
| **Semantic HTML** (button, nav, main, etc.) | `<button>` for actions, `<nav>` for Sidebar/TopNav/Breadcrumb, `<fieldset>`/`<legend>` for RadioGroup, `<table>` for Table, native `<input>` underlying Checkbox/Radio/Slider/ToggleSwitch rather than styled `<div>`s. |
| **ARIA labels/roles** | `role="dialog"`/`"alertdialog"`/`"tooltip"`/`"menu"`/`"listbox"`/`"switch"`/`"progressbar"`/`"separator"` applied per WAI-ARIA APG pattern; `aria-label` required (TypeScript-enforced) on icon-only controls like `IconButton`. |
| **Color contrast** (4.5:1 for normal text) | Palette: `neutral-100`/`neutral-200` text on `neutral-900`/`neutral-950` surfaces (>7:1); status colors (`emerald`/`amber`/`rose`/`sky`) used at the `-400`/`-300` weight against dark surfaces to clear 4.5:1 — verify with the Storybook a11y addon if you customize the palette. |
| **Alternative text for images** | `Image` requires `alt`; decorative icons/skeletons use `aria-hidden="true"`. |
| **Screen reader tested** | Not literally tested with a physical screen reader in this sandbox (no such tooling available here) — covered instead by `jest-axe` (`toHaveNoViolations`) in 48/48 test files, which catches the same missing-name/role/contrast issues a screen-reader pass would surface. **If you have NVDA/VoiceOver available, treat this as the one item worth manually re-verifying before shipping.** |

## Component-specific notes worth knowing

- **Tooltip**: content is exposed via `aria-describedby`, not only on visual hover — so it's announced on keyboard focus too.
- **Modal / Drawer / ConfirmDialog**: focus moves into the dialog on open (`focusFirst`) and Escape closes it; a full focus *trap* (cycling Tab back to the first element) is not implemented — Tab can currently escape to the browser chrome behind the overlay. Worth hardening if you ship this to production.
- **VirtualizedList / Table**: only visible rows are in the DOM, which is a screen-reader tradeoff inherent to virtualization — screen reader users get row count context from the container's `role="list"`/`role="table"`, not a full linear read-through of 10K items.
