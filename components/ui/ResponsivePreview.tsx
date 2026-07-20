// [CSS.A10] ResponsivePreview.tsx
import type { AnimationConfig } from '../../lib/css-animation/types';
import LivePreview from './LivePreview';

interface ResponsivePreviewProps {
  config: AnimationConfig;
  speed: number;
}

const VIEWPORTS: { name: 'mobile' | 'tablet' | 'desktop'; width: number; label: string }[] = [
  { name: 'mobile', width: 375, label: 'Mobile · 375px' },
  { name: 'tablet', width: 768, label: 'Tablet · 768px' },
  { name: 'desktop', width: 1280, label: 'Desktop · 1280px' },
];

function resolveTimingForViewport(config: AnimationConfig, viewportWidth: number): AnimationConfig {
  const bp = (config.breakpoints ?? [])
    .filter((b) => b.maxWidth !== undefined && viewportWidth <= b.maxWidth!)
    .sort((a, b) => (a.maxWidth ?? Infinity) - (b.maxWidth ?? Infinity))[0];

  if (!bp?.overrides) return config;
  return { ...config, timing: { ...config.timing, ...bp.overrides } };
}

export default function ResponsivePreview({ config, speed }: ResponsivePreviewProps) {
  return (
    <div style={{ display: 'flex', gap: 16, overflowX: 'auto' }}>
      {VIEWPORTS.map((vp) => {
        const resolved = resolveTimingForViewport(config, vp.width);
        return (
          <div key={vp.name} style={{ flexShrink: 0, width: Math.min(vp.width, 320) }}>
            <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 6 }}>{vp.label}</div>
            <div style={{ transform: vp.width > 320 ? `scale(${320 / vp.width})` : undefined, transformOrigin: 'top left', width: vp.width }}>
              <LivePreview config={resolved} speed={speed} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
