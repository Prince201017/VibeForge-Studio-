/**
 * components/responsive/ResponsiveLayout.tsx
 *
 * The editor shell layout switcher (section 2 "Responsive Editor
 * Layout" + the ASCII diagrams under "Layout Variations"). This is the
 * top-level component the app's editor page renders; it decides which
 * of the three layout modes to use and adapts the left/right/bottom
 * panels accordingly:
 *
 *   Mobile   (< 768px):  panels hidden by default, full-width viewport,
 *                        bottom panel behind a tab, FAB for tools.
 *   Tablet   (768-1023): left sidebar visible, right panel on demand,
 *                        bottom panel below viewport, resizable splitter.
 *   Desktop  (>= 1024):  full multi-pane layout, all panels visible.
 */

import React, { useState } from "react";
import { useViewportInfo } from "../../lib/responsive/hooks";
import { BottomSheet } from "./BottomSheet";
import { FloatingActionButton, FabAction } from "./FloatingActionButton";
import { SafeAreaView } from "./SafeAreaView";
import { cx } from "../../lib/responsive/styles";

export interface ResponsiveLayoutProps {
  /** Main canvas/viewport content — always rendered, always full available space. */
  viewport: React.ReactNode;
  /** Layers/tree panel, shown as a left sidebar (tablet+) or a bottom-sheet tab (mobile). */
  leftPanel?: React.ReactNode;
  /** Properties/inspector panel, shown as a right sidebar (tablet+) or a bottom-sheet tab (mobile). */
  rightPanel?: React.ReactNode;
  /** Timeline / bottom panel, docked under the viewport (tablet+) or a bottom-sheet tab (mobile). */
  bottomPanel?: React.ReactNode;
  /** Top bar content (hamburger menu, search, etc.) rendered above everything on mobile. */
  topBar?: React.ReactNode;
  /** Quick-tool actions surfaced as a FAB speed-dial on mobile. */
  mobileToolActions?: FabAction[];
}

type MobileTab = "layers" | "properties" | "timeline" | null;

export function ResponsiveLayout({
  viewport,
  leftPanel,
  rightPanel,
  bottomPanel,
  topBar,
  mobileToolActions = [],
}: ResponsiveLayoutProps) {
  const { device } = useViewportInfo();
  const [mobileTab, setMobileTab] = useState<MobileTab>(null);

  if (device === "mobile") {
    return (
      <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[var(--bg,#111113)]">
        {topBar && (
          <SafeAreaView edges={["top"]} minPaddingPx={8} className="shrink-0">
            <div className="flex h-12 items-center justify-between px-2">{topBar}</div>
          </SafeAreaView>
        )}

        <div className="relative flex-1 overflow-hidden">{viewport}</div>

        {mobileToolActions.length > 0 && (
          <FloatingActionButton icon={<PlusIcon />} actions={mobileToolActions} />
        )}

        {/* Tab strip to reveal each panel as a bottom sheet on demand. */}
        <SafeAreaView edges={["bottom"]} minPaddingPx={4} className="shrink-0 border-t border-white/10">
          <div className="flex h-14">
            {leftPanel && (
              <TabButton label="Layers" active={mobileTab === "layers"} onClick={() => setMobileTab("layers")} />
            )}
            {rightPanel && (
              <TabButton
                label="Properties"
                active={mobileTab === "properties"}
                onClick={() => setMobileTab("properties")}
              />
            )}
            {bottomPanel && (
              <TabButton
                label="Timeline"
                active={mobileTab === "timeline"}
                onClick={() => setMobileTab("timeline")}
              />
            )}
          </div>
        </SafeAreaView>

        <BottomSheet isOpen={mobileTab === "layers"} onClose={() => setMobileTab(null)} title="Layers">
          {leftPanel}
        </BottomSheet>
        <BottomSheet isOpen={mobileTab === "properties"} onClose={() => setMobileTab(null)} title="Properties">
          {rightPanel}
        </BottomSheet>
        <BottomSheet
          isOpen={mobileTab === "timeline"}
          onClose={() => setMobileTab(null)}
          variant="full"
          title="Timeline"
        >
          {bottomPanel}
        </BottomSheet>
      </div>
    );
  }

  if (device === "tablet") {
    return (
      <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[var(--bg,#111113)]">
        {topBar && <div className="flex h-12 shrink-0 items-center px-3">{topBar}</div>}
        <div className="flex flex-1 overflow-hidden">
          {leftPanel && (
            <aside className="w-[250px] shrink-0 overflow-y-auto border-r border-white/10">
              {leftPanel}
            </aside>
          )}
          <main className="relative flex-1 overflow-hidden">{viewport}</main>
          {rightPanel && (
            <aside className="w-[300px] shrink-0 overflow-y-auto border-l border-white/10">
              {rightPanel}
            </aside>
          )}
        </div>
        {bottomPanel && (
          <div className="h-[220px] shrink-0 overflow-y-auto border-t border-white/10">{bottomPanel}</div>
        )}
      </div>
    );
  }

  // Desktop: full multi-pane layout.
  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[var(--bg,#111113)]">
      {topBar && <div className="flex h-12 shrink-0 items-center px-4">{topBar}</div>}
      <div className="flex flex-1 overflow-hidden">
        {leftPanel && (
          <aside className="w-[280px] shrink-0 overflow-y-auto border-r border-white/10">
            {leftPanel}
          </aside>
        )}
        <main className="relative flex-1 overflow-hidden">{viewport}</main>
        {rightPanel && (
          <aside className="w-[320px] shrink-0 overflow-y-auto border-l border-white/10">
            {rightPanel}
          </aside>
        )}
      </div>
      {bottomPanel && (
        <div className="h-[260px] shrink-0 overflow-y-auto border-t border-white/10">{bottomPanel}</div>
      )}
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "flex-1 text-xs font-medium",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent,#5b8def)]",
        active ? "text-[var(--accent,#5b8def)]" : "text-[var(--text,#f2f2f2)]/60",
      )}
    >
      {label}
    </button>
  );
}

function PlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default ResponsiveLayout;
