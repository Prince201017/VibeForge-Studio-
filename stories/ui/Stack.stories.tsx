import type { Meta, StoryObj } from "@storybook/react";
import { Stack } from "./Stack";

const Chip = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded bg-neutral-800 px-3 py-1.5 text-xs text-neutral-300">{children}</div>
);

/** [ForgeOS UI] Stack stories: vertical/horizontal flex composition. */
const meta: Meta<typeof Stack> = {
  title: "Layout/Stack",
  component: Stack,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof Stack>;

export const Vertical: Story = {
  render: () => (
    <Stack direction="vertical" gap={2}>
      <Chip>One</Chip><Chip>Two</Chip><Chip>Three</Chip>
    </Stack>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <Stack direction="horizontal" gap={2} align="center">
      <Chip>One</Chip><Chip>Two</Chip><Chip>Three</Chip>
    </Stack>
  ),
};

export const ResponsiveCollapse: Story = {
  render: () => (
    <Stack direction="horizontal" responsive gap={2}>
      <Chip>One</Chip><Chip>Two</Chip><Chip>Three</Chip>
    </Stack>
  ),
};
