// [Claude.A3] Keyframe timeline + interpolation engine.
import { Easing, EasingFn } from "./easing";

export interface Keyframe<T = number> {
  time: number;      // seconds
  value: T;
  easing?: EasingFn;  // easing OUT of this keyframe toward the next
}

export interface Track<T = number> {
  id: string;
  targetId: string;   // scene node id
  property: string;   // e.g. "transform.position.x"
  keyframes: Keyframe<T>[];
  interpolate: (a: T, b: T, t: number) => T;
}

export const numberInterpolator = (a: number, b: number, t: number) => a + (b - a) * t;

export function sortKeyframes<T>(track: Track<T>): void {
  track.keyframes.sort((a, b) => a.time - b.time);
}

export function evaluateTrack<T>(track: Track<T>, time: number): T | undefined {
  const kfs = track.keyframes;
  if (kfs.length === 0) return undefined;
  if (time <= kfs[0].time) return kfs[0].value;
  if (time >= kfs[kfs.length - 1].time) return kfs[kfs.length - 1].value;

  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i], b = kfs[i + 1];
    if (time >= a.time && time <= b.time) {
      const span = b.time - a.time || 1;
      const localT = (time - a.time) / span;
      const eased = (a.easing ?? Easing.linear)(localT);
      return track.interpolate(a.value, b.value, eased);
    }
  }
  return kfs[kfs.length - 1].value;
}

export class Timeline {
  tracks: Track<any>[] = [];
  duration = 0;
  fps = 60;
  private playing = false;
  private currentTime = 0;
  private listeners = new Set<(t: number) => void>();

  addTrack(track: Track<any>): void {
    sortKeyframes(track);
    this.tracks.push(track);
    const last = track.keyframes[track.keyframes.length - 1];
    if (last) this.duration = Math.max(this.duration, last.time);
  }

  evaluateAll(time: number): Record<string, Record<string, any>> {
    const result: Record<string, Record<string, any>> = {};
    for (const track of this.tracks) {
      const value = evaluateTrack(track, time);
      if (value === undefined) continue;
      result[track.targetId] ??= {};
      result[track.targetId][track.property] = value;
    }
    return result;
  }

  seek(time: number): void {
    this.currentTime = Math.max(0, Math.min(this.duration, time));
    for (const l of this.listeners) l(this.currentTime);
  }

  onTimeUpdate(cb: (t: number) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  play(onFrame: (time: number) => void): () => void {
    this.playing = true;
    let last = performance.now();
    const step = (now: number) => {
      if (!this.playing) return;
      const dt = (now - last) / 1000;
      last = now;
      this.seek(this.currentTime + dt);
      onFrame(this.currentTime);
      if (this.currentTime < this.duration) requestAnimationFrame(step);
      else this.playing = false;
    };
    requestAnimationFrame(step);
    return () => { this.playing = false; };
  }

  pause(): void { this.playing = false; }
}
