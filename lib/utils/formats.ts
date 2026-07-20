import type { ExportFormat, ExportPreset, FormatInfo } from "./types";

/**
 * [V0.A7] Export format registry (frontend mirror of
 * backend/services/format_registry.py::FORMAT_CATALOG). The dialog fetches
 * the live list from GET /api/export/formats on mount and falls back to
 * this constant if that request fails (offline dev, backend not yet
 * running) so the UI is never blank.
 */
export const FORMAT_CATALOG: FormatInfo[] = [
  { format: "mp4", category: "video", label: "MP4 (H.264)", extension: ".mp4", supports_alpha: false, supports_audio: true, notes: "Widely compatible, best default for sharing." },
  { format: "webm", category: "video", label: "WebM (VP9)", extension: ".webm", supports_alpha: false, supports_audio: true, notes: "Web-optimized, smaller files." },
  { format: "mov", category: "video", label: "MOV (ProRes 422 HQ)", extension: ".mov", supports_alpha: true, supports_audio: true, notes: "High-quality intermediate for further editing." },
  { format: "mkv", category: "video", label: "MKV (H.265, lossless)", extension: ".mkv", supports_alpha: false, supports_audio: true },
  { format: "avi", category: "video", label: "AVI (legacy)", extension: ".avi", supports_alpha: false, supports_audio: true },

  { format: "png_sequence", category: "image_sequence", label: "PNG Sequence", extension: ".png", supports_alpha: true, supports_audio: false },
  { format: "apng", category: "image_sequence", label: "Animated PNG", extension: ".png", supports_alpha: true, supports_audio: false },
  { format: "webp_sequence", category: "image_sequence", label: "WebP Sequence", extension: ".webp", supports_alpha: true, supports_audio: false },
  { format: "avif_sequence", category: "image_sequence", label: "AVIF Sequence", extension: ".avif", supports_alpha: true, supports_audio: false, notes: "Requires pillow-avif-plugin on the server." },
  { format: "exr_sequence", category: "image_sequence", label: "OpenEXR Sequence", extension: ".exr", supports_alpha: true, supports_audio: false, notes: "Requires OpenEXR native libs on the server." },
  { format: "tiff_sequence", category: "image_sequence", label: "TIFF Sequence", extension: ".tiff", supports_alpha: true, supports_audio: false },

  { format: "css", category: "code", label: "CSS (@keyframes)", extension: ".css", supports_alpha: false, supports_audio: false },
  { format: "html", category: "code", label: "HTML Page", extension: ".html", supports_alpha: false, supports_audio: false },
  { format: "tsx", category: "code", label: "React (TSX)", extension: ".tsx", supports_alpha: false, supports_audio: false },
  { format: "framer_motion", category: "code", label: "Framer Motion", extension: ".tsx", supports_alpha: false, supports_audio: false },
  { format: "gsap", category: "code", label: "GSAP", extension: ".js", supports_alpha: false, supports_audio: false },
  { format: "motion_one", category: "code", label: "Motion One", extension: ".js", supports_alpha: false, supports_audio: false },
  { format: "anime_js", category: "code", label: "Anime.js", extension: ".js", supports_alpha: false, supports_audio: false },
  { format: "web_animation_api", category: "code", label: "Web Animation API", extension: ".js", supports_alpha: false, supports_audio: false, notes: "Zero dependencies." },
  { format: "three_js", category: "code", label: "Three.js", extension: ".js", supports_alpha: false, supports_audio: false },
  { format: "tailwind", category: "code", label: "Tailwind CSS", extension: ".tsx", supports_alpha: false, supports_audio: false },
  { format: "styled_components", category: "code", label: "styled-components", extension: ".tsx", supports_alpha: false, supports_audio: false },

  { format: "svg_smil", category: "specialized", label: "SVG (SMIL)", extension: ".svg", supports_alpha: true, supports_audio: false },
  { format: "svg_css", category: "specialized", label: "SVG (CSS-driven)", extension: ".svg", supports_alpha: true, supports_audio: false },
  { format: "svg_js", category: "specialized", label: "SVG (JS-driven)", extension: ".svg", supports_alpha: true, supports_audio: false },
  { format: "lottie", category: "specialized", label: "Lottie JSON", extension: ".json", supports_alpha: true, supports_audio: false },
  { format: "rive", category: "specialized", label: "Rive bundle", extension: ".zip", supports_alpha: true, supports_audio: false, notes: "True .riv binary can't be generated programmatically; ships a Lottie + state-machine bundle for manual import." },
  { format: "sprite_sheet_png", category: "specialized", label: "Sprite Sheet (PNG)", extension: ".png", supports_alpha: true, supports_audio: false },
  { format: "sprite_sheet_json", category: "specialized", label: "Sprite Sheet (JSON + PNG)", extension: ".json", supports_alpha: true, supports_audio: false },
];

export const CATEGORY_LABEL: Record<string, string> = {
  video: "Video",
  image_sequence: "Image Sequence",
  code: "Code",
  specialized: "Specialized",
};

export function formatsByCategory(): Record<string, FormatInfo[]> {
  return FORMAT_CATALOG.reduce<Record<string, FormatInfo[]>>((acc, f) => {
    (acc[f.category] ||= []).push(f);
    return acc;
  }, {});
}

export function getFormatInfo(format: ExportFormat): FormatInfo | undefined {
  return FORMAT_CATALOG.find((f) => f.format === format);
}

export const BUILT_IN_PRESETS: ExportPreset[] = [
  { id: "web-mp4", name: "Web (MP4, 1080p)", format: "mp4", resolution: [1920, 1080], fps: 30, video: { codec: "libx264", bitrate_kbps: 8000 }, render: {} },
  { id: "social-square", name: "Social Square (MP4, 1:1)", format: "mp4", resolution: [1080, 1080], fps: 30, video: { bitrate_kbps: 6000 }, render: {} },
  { id: "gif-friendly-webm", name: "Lightweight Web (WebM)", format: "webm", resolution: [1280, 720], fps: 24, video: { bitrate_kbps: 2500 }, render: {} },
  { id: "prores-master", name: "Editing Master (ProRes MOV)", format: "mov", fps: 30, video: {}, render: { antialiasing: "8x" } },
  { id: "react-component", name: "React Component (Framer Motion)", format: "framer_motion", video: {}, render: {} },
  { id: "lottie-app", name: "App Animation (Lottie)", format: "lottie", video: {}, render: {} },
];
