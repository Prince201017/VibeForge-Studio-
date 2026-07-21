import type { Meta, StoryObj } from "@storybook/react";
import { ToastProvider, useToast } from "./Toast";
import { Button } from "../button/Button";

/**
 * [ForgeOS UI] Toast stories.
 * Design notes: wrap the whole Storybook decorator (or your app root)
 * in a single <ToastProvider>; individual components call useToast().
 */
const meta: Meta = {
  title: "Modal/Toast",
  tags: ["autodocs"],
  decorators: [(Story) => <ToastProvider><Story /></ToastProvider>],
};
export default meta;
type Story = StoryObj;

function Demo() {
  const { show } = useToast();
  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={() => show({ title: "Saved", status: "success" })}>Success</Button>
      <Button size="sm" onClick={() => show({ title: "Export failed", description: "Try again", status: "error" })}>Error</Button>
      <Button size="sm" onClick={() => show({ title: "Update available", action: { label: "Reload", onClick: () => {} } })}>With action</Button>
    </div>
  );
}

export const Basic: Story = { render: () => <Demo /> };
