import { useState, useMemo } from 'react';
import { useFishStore } from '../../store/fishStore';
import type { MapLayer } from '../../store/fishStore';
import { PacificMap } from '../map/PacificMap';
import { ResultsPanel, ComparisonChart, calcKPIs } from './ResultsPanel';
import { GlobalTimeline } from './GlobalTimeline';
import { SaveScenarioModal } from './SaveScenarioModal';
import {
  VERDICT_A, VERDICT_B, YEARS,
  BIOMASS_A, CATCH_A, RECRUITMENT_A,
  BIOMASS_B, CATCH_B, RECRUITMENT_B,
} from '../../data/mockData';

// ── Chip ─────────────────────────────────────────────────────────────────

const ZONE_CSS: Record<string, string> = {
  A: 'var(--fish-a)', B: 'var(--fish-b)', C: 'var(--fish-c)',
};

function Chip({ children, dimmed, zoneId }: { children: React.ReactNode; dimmed?: boolean; zoneId?: string }) {
  const swatchColor = zoneId ? ZONE_CSS[zoneId] : undefined;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: swatchColor ? 5 : 0,
      padding: swatchColor ? '2px 8px 2px 5px' : '2px 8px',
      background: 'var(--ink-500)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12, fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--text-mid)',
      whiteSpace: 'nowrap', opacity: dimmed ? 0.5 : 1,
    }}>
      {swatchColor && <div style={{ width: 8, height: 8, borderRadius: 2, background: swatchColor, flexShrink: 0 }} />}
      {children}
    </div>
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
    <div style={{ padding: '0 14px', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
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
      display: 'flex', alignItems: 'stretch',
      background: 'var(--ink-700)',
      borderBottom: '1px solid var(--ink-500)', flexShrink: 0,
      overflow: 'hidden',
    }}>

      {/* LEFT 50% — scenario */}
      <div className="print-hide" style={{ flex: '0 0 50%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', overflow: 'hidden', minWidth: 0 }}>

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

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, overflow: 'hidden', minWidth: 0 }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
            <GroupLabel>Catch</GroupLabel>
            <Chip zoneId="A"><b>A West</b> · {fmtNum(catchA)} t · {modeAbbr(catchAMode)}</Chip>
            <Chip zoneId="B">
              <b>B Central</b> · {catchBMode === 'per-year'
                ? 'per-year'
                : `${fmtNum(catchB)} t · ${modeAbbr(catchBMode)}`}
            </Chip>
            <Chip zoneId="C"><b>C East</b> · {fmtNum(catchC)} t · {modeAbbr(catchCMode)}</Chip>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
            <GroupLabel>Closures</GroupLabel>
            {closures.length === 0 ? (
              <Chip dimmed>No closures</Chip>
            ) : (
              <Chip>{closures.map(e => e.split(' ')[0]).join(' · ')}</Chip>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
            <GroupLabel>Climate</GroupLabel>
            <Chip>IPCC {capitalize(climateScenario)} · {climateModels.join(', ')}</Chip>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
            <GroupLabel>Concentration</GroupLabel>
            <Chip>{capitalize(catchConcentration)}</Chip>
          </div>
        </div>

        <button
          onClick={() => setShowSaveModal(true)}
          style={{
            padding: '4px 10px', fontSize: 10, fontFamily: 'var(--font-ui)',
            background: 'var(--ink-500)', border: '1px solid var(--ink-400)',
            borderRadius: 'var(--radius-sm)', color: 'var(--text-mid)', cursor: 'pointer',
            flexShrink: 0, marginLeft: 'auto',
          }}>
          ⤓ Save this scenario
        </button>
      </div>

      {/* RIGHT 50% — results */}
      <div style={{ flex: '0 0 50%', display: 'flex', alignItems: 'center', gap: 0, borderLeft: '1px solid var(--ink-500)', overflow: 'hidden', minWidth: 0 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, padding: '0 16px' }}>
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

        <button
          className="print-hide"
          onClick={() => setComparisonMode(true)}
          style={{
            marginLeft: 'auto', marginRight: 12, flexShrink: 0,
            padding: '4px 12px', fontSize: 10, fontFamily: 'var(--font-ui)',
            background: 'var(--ice-dim)', border: '1px solid var(--ice-border)',
            borderRadius: 'var(--radius-sm)', color: 'var(--ice)', cursor: 'pointer', fontWeight: 600,
          }}>
          ⇄ Compare
        </button>
      </div>

      {showSaveModal && <SaveScenarioModal onClose={() => setShowSaveModal(false)} />}
    </div>
  );
}

