import type { Meta, StoryObj } from "@storybook/react";
import { LoadingSpinner } from "./LoadingSpinner";

/** [ForgeOS UI] LoadingSpinner stories: sizes and colors. */
const meta: Meta<typeof LoadingSpinner> = { title: "Display/LoadingSpinner", component: LoadingSpinner, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof LoadingSpinner>;

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <LoadingSpinner size="sm" /><LoadingSpinner size="md" /><LoadingSpinner size="lg" />
    </div>
  ),
};
export const Colors: Story = {
  render: () => (
    <div className="flex items-center gap-4 bg-neutral-950 p-2">
      <LoadingSpinner color="indigo" /><LoadingSpinner color="neutral" /><LoadingSpinner color="white" />
    </div>
  ),
};
