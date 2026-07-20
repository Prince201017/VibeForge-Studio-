import type { Meta, StoryObj } from "@storybook/react";
import { Progress } from "./Progress";

/** [ForgeOS UI] Progress stories: determinate, indeterminate, statuses. */
const meta: Meta<typeof Progress> = { title: "Visualization/Progress", component: Progress, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof Progress>;

export const Determinate: Story = { args: { value: 62, showLabel: true } };
export const Indeterminate: Story = { args: {} };
export const Statuses: Story = {
  render: () => (
    <div className="flex flex-col gap-3 w-64">
      <Progress value={80} status="success" showLabel />
      <Progress value={40} status="warning" showLabel />
      <Progress value={15} status="error" showLabel />
      <Progress value={65} status="info" showLabel />
    </div>
  ),
};
