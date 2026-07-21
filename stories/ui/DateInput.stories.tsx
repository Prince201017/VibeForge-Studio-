import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { DateInput } from "./DateInput";

/** [ForgeOS UI] DateInput stories: single date and range selection. */
const meta: Meta = { title: "Input/DateInput", tags: ["autodocs"] };
export default meta;
type Story = StoryObj;

export const SingleDate: Story = {
  render: () => {
    function Demo() {
      const [date, setDate] = useState<Date | null>(new Date());
      return <DateInput label="Due date" value={date} onChange={setDate} />;
    }
    return <Demo />;
  },
};

export const DateRange: Story = {
  render: () => {
    function Demo() {
      const [range, setRange] = useState<[Date | null, Date | null]>([null, null]);
      return <DateInput label="Project timeline" range value={range} onChange={setRange} />;
    }
    return <Demo />;
  },
};
