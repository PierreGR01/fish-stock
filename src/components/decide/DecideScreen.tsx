import { useState } from 'react';
import { useFishStore } from '../../store/fishStore';
import type { MapLayer } from '../../store/fishStore';
import { PacificMap } from '../map/PacificMap';
import { ResultsPanel } from './ResultsPanel';
import { GlobalTimeline } from './GlobalTimeline';
import { SaveScenarioModal } from './SaveScenarioModal';
import { VERDICT_A, VERDICT_B } from '../../data/mockData';

// ── Chip ─────────────────────────────────────────────────────────────────

function Chip({ children, dimmed }: { children: React.ReactNode; dimmed?: boolean }) {
  return (
    <div style={{
      padding: '2px 8px',
      background: 'var(--ink-500)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12, fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--text-mid)',
      whiteSpace: 'nowrap', opacity: dimmed ? 0.5 : 1,
    }}>{children}</div>
  );
}

function VerdictArrow({ trend, small }: { trend: 'up' | 'down'; small?: boolean }) {
  return (
    <div style={{
      width: small ? 32 : 40, height: small ? 32 : 40,
      border: `2px solid ${trend === 'down' ? 'var(--signal-danger)' : 'var(--signal-ok)'}`,
      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: small ? 16 : 20,
      color: trend === 'down' ? 'var(--signal-danger)' : 'var(--signal-ok)', flexShrink: 0,
    }}>
      {trend === 'down' ? '↘' : '↗'}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────

const fmtNum = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const modeAbbr = (m: string): string =>
  ({ constant: 'const.', 'per-year': 'per-year', increasing: '↑', decreasing: '↓' }[m] ?? m);

// ── SingleBanner ─────────────────────────────────────────────────────────

function KPISeparator() {
  return <div style={{ width: 1, height: 36, background: 'var(--ink-500)', flexShrink: 0 }} />;
}

function BannerKPI({ label, value, unit, delta, critYear }: {
  label: string;
  value?: number;
  unit?: string;
  delta?: number;
  critYear?: number | null;
}) {
  const deltaColor = delta !== undefined
    ? (delta >= 0 ? 'var(--signal-ok)' : 'var(--signal-danger)')
    : 'var(--text-lo)';

  return (
    <div style={{ padding: '0 14px', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignSelf: 'stretch' }}>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-lo)', marginBottom: 2 }}>
        {label}
      </div>
      {critYear !== undefined ? (
        critYear !== null
          ? <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--text-hi)' }}>{critYear}</div>
          : <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--signal-ok)' }}>Not reached</div>
      ) : (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--text-hi)' }}>
            {value !== undefined ? value.toFixed(1) : '—'}
            {unit && <span style={{ fontSize: 9, fontWeight: 400, color: 'var(--text-lo)', marginLeft: 3 }}>{unit}</span>}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: deltaColor, marginTop: 1 }}>
            {delta !== undefined ? `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}% vs 2026` : '—'}
          </div>
        </>
      )}
    </div>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'var(--font-ui)', fontSize: 7, textTransform: 'uppercase',
      letterSpacing: '0.5px', color: 'var(--text-lo)', marginBottom: 2,
    }}>{children}</div>
  );
}

