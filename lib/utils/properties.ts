// [CSS.A10] properties.ts
// Registry describing every animatable property: its CSS output name,
// default unit, interpolation kind, and whether it triggers GPU compositing
// (used by PerformanceOptimization to warn about layout-thrashing props).

import type { AnimatableProperty, CSSUnit } from './types';

export type InterpolationKind = 'number' | 'color' | 'string' | 'transform-fn' | 'filter-fn';

export interface PropertyMeta {
  cssProperty: 'transform' | 'filter' | 'backdrop-filter' | string;
  transformFn?: string;   // e.g. 'translateX', 'rotateZ' when cssProperty === 'transform'
  filterFn?: string;      // e.g. 'blur', 'brightness' when cssProperty === 'filter'
  defaultUnit: CSSUnit;
  kind: InterpolationKind;
  gpuAccelerated: boolean; // true only for transform & opacity
  label: string;
  min?: number;
  max?: number;
  step?: number;
}

export const PROPERTY_REGISTRY: Record<AnimatableProperty, PropertyMeta> = {
  translateX: { cssProperty: 'transform', transformFn: 'translateX', defaultUnit: 'px', kind: 'transform-fn', gpuAccelerated: true, label: 'Translate X' },
  translateY: { cssProperty: 'transform', transformFn: 'translateY', defaultUnit: 'px', kind: 'transform-fn', gpuAccelerated: true, label: 'Translate Y' },
  translateZ: { cssProperty: 'transform', transformFn: 'translateZ', defaultUnit: 'px', kind: 'transform-fn', gpuAccelerated: true, label: 'Translate Z' },
  rotate:  { cssProperty: 'transform', transformFn: 'rotate',  defaultUnit: 'deg', kind: 'transform-fn', gpuAccelerated: true, label: 'Rotate' },
  rotateX: { cssProperty: 'transform', transformFn: 'rotateX', defaultUnit: 'deg', kind: 'transform-fn', gpuAccelerated: true, label: 'Rotate X' },
  rotateY: { cssProperty: 'transform', transformFn: 'rotateY', defaultUnit: 'deg', kind: 'transform-fn', gpuAccelerated: true, label: 'Rotate Y' },
  rotateZ: { cssProperty: 'transform', transformFn: 'rotateZ', defaultUnit: 'deg', kind: 'transform-fn', gpuAccelerated: true, label: 'Rotate Z' },
  scale:   { cssProperty: 'transform', transformFn: 'scale',   defaultUnit: '',    kind: 'transform-fn', gpuAccelerated: true, label: 'Scale', min: 0, max: 3, step: 0.01 },
  scaleX:  { cssProperty: 'transform', transformFn: 'scaleX',  defaultUnit: '',    kind: 'transform-fn', gpuAccelerated: true, label: 'Scale X' },
  scaleY:  { cssProperty: 'transform', transformFn: 'scaleY',  defaultUnit: '',    kind: 'transform-fn', gpuAccelerated: true, label: 'Scale Y' },
  scaleZ:  { cssProperty: 'transform', transformFn: 'scaleZ',  defaultUnit: '',    kind: 'transform-fn', gpuAccelerated: true, label: 'Scale Z' },
  skewX:   { cssProperty: 'transform', transformFn: 'skewX',   defaultUnit: 'deg', kind: 'transform-fn', gpuAccelerated: true, label: 'Skew X' },
  skewY:   { cssProperty: 'transform', transformFn: 'skewY',   defaultUnit: 'deg', kind: 'transform-fn', gpuAccelerated: true, label: 'Skew Y' },
  perspective: { cssProperty: 'transform', transformFn: 'perspective', defaultUnit: 'px', kind: 'transform-fn', gpuAccelerated: true, label: 'Perspective' },

  opacity: { cssProperty: 'opacity', defaultUnit: '', kind: 'number', gpuAccelerated: true, label: 'Opacity', min: 0, max: 1, step: 0.01 },
  color: { cssProperty: 'color', defaultUnit: '', kind: 'color', gpuAccelerated: false, label: 'Text Color' },
  backgroundColor: { cssProperty: 'background-color', defaultUnit: '', kind: 'color', gpuAccelerated: false, label: 'Background Color' },
  borderColor: { cssProperty: 'border-color', defaultUnit: '', kind: 'color', gpuAccelerated: false, label: 'Border Color' },

  blur: { cssProperty: 'filter', filterFn: 'blur', defaultUnit: 'px', kind: 'filter-fn', gpuAccelerated: false, label: 'Blur' },
  brightness: { cssProperty: 'filter', filterFn: 'brightness', defaultUnit: '', kind: 'filter-fn', gpuAccelerated: false, label: 'Brightness' },
  contrast: { cssProperty: 'filter', filterFn: 'contrast', defaultUnit: '', kind: 'filter-fn', gpuAccelerated: false, label: 'Contrast' },
  dropShadow: { cssProperty: 'filter', filterFn: 'drop-shadow', defaultUnit: '', kind: 'filter-fn', gpuAccelerated: false, label: 'Drop Shadow' },
  grayscale: { cssProperty: 'filter', filterFn: 'grayscale', defaultUnit: '', kind: 'filter-fn', gpuAccelerated: false, label: 'Grayscale' },
  hueRotate: { cssProperty: 'filter', filterFn: 'hue-rotate', defaultUnit: 'deg', kind: 'filter-fn', gpuAccelerated: false, label: 'Hue Rotate' },
  invert: { cssProperty: 'filter', filterFn: 'invert', defaultUnit: '', kind: 'filter-fn', gpuAccelerated: false, label: 'Invert' },
  saturate: { cssProperty: 'filter', filterFn: 'saturate', defaultUnit: '', kind: 'filter-fn', gpuAccelerated: false, label: 'Saturate' },
  sepia: { cssProperty: 'filter', filterFn: 'sepia', defaultUnit: '', kind: 'filter-fn', gpuAccelerated: false, label: 'Sepia' },

  fontSize: { cssProperty: 'font-size', defaultUnit: 'px', kind: 'number', gpuAccelerated: false, label: 'Font Size' },
  fontWeight: { cssProperty: 'font-weight', defaultUnit: '', kind: 'number', gpuAccelerated: false, label: 'Font Weight', min: 100, max: 900, step: 100 },
  letterSpacing: { cssProperty: 'letter-spacing', defaultUnit: 'em', kind: 'number', gpuAccelerated: false, label: 'Letter Spacing' },

  width: { cssProperty: 'width', defaultUnit: 'px', kind: 'number', gpuAccelerated: false, label: 'Width' },
  height: { cssProperty: 'height', defaultUnit: 'px', kind: 'number', gpuAccelerated: false, label: 'Height' },
  maxWidth: { cssProperty: 'max-width', defaultUnit: 'px', kind: 'number', gpuAccelerated: false, label: 'Max Width' },
  maxHeight: { cssProperty: 'max-height', defaultUnit: 'px', kind: 'number', gpuAccelerated: false, label: 'Max Height' },
  margin: { cssProperty: 'margin', defaultUnit: 'px', kind: 'number', gpuAccelerated: false, label: 'Margin' },
  padding: { cssProperty: 'padding', defaultUnit: 'px', kind: 'number', gpuAccelerated: false, label: 'Padding' },

  borderRadius: { cssProperty: 'border-radius', defaultUnit: 'px', kind: 'number', gpuAccelerated: false, label: 'Border Radius' },
  borderWidth: { cssProperty: 'border-width', defaultUnit: 'px', kind: 'number', gpuAccelerated: false, label: 'Border Width' },

  boxShadow: { cssProperty: 'box-shadow', defaultUnit: '', kind: 'string', gpuAccelerated: false, label: 'Box Shadow' },
  textShadow: { cssProperty: 'text-shadow', defaultUnit: '', kind: 'string', gpuAccelerated: false, label: 'Text Shadow' },
  backdropFilter: { cssProperty: 'backdrop-filter', defaultUnit: '', kind: 'string', gpuAccelerated: false, label: 'Backdrop Filter' },
  clipPath: { cssProperty: 'clip-path', defaultUnit: '', kind: 'string', gpuAccelerated: false, label: 'Clip Path' },
  maskImage: { cssProperty: 'mask-image', defaultUnit: '', kind: 'string', gpuAccelerated: false, label: 'Mask Image' },
  backgroundPosition: { cssProperty: 'background-position', defaultUnit: '%', kind: 'string', gpuAccelerated: false, label: 'Background Position' },
  backgroundSize: { cssProperty: 'background-size', defaultUnit: '%', kind: 'string', gpuAccelerated: false, label: 'Background Size' },
  gradientAngle: { cssProperty: '--gradient-angle', defaultUnit: 'deg', kind: 'number', gpuAccelerated: false, label: 'Gradient Angle' },
};

export const TRANSFORM_PROPERTIES: AnimatableProperty[] = Object.entries(PROPERTY_REGISTRY)
  .filter(([, meta]) => meta.cssProperty === 'transform')
  .map(([key]) => key as AnimatableProperty);

export const FILTER_PROPERTIES: AnimatableProperty[] = Object.entries(PROPERTY_REGISTRY)
  .filter(([, meta]) => meta.cssProperty === 'filter')
  .map(([key]) => key as AnimatableProperty);

/** Returns true if every track in the list only touches GPU-cheap properties (transform/opacity). */
export function isGpuOnlyAnimation(properties: AnimatableProperty[]): boolean {
  return properties.every((p) => PROPERTY_REGISTRY[p]?.gpuAccelerated);
}

/** Generates the `will-change` value recommendation for a set of properties. */
export function recommendWillChange(properties: AnimatableProperty[]): string {
  const cssProps = new Set<string>();
  for (const p of properties) {
    const meta = PROPERTY_REGISTRY[p];
    if (!meta) continue;
    cssProps.add(meta.cssProperty);
  }
  return Array.from(cssProps).join(', ');
}
