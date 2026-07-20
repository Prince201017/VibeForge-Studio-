// [CSS.A10] ExportDialog.tsx
import { useState } from 'react';
import type { GenerateCodeResponse } from '../../lib/css-animation/types';

interface ExportDialogProps {
  result: GenerateCodeResponse | null;
  open: boolean;
  onClose: () => void;
}

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ExportDialog({ result, open, onClose }: ExportDialogProps) {
  const [filename, setFilename] = useState(result?.filename ?? 'animation.css');

  if (!open || !result) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 380, background: '#16161a', borderRadius: 10, padding: 20, color: '#e6e6ea', border: '1px solid #2a2a30' }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Export {result.framework}</div>

        <label style={{ fontSize: 12, opacity: 0.7 }}>Filename</label>
        <input
          value={filename || result.filename}
          onChange={(e) => setFilename(e.target.value)}
          style={{ width: '100%', background: '#0d0d10', border: '1px solid #2a2a30', borderRadius: 6, padding: '6px 8px', color: 'inherit', margin: '4px 0 12px' }}
        />

        <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 16 }}>
          {(result.sizeBytes / 1024).toFixed(2)} KB · {result.warnings.length} warning(s)
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={secondaryBtn}>Cancel</button>
          <button
            onClick={() => {
              downloadFile(filename || result.filename, result.code);
              onClose();
            }}
            style={primaryBtn}
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
}

const secondaryBtn: React.CSSProperties = {
  fontSize: 13, padding: '6px 14px', borderRadius: 6, border: '1px solid #2a2a30',
  background: 'transparent', color: 'inherit', cursor: 'pointer',
};
const primaryBtn: React.CSSProperties = {
  fontSize: 13, padding: '6px 14px', borderRadius: 6, border: 'none',
  background: 'var(--accent, #7c9cff)', color: '#000', cursor: 'pointer', fontWeight: 600,
};
