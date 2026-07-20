import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Splitter } from "./Splitter";

/**
 * [ForgeOS UI] Splitter stories.
 * Design notes: pair with two flex siblings whose width/height you
 * update from onResize; Splitter itself only reports deltas, it
 * doesn't own layout state.
 */
const meta: Meta<typeof Splitter> = {
  title: "Layout/Splitter",
  component: Splitter,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof Splitter>;

export const Vertical: Story = {
  render: () => (
    <div className="flex h-40 w-full border border-neutral-800">
      <div className="w-64 bg-neutral-900 p-2 text-xs text-neutral-400">Left panel</div>
      <Splitter orientation="vertical" />
      <div className="flex-1 bg-neutral-950 p-2 text-xs text-neutral-400">Right panel</div>
    </div>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <div className="flex h-64 w-full flex-col border border-neutral-800">
      <div className="h-40 bg-neutral-900 p-2 text-xs text-neutral-400">Top panel</div>
      <Splitter orientation="horizontal" />
      <div className="flex-1 bg-neutral-950 p-2 text-xs text-neutral-400">Bottom panel</div>
    </div>
  ),
};

export const Interactive: Story = {
  render: () => {
    function Demo() {
      const [width, setWidth] = useState(240);
      return (
        <div className="flex h-40 w-full border border-neutral-800">
          <div style={{ width }} className="bg-neutral-900 p-2 text-xs text-neutral-400">
            {width}px
          </div>
          <Splitter orientation="vertical" defaultSize={240} onResize={setWidth} />
          <div className="flex-1 bg-neutral-950 p-2 text-xs text-neutral-400">Fills remaining space</div>
        </div>
      );
    }
    return <Demo />;
  },
};
