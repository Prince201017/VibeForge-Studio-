import type { Meta, StoryObj } from "@storybook/react";
import { ListItem } from "./ListItem";
import { IconButton } from "../button/IconButton";

/** [ForgeOS UI] ListItem stories: leading icon, actions, selected state. */
const meta: Meta<typeof ListItem> = {
  title: "List/ListItem",
  component: ListItem,
  tags: ["autodocs"],
  args: { title: "Hero image", subtitle: "Image · 1200×800" },
};
export default meta;
type Story = StoryObj<typeof ListItem>;

export const Basic: Story = { args: { onClick: () => {} } };
export const Selected: Story = { args: { onClick: () => {}, selected: true } };
export const WithActions: Story = {
  args: {
    onClick: () => {},
    actions: <IconButton icon={<span>⋮</span>} aria-label="More options" size="sm" />,
  },
};
