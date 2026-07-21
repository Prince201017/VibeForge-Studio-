import type { Meta, StoryObj } from "@storybook/react";
import { FileInput } from "./FileInput";

/** [ForgeOS UI] FileInput stories: drag-and-drop asset upload. */
const meta: Meta<typeof FileInput> = { title: "Input/FileInput", component: FileInput, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof FileInput>;

export const Basic: Story = { args: { onFilesSelected: () => {} } };
export const ImagesOnly: Story = { args: { onFilesSelected: () => {}, accept: "image/*", label: "Drop an image or click to browse" } };
export const MultipleWithSizeLimit: Story = { args: { onFilesSelected: () => {}, multiple: true, maxSizeMb: 5 } };
