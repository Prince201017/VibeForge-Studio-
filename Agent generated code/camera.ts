// [Claude.A5] 2D pan/zoom camera for the viewport.
export interface Camera {
  x: number; y: number; zoom: number;
}

export function screenToWorld(cam: Camera, sx: number, sy: number, canvasW: number, canvasH: number) {
  return { x: (sx - canvasW / 2) / cam.zoom + cam.x, y: (sy - canvasH / 2) / cam.zoom + cam.y };
}

export function worldToScreen(cam: Camera, wx: number, wy: number, canvasW: number, canvasH: number) {
  return { x: (wx - cam.x) * cam.zoom + canvasW / 2, y: (wy - cam.y) * cam.zoom + canvasH / 2 };
}

export function zoomAt(cam: Camera, factor: number, pivotX: number, pivotY: number, canvasW: number, canvasH: number): Camera {
  const before = screenToWorld(cam, pivotX, pivotY, canvasW, canvasH);
  const newZoom = Math.max(0.02, Math.min(64, cam.zoom * factor));
  const next = { ...cam, zoom: newZoom };
  const after = screenToWorld(next, pivotX, pivotY, canvasW, canvasH);
  next.x += before.x - after.x;
  next.y += before.y - after.y;
  return next;
}
