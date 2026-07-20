import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

/** [ForgeOS UI] Button stories: variants, sizes, loading, icon, full-width. */
const meta: Meta<typeof Button> = {
  title: "Button/Button",
  component: Button,
  tags: ["autodocs"],
  args: { children: "Click Me" },
};
export default meta;
type Story = StoryObj<typeof Button>;

export const Variants: Story = {
  render: () => (
    <div className="flex gap-2">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="tertiary">Tertiary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
    </div>
  ),
};
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};
export const Loading: Story = { args: { isLoading: true } };
export const Disabled: Story = { args: { disabled: true } };
export const FullWidth: Story = { args: { fullWidth: true } };
export const WithIcon: Story = { args: { icon: <span>＋</span>, children: "Add layer" } };
