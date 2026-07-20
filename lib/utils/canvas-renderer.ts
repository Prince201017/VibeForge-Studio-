// [Claude.A5] Canvas2D renderer — the fallback/default path (WebGL path is a
// separate renderer implementing the same RenderTarget interface).
import { Camera, worldToScreen } from "./camera";

export interface RenderNode {
  id: string;
  kind: "rect" | "circle" | "path" | "text";
  x: number; y: number;
  w?: number; h?: number; r?: number;
  fill?: string; stroke?: string; strokeWidth?: number;
  path?: string; text?: string; fontSize?: number;
  rotation?: number;
  opacity?: number;
}

export interface RenderTarget {
  clear(): void;
  drawFrame(nodes: RenderNode[], camera: Camera): void;
  toDataURL(mime?: string): string;
}

export class CanvasRenderTarget implements RenderTarget {
  private ctx: CanvasRenderingContext2D;
  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context unavailable");
    this.ctx = ctx;
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawFrame(nodes: RenderNode[], camera: Camera): void {
    this.clear();
    const ctx = this.ctx;
    for (const node of nodes) {
      const screen = worldToScreen(camera, node.x, node.y, this.canvas.width, this.canvas.height);
      ctx.save();
      ctx.globalAlpha = node.opacity ?? 1;
      ctx.translate(screen.x, screen.y);
      if (node.rotation) ctx.rotate((node.rotation * Math.PI) / 180);
      ctx.fillStyle = node.fill ?? "transparent";
      ctx.strokeStyle = node.stroke ?? "transparent";
      ctx.lineWidth = (node.strokeWidth ?? 1) * camera.zoom;

      switch (node.kind) {
        case "rect": {
          const w = (node.w ?? 0) * camera.zoom, h = (node.h ?? 0) * camera.zoom;
          ctx.fillRect(-w / 2, -h / 2, w, h);
          if (node.stroke) ctx.strokeRect(-w / 2, -h / 2, w, h);
          break;
        }
        case "circle": {
          ctx.beginPath();
          ctx.arc(0, 0, (node.r ?? 0) * camera.zoom, 0, Math.PI * 2);
          ctx.fill();
          if (node.stroke) ctx.stroke();
          break;
        }
        case "path": {
          if (node.path) {
            const p = new Path2D(node.path);
            ctx.fill(p);
            if (node.stroke) ctx.stroke(p);
          }
          break;
        }
        case "text": {
          ctx.font = `${(node.fontSize ?? 16) * camera.zoom}px sans-serif`;
          ctx.fillText(node.text ?? "", 0, 0);
          break;
        }
      }
      ctx.restore();
    }
  }

  toDataURL(mime = "image/png"): string {
    return this.canvas.toDataURL(mime);
  }
}
