/**
 * [ForgeOS UI] Dialog (ConfirmDialog)
 * Pre-composed confirmation dialog: title, description, optional
 * "don't ask again" checkbox, and Cancel/Confirm actions. Built on
 * the same portal + focus-trap pattern as Modal, kept separate since
 * its API is narrower and purpose-specific.
 */
import React, { useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../utils/classNames";
import { useKeyboard } from "../hooks/useKeyboard";
import { Button } from "../button/Button";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (dontAskAgain: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  showDontAskAgain?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  showDontAskAgain = false,
}) => {
  const [dontAskAgain, setDontAskAgain] = useState(false);
  useKeyboard("Escape", onClose, isOpen);

  if (!isOpen) return null;

  const dialog = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={description ? "confirm-desc" : undefined}
        className="relative w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-900 p-5 shadow-2xl"
      >
        <h2 id="confirm-title" className="text-base font-semibold text-neutral-50">{title}</h2>
        {description && <p id="confirm-desc" className="mt-2 text-sm text-neutral-400">{description}</p>}
        {showDontAskAgain && (
          <label className="mt-3 flex items-center gap-2 text-xs text-neutral-400">
            <input type="checkbox" checked={dontAskAgain} onChange={(e) => setDontAskAgain(e.target.checked)} />
            Don't ask me again
          </label>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>{cancelLabel}</Button>
          <Button variant={destructive ? "danger" : "primary"} size="sm" onClick={() => onConfirm(dontAskAgain)}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(dialog, document.body) : dialog;
};

ConfirmDialog.displayName = "ConfirmDialog";
