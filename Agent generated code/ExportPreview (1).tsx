import { getFormatInfo } from "../../lib/export/formats";
import type { ExportRequestPayload } from "../../lib/export/types";
import { formatBytes, isCodeFormat, isVideoFormat } from "../../lib/export/utils";

interface ExportPreviewProps {
  request: ExportRequestPayload;
  projectDurationMs: number;
  projectFps: number;
  /** Optional data URL / object URL for an actual rendered thumbnail frame,
   * supplied by the host app from the WebGL viewport (Claude.A5). Falls
   * back to a plain aspect-ratio placeholder when omitted, since this
   * package doesn't own the renderer. */
  thumbnailUrl?: string;
}

export default function ExportPreview({ request, projectDurationMs, projectFps, thumbnailUrl }: ExportPreviewProps) {
  const info = getFormatInfo(request.format);
  const [w, h] = request.resolution ?? [1920, 1080];
  const fps = request.fps ?? projectFps;
  const durationSec = projectDurationMs / 1000;
  const frameCount = Math.max(1, Math.round(durationSec * fps));

  // Rough, clearly-labeled estimate — not the same rigor as the backend's
  // actual encode; useful for gut-checking a huge export before starting it.
  const estimatedBytes = isVideoFormat(request.format)
    ? ((request.video.bitrate_kbps ?? 6000) * 1000 / 8) * durationSec
    : isCodeFormat(request.format)
      ? undefined
      : frameCount * w * h * 0.35; // crude per-frame estimate for image sequences

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative flex items-center justify-center overflow-hidden rounded-md border border-neutral-800 bg-neutral-950 bg-[linear-gradient(45deg,#1a1a1a_25%,transparent_25%),linear-gradient(-45deg,#1a1a1a_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1a1a1a_75%),linear-gradient(-45deg,transparent_75%,#1a1a1a_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0]"
        style={{ aspectRatio: `${w} / ${h}` }}
      >
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnailUrl} alt="Export preview frame" className="h-full w-full object-contain" />
        ) : (
          <span className="font-mono text-xs text-neutral-600">{w} × {h}</span>
        )}
        <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-neutral-300">
          {info?.label ?? request.format}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs text-neutral-400">
        <dt>Duration</dt>
        <dd className="text-right text-neutral-200">{durationSec.toFixed(2)}s</dd>
        {!isCodeFormat(request.format) && (
          <>
            <dt>Frame rate</dt>
            <dd className="text-right text-neutral-200">{fps} fps</dd>
            <dt>Frames</dt>
            <dd className="text-right text-neutral-200">{frameCount.toLocaleString()}</dd>
          </>
        )}
        <dt>Estimated size</dt>
        <dd className="text-right text-neutral-200">{estimatedBytes ? formatBytes(estimatedBytes) : "n/a"}</dd>
      </dl>
    </div>
  );
}
