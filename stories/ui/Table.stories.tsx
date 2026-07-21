import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Table } from "./Table";

interface Asset { id: string; name: string; type: string; size: number; }
const data: Asset[] = [
  { id: "1", name: "hero.png", type: "Image", size: 240 },
  { id: "2", name: "logo.svg", type: "Vector", size: 12 },
  { id: "3", name: "intro.mp4", type: "Video", size: 8200 },
];

/** [ForgeOS UI] Table stories: sortable, filterable, selectable, expandable. */
const meta: Meta = { title: "List/Table", tags: ["autodocs"] };
export default meta;
type Story = StoryObj;

const columns = [
  { key: "name", header: "Name", render: (r: Asset) => r.name, sortable: true, sortAccessor: (r: Asset) => r.name },
  { key: "type", header: "Type", render: (r: Asset) => r.type, sortable: true, sortAccessor: (r: Asset) => r.type },
  { key: "size", header: "Size (KB)", render: (r: Asset) => r.size, sortable: true, sortAccessor: (r: Asset) => r.size },
];

export const Basic: Story = {
  render: () => <Table columns={columns} data={data} getRowId={(r) => r.id} />,
};

export const Selectable: Story = {
  render: () => {
    function Demo() {
      const [selected, setSelected] = useState(new Set<string>());
      return <Table columns={columns} data={data} getRowId={(r) => r.id} selectable selectedIds={selected} onSelectionChange={setSelected} />;
    }
    return <Demo />;
  },
};

export const FilterableAndExpandable: Story = {
  render: () => (
    <Table
      columns={columns}
      data={data}
      getRowId={(r) => r.id}
      filterable
      renderExpanded={(r) => <p className="text-xs text-neutral-400">Asset ID: {r.id}</p>}
    />
  ),
};