function SingleBanner() {
  const {
    catchA, catchAMode, catchB, catchBMode, catchC, catchCMode,
    catchConcentration, closures, climateScenario, climateModels,
    kpis, setComparisonMode, setPhase,
  } = useFishStore();
  const [showSaveModal, setShowSaveModal] = useState(false);

  const verdictColor = VERDICT_A.trend === 'down' ? 'var(--signal-danger)' : 'var(--signal-ok)';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 0,
      padding: '8px 16px', background: 'var(--ink-700)',
      borderBottom: '1px solid var(--ink-500)', flexShrink: 0,
    }}>

      {/* LEFT — back button + key parameters + save */}
      <div className="print-hide" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>

        {/* Back button */}
        <button
          onClick={() => setPhase('configure')}
          style={{
            padding: '6px 10px', fontSize: 10, fontFamily: 'var(--font-ui)',
            background: 'transparent', border: '1px solid var(--ink-500)',
            borderRadius: 'var(--radius-sm)', color: 'var(--text-lo)', cursor: 'pointer',
            flexShrink: 0,
          }}>
          ← Back to configure
        </button>

        {/* Key parameters groups */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>

          {/* CATCH */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <GroupLabel>Catch</GroupLabel>
            <Chip><b>A West</b> · {fmtNum(catchA)} t · {modeAbbr(catchAMode)}</Chip>
            <Chip>
              <b>B Central</b> · {catchBMode === 'per-year'
                ? 'per-year'
                : `${fmtNum(catchB)} t · ${modeAbbr(catchBMode)}`}
            </Chip>
            <Chip><b>C East</b> · {fmtNum(catchC)} t · {modeAbbr(catchCMode)}</Chip>
          </div>

          {/* CLOSURES */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <GroupLabel>Closures</GroupLabel>
            {closures.length === 0 ? (
              <Chip dimmed>No closures</Chip>
            ) : (
              <Chip>{closures.map(e => e.split(' ')[0]).join(' · ')}</Chip>
            )}
          </div>

          {/* CLIMATE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <GroupLabel>Climate</GroupLabel>
            <Chip>IPCC {capitalize(climateScenario)} · {climateModels.join(', ')}</Chip>
          </div>

          {/* CONCENTRATION */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <GroupLabel>Concentration</GroupLabel>
            <Chip>{capitalize(catchConcentration)}</Chip>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={() => setShowSaveModal(true)}
          style={{
            padding: '4px 8px', fontSize: 9, fontFamily: 'var(--font-ui)',
            background: 'var(--ink-500)', border: '1px solid var(--ink-400)',
            borderRadius: 'var(--radius-sm)', color: 'var(--text-lo)', cursor: 'pointer',
            flexShrink: 0,
          }}>
          ⤓ Save
        </button>
      </div>

      {/* SEPARATOR */}
      <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--ink-500)', margin: '0 12px', flexShrink: 0 }} />

      {/* CENTER — verdict + KPIs + Compare */}
      <div style={{ display: 'flex', alignItems: 'flex-start', flex: 1, minWidth: 0, padding: '2px 0' }}>

        {/* Verdict */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <VerdictArrow trend={VERDICT_A.trend as 'up' | 'down'} />
          <div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: verdictColor }}>{VERDICT_A.text}</div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--text-lo)' }}>{VERDICT_A.detail}</div>
          </div>
        </div>

        <KPISeparator />

        <BannerKPI label="Biomass 2055" value={kpis?.v2055} unit="t/km²" delta={kpis?.d2055} />
        <KPISeparator />
        <BannerKPI label="Biomass 2099" value={kpis?.v2099} unit="t/km²" delta={kpis?.d2099} />
        <KPISeparator />
        <BannerKPI label="Critical year" critYear={kpis !== null ? kpis?.critYear : undefined} />

        {/* Compare button — pushed to right */}
        <div className="print-hide" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', paddingLeft: 12, flexShrink: 0 }}>
          <button
            onClick={() => setComparisonMode(true)}
            style={{
              padding: '4px 12px', fontSize: 10, fontFamily: 'var(--font-ui)',
              background: 'var(--ice-dim)', border: '1px solid var(--ice-border)',
              borderRadius: 'var(--radius-sm)', color: 'var(--ice)', cursor: 'pointer', fontWeight: 600,
            }}>
            ⇄ Compare
          </button>
        </div>
      </div>

      {showSaveModal && <SaveScenarioModal onClose={() => setShowSaveModal(false)} />}
    </div>
  );
}

// ── ComparisonBanner ──────────────────────────────────────────────────────

