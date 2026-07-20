// [Claude.A6] Composable force fields applied to a ParticleBuffer each tick.
import { ParticleBuffer } from "./particle-buffer";

export type Force = (buf: ParticleBuffer, dt: number) => void;

export function gravity(gx: number, gy: number): Force {
  return (buf, dt) => {
    for (let i = 0; i < buf.count; i++) {
      if (!buf.alive[i]) continue;
      buf.velX[i] += gx * dt;
      buf.velY[i] += gy * dt;
    }
  };
}

export function drag(coefficient: number): Force {
  return (buf, dt) => {
    const factor = Math.max(0, 1 - coefficient * dt);
    for (let i = 0; i < buf.count; i++) {
      if (!buf.alive[i]) continue;
      buf.velX[i] *= factor; buf.velY[i] *= factor;
    }
  };
}

export function pointAttractor(x: number, y: number, strength: number): Force {
  return (buf, dt) => {
    for (let i = 0; i < buf.count; i++) {
      if (!buf.alive[i]) continue;
      const dx = x - buf.posX[i], dy = y - buf.posY[i];
      const distSq = Math.max(dx * dx + dy * dy, 1);
      const f = (strength * dt) / distSq;
      buf.velX[i] += dx * f; buf.velY[i] += dy * f;
    }
  };
}

export function turbulence(scale: number, strength: number): Force {
  // Cheap pseudo-noise (no external noise lib dependency) — good enough for stylized FX.
  return (buf, dt) => {
    for (let i = 0; i < buf.count; i++) {
      if (!buf.alive[i]) continue;
      const n1 = Math.sin(buf.posX[i] * scale + i) * Math.cos(buf.posY[i] * scale);
      const n2 = Math.cos(buf.posX[i] * scale - i) * Math.sin(buf.posY[i] * scale);
      buf.velX[i] += n1 * strength * dt;
      buf.velY[i] += n2 * strength * dt;
    }
  };
}
