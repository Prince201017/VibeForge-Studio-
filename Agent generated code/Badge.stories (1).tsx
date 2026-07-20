import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./Badge";

/** [ForgeOS UI] Badge stories: status colors, sizes, dismissible. */
const meta: Meta<typeof Badge> = {
  title: "Display/Badge",
  component: Badge,
  tags: ["autodocs"],
  args: { children: "Draft" },
};
export default meta;
type Story = StoryObj<typeof Badge>;

export const AllStatuses: Story = {
  render: () => (
    <div className="flex gap-2">
      <Badge status="default">Default</Badge>
      <Badge status="success">Success</Badge>
      <Badge status="warning">Warning</Badge>
      <Badge status="error">Error</Badge>
      <Badge status="info">Info</Badge>
    </div>
  ),
};
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Badge size="sm">Small</Badge>
      <Badge size="md">Medium</Badge>
      <Badge size="lg">Large</Badge>
    </div>
  ),
};
export const Dismissible: Story = { args: { onDismiss: () => {} } };
