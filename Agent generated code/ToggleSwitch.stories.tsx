import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { ToggleSwitch } from "./ToggleSwitch";

/** [ForgeOS UI] ToggleSwitch stories: sizes and labeled variants. */
const meta: Meta = { title: "Form/ToggleSwitch", tags: ["autodocs"] };
export default meta;
type Story = StoryObj;

export const Basic: Story = {
  render: () => {
    function Demo() {
      const [on, setOn] = useState(false);
      return <ToggleSwitch label="Auto-save" checked={on} onChange={setOn} />;
    }
    return <Demo />;
  },
};

export const WithOnOffLabels: Story = {
  render: () => {
    function Demo() {
      const [on, setOn] = useState(true);
      return <ToggleSwitch checked={on} onChange={setOn} onLabel="On" offLabel="Off" />;
    }
    return <Demo />;
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <ToggleSwitch size="sm" checked onChange={() => {}} />
      <ToggleSwitch size="md" checked onChange={() => {}} />
      <ToggleSwitch size="lg" checked onChange={() => {}} />
    </div>
  ),
};

export const Disabled: Story = { render: () => <ToggleSwitch checked disabled onChange={() => {}} label="Locked" /> };
