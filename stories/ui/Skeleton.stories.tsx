import type { Meta, StoryObj } from "@storybook/react";
import { Skeleton } from "./Skeleton";

/** [ForgeOS UI] Skeleton stories: block, multi-line, and circular. */
const meta: Meta<typeof Skeleton> = { title: "Display/Skeleton", component: Skeleton, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Block: Story = { args: { className: "h-24 w-full" } };
export const TextLines: Story = { args: { lines: 3 } };
export const Circle: Story = { args: { circle: true, className: "h-10 w-10" } };
