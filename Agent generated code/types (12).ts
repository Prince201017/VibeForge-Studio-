/**
 * [V0.A7] Export Pipeline — frontend types
 * Mirrors backend/models/schemas.py by hand. If the Python schema changes,
 * update this file to match — there's no shared codegen step in this
 * handoff (a natural follow-up: generate this from the FastAPI OpenAPI
 * schema instead of hand-mirroring it).
 */

export type ExportFormat =
  // video
  | "mp4" | "webm" | "mov" | "mkv" | "avi"
  // image sequence
  | "png_sequence" | "apng" | "webp_sequence" | "avif_sequence" | "exr_sequence" | "tiff_sequence"
  // code
  | "css" | "html" | "tsx" | "framer_motion" | "gsap" | "motion_one" | "anime_js"
  | "web_animation_api" | "three_js" | "tailwind" | "styled_components"
  // specialized
  | "svg_smil" | "svg_css" | "svg_js" | "lottie" | "rive" | "sprite_sheet_png" | "sprite_sheet_json";

export type FormatCategory = "video" | "image_sequence" | "code" | "specialized";

export interface FormatInfo {
  format: ExportFormat;
  category: FormatCategory;
  label: string;
  extension: string;
  supports_alpha: boolean;
  supports_audio: boolean;
  notes?: string | null;
}

export type FrameRangeMode = "full" | "range" | "current_frame";

export interface FrameRange {
  mode: FrameRangeMode;
  start_ms?: number;
  end_ms?: number;
  current_frame_ms?: number;
}

export interface VideoOptions {
  codec?: string;
  bitrate_kbps?: number;
  hardware_accel?: "nvenc" | "qsv" | "none";
  color_space: "srgb" | "p3" | "hdr10";
  include_audio: boolean;
  audio_path?: string;
}

export interface ImageSeqOptions {
  bit_depth: 8 | 16 | 32;
  compression_level: number;
  name_padding: number;
}

export interface CodeOptions {
  minify: boolean;
  typescript: boolean;
  css_scope: "inline" | "external" | "modules" | "styled_components" | "emotion";
  include_responsive: boolean;
  component_name: string;
}

export interface RenderOptions {
  antialiasing: "off" | "2x" | "4x" | "8x";
  motion_blur: boolean;
  depth_of_field: boolean;
  bloom: boolean;
  tone_mapping: "none" | "aces" | "reinhard";
  film_grain: number;
}

export interface ExportMetadata {
  title?: string;
  author?: string;
  copyright?: string;
  custom: Record<string, string>;
}

export interface StorageTarget {
  destination: "local" | "vercel_blob" | "s3" | "gdrive";
  public: boolean;
  folder?: string;
}

// Minimal subset of ProjectData the export dialog needs to read (dimensions,
// duration, layer count) — the full timeline payload is assembled from the
// Zustand store immediately before POSTing, not held in component state.
export interface ProjectSummary {
  project_id: string;
  name: string;
  width: number;
  height: number;
  duration_ms: number;
  fps: number;
  layer_count: number;
}

export interface ExportRequestPayload {
  project: unknown; // full ProjectData — see lib/export/utils.ts::buildProjectPayload
  format: ExportFormat;
  resolution?: [number, number];
  fps?: number;
  frame_range: FrameRange;
  video: VideoOptions;
  image_seq: ImageSeqOptions;
  code: CodeOptions;
  render: RenderOptions;
  metadata: ExportMetadata;
  storage: StorageTarget;
}

export type JobStatus = "queued" | "running" | "complete" | "failed" | "cancelled";

export interface ExportJob {
  job_id: string;
  status: JobStatus;
  percent_complete: number;
  current_frame: number;
  total_frames: number;
  time_remaining_sec: number | null;
  error?: string | null;
}

export interface StartExportResponse {
  job_id: string;
  estimated_time_sec: number;
}

export interface HistoryEntry {
  job_id: string;
  status: JobStatus;
  format: ExportFormat;
  created_at: string;
  finished_at?: string | null;
  file_size_bytes?: number | null;
  output_url?: string | null;
  error?: string | null;
}

export interface ExportPreset {
  id: string;
  name: string;
  format: ExportFormat;
  resolution?: [number, number];
  fps?: number;
  video: Partial<VideoOptions>;
  render: Partial<RenderOptions>;
}

export interface QueueItem {
  localId: string;
  format: ExportFormat;
  job?: ExportJob;
  request: ExportRequestPayload;
}
