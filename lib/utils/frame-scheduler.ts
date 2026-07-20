// [Claude.A5] Frame scheduler enforcing the 60 FPS SLA with frame-time budgeting
// and dirty-rect-style skip logic (skip redraw if nothing changed since last frame).
export class FrameScheduler {
  private rafId: number | null = null;
  private lastFrameTime = 0;
  private frameBudgetMs = 1000 / 60;
  private dirty = true;
  private frameTimes: number[] = [];

  markDirty(): void { this.dirty = true; }

  start(render: () => void): void {
    const loop = (now: number) => {
      const elapsed = now - this.lastFrameTime;
      if (this.dirty && elapsed >= this.frameBudgetMs) {
        const t0 = performance.now();
        render();
        const frameTime = performance.now() - t0;
        this.frameTimes.push(frameTime);
        if (this.frameTimes.length > 120) this.frameTimes.shift();
        this.lastFrameTime = now;
        this.dirty = false;
      }
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  getAverageFrameTimeMs(): number {
    if (this.frameTimes.length === 0) return 0;
    return this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
  }

  isWithinBudget(): boolean {
    return this.getAverageFrameTimeMs() <= this.frameBudgetMs;
  }
}
