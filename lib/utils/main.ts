import type { StorybookConfig } from "@storybook/react-vite";

/**
 * [ForgeOS UI] Storybook configuration.
 * addon-a11y runs axe-core against every story automatically, backing
 * the "Accessibility checklist" tab required for each component story.
 */
const config: StorybookConfig = {
  stories: ["../components/ui/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-a11y",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  docs: { autodocs: "tag" },
};

export default config;
