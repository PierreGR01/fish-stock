// TASK-09 — Save scenario modal
import { useState, useEffect, useRef } from 'react';
import { useFishStore } from '../../store/fishStore';

interface Props {
  onClose: () => void;
}

export function SaveScenarioModal({ onClose }: Props) {
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);
  const saveCurrentScenario = useFishStore(s => s.saveCurrentScenario);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSave = () => {
    if (!name.trim()) return;
    saveCurrentScenario(name.trim());
    setSaved(true);
    setTimeout(onClose, 1400);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,20,40,0.7)' }} onClick={onClose} />
      <div style={{
        position: 'relative', zIndex: 1,
        width: 340,
        background: 'var(--ink-700)',
        border: '1px solid var(--ice-border)',
        borderRadius: 8,
        padding: '20px 22px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
      }}>
        {saved ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 8, color: 'var(--signal-ok)' }}>✓</div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--signal-ok)' }}>
              Scenario saved!
            </div>
          </div>
        ) : (
          <>
            <h3 style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, color: 'var(--text-hi)', marginBottom: 14 }}>
              Save scenario
            </h3>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: 'var(--text-lo)', fontFamily: 'var(--font-ui)', marginBottom: 5 }}>
                Scenario name
              </div>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                placeholder="e.g. Low catch + PIPA closure"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--ink-500)', border: '1px solid var(--ice-border)',
                  borderRadius: 'var(--radius-sm)', color: 'var(--text-hi)',
                  fontFamily: 'var(--font-ui)', fontSize: 11, padding: '7px 10px', outline: 'none',
                }}
              />
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-lo)', fontFamily: 'var(--font-ui)', marginBottom: 16 }}>
              Date: {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onClose} style={{
                flex: 1, padding: '8px 0', fontSize: 11,
                background: 'transparent', border: '1px solid var(--ink-500)',
                borderRadius: 'var(--radius-sm)', color: 'var(--text-lo)',
                fontFamily: 'var(--font-ui)', cursor: 'pointer',
              }}>Cancel</button>
              <button
                onClick={handleSave}
                disabled={!name.trim()}
                style={{
                  flex: 1, padding: '8px 0', fontSize: 11, fontWeight: 600,
                  background: name.trim() ? 'var(--ice)' : 'var(--ink-500)',
                  border: 'none', borderRadius: 'var(--radius-sm)',
                  color: name.trim() ? 'var(--ink-900)' : 'var(--text-lo)',
                  fontFamily: 'var(--font-ui)', cursor: name.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.12s',
                }}>Save →</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