function ComparisonBanner() {
  const setComparisonMode = useFishStore(s => s.setComparisonMode);
  const [showSaveModal, setShowSaveModal] = useState(false);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '8px 16px', background: 'var(--ink-700)',
      borderBottom: '1px solid var(--ink-500)', flexShrink: 0, minHeight: 66,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-lo)', marginBottom: 6 }}>
          Comparison — two verdicts
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {[VERDICT_A, VERDICT_B].map((v, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <VerdictArrow trend={v.trend as 'up' | 'down'} small />
              <div>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, color: v.trend === 'down' ? 'var(--signal-danger)' : 'var(--signal-ok)' }}>
                  Scenario {i === 0 ? 'A' : 'B'} · {v.text}
                </span>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--text-lo)', marginLeft: 6 }}>{v.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '0 16px', borderLeft: '1px solid var(--ink-500)', borderRight: '1px solid var(--ink-500)' }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-lo)', marginBottom: 4 }}>Difference (B − A)</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, color: 'var(--signal-ok)' }}>+31</div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-mid)' }}>pts biomass</div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 8, color: 'var(--text-lo)' }}>B closes more zones + lower catch C</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        <button onClick={() => setShowSaveModal(true)} style={{ padding: '4px 10px', fontSize: 10, fontFamily: 'var(--font-ui)', background: 'var(--ink-500)', border: '1px solid var(--ice-border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-mid)', cursor: 'pointer' }}>
          ⤓ Save comparison
        </button>
        <button onClick={() => setComparisonMode(false)} style={{ padding: '4px 10px', fontSize: 10, fontFamily: 'var(--font-ui)', background: 'transparent', border: '1px solid var(--ink-500)', borderRadius: 'var(--radius-sm)', color: 'var(--text-lo)', cursor: 'pointer' }}>
          ✕ Exit comparison
        </button>
        <button style={{ padding: '4px 10px', fontSize: 10, fontFamily: 'var(--font-ui)', background: 'transparent', border: '1px solid var(--ice-border)', borderRadius: 'var(--radius-sm)', color: 'var(--ice)', cursor: 'pointer' }}>
          + Add a scenario
        </button>
      </div>

      {showSaveModal && <SaveScenarioModal onClose={() => setShowSaveModal(false)} />}
    </div>
  );
}

// ── UnifiedToggle ─────────────────────────────────────────────────────────

const ZONE_COLORS: Record<string, string> = {
  A: '#4DA8DA',
  B: '#3AC58E',
  C: '#F2A93B',
};
const ZONE_NAMES: Record<string, string> = {
  A: 'West Pacific',
  B: 'Central',
  C: 'East tropical',
};

const TOGGLE_SERIES = [
  { key: 'biomass'     as MapLayer, label: 'Biomass',     unit: 't/km²', color: 'var(--fish-a)' },
  { key: 'catch'       as MapLayer, label: 'Catch',       unit: 't/yr',  color: 'var(--fish-b)' },
  { key: 'recruitment' as MapLayer, label: 'Recruitment', unit: 'index', color: 'var(--fish-c)' },
] as const;

