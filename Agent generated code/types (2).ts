// [CSS.A10] types.ts
// Core type contracts for the CSS/Frontend Animation Engine.
// These types are the single source of truth consumed by:
// CSSAnimationEditor, CodeGenerator, LivePreview, and every backend *_gen.py
// via the JSON-serialized AnimationConfig payload sent to /api/css-animation/*.

export type EasingName =
  | 'linear'
  | 'ease'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'step-start'
  | 'step-end'
  | 'power1' | 'power2' | 'power3' | 'power4'
  | 'back-in' | 'back-out' | 'back-in-out'
  | 'elastic-in' | 'elastic-out' | 'elastic-in-out'
  | 'bounce-in' | 'bounce-out' | 'bounce-in-out'
  | 'custom-bezier'
  | 'steps';

export interface CubicBezier {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Easing {
  name: EasingName;
  bezier?: CubicBezier;   // required when name === 'custom-bezier'
  steps?: number;         // required when name === 'steps'
  stepPosition?: 'start' | 'end' | 'jump-start' | 'jump-end' | 'jump-both' | 'jump-none';
  amplitude?: number;     // elastic/spring tuning
  period?: number;        // elastic/spring tuning
}

// Every property this engine can animate. Kept flat (not nested) so
// code generators can iterate a single map without type narrowing.
export type AnimatableProperty =
  | 'translateX' | 'translateY' | 'translateZ'
  | 'rotate' | 'rotateX' | 'rotateY' | 'rotateZ'
  | 'scale' | 'scaleX' | 'scaleY' | 'scaleZ'
  | 'skewX' | 'skewY'
  | 'perspective'
  | 'opacity'
  | 'color' | 'backgroundColor' | 'borderColor'
  | 'blur' | 'brightness' | 'contrast' | 'dropShadow'
  | 'grayscale' | 'hueRotate' | 'invert' | 'saturate' | 'sepia'
  | 'fontSize' | 'fontWeight' | 'letterSpacing'
  | 'width' | 'height' | 'maxWidth' | 'maxHeight'
  | 'margin' | 'padding'
  | 'borderRadius' | 'borderWidth'
  | 'boxShadow' | 'textShadow'
  | 'backdropFilter'
  | 'clipPath'
  | 'maskImage'
  | 'backgroundPosition' | 'backgroundSize'
  | 'gradientAngle';

export type CSSUnit = 'px' | '%' | 'deg' | 'rad' | 'em' | 'rem' | 'vw' | 'vh' | 's' | 'ms' | '';

export interface PropertyKeyframe {
  offset: number;              // 0..1
  value: number | string;      // numeric for interpolated props, string for color/clipPath/etc
  unit?: CSSUnit;
  easing?: Easing;              // per-keyframe-segment easing override
}

export interface AnimationTrack {
  id: string;
  property: AnimatableProperty;
  keyframes: PropertyKeyframe[];
  enabled: boolean;
}

export interface Breakpoint {
  name: 'mobile' | 'tablet' | 'desktop';
  maxWidth?: number;   // px, undefined = no upper bound (desktop)
  overrides?: Partial<AnimationTiming>;
}

export interface AnimationTiming {
  durationMs: number;
  delayMs: number;
  iterationCount: number | 'infinite';
  direction: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  fillMode: 'none' | 'forwards' | 'backwards' | 'both';
  playState: 'running' | 'paused';
  easing: Easing;
}

export interface AnimationConfig {
  id: string;
  name: string;              // used as @keyframes identifier / component name
  selector: string;          // CSS selector or React component tag hint
  tracks: AnimationTrack[];
  timing: AnimationTiming;
  breakpoints?: Breakpoint[];
  trigger?: 'load' | 'hover' | 'click' | 'scroll' | 'inView';
  stagger?: {
    enabled: boolean;
    delayEachMs: number;
    from: 'start' | 'end' | 'center' | 'edges';
  };
}

export type ExportFramework =
  | 'css'
  | 'tailwind'
  | 'styled-components'
  | 'framer-motion'
  | 'gsap'
  | 'motion-one'
  | 'animejs'
  | 'web-animation-api'
  | 'html';

export interface GenerateCodeRequest {
  config: AnimationConfig;
  framework: ExportFramework;
  typescript?: boolean;
  minify?: boolean;
  includeVendorPrefixes?: boolean;
}

export interface GenerateCodeResponse {
  framework: ExportFramework;
  code: string;
  filename: string;
  sizeBytes: number;
  warnings: string[];
}
