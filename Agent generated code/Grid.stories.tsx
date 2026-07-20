import type { Meta, StoryObj } from "@storybook/react";
import { Grid } from "./Grid";

const Box = ({ n }: { n: number }) => (
  <div className="rounded bg-neutral-800 p-4 text-center text-xs text-neutral-300">{n}</div>
);

/** [ForgeOS UI] Grid stories: responsive column configurations. */
const meta: Meta<typeof Grid> = {
  title: "Layout/Grid",
  component: Grid,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof Grid>;

export const ThreeColumns: Story = {
  render: () => (
    <Grid columns={3} gap={3}>
      {Array.from({ length: 6 }, (_, i) => <Box key={i} n={i + 1} />)}
    </Grid>
  ),
};

export const Responsive: Story = {
  render: () => (
    <Grid columns={{ base: 1, sm: 2, lg: 4 }} gap={3}>
      {Array.from({ length: 8 }, (_, i) => <Box key={i} n={i + 1} />)}
    </Grid>
  ),
};
