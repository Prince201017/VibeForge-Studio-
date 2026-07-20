import type { Meta, StoryObj } from "@storybook/react";
import { Link } from "./Link";

/** [ForgeOS UI] Link stories: internal, external, underline variants. */
const meta: Meta<typeof Link> = {
  title: "Button/Link",
  component: Link,
  tags: ["autodocs"],
  args: { href: "#", children: "View documentation" },
};
export default meta;
type Story = StoryObj<typeof Link>;

export const Internal: Story = {};
export const External: Story = { args: { external: true, href: "https://example.com" } };
export const UnderlineAlways: Story = { args: { underline: "always" } };
