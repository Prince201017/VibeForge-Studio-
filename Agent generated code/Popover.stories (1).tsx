import type { Meta, StoryObj } from "@storybook/react";
import { Popover } from "./Popover";
import { Button } from "./Button";

/** [ForgeOS UI] Popover stories: click-to-open content container. */
const meta: Meta = { title: "Button/Popover", tags: ["autodocs"] };
export default meta;
type Story = StoryObj;

export const Basic: Story = {
  render: () => (
    <Popover trigger={<Button variant="secondary">Share</Button>}>
      <p className="text-sm text-neutral-200">Share link</p>
      <input readOnly value="https://forgeos.app/d/abc123" className="mt-2 w-full rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-300" />
    </Popover>
  ),
};