// ── Scenario colour tokens (mirrors tokens.css) ───────────────────────────
export const SCENARIO_COLORS = { A: 'var(--scenario-a)', B: 'var(--scenario-b)' } as const;

// ── VerdictCard ───────────────────────────────────────────────────────────

function VerdictCard({
  scenario, verdict, checked, onToggle,
}: {
  scenario: 'A' | 'B';
  verdict: { trend: string; text: string; detail: string };
  checked: boolean;
  onToggle: () => void;
}) {
  const [hover, setHover] = useState(false);
  const color = SCENARIO_COLORS[scenario];
  const trendColor = verdict.trend === 'down' ? 'var(--signal-danger)' : 'var(--signal-ok)';

  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={checked ? `Deselect scenario ${scenario}` : `Select scenario ${scenario}`}
      style={{
        flex: 1, display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        background: checked && hover ? `color-mix(in srgb, ${color} 8%, transparent)` : 'transparent',
        border: 'none',
        cursor: 'pointer',
        opacity: checked ? 1 : 0.38,
        transition: 'opacity 0.2s ease, background 0.15s ease',
        textAlign: 'left',
      }}
    >
      {/* Custom checkbox */}
      <div style={{
        width: 14, height: 14, borderRadius: 2, flexShrink: 0,
        border: `2px solid ${checked ? color : 'rgba(255,255,255,0.3)'}`,
        background: checked ? color : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s ease',
      }}>
        {checked && <span style={{ color: '#fff', fontSize: 9, lineHeight: 1, fontWeight: 700 }}>✓</span>}
      </div>

      <VerdictArrow trend={verdict.trend as 'up' | 'down'} small />

      <div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.4px', color, marginBottom: 2, fontWeight: 600 }}>
          Scenario {scenario}
        </div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, color: trendColor }}>
          {verdict.text}
        </div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--text-lo)', marginTop: 1 }}>
          {verdict.detail}
        </div>
      </div>
    </button>
  );
}

// ── DiffBlock ─────────────────────────────────────────────────────────────

function DiffBlock() {
  const kpisA = useMemo(() => calcKPIs(BIOMASS_A), []);
  const kpisB = useMemo(() => calcKPIs(BIOMASS_B), []);

  const d2055 = kpisB.v2055 - kpisA.v2055;
  const d2099 = kpisB.v2099 - kpisA.v2099;
  const sign = (v: number) => (v >= 0 ? '+' : '');
  const deltaColor = (v: number) => v >= 0 ? 'var(--signal-ok)' : 'var(--signal-danger)';

  function Row({ label, value, unit }: { label: string; value: number; unit?: string }) {
    return (
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 8, color: 'var(--text-lo)', flexShrink: 0 }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, color: deltaColor(value), whiteSpace: 'nowrap' }}>
          {sign(value)}{value.toFixed(1)}{unit ? <span style={{ fontSize: 8, fontWeight: 400, color: 'var(--text-lo)', marginLeft: 2 }}>{unit}</span> : null}
        </span>
      </div>
    );
  }

  return (
    <div style={{
      flexShrink: 0, padding: '8px 14px',
      borderLeft: '1px solid var(--ink-500)', borderRight: '1px solid var(--ink-500)',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5, minWidth: 150,
    }}>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-lo)', marginBottom: 2 }}>
        B vs A · biomass delta
      </div>
      <Row label="2055" value={d2055} unit="t/km²" />
      <Row label="2099" value={d2099} unit="t/km²" />
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 8, color: 'var(--text-lo)' }}>Crit. yr A</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, color: 'var(--signal-danger)', whiteSpace: 'nowrap' }}>
          {kpisA.critYear ?? '—'}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 8, color: 'var(--text-lo)' }}>Crit. yr B</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, color: kpisB.critYear ? 'var(--signal-danger)' : 'var(--signal-ok)', whiteSpace: 'nowrap' }}>
          {kpisB.critYear ?? 'not reached'}
        </span>
      </div>
    </div>
  );
}

