// [Claude.A14] Shared AI request/response types.
// Mirrors python-service/models/ai/*.py — keep in sync manually until
// we wire up an OpenAPI codegen step in the build pipeline.

export interface ModelUsage {
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  latencyMs: number;
  fallbackDepth: number;
}

export interface AIResponseMeta {
  requestId: string;
  generatedAt: string;
  usage?: ModelUsage | null;
  warnings: string[];
  cached: boolean;
}

export interface AIResponse<T> {
  success: boolean;
  data: T | null;
  error?: string | null;
  meta: AIResponseMeta;
}

// --- Design generation -------------------------------------------------
export interface LayerFill {
  type: "solid" | "gradient" | "glass";
  colors: string[];
  angle?: number | null;
  blur?: number | null;
  opacity: number;
}

export interface GeneratedLayer {
  id: string;
  type: "rect" | "ellipse" | "text" | "group" | "vector" | "image";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill?: LayerFill | null;
  text?: string | null;
  fontFamily?: string | null;
  fontSize?: number | null;
  cornerRadius?: number | null;
  children: GeneratedLayer[];
}

export interface DesignVariation {
  variationId: string;
  layers: GeneratedLayer[];
  palette: string[];
  notes?: string | null;
}

export interface GenerateDesignRequest {
  prompt: string;
  styleReference?: string[];
  variations?: number;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "21:9";
}

export interface GenerateDesignResponse {
  designId: string;
  prompt: string;
  variations: DesignVariation[];
}

export interface DesignGenerationProgress {
  taskId: string;
  status: "queued" | "running" | "done" | "error" | "cancelled";
  progress: number; // 0..1
  message?: string;
  result?: { response: GenerateDesignResponse; warnings: string[] };
  error?: string;
}

// --- Reference analysis --------------------------------------------------
export type AnalysisType = "color_palette" | "design_patterns" | "layout" | "all";

export interface AnalyzeReferenceRequest {
  imageUrl: string;
  analysisType?: AnalysisType;
}

export interface ColorPaletteResult {
  dominant: string[];
  accent: string[];
  background: string[];
  harmony?: string | null;
}

export interface DesignPatternResult {
  detected: string[];
  confidence: Record<string, number>;
}

export interface TypographyResult {
  primaryTypeface?: string | null;
  scale: number[];
  weightRange: number[];
}

export interface LayoutResult {
  grid?: string | null;
  balance?: string | null;
  whitespaceRatio?: number | null;
}

export interface AnalyzeReferenceResponse {
  imageUrl: string;
  colorPalette?: ColorPaletteResult | null;
  designPatterns?: DesignPatternResult | null;
  typography?: TypographyResult | null;
  layout?: LayoutResult | null;
  compositionNotes?: string | null;
}

// --- Animation -------------------------------------------------------------
export interface Keyframe {
  time: number;
  properties: Record<string, unknown>;
  easing: string;
}

export interface AnimationTrack {
  property: string;
  keyframes: Keyframe[];
}

export interface GeneratedAnimation {
  layerId: string;
  animationType: "hover" | "entrance" | "exit" | "loop";
  durationMs: number;
  tracks: AnimationTrack[];
  trigger: "hover" | "click" | "scroll" | "load" | "loop";
}

export interface GenerateAnimationRequest {
  objectType: string;
  layerId: string;
  animationType: "hover" | "entrance" | "exit" | "loop";
}

// --- Shader ----------------------------------------------------------------
export interface ShaderUniform {
  name: string;
  type: string;
  defaultValue?: number | number[] | null;
}

export interface GeneratedShader {
  vertexShader: string;
  fragmentShader: string;
  uniforms: ShaderUniform[];
  targetPlatform: "webgl" | "webgpu";
  estimatedCostTier: "low" | "medium" | "high";
  compiled: boolean;
  compileErrors: string[];
}

export interface GenerateShaderRequest {
  effectDescription: string;
  targetPlatform?: "webgl" | "webgpu";
}

// --- Code generation ---------------------------------------------------
export interface GenerateCodeRequest {
  layerId: string;
  framework?: "react" | "nextjs" | "html" | "css";
  includeTypes?: boolean;
  layerSummary?: Record<string, unknown>;
}

export interface GeneratedCode {
  code: string;
  fileName: string;
  types?: string | null;
}

// --- Style transfer -------------------------------------------------------
export type StylePreset =
  | "glassmorphism"
  | "minimalism"
  | "brutal"
  | "flat"
  | "neumorphism"
  | "skeuomorphism";

export interface TransferStyleRequest {
  sourceLayer: string;
  referenceImages?: string[];
  stylePreset?: StylePreset;
}

export interface StyleAttributes {
  colors: string[];
  cornerRadius?: number | null;
  shadow?: Record<string, unknown> | null;
  blur?: number | null;
  opacity?: number | null;
  typographyScale: number[];
  spacingRhythm: number[];
}

export interface TransferStyleResponse {
  sourceLayer: string;
  appliedStyle: StyleAttributes;
  designSystem?: Record<string, unknown> | null;
}

// --- Refinement --------------------------------------------------------
export interface RefineRequest {
  designId: string;
  feedback: string;
  refinementCount?: number;
}

// --- Suggestions -----------------------------------------------------------
export type SuggestionType = "color_harmony" | "layout" | "typography" | "responsive";

export interface SuggestRequest {
  layerId: string;
  suggestionType: SuggestionType;
  layerContext?: Record<string, unknown>;
}

export interface Suggestion {
  type: string;
  description: string;
  payload: Record<string, unknown>;
  confidence: number;
}

export interface SuggestResponse {
  layerId: string;
  suggestions: Suggestion[];
}

// --- NLP commands --------------------------------------------------------
export interface ExecuteCommandRequest {
  command: string;
  context?: string;
}

export interface ParsedAction {
  type: string;
  target: string;
  params: Record<string, unknown>;
}

export interface ExecuteCommandResponse {
  actions: ParsedAction[];
  ambiguous: boolean;
  clarificationNeeded?: string | null;
}

// --- Format conversion -----------------------------------------------------
export interface ConvertFormatRequest {
  assetId: string;
  assetUrl?: string;
  assetDescription?: string;
  currentFormat?: string;
  targetFormat: "svg" | "gltf" | "webp" | "avif";
  optimization?: "quality" | "size" | "balanced";
}

// --- Optimization ------------------------------------------------------
export interface OptimizeRequest {
  projectId: string;
  optimizationType?: "performance" | "file_size" | "quality";
  projectSnapshot?: Record<string, unknown>;
}

export interface OptimizeResponse {
  predictedRenderTimeMs: number;
  estimatedFps: number;
  issues: Array<{ layerId: string; issue: string; suggestion: string; severity: string }>;
  recommendations: string[];
  unnecessaryLayerIds: string[];
}
