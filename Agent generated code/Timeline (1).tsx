/**
 * [ForgeOS UI] Timeline
 * Vertical activity/history timeline (e.g. version history, collab
 * activity feed). Supports a status dot color per entry and an
 * alternating left/right layout for wider containers.
 */
import React, { type ReactNode } from "react";
import { cn } from "../utils/classNames";
import type { Status } from "../types";

export interface TimelineEntry {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  status?: Status;
  icon?: ReactNode;
}

export interface TimelineProps {
  entries: TimelineEntry[];
  alternate?: boolean;
  className?: string;
}

const dotClass: Record<Status, string> = {
  default: "bg-neutral-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-rose-500",
  info: "bg-indigo-500",
};

export const Timeline: React.FC<TimelineProps> = ({ entries, alternate = false, className }) => {
  return (
    <ol className={cn("relative flex flex-col gap-6 pl-6", className)}>
      <div className="absolute left-[7px] top-1 bottom-1 w-px bg-neutral-800" aria-hidden="true" />
      {entries.map((entry, i) => (
        <li key={entry.id} className={cn("relative", alternate && i % 2 === 1 && "md:pl-8")}>
          <span
            className={cn("absolute -left-6 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full ring-4 ring-neutral-950", dotClass[entry.status ?? "default"])}
            aria-hidden="true"
          >
            {entry.icon}
          </span>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-medium text-neutral-100">{entry.title}</p>
            <time className="shrink-0 text-xs text-neutral-500">{entry.timestamp}</time>
          </div>
          {entry.description && <p className="mt-0.5 text-xs text-neutral-400">{entry.description}</p>}
        </li>
      ))}
    </ol>
  );
};

Timeline.displayName = "Timeline";
