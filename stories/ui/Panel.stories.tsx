import type { Meta, StoryObj } from "@storybook/react";
import { Panel } from "./Panel";

/**
 * [ForgeOS UI] Panel stories.
 * Design notes: Panel is the base chrome for every dockable editor
 * region (Layers, Inspector, Assets). Keep title copy to one or two
 * words so it doesn't wrap at narrow docked widths.
 */
const meta: Meta<typeof Panel> = {
  title: "Layout/Panel",
  component: Panel,
  tags: ["autodocs"],
  args: { title: "Layers", children: "Panel content goes here." },
};
export default meta;
type Story = StoryObj<typeof Panel>;

export const Basic: Story = {};

export const Collapsible: Story = {
  args: { collapsible: true },
};

export const CollapsedByDefault: Story = {
  args: { collapsible: true, defaultCollapsed: true },
};

export const FixedWidth: Story = {
  args: { width: 260 },
};

export const WithActions: Story = {
  args: {
    actions: <button className="text-xs text-neutral-400 hover:text-neutral-100">+</button>,
    collapsible: true,
  },
};
