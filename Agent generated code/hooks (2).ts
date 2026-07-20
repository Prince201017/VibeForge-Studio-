// [CSS.A10] hooks.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import type { AnimationConfig, ExportFramework, GenerateCodeResponse } from './types';
import { generateFullCSS } from './css-generator';

/**
 * Drives the LivePreview scrubber: exposes current progress (0..1),
 * play/pause/step controls, and respects playbackSpeed.
 */
export function useCSSAnimation(config: AnimationConfig, opts: { autoplay?: boolean; speed?: number } = {}) {
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(opts.autoplay ?? true);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const speed = opts.speed ?? 1;

  const totalMs = config.timing.durationMs + config.timing.delayMs;

  const tick = useCallback(
    (t: number) => {
      if (startRef.current === null) startRef.current = t;
      const elapsed = (t - startRef.current) * speed;
      const p = Math.min(1, elapsed / totalMs);
      setProgress(p);
      if (p < 1 && playing) {
        rafRef.current = requestAnimationFrame(tick);
      } else if (p >= 1 && config.timing.iterationCount === 'infinite') {
        startRef.current = t;
        rafRef.current = requestAnimationFrame(tick);
      }
    },
    [playing, speed, totalMs, config.timing.iterationCount]
  );

  useEffect(() => {
    if (playing) {
      startRef.current = null;
      rafRef.current = requestAnimationFrame(tick);
    } else if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, tick]);

  const play = () => setPlaying(true);
  const pause = () => setPlaying(false);
  const restart = () => {
    startRef.current = null;
    setProgress(0);
    setPlaying(true);
  };
  const seek = (p: number) => {
    setPlaying(false);
    setProgress(Math.max(0, Math.min(1, p)));
  };

  const css = generateFullCSS(config);

  return { progress, playing, play, pause, restart, seek, css };
}

/**
 * Calls the backend export endpoint for a given framework. Falls back to
 * the local client-side CSS generator for framework === 'css' so the panel
 * feels instant even before the backend responds.
 */
export function useCodeGen(config: AnimationConfig, framework: ExportFramework) {
  const [result, setResult] = useState<GenerateCodeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        if (framework === 'css') {
          const code = generateFullCSS(config, { vendorPrefixes: true });
          if (!cancelled) {
            setResult({
              framework,
              code,
              filename: `${config.name}.css`,
              sizeBytes: new TextEncoder().encode(code).length,
              warnings: [],
            });
          }
          return;
        }
        const res = await fetch(`/api/css-animation/generate-${mapEndpoint(framework)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config, framework, typescript: true }),
        });
        if (!res.ok) throw new Error(`Generation failed: ${res.status}`);
        const data: GenerateCodeResponse = await res.json();
        if (!cancelled) setResult(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [config, framework]);

  return { result, loading, error };
}

function mapEndpoint(framework: ExportFramework): string {
  const map: Record<ExportFramework, string> = {
    css: 'css',
    tailwind: 'tailwind',
    'styled-components': 'styled',
    'framer-motion': 'framer',
    gsap: 'gsap',
    'motion-one': 'motion-one',
    animejs: 'animejs',
    'web-animation-api': 'waapi',
    html: 'html',
  };
  return map[framework];
}
