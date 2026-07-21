import type { Meta, StoryObj } from "@storybook/react";
import { ProgressRing } from "./ProgressRing";

/** [ForgeOS UI] ProgressRing stories: sizes and status colors. */
const meta: Meta<typeof ProgressRing> = { title: "Visualization/ProgressRing", component: ProgressRing, tags: ["autodocs"], args: { value: 68 } };
export default meta;
type Story = StoryObj<typeof ProgressRing>;

export const Basic: Story = {};
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <ProgressRing value={40} size="sm" /><ProgressRing value={40} size="md" /><ProgressRing value={40} size="lg" />
    </div>
  ),
};
export const StatusColors: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <ProgressRing value={90} status="success" />
      <ProgressRing value={50} status="warning" />
      <ProgressRing value={20} status="error" />
    </div>
  ),
};
