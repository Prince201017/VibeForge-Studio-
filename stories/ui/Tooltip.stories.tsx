import type { Meta, StoryObj } from "@storybook/react";
import { Tooltip } from "./Tooltip";
import { IconButton } from "../button/IconButton";

/** [ForgeOS UI] Tooltip stories: placements and dark/light variants. */
const meta: Meta = { title: "Display/Tooltip", tags: ["autodocs"] };
export default meta;
type Story = StoryObj;

export const Basic: Story = {
  render: () => (
    <Tooltip content="Undo last action">
      <IconButton aria-label="Undo" icon={<span>↺</span>} />
    </Tooltip>
  ),
};

export const Placements: Story = {
  render: () => (
    <div className="flex gap-6 p-8">
      {(["top", "bottom", "left", "right"] as const).map((p) => (
        <Tooltip key={p} content={`Placed ${p}`} placement={p}>
          <button className="rounded bg-neutral-800 px-3 py-1.5 text-xs text-neutral-200">{p}</button>
        </Tooltip>
      ))}
    </div>
  ),
};

export const LightVariant: Story = {
  render: () => (
    <Tooltip content="Light tooltip" variant="light">
      <button className="rounded bg-neutral-800 px-3 py-1.5 text-xs text-neutral-200">Hover me</button>
    </Tooltip>
  ),
};
