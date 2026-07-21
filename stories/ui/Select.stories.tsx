import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Select } from "./Select";
import type { OptionType } from "../types";

const fonts: OptionType[] = [
  { label: "Inter", value: "inter" },
  { label: "Roboto", value: "roboto" },
  { label: "Helvetica", value: "helvetica" },
  { label: "Georgia", value: "georgia" },
  { label: "Courier New", value: "courier", disabled: true },
];

/** [ForgeOS UI] Select stories: single, multi, and searchable variants. */
const meta: Meta = { title: "Form/Select", tags: ["autodocs"] };
export default meta;
type Story = StoryObj;

export const SingleSelect: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState<string | null>("inter");
      return <Select options={fonts} value={value} onChange={(v) => setValue(v as string)} />;
    }
    return <Demo />;
  },
};

export const Searchable: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState<string | null>(null);
      return <Select options={fonts} value={value} onChange={(v) => setValue(v as string)} searchable placeholder="Search fonts..." />;
    }
    return <Demo />;
  },
};

export const MultiSelect: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState<string[]>(["inter"]);
      return <Select options={fonts} value={value} onChange={(v) => setValue(v as string[])} multiple />;
    }
    return <Demo />;
  },
};
