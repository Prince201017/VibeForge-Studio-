import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { ColorPicker } from "./ColorPicker";

/** [ForgeOS UI] ColorPicker stories: swatch trigger + popover editor. */
const meta: Meta = { title: "Form/ColorPicker", tags: ["autodocs"] };
export default meta;
type Story = StoryObj;

export const Basic: Story = {
  render: () => {
    function Demo() {
      const [color, setColor] = useState("#6366F1");
      return <ColorPicker label="Fill color" value={color} onChange={setColor} />;
    }
    return <Demo />;
  },
};

export const CustomPresets: Story = {
  render: () => {
    function Demo() {
      const [color, setColor] = useState("#22C55E");
      return <ColorPicker label="Brand color" value={color} onChange={setColor} presets={["#22C55E", "#0EA5E9", "#F97316"]} />;
    }
    return <Demo />;
  },
};

export const Disabled: Story = {
  render: () => <ColorPicker label="Locked" value="#71717A" onChange={() => {}} disabled />,
};
