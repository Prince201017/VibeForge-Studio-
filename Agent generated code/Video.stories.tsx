import type { Meta, StoryObj } from "@storybook/react";
import { Video } from "./Video";

/** [ForgeOS UI] Video stories: custom-themed HTML5 player controls. */
const meta: Meta<typeof Video> = { title: "Media/Video", component: Video, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof Video>;

export const Basic: Story = {
  args: {
    src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    className: "w-96",
  },
};
export const WithPoster: Story = {
  args: {
    src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    poster: "https://picsum.photos/640/360",
    className: "w-96",
  },
};
