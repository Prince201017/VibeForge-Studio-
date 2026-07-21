// [CSS.A10] GeneratedCodePreview.tsx
import type { GenerateCodeResponse } from '../../lib/css-animation/types';

interface GeneratedCodePreviewProps {
  result: GenerateCodeResponse | null;
  loading: boolean;
  error: string | null;
  onOpenExportDialog?: () => void;
}

export default function GeneratedCodePreview({ result, loading, error, onOpenExportDialog }: GeneratedCodePreviewProps) {
  const copyCode = async () => {
    if (result) await navigator.clipboard.writeText(result.code);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, height: '100%' }}>
      <div style={{ position: 'relative', flex: 1, minHeight: 240 }}>
        <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 1, display: 'flex', gap: 6 }}>
          <button onClick={copyCode} style={btn}>Copy</button>
          {onOpenExportDialog && <button onClick={onOpenExportDialog} style={btn}>Export…</button>}
        </div>
        <pre style={{ margin: 0, padding: 12, borderRadius: 8, background: '#0d0d10', fontSize: 12, overflow: 'auto', height: '100%', whiteSpace: 'pre-wrap' }}>
          {loading ? 'Generating…' : error ? `Error: ${error}` : result?.code}
        </pre>
      </div>
      {result && (
        <div style={{ fontSize: 11, opacity: 0.5, display: 'flex', justifyContent: 'space-between' }}>
          <span>{result.filename} · {(result.sizeBytes / 1024).toFixed(2)} KB</span>
          {result.warnings.length > 0 && <span style={{ color: '#ffb454' }}>{result.warnings.length} warning(s)</span>}
        </div>
      )}
      {result?.warnings.map((w, i) => (
        <div key={i} style={{ fontSize: 11, padding: 6, borderRadius: 4, background: 'rgba(255,180,84,0.12)' }}>
          ⚠ {w}
        </div>
      ))}
    </div>
  );
}

const btn: React.CSSProperties = {
  fontSize: 11,
  padding: '4px 8px',
  borderRadius: 6,
  border: '1px solid #2a2a30',
  background: '#111114',
  color: 'inherit',
  cursor: 'pointer',
};
