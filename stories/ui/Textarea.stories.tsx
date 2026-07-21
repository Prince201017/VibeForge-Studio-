import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Textarea } from "./Textarea";

/** [ForgeOS UI] Textarea stories: auto-expand and character count. */
const meta: Meta<typeof Textarea> = {
  title: "Form/Textarea",
  component: Textarea,
  tags: ["autodocs"],
  args: { label: "Description", placeholder: "Describe this asset..." },
};
export default meta;
type Story = StoryObj<typeof Textarea>;

export const Basic: Story = {
  render: (args) => {
    function Demo() {
      const [value, setValue] = useState("");
      return <Textarea {...args} value={value} onChange={(e) => setValue(e.target.value)} />;
    }
    return <Demo />;
  },
};

export const WithCharacterCount: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState("");
      return <Textarea label="Bio" maxLength={140} value={value} onChange={(e) => setValue(e.target.value)} />;
    }
    return <Demo />;
  },
};

export const AutoExpanding: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState("");
      return <Textarea label="Notes" autoExpand value={value} onChange={(e) => setValue(e.target.value)} />;
    }
    return <Demo />;
  },
};

export const WithError: Story = { args: { error: "Description is required" } };
