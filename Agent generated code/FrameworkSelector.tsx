// [CSS.A10] FrameworkSelector.tsx
import type { ExportFramework } from '../../lib/css-animation/types';

interface FrameworkSelectorProps {
  selected: ExportFramework;
  onSelect: (fw: ExportFramework) => void;
}

export const FRAMEWORKS: { id: ExportFramework; label: string; description: string }[] = [
  { id: 'css', label: 'CSS', description: 'Plain @keyframes, works everywhere' },
  { id: 'tailwind', label: 'Tailwind', description: 'tailwind.config.js extension' },
  { id: 'styled-components', label: 'Styled Components', description: 'Tagged-template CSS-in-JS' },
  { id: 'framer-motion', label: 'Framer Motion', description: 'React component with motion.div' },
  { id: 'gsap', label: 'GSAP', description: 'Timeline-based, best for sequencing' },
  { id: 'motion-one', label: 'Motion One', description: 'Lightweight WAAPI wrapper' },
  { id: 'animejs', label: 'Anime.js', description: 'Flexible targeting & stagger' },
  { id: 'web-animation-api', label: 'Web Animation API', description: 'Zero dependencies' },
  { id: 'html', label: 'Full HTML', description: 'Self-contained runnable page' },
];

export default function FrameworkSelector({ selected, onSelect }: FrameworkSelectorProps) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {FRAMEWORKS.map((f) => (
        <button
          key={f.id}
          title={f.description}
          onClick={() => onSelect(f.id)}
          style={{
            fontSize: 12,
            padding: '5px 10px',
            borderRadius: 999,
            border: '1px solid #2a2a30',
            background: selected === f.id ? 'var(--accent, #7c9cff)' : 'transparent',
            color: selected === f.id ? '#000' : 'inherit',
            cursor: 'pointer',
          }}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
