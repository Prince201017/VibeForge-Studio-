import type { Meta, StoryObj } from "@storybook/react";
import { List } from "./List";
import { ListItem } from "./ListItem";

/** [ForgeOS UI] List stories: bordered container of ListItems. */
const meta: Meta = { title: "List/List", tags: ["autodocs"] };
export default meta;
type Story = StoryObj;

export const Basic: Story = {
  render: () => (
    <List bordered className="w-72">
      <ListItem title="Header layer" subtitle="Group · 3 items" onClick={() => {}} />
      <ListItem title="Hero image" subtitle="Image" selected onClick={() => {}} />
      <ListItem title="CTA button" subtitle="Component" onClick={() => {}} />
    </List>
  ),
};
