// [Claude.A6] Emitter: spawns particles per-tick according to a rate + preset shape.
import { ParticleBuffer } from "./particle-buffer";

export interface EmitterConfig {
  x: number; y: number;
  rate: number;              // particles per second
  spread: number;            // radians
  speed: [number, number];   // min/max
  life: [number, number];
  size: [number, number];
  color: [number, number, number];
  shape: "point" | "circle" | "line";
  shapeRadius?: number;
}

export class Emitter {
  private accumulator = 0;
  constructor(public config: EmitterConfig) {}

  tick(buf: ParticleBuffer, dt: number): number {
    this.accumulator += this.config.rate * dt;
    let spawned = 0;
    while (this.accumulator >= 1) {
      this.accumulator -= 1;
      const { x, y } = this.samplePosition();
      const angle = (Math.random() - 0.5) * this.config.spread;
      const speed = lerp(this.config.speed[0], this.config.speed[1], Math.random());
      const life = lerp(this.config.life[0], this.config.life[1], Math.random());
      const size = lerp(this.config.size[0], this.config.size[1], Math.random());
      const idx = buf.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, life, size, this.config.color);
      if (idx >= 0) spawned++;
    }
    return spawned;
  }

  private samplePosition(): { x: number; y: number } {
    const { x, y, shape, shapeRadius = 10 } = this.config;
    if (shape === "point") return { x, y };
    if (shape === "circle") {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * shapeRadius;
      return { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r };
    }
    // line
    return { x: x + (Math.random() - 0.5) * shapeRadius * 2, y };
  }
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

// 20+ presets per spec target: parametrized by shape/force combos in presets.ts
