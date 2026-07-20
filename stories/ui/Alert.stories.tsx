import type { Meta, StoryObj } from "@storybook/react";
import { Alert } from "./Alert";

/** [ForgeOS UI] Alert stories: all status variants, dismissible, with action. */
const meta: Meta<typeof Alert> = {
  title: "Display/Alert",
  component: Alert,
  tags: ["autodocs"],
  args: { title: "Export complete", description: "Your file has been saved to Downloads." },
};
export default meta;
type Story = StoryObj<typeof Alert>;

export const Success: Story = { args: { status: "success" } };
export const Error: Story = { args: { status: "error", title: "Export failed", description: "Check your network connection and try again." } };
export const Warning: Story = { args: { status: "warning", title: "Unsaved changes", description: "You have changes that haven't been saved." } };
export const Info: Story = { args: { status: "info", title: "New feature", description: "Try the new particle engine presets." } };
export const Dismissible: Story = { args: { status: "info", onDismiss: () => {} } };
