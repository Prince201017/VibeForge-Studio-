import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Drawer } from "./Drawer";
import { Button } from "../button/Button";

/** [ForgeOS UI] Drawer stories: left/right edge-anchored panels. */
const meta: Meta = { title: "Modal/Drawer", tags: ["autodocs"] };
export default meta;
type Story = StoryObj;

function Demo(props: Partial<React.ComponentProps<typeof Drawer>>) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <Button onClick={() => setOpen(true)}>Open drawer</Button>
      <Drawer isOpen={open} onClose={() => setOpen(false)} title="Export settings" {...props}>
        <p>Configure format, resolution, and quality.</p>
      </Drawer>
    </div>
  );
}

export const RightSide: Story = { render: () => <Demo /> };
export const LeftSide: Story = { render: () => <Demo position="left" /> };
export const Wide: Story = { render: () => <Demo width={480} /> };
