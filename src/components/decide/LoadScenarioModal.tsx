// TASK-10 — Load scenario modal
import { useState, useEffect } from 'react';
import { useFishStore } from '../../store/fishStore';

interface Props {
  onClose: () => void;
}

export function LoadScenarioModal({ onClose }: Props) {
  const { savedScenarios, loadSavedScenario, deleteSavedScenario } = useFishStore();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleLoad = (id: string) => {
    loadSavedScenario(id);
    onClose();
  };

  const handleDelete = (id: string) => {
    if (confirmDelete === id) {
      deleteSavedScenario(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,20,40,0.7)' }} onClick={onClose} />
      <div style={{
        position: 'relative', zIndex: 1,
        width: 440,
        background: 'var(--ink-700)',
        border: '1px solid var(--ice-border)',
        borderRadius: 8,
        padding: '20px 22px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
        maxHeight: '80vh',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, color: 'var(--text-hi)' }}>
            Load a scenario
          </h3>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: 'var(--text-lo)',
            cursor: 'pointer', fontSize: 15, lineHeight: 1,
          }}>✕</button>
        </div>

        {savedScenarios.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 24, marginBottom: 10, opacity: 0.4 }}>📂</div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-lo)', lineHeight: 1.6 }}>
              No saved scenarios yet.<br />
              Use "Save scenario" in the Decide phase.
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {savedScenarios.slice().reverse().map(s => (
              <div key={s.id} style={{
                padding: '10px 12px',
                background: 'var(--ink-500)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, color: 'var(--text-hi)' }}>
                    {s.name}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-lo)' }}>
                    {new Date(s.createdAt).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 8 }}>
                  {[
                    `A ${(s.params.catchA / 1000).toFixed(0)}k t`,
                    `C ${(s.params.catchC / 1000).toFixed(0)}k t · ${s.params.catchCMode}`,
                    `IPCC ${s.params.climateScenario}`,
                    s.params.closures.length > 0 ? `${s.params.closures.length} closure(s)` : 'No closures',
                    s.params.climateModels.join('+'),
                  ].map(chip => (
                    <div key={chip} style={{
                      padding: '1px 6px', borderRadius: 10,
                      background: 'var(--ink-700)', border: '1px solid rgba(255,255,255,0.08)',
                      fontFamily: 'var(--font-ui)', fontSize: 8, color: 'var(--text-mid)',
                    }}>{chip}</div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => handleLoad(s.id)} style={{
                    flex: 1, padding: '5px 0', fontSize: 10, fontWeight: 600,
                    background: 'var(--ice)', border: 'none',
                    borderRadius: 'var(--radius-sm)', color: 'var(--ink-900)',
                    fontFamily: 'var(--font-ui)', cursor: 'pointer',
                  }}>Load →</button>
                  <button onClick={() => handleDelete(s.id)} style={{
                    padding: '5px 12px', fontSize: 10,
                    background: confirmDelete === s.id ? 'var(--danger-dim)' : 'transparent',
                    border: `1px solid ${confirmDelete === s.id ? 'var(--signal-danger)' : 'var(--ink-500)'}`,
                    borderRadius: 'var(--radius-sm)',
                    color: confirmDelete === s.id ? 'var(--signal-danger)' : 'var(--text-lo)',
                    fontFamily: 'var(--font-ui)', cursor: 'pointer', transition: 'all 0.12s',
                  }}>{confirmDelete === s.id ? 'Confirm?' : '✕'}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