// ── ComparisonBanner ──────────────────────────────────────────────────────

function ComparisonBanner() {
  const { setComparisonMode, comparisonScenarios, toggleComparisonScenario } = useFishStore();
  const [showSaveModal, setShowSaveModal] = useState(false);

  return (
    <div style={{
      display: 'flex', alignItems: 'stretch',
      background: 'var(--ink-700)',
      borderBottom: '1px solid var(--ink-500)', flexShrink: 0,
    }}>

      <VerdictCard scenario="A" verdict={VERDICT_A}
        checked={comparisonScenarios.includes('A')}
        onToggle={() => toggleComparisonScenario('A')} />

      <div style={{ width: 1, background: 'var(--ink-500)', flexShrink: 0 }} />

      <VerdictCard scenario="B" verdict={VERDICT_B}
        checked={comparisonScenarios.includes('B')}
        onToggle={() => toggleComparisonScenario('B')} />

      <DiffBlock />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'center', flexShrink: 0, padding: '8px 12px' }}>
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
  A: '#A8D4EE',
  B: '#6ABADE',
  C: '#3A98C8',
};
const ZONE_NAMES: Record<string, string> = {
  A: 'West Pacific',
  B: 'Central',
  C: 'East tropical',
};

const TOGGLE_SERIES = [
  { key: 'biomass'     as MapLayer, label: 'Biomass',     unit: 't/km²', color: 'var(--metric-biomass)' },
  { key: 'catch'       as MapLayer, label: 'Catch',       unit: 't/yr',  color: 'var(--metric-catch)' },
  { key: 'recruitment' as MapLayer, label: 'Recruitment', unit: 'index', color: 'var(--metric-recruitment)' },
] as const;

function UnifiedToggle() {
  const { mapLayer, setMapLayer, setFeaturedSeries, selectedZone, setSelectedZone } = useFishStore();

  const handleToggle = (l: MapLayer) => {
    setMapLayer(l);
    setFeaturedSeries(l);
  };

  return (
    <div className="print-hide" style={{
      height: 40, position: 'relative', display: 'flex', alignItems: 'center',
      padding: '0 16px',
      background: 'rgba(10,20,40,0.9)',
      borderBottom: '1px solid var(--ink-500)', flexShrink: 0,
    }}>

      {/* Left — zone indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-ui)', fontSize: 9, flexShrink: 0 }}>
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

      {/* Absolutely centered — layer toggle */}
      <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 6 }}>
        {TOGGLE_SERIES.map(s => {
          const isActive = mapLayer === s.key;
          return (
            <button
              key={s.key}
              onClick={() => handleToggle(s.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 14px',
                background: isActive ? 'var(--ink-500)' : 'transparent',
                border: isActive ? `1px solid ${s.color}` : '1px solid var(--ink-400)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: s.color, opacity: isActive ? 1 : 0.6, flexShrink: 0,
              }} />
              <span style={{
                fontFamily: 'var(--font-ui)', fontSize: 10,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--text-hi)' : 'var(--text-mid)',
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

// ── ComparisonPanel ───────────────────────────────────────────────────────

const COMPARISON_DATA: Record<MapLayer, { A: number[]; B: number[] }> = {
  biomass:     { A: BIOMASS_A,     B: BIOMASS_B },
  catch:       { A: CATCH_A,       B: CATCH_B },
  recruitment: { A: RECRUITMENT_A, B: RECRUITMENT_B },
};

function ComparisonPanel() {
  const featuredSeries = useFishStore(s => s.featuredSeries);
  const activeYear     = useFishStore(s => s.activeYear);
  const activeIdx      = useMemo(() => YEARS.indexOf(activeYear), [activeYear]);

  const { A: dataA, B: dataB } = COMPARISON_DATA[featuredSeries];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, padding: '10px 14px 8px' }}>
      <ComparisonChart
        dataA={dataA}
        dataB={dataB}
        featured={featuredSeries}
        activeYearIdx={activeIdx >= 0 ? activeIdx : undefined}
      />
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
          {comparisonMode ? <ComparisonPanel /> : <ResultsPanel />}
        </div>
      </div>

      <GlobalTimeline />
    </div>
  );
}
