import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Checkbox } from "./Checkbox";

/** [ForgeOS UI] Checkbox stories: checked, indeterminate, error, disabled. */
const meta: Meta<typeof Checkbox> = {
  title: "Form/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
  args: { label: "Lock aspect ratio" },
};
export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Unchecked: Story = {
  render: (args) => {
    function Demo() {
      const [checked, setChecked] = useState(false);
      return <Checkbox {...args} checked={checked} onChange={(e) => setChecked(e.target.checked)} />;
    }
    return <Demo />;
  },
};

export const Indeterminate: Story = { args: { indeterminate: true, label: "Select all" } };
export const WithError: Story = { args: { error: "This field is required" } };
export const Disabled: Story = { args: { disabled: true } };
