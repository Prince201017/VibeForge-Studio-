import type { Meta, StoryObj } from "@storybook/react";
import { Image } from "./Image";

/** [ForgeOS UI] Image stories: aspect ratio lock and error fallback. */
const meta: Meta<typeof Image> = { title: "Media/Image", component: Image, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof Image>;

export const Basic: Story = {
  args: { src: "https://picsum.photos/400/300", alt: "Random placeholder photo", containerClassName: "w-72" },
};
export const AspectRatioLocked: Story = {
  args: { src: "https://picsum.photos/800/450", alt: "Wide photo", aspectRatio: "16/9", containerClassName: "w-72" },
};
export const ErrorState: Story = {
  args: { src: "https://broken.invalid/missing.png", alt: "Broken image", containerClassName: "w-40 h-40" },
};
