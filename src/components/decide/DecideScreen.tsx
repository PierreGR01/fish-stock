import { useFishStore } from '../../store/fishStore';
import type { MapLayer } from '../../store/fishStore';
import { PacificMap } from '../map/PacificMap';
import { ResultsPanel } from './ResultsPanel';
import { GlobalTimeline } from './GlobalTimeline';
import { VERDICT_A, VERDICT_B } from '../../data/mockData';

// ── Scenario recap chips ────────────────────────────────────────────────

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: '2px 8px',
      background: 'var(--ink-500)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--text-mid)',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </div>
  );
}

function VerdictArrow({ trend, small }: { trend: 'up' | 'down'; small?: boolean }) {
  return (
    <div style={{
      width: small ? 32 : 40, height: small ? 32 : 40,
      border: `2px solid ${trend === 'down' ? 'var(--signal-danger)' : 'var(--signal-ok)'}`,
      borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: small ? 16 : 20,
      color: trend === 'down' ? 'var(--signal-danger)' : 'var(--signal-ok)',
      flexShrink: 0,
    }}>
      {trend === 'down' ? '↘' : '↗'}
    </div>
  );
}

// ── Banner (single scenario) ─────────────────────────────────────────────

function SingleBanner() {
  const {
    catchA, catchAMode, catchBMode, catchC, catchCMode,
    catchConcentration, closures, climateScenario, climateModels,
    setComparisonMode, setPhase,
  } = useFishStore();

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '8px 16px',
      background: 'var(--ink-700)',
      borderBottom: '1px solid var(--ink-500)',
      flexShrink: 0, minHeight: 58,
    }}>
      {/* Scenario chips */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-lo)', marginBottom: 5 }}>
          Active scenario — key parameters
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          <Chip><b>A West</b> {catchA.toLocaleString()} t · {catchAMode}</Chip>
          <Chip><b>B Central</b> {catchBMode}</Chip>
          <Chip><b>C East</b> {catchC.toLocaleString()} t · {catchCMode}</Chip>
          <Chip>Concentration <b>{catchConcentration}</b></Chip>
          {closures.length > 0 && <Chip>Closures <b>{closures.map(e => e.split(' ')[0]).join(', ')}</b></Chip>}
          <Chip>Climate <b>IPCC {climateScenario}</b></Chip>
          <Chip>Models <b>{climateModels.join(', ')}</b></Chip>
        </div>
      </div>

      {/* Verdict */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-lo)', marginBottom: 4 }}>Verdict</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <VerdictArrow trend={VERDICT_A.trend as 'up' | 'down'} />
            <div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--signal-danger)' }}>{VERDICT_A.text}</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--text-lo)' }}>{VERDICT_A.detail} · plain-language read</div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        <button style={{ padding: '4px 10px', fontSize: 10, fontFamily: 'var(--font-ui)', background: 'var(--ink-500)', border: '1px solid var(--ice-border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-mid)', cursor: 'pointer' }}>
          ⤓ Save scenario
        </button>
        <button
          onClick={() => setComparisonMode(true)}
          style={{ padding: '4px 10px', fontSize: 10, fontFamily: 'var(--font-ui)', background: 'var(--ice-dim)', border: '1px solid var(--ice-border)', borderRadius: 'var(--radius-sm)', color: 'var(--ice)', cursor: 'pointer', fontWeight: 600 }}>
          ⇄ Compare with another
        </button>
        <button
          onClick={() => setPhase('configure')}
          style={{ padding: '4px 10px', fontSize: 10, fontFamily: 'var(--font-ui)', background: 'transparent', border: '1px solid var(--ink-500)', borderRadius: 'var(--radius-sm)', color: 'var(--text-lo)', cursor: 'pointer' }}>
          ✎ Modify parameters
        </button>
      </div>
    </div>
  );
}

// ── Banner (comparison mode) ─────────────────────────────────────────────

