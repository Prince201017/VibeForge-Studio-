/**
 * [V0.A1] Main viewport for canvas editing
 * Handles zoom, pan, rendering, and interaction
 */

'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useEditorStore } from '@/lib/store';

export function Viewport() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);

  const viewport = useEditorStore((state) => state.editorState.viewport);
  const setZoom = useEditorStore((state) => state.setZoom);
  const setPan = useEditorStore((state) => state.setPan);

  // [V0.A1] Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    canvas.width = rect.width;
    canvas.height = rect.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // [V0.A1] Clear and draw grid background
    ctx.fillStyle = 'hsl(var(--color-background))';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = 'hsl(var(--color-border) / 0.3)';
    ctx.lineWidth = 1;
    const gridSize = 20;

    for (let i = 0; i < canvas.width; i += gridSize) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }

    for (let i = 0; i < canvas.height; i += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }
  }, []);

  // [V0.A1] Zoom handling
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(viewport.zoom * delta);
    }
  };

  // [V0.A1] Pan handling
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2 || e.button === 1) {
      // Middle or right mouse button
      setIsPanning(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan(viewport.panX + e.movementX, viewport.panY + e.movementY);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-background overflow-hidden relative"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          cursor: isPanning ? 'grabbing' : 'default',
        }}
      />

      {/* [V0.A1] Zoom indicator */}
      <div className="absolute bottom-lg right-lg bg-panel border border-border px-md py-xs rounded-sm text-xs font-mono">
        {Math.round(viewport.zoom * 100)}%
      </div>

      {/* [V0.A1] Placeholder - will be replaced with real rendering */}
      <div className="absolute inset-0 flex items-center justify-center text-foreground/40 pointer-events-none">
        <div className="text-center">
          <p className="text-lg font-semibold">Viewport Ready</p>
          <p className="text-sm mt-md">Scroll to zoom, middle-click to pan</p>
        </div>
      </div>
    </div>
  );
}
