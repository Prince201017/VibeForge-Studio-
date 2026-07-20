import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "../button/Button";

/**
 * [ForgeOS UI] Modal stories.
 * Design notes: use `sm` for confirmations, `md` (default) for forms,
 * `lg` for anything with a preview/canvas area inside.
 */
const meta: Meta<typeof Modal> = {
  title: "Layout/Modal",
  component: Modal,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof Modal>;

function Demo(props: Partial<React.ComponentProps<typeof Modal>>) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <Button onClick={() => setOpen(true)}>Open modal</Button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Export settings" {...props}>
        <p>Choose a format and resolution for your export.</p>
      </Modal>
    </div>
  );
}

export const Basic: Story = { render: () => <Demo /> };
export const Small: Story = { render: () => <Demo size="sm" /> };
export const Large: Story = { render: () => <Demo size="lg" /> };
export const WithFooter: Story = {
  render: () => (
    <Demo
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm">Cancel</Button>
          <Button size="sm">Export</Button>
        </div>
      }
    />
  ),
};
