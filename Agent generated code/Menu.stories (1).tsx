import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Menu } from "./Menu";

/** [ForgeOS UI] Menu stories: right-click context menu triggered at a point. */
const meta: Meta = { title: "Button/Menu", tags: ["autodocs"] };
export default meta;
type Story = StoryObj;

export const ContextMenu: Story = {
  render: () => {
    function Demo() {
      const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
      return (
        <div
          onContextMenu={(e) => {
            e.preventDefault();
            setMenuPos({ x: e.clientX, y: e.clientY });
          }}
          className="flex h-40 w-64 items-center justify-center rounded border border-dashed border-neutral-700 text-xs text-neutral-500"
        >
          Right-click here
          {menuPos && (
            <Menu
              x={menuPos.x}
              y={menuPos.y}
              onClose={() => setMenuPos(null)}
              items={[
                { id: "copy", label: "Copy", shortcut: "⌘C", onSelect: () => {} },
                { id: "paste", label: "Paste", shortcut: "⌘V", onSelect: () => {}, separatorAfter: true },
                { id: "delete", label: "Delete", danger: true, onSelect: () => {} },
              ]}
            />
          )}
        </div>
      );
    }
    return <Demo />;
  },
};
