import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { ButtonGroup } from "./ButtonGroup";
import { IconButton } from "./IconButton";

/** [ForgeOS UI] ButtonGroup stories: plain grouping and segmented control. */
const meta: Meta = { title: "Button/ButtonGroup", tags: ["autodocs"] };
export default meta;
type Story = StoryObj;

export const Plain: Story = {
  render: () => (
    <ButtonGroup>
      <IconButton icon={<span>B</span>} aria-label="Bold" variant="secondary" />
      <IconButton icon={<span>I</span>} aria-label="Italic" variant="secondary" />
      <IconButton icon={<span>U</span>} aria-label="Underline" variant="secondary" />
    </ButtonGroup>
  ),
};

export const Segmented: Story = {
  render: () => {
    function Demo() {
      const [align, setAlign] = useState("left");
      return (
        <ButtonGroup
          segmented={[
            { value: "left", label: "Left" },
            { value: "center", label: "Center" },
            { value: "right", label: "Right" },
          ]}
          value={align}
          onChange={setAlign}
        />
      );
    }
    return <Demo />;
  },
};
