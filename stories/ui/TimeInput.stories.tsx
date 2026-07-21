import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { TimeInput } from "./TimeInput";

/** [ForgeOS UI] TimeInput stories: 24h and 12h formats, with seconds. */
const meta: Meta = { title: "Input/TimeInput", tags: ["autodocs"] };
export default meta;
type Story = StoryObj;

export const TwentyFourHour: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState({ hours: 14, minutes: 30 });
      return <TimeInput label="Start time" value={value} onChange={setValue} />;
    }
    return <Demo />;
  },
};

export const TwelveHourWithSeconds: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState({ hours: 14, minutes: 30, seconds: 0 });
      return <TimeInput label="Playback position" value={value} onChange={setValue} format="12h" showSeconds />;
    }
    return <Demo />;
  },
};
