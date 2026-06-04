// TASK-16 — Topbar with NECCTON badge (updated)
import { useFishStore } from '../store/fishStore';
import type { Phase } from '../store/fishStore';

const STEPS: { id: Phase; label: string; num: number }[] = [
  { id: 'configure', label: 'Configure', num: 1 },
  { id: 'simulate',  label: 'Simulate',  num: 2 },
  { id: 'decide',    label: 'Decide',    num: 3 },
];

function stepState(stepId: Phase, currentPhase: Phase): 'done' | 'active' | 'todo' {
  const order: Phase[] = ['configure', 'simulate', 'decide'];
  const si = order.indexOf(stepId);
  const ci = order.indexOf(currentPhase);
  if (si < ci) return 'done';
  if (si === ci) return 'active';
  return 'todo';
}

export function Topbar() {
  const phase = useFishStore(s => s.phase);

  return (
    <header className="print-hide" style={{
      height: 44, background: 'var(--ink-900)',
      borderBottom: '1px solid var(--ink-500)',
      display: 'flex', alignItems: 'center', padding: '0 16px', gap: 16,
      flexShrink: 0, zIndex: 20,
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="11" r="10" stroke="#A8D8E8" strokeWidth="1.2"/>
          <path d="M5 11 C7 8 12 7 17 11 C12 15 7 14 5 11Z" fill="none" stroke="#A8D8E8" strokeWidth="1"/>
          <circle cx="7" cy="10.5" r="1" fill="#A8D8E8"/>
        </svg>
        <div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, color: 'var(--text-hi)', letterSpacing: '0.3px', lineHeight: 1.2 }}>
            PACIFIC TUNA STOCK SIMULATOR
          </div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--text-lo)', letterSpacing: '0.4px' }}>
            Mercator Ocean Int'l · SEAPODYM / EDITO
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
        {STEPS.map((step, i) => {
          const state = stepState(step.id, phase);
          return (
            <div key={step.id} style={{ display: 'flex', alignItems: 'center' }}>
              {i > 0 && (
                <div style={{ width: 32, height: 1, background: state === 'todo' ? 'var(--ink-500)' : 'var(--ice-border)' }} />
              )}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                background: state === 'active' ? 'var(--ice-dim)' : 'transparent',
                border: state === 'active' ? '1px solid var(--ice-border)' : '1px solid transparent',
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 600,
                  background: state === 'active' ? 'var(--ice)' : state === 'done' ? 'var(--signal-ok)' : 'var(--ink-500)',
                  color: state === 'active' ? 'var(--ink-900)' : state === 'done' ? 'var(--ink-900)' : 'var(--text-lo)',
                  flexShrink: 0,
                }}>
                  {state === 'done' ? '✓' : step.num}
                </div>
                <span style={{
                  fontFamily: 'var(--font-ui)', fontSize: 11,
                  fontWeight: state === 'active' ? 600 : 400,
                  color: state === 'active' ? 'var(--text-hi)' : state === 'done' ? 'var(--text-mid)' : 'var(--text-lo)',
                }}>
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Right utility */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* TASK-16 — NECCTON badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 0,
          border: '1px solid var(--ink-500)', borderRadius: 'var(--radius-sm)', overflow: 'hidden',
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-lo)',
            padding: '2px 7px', letterSpacing: '0.5px',
            borderRight: '1px solid var(--ink-500)',
          }}>EDITO · API</div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 9,
            color: 'rgba(255,200,80,0.8)',
            padding: '2px 7px', letterSpacing: '0.5px',
            background: 'rgba(255,200,80,0.06)',
          }}>NECCTON · Horizon Europe</div>
        </div>
        <button style={{
          fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-mid)',
          background: 'var(--ink-500)', border: '1px solid var(--ice-border)',
          borderRadius: 'var(--radius-sm)', padding: '3px 8px', cursor: 'pointer',
        }}>? Help</button>
      </div>
    </header>
  );
}
