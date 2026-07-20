import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { NumberInput } from "./NumberInput";

/** [ForgeOS UI] NumberInput stories: unit suffix, min/max, precision. */
const meta: Meta = { title: "Input/NumberInput", tags: ["autodocs"] };
export default meta;
type Story = StoryObj;

export const Basic: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState(24);
      return <NumberInput label="Font size" value={value} onChange={setValue} unit="px" min={8} max={200} />;
    }
    return <Demo />;
  },
};

export const Percentage: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState(100);
      return <NumberInput label="Opacity" value={value} onChange={setValue} unit="%" min={0} max={100} step={5} />;
    }
    return <Demo />;
  },
};

export const Disabled: Story = { render: () => <NumberInput label="Locked" value={16} onChange={() => {}} disabled /> };
