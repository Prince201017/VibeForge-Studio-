import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Sidebar } from "./Sidebar";

const icon = (label: string) => <span className="text-xs">{label[0]}</span>;

const items = [
  { id: "layers", label: "Layers", icon: icon("Layers") },
  {
    id: "assets",
    label: "Assets",
    icon: icon("Assets"),
    children: [
      { id: "images", label: "Images", icon: icon("Images") },
      { id: "fonts", label: "Fonts", icon: icon("Fonts") },
    ],
  },
  { id: "settings", label: "Settings", icon: icon("Settings") },
];

/** [ForgeOS UI] Sidebar stories: grouped nav with collapse toggle. */
const meta: Meta = { title: "Nav/Sidebar", tags: ["autodocs"] };
export default meta;
type Story = StoryObj;

export const Basic: Story = {
  render: () => {
    function Demo() {
      const [active, setActive] = useState("layers");
      return <Sidebar items={items} activeId={active} onSelect={setActive} />;
    }
    return <Demo />;
  },
};
