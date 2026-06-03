import { useEffect, useRef, useState } from 'react';
import { useFishStore, SIM_MESSAGES } from '../../store/fishStore';
import { PacificMap } from '../map/PacificMap';

const SIM_STEP_LABELS = ['Initialization', 'Trajectory calculation', 'Results aggregation'];

export function SimulateScreen() {
  const {
    simProgress, simPhaseIdx, catchA, catchAMode, catchBMode,
    catchC, catchCMode, catchConcentration, closures,
    climateScenario, climateModels, cancelSimulation, tickSimulation,
  } = useFishStore();

  const [msgIdx, setMsgIdx] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const done = simProgress >= 100;

  // Progress ticker
  useEffect(() => {
    if (done) return;
    tickRef.current = setInterval(() => {
      tickSimulation();
    }, 80);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [done, tickSimulation]);

  // Message rotation
  useEffect(() => {
    msgRef.current = setInterval(() => {
      setMsgIdx(i => (i + 1) % SIM_MESSAGES.length);
    }, 4000);
    return () => { if (msgRef.current) clearInterval(msgRef.current); };
  }, []);

  const catchBLabel = catchBMode === 'per-year' ? 'per-year' : '–';
  const catchCLabel = `${catchC.toLocaleString()} t/yr · ${catchCMode === 'decreasing' ? '↓' : catchCMode === 'increasing' ? '↑' : '—'}`;

  const recap = [
    { k: 'Catch A · West',    v: `${catchA.toLocaleString()} t/yr · ${catchAMode === 'constant' ? 'const.' : catchAMode}` },
    { k: 'Catch B · Central', v: catchBLabel },
    { k: 'Catch C · East',    v: catchCLabel },
    { k: 'Concentration',     v: catchConcentration.charAt(0).toUpperCase() + catchConcentration.slice(1) },
    { k: 'Closures',          v: closures.length > 0 ? closures.map(e => e.split(' ')[0]).join(', ') : 'None' },
    { k: 'Climate',           v: `IPCC ${climateScenario.charAt(0).toUpperCase() + climateScenario.slice(1)} · ${climateModels.join('+')}` },
  ];

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      {/* Full-screen map backdrop */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <PacificMap phase="simulate" />
      </div>
      {/* Dimming veil */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,20,40,0.72)', zIndex: 1 }} />

      {/* Center card */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 2,
        width: 460,
        background: 'rgba(21,34,56,0.97)',
        border: '1px solid var(--ice-border)',
        borderRadius: 10,
        padding: '24px 28px',
        boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
      }}>
        <h2 style={{ fontFamily: 'var(--font-ui)', fontSize: 17, fontWeight: 600, color: 'var(--text-hi)', marginBottom: 4, textAlign: 'center' }}>
          Running the projection…
        </h2>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-lo)', textAlign: 'center', marginBottom: 20 }}>
          The live Pacific (currents, SST) keeps animating behind this panel.
        </p>

        {/* Internal progress stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 16, justifyContent: 'center' }}>
          {SIM_STEP_LABELS.map((label, i) => {
            const state = i < simPhaseIdx ? 'done' : i === simPhaseIdx ? 'active' : 'todo';
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
                {i > 0 && (
                  <div style={{ width: 20, height: 1, background: state === 'todo' ? 'var(--ink-500)' : 'var(--signal-ok)', opacity: 0.7 }} />
                )}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: state === 'done' ? 'var(--signal-ok)'
                      : state === 'active' ? 'var(--ice)'
                      : 'var(--ink-500)',
                    boxShadow: state === 'active' ? '0 0 8px var(--ice)' : 'none',
                    transition: 'all 0.3s',
                  }} />
                  <span style={{ fontSize: 8, fontFamily: 'var(--font-ui)', color: state === 'todo' ? 'var(--text-lo)' : 'var(--text-mid)', whiteSpace: 'nowrap' }}>
                    {label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div style={{ background: 'var(--ink-500)', borderRadius: 2, height: 6, marginBottom: 6, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${simProgress}%`,
            background: 'linear-gradient(90deg, var(--signal-info), var(--ice))',
            borderRadius: 2,
            transition: 'width 0.2s',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ice)' }}>
            {Math.round(simProgress)}%
          </span>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--text-lo)' }}>
            est. remaining ~{Math.max(0, Math.round((100 - simProgress) / 100 * 3))} min
          </span>
        </div>

        {/* Pedagogical text */}
        <div style={{
          padding: '10px 12px',
          background: 'var(--ice-dim)',
          border: '1px solid var(--ice-border)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: 14,
        }}>
          <div style={{ fontSize: 8, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--ice)', fontFamily: 'var(--font-ui)', marginBottom: 4 }}>
            What the model is doing
          </div>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-mid)', lineHeight: 1.5, fontStyle: 'italic', transition: 'opacity 0.5s' }}>
            "{SIM_MESSAGES[msgIdx]}"
          </p>
          <div style={{ display: 'flex', gap: 4, marginTop: 6, justifyContent: 'center' }}>
            {SIM_MESSAGES.map((_, i) => (
              <div key={i} style={{
                width: 5, height: 5, borderRadius: '50%',
                background: i === msgIdx ? 'var(--ice)' : 'var(--ink-500)',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>
        </div>

        {/* Scenario recap */}
        <div style={{
          padding: '8px 10px',
          background: 'var(--ink-500)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: 14,
        }}>
          <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-lo)', fontFamily: 'var(--font-ui)', marginBottom: 6 }}>
            Launched scenario — read only
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 16px' }}>
            {recap.map(({ k, v }) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--text-lo)' }}>{k}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-mid)' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cancel */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={cancelSimulation}
            style={{
              background: 'transparent', border: '1px solid var(--ink-500)',
              borderRadius: 'var(--radius-sm)', color: 'var(--text-lo)',
              fontFamily: 'var(--font-ui)', fontSize: 10, padding: '4px 14px', cursor: 'pointer',
            }}>
            ✕ Cancel the simulation
          </button>
        </div>
      </div>
    </div>
  );
}
