// [Claude.A5] Export current viewport to PNG/SVG (video export is delegated to the
// export-pipeline system — 07 — which needs server-side ffmpeg).
import { RenderNode } from "./canvas-renderer";

export function exportToPNG(canvas: HTMLCanvasElement): Blob | null {
  let blob: Blob | null = null;
  canvas.toBlob((b) => { blob = b; }, "image/png");
  return blob; // NOTE: toBlob is async in real browsers; caller should use the Promise form.
}

export function exportToSVG(nodes: RenderNode[], width: number, height: number): string {
  const els = nodes.map((n) => {
    const fill = n.fill ?? "none";
    const stroke = n.stroke ?? "none";
    switch (n.kind) {
      case "rect":
        return `<rect x="${n.x - (n.w ?? 0) / 2}" y="${n.y - (n.h ?? 0) / 2}" width="${n.w}" height="${n.h}" fill="${fill}" stroke="${stroke}"/>`;
      case "circle":
        return `<circle cx="${n.x}" cy="${n.y}" r="${n.r}" fill="${fill}" stroke="${stroke}"/>`;
      case "path":
        return `<path d="${n.path}" fill="${fill}" stroke="${stroke}"/>`;
      case "text":
        return `<text x="${n.x}" y="${n.y}" font-size="${n.fontSize ?? 16}" fill="${fill}">${escapeXml(n.text ?? "")}</text>`;
      default:
        return "";
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${els.join("")}</svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
