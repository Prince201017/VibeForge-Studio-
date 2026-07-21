import type { Meta, StoryObj } from "@storybook/react";
import { VirtualizedList } from "./VirtualizedList";

const items = Array.from({ length: 10000 }, (_, i) => ({ id: i, name: `Layer ${i + 1}` }));

/** [ForgeOS UI] VirtualizedList stories: 10,000-row smooth scrolling demo. */
const meta: Meta = { title: "List/VirtualizedList", tags: ["autodocs"] };
export default meta;
type Story = StoryObj;

export const TenThousandRows: Story = {
  render: () => (
    <VirtualizedList
      items={items}
      itemHeight={32}
      height={320}
      getKey={(item) => item.id}
      renderItem={(item) => (
        <div className="flex h-8 items-center border-b border-neutral-800 px-3 text-sm text-neutral-300">{item.name}</div>
      )}
    />
  ),
};
