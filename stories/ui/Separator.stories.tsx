import type { Meta, StoryObj } from "@storybook/react";
import { Separator } from "./Separator";

/** [ForgeOS UI] Separator stories: horizontal, vertical, labeled. */
const meta: Meta<typeof Separator> = { title: "Display/Separator", component: Separator, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof Separator>;

export const Horizontal: Story = { render: () => <div className="w-64"><Separator /></div> };
export const WithLabel: Story = { render: () => <div className="w-64"><Separator label="OR" /></div> };
export const Vertical: Story = { render: () => <div className="flex h-10 gap-3"><span>A</span><Separator orientation="vertical" /><span>B</span></div> };
