import type { Meta, StoryObj } from "@storybook/react";
import { EmptyState } from "./EmptyState";
import { Button } from "../button/Button";

/** [ForgeOS UI] EmptyState stories: with/without action. */
const meta: Meta<typeof EmptyState> = {
  title: "Display/EmptyState",
  component: EmptyState,
  tags: ["autodocs"],
  args: { title: "No layers yet", description: "Add a shape or import an asset to get started." },
};
export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Basic: Story = {};
export const WithAction: Story = { args: { action: <Button size="sm">Add layer</Button> } };
