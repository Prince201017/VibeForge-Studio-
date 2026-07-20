import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./Input";

/** [ForgeOS UI] Input stories: sizes, icons, and validation states. */
const meta: Meta<typeof Input> = {
  title: "Form/Input",
  component: Input,
  tags: ["autodocs"],
  args: { placeholder: "Enter a value..." },
};
export default meta;
type Story = StoryObj<typeof Input>;

export const Basic: Story = {};
export const WithLabel: Story = { args: { label: "Layer name", required: true } };
export const Small: Story = { args: { size: "sm" } };
export const Large: Story = { args: { size: "lg" } };
export const WithError: Story = { args: { label: "Email", error: "Enter a valid email address" } };
export const WithHelperText: Story = { args: { label: "Width", helperText: "In pixels" } };
export const Disabled: Story = { args: { disabled: true, value: "Locked value" } };
