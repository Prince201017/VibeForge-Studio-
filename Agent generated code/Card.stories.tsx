import type { Meta, StoryObj } from "@storybook/react";
import { Card } from "./Card";

/** [ForgeOS UI] Card stories: header/footer sections and hover states. */
const meta: Meta<typeof Card> = {
  title: "Display/Card",
  component: Card,
  tags: ["autodocs"],
  args: { children: "Card body content." },
};
export default meta;
type Story = StoryObj<typeof Card>;

export const Basic: Story = {};
export const WithHeaderFooter: Story = {
  args: {
    header: <h3 className="text-sm font-semibold text-neutral-100">Project Alpha</h3>,
    footer: <span className="text-xs text-neutral-500">Updated 2 hours ago</span>,
  },
};
export const Hoverable: Story = { args: { hoverable: true } };
export const Clickable: Story = { args: { onClick: () => alert("clicked") } };
