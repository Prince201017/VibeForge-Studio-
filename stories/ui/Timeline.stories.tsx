import type { Meta, StoryObj } from "@storybook/react";
import { Timeline } from "./Timeline";

/** [ForgeOS UI] Timeline stories: version history / activity feed. */
const meta: Meta<typeof Timeline> = {
  title: "Visualization/Timeline",
  component: Timeline,
  tags: ["autodocs"],
  args: {
    entries: [
      { id: "1", title: "Design published", timestamp: "2 min ago", status: "success" },
      { id: "2", title: "Comment added", description: "\"Can we try a warmer palette?\"", timestamp: "1 hour ago", status: "info" },
      { id: "3", title: "Export failed", description: "Network timeout", timestamp: "Yesterday", status: "error" },
    ],
  },
};
export default meta;
type Story = StoryObj<typeof Timeline>;

export const Basic: Story = {};
