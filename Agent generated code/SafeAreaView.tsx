/**
 * components/responsive/SafeAreaView.tsx
 *
 * Wraps children in a container that pads for device safe areas
 * (notch, home indicator, status/action bars) using CSS `env()` values
 * with a configurable minimum floor, per 14_MOBILE_RESPONSIVE_NEEDS.md
 * "Safe Area Insets".
 */

import React from "react";
import { getSafeAreaPadding, cx } from "../../lib/responsive/styles";

export interface SafeAreaViewProps {
  children: React.ReactNode;
  className?: string;
  /** Which edges to apply safe-area padding to. Default: all. */
  edges?: Array<"top" | "right" | "bottom" | "left">;
  /** Minimum padding floor (px) applied even when env() resolves to 0. Default 16. */
  minPaddingPx?: number;
  as?: keyof JSX.IntrinsicElements;
}

const ALL_EDGES: Array<"top" | "right" | "bottom" | "left"> = ["top", "right", "bottom", "left"];

export function SafeAreaView({
  children,
  className,
  edges = ALL_EDGES,
  minPaddingPx = 16,
  as: Tag = "div",
}: SafeAreaViewProps) {
  const padding = getSafeAreaPadding(minPaddingPx);

  const style: React.CSSProperties = {};
  if (edges.includes("top")) style.paddingTop = padding.paddingTop;
  if (edges.includes("right")) style.paddingRight = padding.paddingRight;
  if (edges.includes("bottom")) style.paddingBottom = padding.paddingBottom;
  if (edges.includes("left")) style.paddingLeft = padding.paddingLeft;

  return (
    <Tag className={cx("w-full", className)} style={style}>
      {children}
    </Tag>
  );
}

export default SafeAreaView;
