import type { Meta, StoryObj } from "@storybook/react";
import { Dropdown } from "./Dropdown";
import { Button } from "./Button";

/** [ForgeOS UI] Dropdown stories: menu button pattern with icons. */
const meta: Meta = { title: "Button/Dropdown", tags: ["autodocs"] };
export default meta;
type Story = StoryObj;

export const Basic: Story = {
  render: () => (
    <Dropdown
      trigger={<Button variant="secondary">Actions ▾</Button>}
      items={[
        { id: "duplicate", label: "Duplicate", onSelect: () => {} },
        { id: "rename", label: "Rename", onSelect: () => {} },
        { id: "delete", label: "Delete", danger: true, onSelect: () => {} },
      ]}
    />
  ),
};

export const WithDisabledItem: Story = {
  render: () => (
    <Dropdown
      trigger={<Button variant="secondary">Export ▾</Button>}
      items={[
        { id: "png", label: "PNG", onSelect: () => {} },
        { id: "svg", label: "SVG", onSelect: () => {} },
        { id: "pdf", label: "PDF (Pro only)", disabled: true },
      ]}
    />
  ),
};
