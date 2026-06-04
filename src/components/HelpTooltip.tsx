// TASK-07 — Contextual help tooltips
import { useState, useRef, useEffect } from 'react';

interface Props {
  content: React.ReactNode;
}

export function HelpTooltip({ content }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouse = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onMouse);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouse);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: 16, height: 16, borderRadius: '50%',
          background: open ? 'var(--ice-dim)' : 'var(--ink-500)',
          border: `1px solid ${open ? 'var(--ice)' : 'var(--ice-border)'}`,
          color: open ? 'var(--ice)' : 'var(--text-lo)',
          fontSize: 9, fontFamily: 'var(--font-mono)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>?</button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0,
          marginTop: 6, zIndex: 100,
          width: 230,
          background: 'var(--ink-700)',
          border: '1px solid var(--ice-border)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 12px',
          fontFamily: 'var(--font-ui)', fontSize: 10,
          color: 'var(--text-mid)', lineHeight: 1.6,
          boxShadow: '0 8px 28px rgba(0,0,0,0.55)',
        }}>
          {content}
        </div>
      )}
    </div>
  );
}
