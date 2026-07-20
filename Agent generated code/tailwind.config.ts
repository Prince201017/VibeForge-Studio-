import type { Config } from "tailwindcss";

/**
 * [ForgeOS UI] Tailwind config for the dark-theme editor component
 * library. Content globs are scoped to components/ui so this file can
 * be merged into a host app's own Tailwind config via `presets`.
 */
export default {
  darkMode: "class",
  content: ["./components/ui/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Editor chrome tokens layered on top of Tailwind's neutral/indigo/
        // emerald/amber/rose/sky scales already used throughout components.
        canvas: "#0B0D10",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
