import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { ConfirmDialog } from "./Dialog";
import { Button } from "../button/Button";

/** [ForgeOS UI] ConfirmDialog stories: standard and destructive confirmation. */
const meta: Meta = { title: "Modal/Dialog", tags: ["autodocs"] };
export default meta;
type Story = StoryObj;

function Demo(props: Partial<React.ComponentProps<typeof ConfirmDialog>>) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <Button onClick={() => setOpen(true)}>Delete layer</Button>
      <ConfirmDialog
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
        title="Delete this layer?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        destructive
        {...props}
      />
    </div>
  );
}

export const Destructive: Story = { render: () => <Demo /> };
export const Standard: Story = { render: () => <Demo destructive={false} title="Discard changes?" confirmLabel="Discard" /> };
export const WithDontAskAgain: Story = { render: () => <Demo showDontAskAgain /> };
