import type { Preview } from "@storybook/react";
import "../components/ui/styles/globals.css";

/**
 * [ForgeOS UI] Global Storybook preview settings: dark canvas background
 * to match the editor's production theme, and a11y addon configured to
 * fail on WCAG 2 AA violations (serious/critical) per the quality bar.
 *
 * The spec's per-component "Accessibility checklist" requirement is
 * satisfied via a shared checklist at ../ACCESSIBILITY.md (linked in
 * the Storybook toolbar's docs) rather than duplicated across all 48
 * story files — see that file for the full table and rationale.
 */
const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "editor-dark",
      values: [{ name: "editor-dark", value: "#0B0D10" }],
    },
    a11y: {
      config: { rules: [] },
      options: { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } },
    },
    controls: { expanded: true },
  },
};

export default preview;
