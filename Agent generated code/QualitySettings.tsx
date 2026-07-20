import { getFormatInfo } from "../../lib/export/formats";
import type { ExportRequestPayload } from "../../lib/export/types";
import { isCodeFormat, isImageSeqFormat, isVideoFormat } from "../../lib/export/utils";

interface QualitySettingsProps {
  request: ExportRequestPayload;
  onChange: (patch: Partial<ExportRequestPayload>) => void;
  projectWidth: number;
  projectHeight: number;
  projectFps: number;
}

const FIELD = "flex flex-col gap-1.5";
const LABEL = "text-[11px] font-medium uppercase tracking-wider text-neutral-500";
const INPUT = "rounded-md border border-neutral-800 bg-neutral-950 px-2.5 py-1.5 text-sm text-neutral-200 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500";
const SELECT = INPUT + " appearance-none";

export default function QualitySettings({ request, onChange, projectWidth, projectHeight, projectFps }: QualitySettingsProps) {
  const info = getFormatInfo(request.format);
  const [w, h] = request.resolution ?? [projectWidth, projectHeight];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <div className={FIELD}>
          <label className={LABEL}>Width</label>
          <input
            type="number" min={1} className={INPUT} value={w}
            onChange={(e) => onChange({ resolution: [Number(e.target.value), h] })}
          />
        </div>
        <div className={FIELD}>
          <label className={LABEL}>Height</label>
          <input
            type="number" min={1} className={INPUT} value={h}
            onChange={(e) => onChange({ resolution: [w, Number(e.target.value)] })}
          />
        </div>
      </div>

      {(isVideoFormat(request.format) || isImageSeqFormat(request.format)) && (
        <div className={FIELD}>
          <label className={LABEL}>Frame Rate</label>
          <select
            className={SELECT}
            value={request.fps ?? projectFps}
            onChange={(e) => onChange({ fps: Number(e.target.value) })}
          >
            {[24, 25, 30, 48, 60, 120].map((f) => (
              <option key={f} value={f}>{f} fps{f === projectFps ? " (project default)" : ""}</option>
            ))}
          </select>
        </div>
      )}

      {isVideoFormat(request.format) && (
        <div className="flex flex-col gap-3 rounded-md border border-neutral-800 p-3">
          <p className={LABEL}>Video</p>
          <div className="grid grid-cols-2 gap-3">
            <div className={FIELD}>
              <label className={LABEL}>Bitrate (kbps)</label>
              <input
                type="number" min={100} className={INPUT}
                placeholder="auto"
                value={request.video.bitrate_kbps ?? ""}
                onChange={(e) => onChange({ video: { ...request.video, bitrate_kbps: e.target.value ? Number(e.target.value) : undefined } })}
              />
            </div>
            <div className={FIELD}>
              <label className={LABEL}>Hardware Accel</label>
              <select
                className={SELECT}
                value={request.video.hardware_accel}
                onChange={(e) => onChange({ video: { ...request.video, hardware_accel: e.target.value as "nvenc" | "qsv" | "none" } })}
              >
                <option value="none">None (software)</option>
                <option value="nvenc">NVIDIA (NVENC)</option>
                <option value="qsv">Intel Quick Sync</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-300">
            <input
              type="checkbox" className="accent-violet-500"
              checked={request.video.include_audio}
              onChange={(e) => onChange({ video: { ...request.video, include_audio: e.target.checked } })}
            />
            Include audio track
          </label>
        </div>
      )}

      {isImageSeqFormat(request.format) && (
        <div className="flex flex-col gap-3 rounded-md border border-neutral-800 p-3">
          <p className={LABEL}>Image Sequence</p>
          <div className="grid grid-cols-2 gap-3">
            <div className={FIELD}>
              <label className={LABEL}>Bit Depth</label>
              <select
                className={SELECT}
                value={request.image_seq.bit_depth}
                onChange={(e) => onChange({ image_seq: { ...request.image_seq, bit_depth: Number(e.target.value) as 8 | 16 | 32 } })}
              >
                <option value={8}>8-bit</option>
                <option value={16}>16-bit</option>
                <option value={32}>32-bit</option>
              </select>
            </div>
            <div className={FIELD}>
              <label className={LABEL}>Compression</label>
              <input
                type="range" min={0} max={9}
                value={request.image_seq.compression_level}
                onChange={(e) => onChange({ image_seq: { ...request.image_seq, compression_level: Number(e.target.value) } })}
              />
            </div>
          </div>
          {info?.notes && <p className="text-xs text-amber-400/80">{info.notes}</p>}
        </div>
      )}

      {isCodeFormat(request.format) && (
        <div className="flex flex-col gap-3 rounded-md border border-neutral-800 p-3">
          <p className={LABEL}>Code Output</p>
          <div className={FIELD}>
            <label className={LABEL}>Component Name</label>
            <input
              className={INPUT}
              value={request.code.component_name}
              onChange={(e) => onChange({ code: { ...request.code, component_name: e.target.value } })}
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-neutral-300">
              <input
                type="checkbox" className="accent-violet-500"
                checked={request.code.typescript}
                onChange={(e) => onChange({ code: { ...request.code, typescript: e.target.checked } })}
              />
              TypeScript
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-300">
              <input
                type="checkbox" className="accent-violet-500"
                checked={request.code.minify}
                onChange={(e) => onChange({ code: { ...request.code, minify: e.target.checked } })}
              />
              Minify
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-300">
              <input
                type="checkbox" className="accent-violet-500"
                checked={request.code.include_responsive}
                onChange={(e) => onChange({ code: { ...request.code, include_responsive: e.target.checked } })}
              />
              Responsive
            </label>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-md border border-neutral-800 p-3">
        <p className={LABEL}>Rendering</p>
        <div className={FIELD}>
          <label className={LABEL}>Anti-aliasing</label>
          <select
            className={SELECT}
            value={request.render.antialiasing}
            onChange={(e) => onChange({ render: { ...request.render, antialiasing: e.target.value as ExportRequestPayload["render"]["antialiasing"] } })}
          >
            <option value="off">Off</option>
            <option value="2x">2×</option>
            <option value="4x">4× (default)</option>
            <option value="8x">8× (slow, highest quality)</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {([
            ["motion_blur", "Motion blur"],
            ["depth_of_field", "Depth of field"],
            ["bloom", "Bloom"],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm text-neutral-300">
              <input
                type="checkbox" className="accent-violet-500"
                checked={request.render[key]}
                onChange={(e) => onChange({ render: { ...request.render, [key]: e.target.checked } })}
              />
              {label}
            </label>
          ))}
        </div>
        <div className={FIELD}>
          <label className={LABEL}>Tone Mapping</label>
          <select
            className={SELECT}
            value={request.render.tone_mapping}
            onChange={(e) => onChange({ render: { ...request.render, tone_mapping: e.target.value as ExportRequestPayload["render"]["tone_mapping"] } })}
          >
            <option value="none">None</option>
            <option value="reinhard">Reinhard</option>
            <option value="aces">ACES (filmic)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