function UnifiedToggle() {
  const { mapLayer, setMapLayer, setFeaturedSeries, comparisonMode, mapScenario, setMapScenario, selectedZone, setSelectedZone } = useFishStore();

  const handleToggle = (l: MapLayer) => {
    setMapLayer(l);
    setFeaturedSeries(l);
  };

  return (
    <div className="print-hide" style={{
      height: 36, display: 'flex', alignItems: 'center', gap: 8,
      padding: '0 14px',
      background: 'rgba(10,20,40,0.9)',
      borderBottom: '1px solid var(--ink-500)', flexShrink: 0,
    }}>

      {/* Left — zone indicator */}
      <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-ui)', fontSize: 9 }}>
        {selectedZone ? (
          <>
            <span style={{ color: ZONE_COLORS[selectedZone], fontSize: 12 }}>◉</span>
            <span style={{ color: 'var(--text-hi)', fontSize: 10 }}>Zone {selectedZone} · {ZONE_NAMES[selectedZone]}</span>
            <button
              onClick={() => setSelectedZone(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-lo)', fontSize: 10, padding: '0 2px', lineHeight: 1, fontFamily: 'var(--font-ui)' }}
              title="Retour à la vue globale"
            >✕</button>
          </>
        ) : (
          <>
            <span style={{ color: 'var(--text-lo)', fontSize: 12 }}>○</span>
            <span style={{ color: 'var(--text-lo)' }}>Global · 3 zones agrégées</span>
          </>
        )}
      </div>

      {/* Center — scenario selector (comparison mode only) */}
      {comparisonMode && (
        <div style={{ display: 'flex', border: '1px solid var(--ice-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
          {(['A', 'B'] as const).map(s => (
            <button key={s} onClick={() => setMapScenario(s)} style={{
              padding: '3px 12px', fontSize: 10, fontFamily: 'var(--font-ui)',
              background: mapScenario === s ? 'var(--ice-dim)' : 'transparent',
              border: 'none', borderRight: s === 'A' ? '1px solid var(--ice-border)' : 'none',
              color: mapScenario === s ? 'var(--ice)' : 'var(--text-lo)',
              cursor: 'pointer', fontWeight: mapScenario === s ? 600 : 400,
            }}>Scenario {s}</button>
          ))}
        </div>
      )}

      {/* Center — layer / series toggle */}
      <div style={{ display: 'flex', gap: 4 }}>
        {TOGGLE_SERIES.map(s => {
          const isActive = mapLayer === s.key;
          return (
            <button
              key={s.key}
              onClick={() => handleToggle(s.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '3px 10px',
                background: isActive ? 'var(--ink-500)' : 'transparent',
                border: isActive ? `1px solid ${s.color}` : '1px solid var(--ink-400)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: s.color, opacity: isActive ? 1 : 0.3, flexShrink: 0,
              }} />
              <span style={{
                fontFamily: 'var(--font-ui)', fontSize: 10,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--text-hi)' : 'var(--text-lo)',
              }}>{s.label}</span>
              {isActive && (
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--text-lo)' }}>
                  {s.unit}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── ComparisonColumns ─────────────────────────────────────────────────────

function ComparisonColumns() {
  const SCENARIO_B_CHIPS = ['C East 15 000 · ↓', 'PIPA, Nauru, Tuvalu', 'IPCC Low'];
  const SCENARIO_A_CHIPS = ['C East 28 500 · ↓', 'PIPA, Nauru', 'IPCC Med'];

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--ink-500)' }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--ink-500)', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, color: 'var(--text-hi)', marginBottom: 4 }}>Scenario A</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {SCENARIO_A_CHIPS.map(c => <Chip key={c}>{c}</Chip>)}
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ResultsPanel scenario="A" compact />
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--ink-500)', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, color: 'var(--text-hi)', marginBottom: 4 }}>Scenario B</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {SCENARIO_B_CHIPS.map(c => <Chip key={c}>{c}</Chip>)}
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ResultsPanel scenario="B" compact />
        </div>
      </div>
    </div>
  );
}

// ── Main DecideScreen ─────────────────────────────────────────────────────

export function DecideScreen() {
  const comparisonMode = useFishStore(s => s.comparisonMode);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      {comparisonMode ? <ComparisonBanner /> : <SingleBanner />}

      <UnifiedToggle />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Map 55% — hidden in print */}
        <div className="print-hide" style={{ flex: '0 0 55%', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--ink-500)' }}>
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <PacificMap phase="decide" />
          </div>
        </div>

        {/* Data panel 45% — full width in print */}
        <div className="print-results" style={{ flex: '0 0 45%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {comparisonMode ? <ComparisonColumns /> : <ResultsPanel />}
        </div>
      </div>

      <GlobalTimeline />
    </div>
  );
}
