import { useEffect, useRef } from 'react';
import { useFishStore } from '../../store/fishStore';
import { TIMELINE_EVENTS, YEARS } from '../../data/mockData';
import type { Phase } from '../../store/fishStore';

const YEAR_MIN = 2010;
const YEAR_MAX = 2099;

function yearToPercent(year: number): number {
  return ((year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100;
}

export function GlobalTimeline() {
  const {
    activeYear, playing, playSpeed, comparisonMode,
    setActiveYear, setPlaying, setPlaySpeed,
  } = useFishStore();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!playing) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    const ms = 250 / playSpeed;
    intervalRef.current = setInterval(() => {
      setActiveYear(useFishStore.getState().activeYear + 1);
      if (useFishStore.getState().activeYear >= YEAR_MAX) setPlaying(false);
    }, ms);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, playSpeed, setActiveYear, setPlaying]);

  const fillPct  = yearToPercent(activeYear);

  return (
    <div style={{
      height: 80,
      background: 'var(--ink-700)',
      borderTop: '1px solid var(--ink-500)',
      flexShrink: 0,
      padding: '8px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Play/Pause */}
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

        {/* Year label */}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-hi)', minWidth: 60 }}>
          {activeYear}
          {comparisonMode && (
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--text-lo)', marginLeft: 6 }}>drives both</span>
          )}
        </div>

        {/* Speed selector */}
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
      </div>

      {/* Track */}
      <div style={{ position: 'relative', flex: 1 }}>
        {/* Range input */}
        <input
          type="range"
          min={YEAR_MIN}
          max={YEAR_MAX}
          value={activeYear}
          onChange={e => setActiveYear(Number(e.target.value))}
          style={{ width: '100%', position: 'absolute', top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}
        />

        {/* Filled portion */}
        <div style={{
          position: 'absolute', top: '50%', left: 0,
          width: `${fillPct}%`, height: 4, marginTop: -2,
          background: 'var(--ice)', borderRadius: 2, pointerEvents: 'none', zIndex: 1,
        }} />

        {/* Event markers */}
        {TIMELINE_EVENTS.map(ev => {
          const pct = yearToPercent(ev.year);
          return (
            <div key={ev.year} style={{ position: 'absolute', top: '50%', left: `${pct}%`, transform: 'translateX(-50%)', zIndex: 3, pointerEvents: 'none' }}>
              <div style={{ width: 2, height: 12, background: 'var(--signal-warn)', marginTop: -6, marginLeft: 'auto', marginRight: 'auto' }} />
              <div style={{
                position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
                fontFamily: 'var(--font-ui)', fontSize: 7, color: 'var(--signal-warn)',
                whiteSpace: 'nowrap', background: 'rgba(10,20,40,0.8)', padding: '1px 3px', borderRadius: 2,
              }}>{ev.label}</div>
            </div>
          );
        })}

        {/* Tick labels */}
        <div style={{
          position: 'absolute', bottom: -2, left: 0, right: 0,
          display: 'flex', justifyContent: 'space-between',
          pointerEvents: 'none',
        }}>
          {['2010 (history)', '2026 now', '2055', '2099'].map(lbl => (
            <span key={lbl} style={{ fontFamily: 'var(--font-ui)', fontSize: 8, color: 'var(--text-lo)' }}>{lbl}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
