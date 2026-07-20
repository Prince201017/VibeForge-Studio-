import type { Meta, StoryObj } from "@storybook/react";
import { IconButton } from "./IconButton";

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V2h4v2M4 4l1 10h6l1-10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

/** [ForgeOS UI] IconButton stories: variants, sizes, circular. */
const meta: Meta<typeof IconButton> = {
  title: "Button/IconButton",
  component: IconButton,
  tags: ["autodocs"],
  args: { icon: <TrashIcon />, "aria-label": "Delete layer" },
};
export default meta;
type Story = StoryObj<typeof IconButton>;

export const Variants: Story = {
  render: () => (
    <div className="flex gap-2">
      <IconButton icon={<TrashIcon />} aria-label="Delete" variant="primary" />
      <IconButton icon={<TrashIcon />} aria-label="Delete" variant="secondary" />
      <IconButton icon={<TrashIcon />} aria-label="Delete" variant="ghost" />
      <IconButton icon={<TrashIcon />} aria-label="Delete" variant="danger" />
    </div>
  ),
};
export const Circular: Story = { args: { circular: true } };
export const Disabled: Story = { args: { disabled: true } };
