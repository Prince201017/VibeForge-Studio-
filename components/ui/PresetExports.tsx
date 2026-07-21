import { useState } from "react";
import { BUILT_IN_PRESETS } from "../../lib/export/formats";
import type { ExportPreset, ExportRequestPayload } from "../../lib/export/types";

interface PresetExportsProps {
  request: ExportRequestPayload;
  onApply: (preset: ExportPreset) => void;
  onSaveCurrent: (name: string) => void;
  customPresets: ExportPreset[];
}

/**
 * [V0.A7] Save/load export presets. Custom presets are lifted to the parent
 * (ExportDialog) rather than persisted here — where they're stored (Zustand,
 * localStorage, or a `/api/export/presets` endpoint) is a host-app decision
 * this package doesn't make on its own.
 */
export default function PresetExports({ request, onApply, onSaveCurrent, customPresets }: PresetExportsProps) {
  const [nameDraft, setNameDraft] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-500">Built-in Presets</h3>
        <div className="flex flex-wrap gap-2">
          {BUILT_IN_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onApply(preset)}
              className="rounded-full border border-neutral-800 px-3 py-1.5 text-xs text-neutral-300 hover:border-violet-600 hover:text-violet-300"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {customPresets.length > 0 && (
        <div>
          <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-500">Your Presets</h3>
          <div className="flex flex-wrap gap-2">
            {customPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onApply(preset)}
                className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-300 hover:border-violet-600 hover:text-violet-300"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-neutral-800 pt-3">
        <input
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          placeholder={`Save current (${request.format}) settings as…`}
          className="flex-1 rounded-md border border-neutral-800 bg-neutral-950 px-2.5 py-1.5 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-violet-500 focus:outline-none"
        />
        <button
          type="button"
          disabled={!nameDraft.trim()}
          onClick={() => {
            onSaveCurrent(nameDraft.trim());
            setNameDraft("");
          }}
          className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}
