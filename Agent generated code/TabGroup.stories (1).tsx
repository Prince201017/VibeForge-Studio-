import type { Meta, StoryObj } from "@storybook/react";
import { TabGroup } from "./TabGroup";

const tabs = [
  { id: "props", label: "Properties", content: <p className="text-xs text-neutral-400">Properties panel content.</p> },
  { id: "style", label: "Style", content: <p className="text-xs text-neutral-400">Style panel content.</p> },
  { id: "export", label: "Export", content: <p className="text-xs text-neutral-400">Export panel content.</p>, disabled: true },
];

/** [ForgeOS UI] TabGroup stories: horizontal/vertical, keyboard-navigable. */
const meta: Meta<typeof TabGroup> = {
  title: "Layout/TabGroup",
  component: TabGroup,
  tags: ["autodocs"],
  args: { tabs, defaultActiveId: "props" },
};
export default meta;
type Story = StoryObj<typeof TabGroup>;

export const Horizontal: Story = {};
export const Vertical: Story = { args: { orientation: "vertical" } };
