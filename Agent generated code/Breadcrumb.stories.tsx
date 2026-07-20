import type { Meta, StoryObj } from "@storybook/react";
import { Breadcrumb } from "./Breadcrumb";

/** [ForgeOS UI] Breadcrumb stories: default and custom separator. */
const meta: Meta<typeof Breadcrumb> = {
  title: "Button/Breadcrumb",
  component: Breadcrumb,
  tags: ["autodocs"],
  args: {
    items: [
      { label: "Projects", onClick: () => {} },
      { label: "ForgeOS", onClick: () => {} },
      { label: "Untitled Design" },
    ],
  },
};
export default meta;
type Story = StoryObj<typeof Breadcrumb>;

export const Basic: Story = {};
export const CustomSeparator: Story = { args: { separator: "›" } };