function ComparisonBanner() {
  const setComparisonMode = useFishStore(s => s.setComparisonMode);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '8px 16px',
      background: 'var(--ink-700)',
      borderBottom: '1px solid var(--ink-500)',
      flexShrink: 0, minHeight: 66,
    }}>
      {/* Two verdicts */}
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

      {/* Delta */}
      <div style={{ textAlign: 'center', padding: '0 16px', borderLeft: '1px solid var(--ink-500)', borderRight: '1px solid var(--ink-500)' }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-lo)', marginBottom: 4 }}>
          Difference (B − A)
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, color: 'var(--signal-ok)' }}>+31</div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-mid)' }}>pts biomass</div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 8, color: 'var(--text-lo)' }}>B closes more zones + lower catch C</div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        <button style={{ padding: '4px 10px', fontSize: 10, fontFamily: 'var(--font-ui)', background: 'var(--ink-500)', border: '1px solid var(--ice-border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-mid)', cursor: 'pointer' }}>
          ⤓ Save comparison
        </button>
        <button
          onClick={() => setComparisonMode(false)}
          style={{ padding: '4px 10px', fontSize: 10, fontFamily: 'var(--font-ui)', background: 'transparent', border: '1px solid var(--ink-500)', borderRadius: 'var(--radius-sm)', color: 'var(--text-lo)', cursor: 'pointer' }}>
          ✕ Exit comparison
        </button>
        <button style={{ padding: '4px 10px', fontSize: 10, fontFamily: 'var(--font-ui)', background: 'transparent', border: '1px solid var(--ice-border)', borderRadius: 'var(--radius-sm)', color: 'var(--ice)', cursor: 'pointer' }}>
          + Add a scenario
        </button>
      </div>
    </div>
  );
}

// ── Map layer selector ────────────────────────────────────────────────────

function LayerSelector() {
  const { mapLayer, setMapLayer, comparisonMode, mapScenario, setMapScenario } = useFishStore();

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '6px 12px',
      background: 'rgba(10,20,40,0.85)',
      borderBottom: '1px solid var(--ink-500)',
      flexShrink: 0,
    }}>
      {comparisonMode && (
        <>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--text-lo)' }}>Showing:</span>
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
        </>
      )}

      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--text-lo)' }}>
        {comparisonMode ? '' : 'Map layer:'}
      </span>
      <div style={{ display: 'flex', border: '1px solid var(--ice-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
        {(['biomass', 'catch', 'recruitment'] as MapLayer[]).map(l => (
          <button key={l} onClick={() => setMapLayer(l)} style={{
            padding: '3px 10px', fontSize: 10, fontFamily: 'var(--font-ui)',
            background: mapLayer === l ? 'var(--ice-dim)' : 'transparent',
            border: 'none', borderRight: l !== 'recruitment' ? '1px solid var(--ice-border)' : 'none',
            color: mapLayer === l ? 'var(--ice)' : 'var(--text-lo)',
            cursor: 'pointer', fontWeight: mapLayer === l ? 600 : 400,
            textTransform: 'capitalize',
          }}>{l}</button>
        ))}
      </div>
      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--text-lo)', marginLeft: 'auto' }}>
        2D choropleth · driven by timeline
      </span>
    </div>
  );
}

// ── Comparison data columns ───────────────────────────────────────────────

function ComparisonColumns() {
  const SCENARIO_B_CHIPS = ['C East 15 000 · ↓', 'PIPA, Nauru, Tuvalu', 'IPCC Low'];
  const SCENARIO_A_CHIPS = ['C East 28 500 · ↓', 'PIPA, Nauru', 'IPCC Med'];

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
      {/* Column A */}
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

      {/* Column B */}
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

// ── Main Decide screen ────────────────────────────────────────────────────

export function DecideScreen() {
  const comparisonMode = useFishStore(s => s.comparisonMode);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      {/* Top banner */}
      {comparisonMode ? <ComparisonBanner /> : <SingleBanner />}

      {/* Body: map + data */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Map (55%) */}
        <div style={{ flex: '0 0 55%', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--ink-500)' }}>
          <LayerSelector />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <PacificMap phase="decide" />
          </div>
        </div>

        {/* Data panel (45%) */}
        <div style={{ flex: '0 0 45%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {comparisonMode
            ? <ComparisonColumns />
            : <ResultsPanel />}
        </div>
      </div>

      {/* Global timeline */}
      <GlobalTimeline />
    </div>
  );
}
