/**
 * [ForgeOS UI] Shared type primitives used across the component library.
 * Keep this file dependency-free so every component can import from it
 * without creating circular imports.
 */

export type Size = "sm" | "md" | "lg";

export type Variant = "primary" | "secondary" | "tertiary" | "ghost" | "danger";

export type Status = "default" | "success" | "warning" | "error" | "info";

export type Placement = "top" | "bottom" | "left" | "right";

export type Alignment = "start" | "center" | "end" | "stretch" | "baseline";

export type Orientation = "horizontal" | "vertical";

/** Standard shape for components that expose a controlled/uncontrolled open state. */
export interface Openable {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** Standard shape for form-adjacent components with validation feedback. */
export interface Validatable {
  error?: string;
  isInvalid?: boolean;
  isDisabled?: boolean;
  isRequired?: boolean;
  helperText?: string;
}

/** Common props every interactive component should accept. */
export interface BaseComponentProps {
  className?: string;
  id?: string;
  "data-testid"?: string;
}

export interface OptionType<T = string> {
  label: string;
  value: T;
  icon?: React.ReactNode;
  description?: string;
  disabled?: boolean;
}

export interface OptionGroup<T = string> {
  label: string;
  options: OptionType<T>[];
}
