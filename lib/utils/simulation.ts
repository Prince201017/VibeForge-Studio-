// [Claude.A6] Ties buffer + emitter + forces together into a per-frame step,
// budgeted against the <16ms/frame SLA.
import { ParticleBuffer } from "./particle-buffer";
import { Emitter } from "./emitter";
import { Force } from "./forces";

export class ParticleSimulation {
  buffer: ParticleBuffer;
  emitters: Emitter[] = [];
  forces: Force[] = [];
  private lastStepMs = 0;

  constructor(capacity: number) {
    this.buffer = new ParticleBuffer(capacity);
  }

  addEmitter(e: Emitter): void { this.emitters.push(e); }
  addForce(f: Force): void { this.forces.push(f); }

  step(dt: number): void {
    const t0 = performance.now();
    for (const e of this.emitters) e.tick(this.buffer, dt);
    for (const f of this.forces) f(this.buffer, dt);

    const buf = this.buffer;
    for (let i = 0; i < buf.count; i++) {
      if (!buf.alive[i]) continue;
      buf.posX[i] += buf.velX[i] * dt;
      buf.posY[i] += buf.velY[i] * dt;
      buf.life[i] -= dt;
      buf.alpha[i] = Math.max(0, buf.life[i] / buf.maxLife[i]);
      if (buf.life[i] <= 0) buf.alive[i] = 0;
    }
    buf.compact();
    this.lastStepMs = performance.now() - t0;
  }

  getLastStepMs(): number { return this.lastStepMs; }
  isWithinBudget(): boolean { return this.lastStepMs <= 16; }
}
