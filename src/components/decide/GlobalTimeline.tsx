// TASK-14 — GlobalTimeline with decade ticks and historical/projection zones
import { useEffect, useRef } from 'react';
import { useFishStore } from '../../store/fishStore';
import { TIMELINE_EVENTS } from '../../data/mockData';

const YEAR_MIN = 2010;
const YEAR_NOW = 2026;
const YEAR_MAX = 2099;

function yearToPercent(year: number): number {
  return ((year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100;
}

const DECADES = [2010, 2020, 2030, 2040, 2050, 2060, 2070, 2080, 2090];

export function GlobalTimeline() {
  const { activeYear, playing, playSpeed, comparisonMode, setActiveYear, setPlaying, setPlaySpeed } = useFishStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!playing) { if (intervalRef.current) clearInterval(intervalRef.current); return; }
    const ms = 250 / playSpeed;
    intervalRef.current = setInterval(() => {
      setActiveYear(useFishStore.getState().activeYear + 1);
      if (useFishStore.getState().activeYear >= YEAR_MAX) setPlaying(false);
    }, ms);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, playSpeed, setActiveYear, setPlaying]);

  const fillPct = yearToPercent(activeYear);
  const histEndPct = yearToPercent(YEAR_NOW);

  return (
    <div className="print-hide" style={{
      height: 'var(--timeline-h)',
      background: 'var(--ink-700)',
      borderTop: '1px solid var(--ink-500)',
      flexShrink: 0, padding: '8px 16px',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={() => setPlaying(!playing)}
          style={{
            width: 28, height: 28, borderRadius: '50%',
            background: playing ? 'var(--ice-dim)' : 'var(--ink-500)',
            border: `1px solid ${playing ? 'var(--ice)' : 'var(--ice-border)'}`,
            color: 'var(--text-hi)', fontSize: 11, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'all 0.15s',
          }}>
          {playing ? '⏸' : '▶'}
        </button>

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-hi)', minWidth: 60 }}>
          {activeYear}
          {activeYear < YEAR_NOW
            ? <span style={{ fontFamily: 'var(--font-ui)', fontSize: 8, color: 'var(--text-lo)', marginLeft: 5 }}>historical</span>
            : <span style={{ fontFamily: 'var(--font-ui)', fontSize: 8, color: 'var(--signal-info)', marginLeft: 5 }}>projection</span>}
          {comparisonMode && (
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--text-lo)', marginLeft: 6 }}>drives both</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--text-lo)' }}>speed</span>
          {([1, 2, 4] as const).map(s => (
            <button key={s} onClick={() => setPlaySpeed(s)} style={{
              padding: '2px 7px', height: 22, fontSize: 9, fontFamily: 'var(--font-mono)',
              background: playSpeed === s ? 'var(--ice-dim)' : 'transparent',
              border: `1px solid ${playSpeed === s ? 'var(--ice)' : 'var(--ink-500)'}`,
              borderRadius: 'var(--radius-sm)', color: playSpeed === s ? 'var(--ice)' : 'var(--text-lo)',
              cursor: 'pointer',
            }}>{s}×</button>
          ))}
        </div>

        {/* Period badges */}
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 20, height: 4, background: 'rgba(168,216,232,0.35)', borderRadius: 1 }} />
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 8, color: 'var(--text-lo)' }}>2010–2025 historical</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 20, height: 4, background: 'rgba(77,168,218,0.2)', borderRadius: 1, border: '1px dashed rgba(77,168,218,0.4)' }} />
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 8, color: 'var(--text-lo)' }}>2026–2099 projection</span>
          </div>
        </div>
      </div>

      {/* Track */}
      <div style={{ position: 'relative', flex: 1 }}>

        {/* TASK-14 — Historical zone background */}
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0,
          width: `${histEndPct}%`,
          background: 'rgba(168,216,232,0.04)',
          borderRight: '1px solid rgba(168,216,232,0.2)',
          borderRadius: '2px 0 0 2px', pointerEvents: 'none', zIndex: 0,
        }} />

        {/* Projection zone background */}
        <div style={{
          position: 'absolute', top: 0, left: `${histEndPct}%`, bottom: 0, right: 0,
          background: 'rgba(77,168,218,0.03)',
          borderRadius: '0 2px 2px 0', pointerEvents: 'none', zIndex: 0,
        }} />

        {/* Range input */}
        <input
          type="range" min={YEAR_MIN} max={YEAR_MAX} value={activeYear}
          onChange={e => setActiveYear(Number(e.target.value))}
          style={{ width: '100%', position: 'absolute', top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}
        />

        {/* Filled portion */}
        <div style={{
          position: 'absolute', top: '50%', left: 0,
          width: `${fillPct}%`, height: 4, marginTop: -2,
          background: 'var(--ice)', borderRadius: 2, pointerEvents: 'none', zIndex: 1,
        }} />

        {/* TASK-14 — Decade ticks */}
        {DECADES.map(decade => {
          const pct = yearToPercent(decade);
          const isPast = decade <= activeYear;
          return (
            <div key={decade} style={{ position: 'absolute', top: '50%', left: `${pct}%`, transform: 'translateX(-50%)', zIndex: 3, pointerEvents: 'none' }}>
              <div style={{ width: 1, height: 8, background: isPast ? 'rgba(168,216,232,0.4)' : 'rgba(255,255,255,0.1)', marginTop: -4 }} />
            </div>
          );
        })}

        {/* Event markers */}
        {TIMELINE_EVENTS.map(ev => {
          const pct = yearToPercent(ev.year);
          return (
            <div key={ev.year} style={{ position: 'absolute', top: '50%', left: `${pct}%`, transform: 'translateX(-50%)', zIndex: 4, pointerEvents: 'none' }}>
              <div style={{ width: 2, height: 12, background: 'var(--signal-warn)', marginTop: -6 }} />
              <div style={{
                position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
                fontFamily: 'var(--font-ui)', fontSize: 7, color: 'var(--signal-warn)',
                whiteSpace: 'nowrap', background: 'rgba(10,20,40,0.8)', padding: '1px 3px', borderRadius: 2,
              }}>{ev.label}</div>
            </div>
          );
        })}

        {/* Decade labels */}
        <div style={{
          position: 'absolute', bottom: -2, left: 0, right: 0,
          display: 'flex', justifyContent: 'space-between', pointerEvents: 'none',
        }}>
          {['2010', '2020', '2026↑', '2040', '2055', '2070', '2099'].map(lbl => {
            const yr = parseInt(lbl);
            if (isNaN(yr)) return null;
            const pct = yearToPercent(yr);
            return (
              <div key={lbl} style={{ position: 'absolute', left: `${pct}%`, transform: 'translateX(-50%)' }}>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 7, color: lbl.includes('↑') ? 'var(--signal-info)' : 'var(--text-lo)', whiteSpace: 'nowrap' }}>
                  {lbl}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
