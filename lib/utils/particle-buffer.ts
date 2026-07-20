// [Claude.A6] Struct-of-arrays particle buffer for performance at scale.
// SoA (not array-of-objects) so updates are cache-friendly and transferable to a
// WebGL buffer / Web Worker without per-particle object overhead.
export class ParticleBuffer {
  readonly capacity: number;
  posX: Float32Array; posY: Float32Array;
  velX: Float32Array; velY: Float32Array;
  life: Float32Array; maxLife: Float32Array;
  size: Float32Array; alpha: Float32Array;
  r: Float32Array; g: Float32Array; b: Float32Array;
  alive: Uint8Array;
  count = 0;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.posX = new Float32Array(capacity); this.posY = new Float32Array(capacity);
    this.velX = new Float32Array(capacity); this.velY = new Float32Array(capacity);
    this.life = new Float32Array(capacity); this.maxLife = new Float32Array(capacity);
    this.size = new Float32Array(capacity); this.alpha = new Float32Array(capacity);
    this.r = new Float32Array(capacity); this.g = new Float32Array(capacity); this.b = new Float32Array(capacity);
    this.alive = new Uint8Array(capacity);
  }

  spawn(x: number, y: number, vx: number, vy: number, life: number, size: number, color: [number, number, number]): number {
    if (this.count >= this.capacity) return -1; // hard cap — never grow unbounded
    const i = this.count++;
    this.posX[i] = x; this.posY[i] = y; this.velX[i] = vx; this.velY[i] = vy;
    this.life[i] = life; this.maxLife[i] = life; this.size[i] = size;
    this.r[i] = color[0]; this.g[i] = color[1]; this.b[i] = color[2];
    this.alpha[i] = 1; this.alive[i] = 1;
    return i;
  }

  /** Swap-remove dead particles to keep the live range packed (O(1) removal). */
  compact(): void {
    let write = 0;
    for (let read = 0; read < this.count; read++) {
      if (!this.alive[read]) continue;
      if (write !== read) {
        this.posX[write] = this.posX[read]; this.posY[write] = this.posY[read];
        this.velX[write] = this.velX[read]; this.velY[write] = this.velY[read];
        this.life[write] = this.life[read]; this.maxLife[write] = this.maxLife[read];
        this.size[write] = this.size[read]; this.alpha[write] = this.alpha[read];
        this.r[write] = this.r[read]; this.g[write] = this.g[read]; this.b[write] = this.b[read];
        this.alive[write] = this.alive[read];
      }
      write++;
    }
    this.count = write;
  }
}
