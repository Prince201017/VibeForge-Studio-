import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Slider } from "./Slider";

/** [ForgeOS UI] Slider stories: single value and dual-thumb range. */
const meta: Meta = { title: "Form/Slider", tags: ["autodocs"] };
export default meta;
type Story = StoryObj;

export const Single: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState(50);
      return <Slider label="Opacity" value={value} onChange={setValue} min={0} max={100} />;
    }
    return <Demo />;
  },
};

export const Range: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState<[number, number]>([20, 80]);
      return <Slider label="Duration range" range value={value} onChange={setValue} min={0} max={100} />;
    }
    return <Demo />;
  },
};

export const Disabled: Story = {
  render: () => <Slider label="Locked" value={30} onChange={() => {}} disabled />,
};
