/**
 * [ForgeOS UI] Splitter
 * Draggable divider for resizing adjacent panels. Supports horizontal
 * (left/right panels) and vertical (top/bottom panels) orientation,
 * double-click to auto-fit to a default size, and min/max clamping.
 */
import React, { useCallback, useRef, useState } from "react";
import { cn } from "../utils/classNames";
import type { BaseComponentProps, Orientation } from "../types";

export interface SplitterProps extends BaseComponentProps {
  orientation?: Orientation;
  min?: number;
  max?: number;
  defaultSize?: number;
  onResize?: (size: number) => void;
  onResizeEnd?: (size: number) => void;
}

export const Splitter: React.FC<SplitterProps> = ({
  orientation = "vertical",
  min = 160,
  max = 640,
  defaultSize = 280,
  onResize,
  onResizeEnd,
  className,
  id,
  "data-testid": testId,
}) => {
  const [dragging, setDragging] = useState(false);
  const sizeRef = useRef(defaultSize);
  const startRef = useRef(0);

  const isVertical = orientation === "vertical"; // divider is vertical, resizes width

  const clamp = useCallback((value: number) => Math.min(max, Math.max(min, value)), [min, max]);

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      const delta = isVertical ? event.clientX - startRef.current : event.clientY - startRef.current;
      const next = clamp(sizeRef.current + delta);
      onResize?.(next);
    },
    [clamp, isVertical, onResize]
  );

  const stopDragging = useCallback(() => {
    setDragging(false);
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", stopDragging);
    onResizeEnd?.(sizeRef.current);
  }, [onPointerMove, onResizeEnd]);

  const startDragging = (event: React.PointerEvent) => {
    setDragging(true);
    startRef.current = isVertical ? event.clientX : event.clientY;
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", stopDragging);
  };

  const handleDoubleClick = () => {
    sizeRef.current = defaultSize;
    onResize?.(defaultSize);
    onResizeEnd?.(defaultSize);
  };

  return (
    <div
      id={id}
      data-testid={testId}
      role="separator"
      aria-orientation={isVertical ? "vertical" : "horizontal"}
      tabIndex={0}
      onPointerDown={startDragging}
      onDoubleClick={handleDoubleClick}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 24 : 8;
        if (event.key === (isVertical ? "ArrowLeft" : "ArrowUp")) {
          sizeRef.current = clamp(sizeRef.current - step);
          onResize?.(sizeRef.current);
        }
        if (event.key === (isVertical ? "ArrowRight" : "ArrowDown")) {
          sizeRef.current = clamp(sizeRef.current + step);
          onResize?.(sizeRef.current);
        }
      }}
      className={cn(
        "shrink-0 bg-neutral-800 transition-colors hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500",
        isVertical ? "w-1 cursor-col-resize" : "h-1 cursor-row-resize",
        dragging && "bg-indigo-500",
        className
      )}
    />
  );
};

Splitter.displayName = "Splitter";
