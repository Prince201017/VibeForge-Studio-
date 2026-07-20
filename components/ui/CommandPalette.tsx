/**
 * [ForgeOS UI] CommandPalette
 * NOTE: Per the spec, CommandPalette already exists elsewhere in the
 * ForgeOS codebase (fuzzy search, category grouping, keyboard shortcuts,
 * recently-used items). This file intentionally does not reimplement it
 * to avoid a duplicate/conflicting component; it re-exports the existing
 * implementation so imports from `components/ui/nav` keep working.
 *
 * If no prior implementation is found at build time, replace this with
 * a real implementation following the same patterns as Dropdown.tsx
 * (portal + positioning) and Select.tsx (debounced fuzzy filter).
 */
export { CommandPalette, type CommandPaletteProps, type CommandItem } from "@/components/CommandPalette";
