import { getFormatInfo } from "./formats";
import type { ExportFormat, ExportRequestPayload, FrameRange } from "./types";

/** [V0.A7] Shared helpers for the export UI. */

export function defaultRequest(format: ExportFormat, project: unknown): ExportRequestPayload {
  return {
    project,
    format,
    frame_range: { mode: "full" } as FrameRange,
    video: { color_space: "srgb", include_audio: false, hardware_accel: "none" },
    image_seq: { bit_depth: 8, compression_level: 6, name_padding: 4 },
    code: { minify: false, typescript: true, css_scope: "external", include_responsive: true, component_name: "AnimatedComponent" },
    render: { antialiasing: "4x", motion_blur: false, depth_of_field: false, bloom: false, tone_mapping: "none", film_grain: 0 },
    metadata: { custom: {} },
    storage: { destination: "local", public: false },
  };
}

export function validateRequest(req: ExportRequestPayload): string[] {
  const errors: string[] = [];
  const info = getFormatInfo(req.format);
  if (!info) errors.push(`Unknown format: ${req.format}`);

  if (req.frame_range.mode === "range") {
    if (req.frame_range.start_ms == null || req.frame_range.end_ms == null) {
      errors.push("Frame range mode 'range' requires both start_ms and end_ms.");
    } else if (req.frame_range.end_ms <= req.frame_range.start_ms) {
      errors.push("end_ms must be greater than start_ms.");
    }
  }
  if (req.resolution) {
    const [w, h] = req.resolution;
    if (w <= 0 || h <= 0) errors.push("Resolution must be positive.");
    if (w > 7680 || h > 4320) errors.push("Resolution exceeds 8K — likely a mistake.");
  }
  if (req.video.bitrate_kbps != null && req.video.bitrate_kbps <= 0) {
    errors.push("Bitrate must be positive.");
  }
  if (req.render.film_grain < 0 || req.render.film_grain > 1) {
    errors.push("Film grain amount must be between 0 and 1.");
  }
  return errors;
}

export function formatBytes(bytes?: number | null): string {
  if (bytes == null) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(value < 10 && unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}

export function formatDuration(seconds?: number | null): string {
  if (seconds == null) return "—";
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

export function isVideoFormat(format: ExportFormat): boolean {
  return ["mp4", "webm", "mov", "mkv", "avi"].includes(format);
}

export function isImageSeqFormat(format: ExportFormat): boolean {
  return ["png_sequence", "apng", "webp_sequence", "avif_sequence", "exr_sequence", "tiff_sequence"].includes(format);
}

export function isCodeFormat(format: ExportFormat): boolean {
  return [
    "css", "html", "tsx", "framer_motion", "gsap", "motion_one", "anime_js",
    "web_animation_api", "three_js", "tailwind", "styled_components",
  ].includes(format);
}
