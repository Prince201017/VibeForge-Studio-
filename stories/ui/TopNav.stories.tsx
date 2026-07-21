import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { TopNav } from "./TopNav";

/** [ForgeOS UI] TopNav stories: brand, centered nav, user menu. */
const meta: Meta = { title: "Nav/TopNav", tags: ["autodocs"] };
export default meta;
type Story = StoryObj;

const navItems = [
  { id: "design", label: "Design" },
  { id: "prototype", label: "Prototype" },
  { id: "export", label: "Export" },
];

export const Basic: Story = {
  render: () => {
    function Demo() {
      const [active, setActive] = useState("design");
      return (
        <TopNav
          brand={<span className="font-semibold text-neutral-100">ForgeOS</span>}
          items={navItems.map((i) => ({ ...i, onClick: () => setActive(i.id) }))}
          activeId={active}
          userMenu={<div className="h-7 w-7 rounded-full bg-indigo-500" />}
        />
      );
    }
    return <Demo />;
  },
};
