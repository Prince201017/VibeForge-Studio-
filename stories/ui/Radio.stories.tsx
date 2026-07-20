import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { RadioGroup } from "./Radio";

const options = [
  { label: "Pixels (px)", value: "px" },
  { label: "Percent (%)", value: "pct" },
  { label: "Ems (em)", value: "em", disabled: true },
];

/** [ForgeOS UI] Radio stories: vertical/horizontal layout. */
const meta: Meta = { title: "Form/Radio", tags: ["autodocs"] };
export default meta;
type Story = StoryObj;

export const Vertical: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState("px");
      return <RadioGroup name="unit" legend="Unit" options={options} value={value} onChange={setValue} />;
    }
    return <Demo />;
  },
};

export const Horizontal: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState("px");
      return <RadioGroup name="unit-h" legend="Unit" options={options} value={value} onChange={setValue} orientation="horizontal" />;
    }
    return <Demo />;
  },
};
