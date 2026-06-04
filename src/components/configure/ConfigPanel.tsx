import { useState } from 'react';
import { useFishStore, EEZ_LIST, ESM_MODELS } from '../../store/fishStore';
import type { CatchMode, Level } from '../../store/fishStore';
import { HelpTooltip } from '../HelpTooltip';
import { LoadScenarioModal } from '../decide/LoadScenarioModal';

// ── Shared UI primitives ──────────────────────────────────────────────────

function BlockHeader({ label, helpContent }: { label: string; helpContent?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, color: 'var(--text-hi)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </span>
      {helpContent && <HelpTooltip content={helpContent} />}
    </div>
  );
}

function SegBtn({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', border: '1px solid var(--ice-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
      {options.map(opt => (
        <button key={opt} onClick={() => onChange(opt)} style={{
          flex: 1, padding: '4px 0', fontSize: 10, fontFamily: 'var(--font-ui)',
          background: value === opt ? 'var(--ice-dim)' : 'transparent',
          border: 'none', borderRight: '1px solid var(--ice-border)',
          color: value === opt ? 'var(--ice)' : 'var(--text-lo)',
          cursor: 'pointer', fontWeight: value === opt ? 600 : 400, transition: 'background 0.12s',
        }}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</button>
      ))}
    </div>
  );
}

function NumInput({ value, onChange, unit }: { value: number; onChange: (v: number) => void; unit?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--ink-500)', border: '1px solid var(--ice-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
      <input
        type="number" value={value}
        onChange={e => { const v = Number(e.target.value); if (!isNaN(v)) onChange(v); }}
        style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-hi)', fontFamily: 'var(--font-mono)', fontSize: 11, padding: '4px 7px', outline: 'none', minWidth: 0 }}
      />
      {unit && <span style={{ padding: '0 7px', fontSize: 9, color: 'var(--text-lo)', fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap' }}>{unit}</span>}
    </div>
  );
}

function SelectInput({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      background: 'var(--ink-500)', border: '1px solid var(--ice-border)',
      borderRadius: 'var(--radius-sm)', color: 'var(--text-hi)',
      fontFamily: 'var(--font-ui)', fontSize: 10, padding: '4px 7px',
      cursor: 'pointer', outline: 'none', width: '100%',
    }}>
      {options.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
    </select>
  );
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <div data-action onClick={onChange} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', borderRadius: 3, cursor: 'pointer' }}>
      <div style={{
        width: 14, height: 14, borderRadius: 2,
        border: `1px solid ${checked ? 'var(--ice)' : 'var(--ink-500)'}`,
        background: checked ? 'var(--ice-dim)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, transition: 'all 0.1s',
      }}>
        {checked && <span style={{ color: 'var(--ice)', fontSize: 9, fontWeight: 700 }}>✓</span>}
      </div>
      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-mid)' }}>{label}</span>
    </div>
  );
}

// ── Help content (TASK-07) ────────────────────────────────────────────────

const HELP_CATCH = (
  <div>
    <strong style={{ color: 'var(--ice)', display: 'block', marginBottom: 4 }}>Annual catch modes</strong>
    <b>Constant</b> — fixed tonnage every year.<br />
    <b>Per-year</b> — custom value per year 2026–2031, then held constant.<br />
    <b>Increasing / Decreasing</b> — linear ±2% per year from baseline.<br />
    <div style={{ marginTop: 6, color: 'rgba(255,255,255,0.45)', fontSize: 9 }}>
      Real-world Pacific tuna: 300 000–500 000 t/yr total across zones.
    </div>
  </div>
);

const HELP_CONCENTRATION = (
  <div>
    <strong style={{ color: 'var(--ice)', display: 'block', marginBottom: 4 }}>Catch concentration</strong>
    Minimum density threshold for fishing effort allocation.<br />
    <b>Low</b> — fishing dispersed across all productive areas.<br />
    <b>High</b> — effort concentrated on the highest-density patches, amplifying local depletion.
  </div>
);

const HELP_CLOSURES = (
  <div>
    <strong style={{ color: 'var(--ice)', display: 'block', marginBottom: 4 }}>Fishing-closure zones</strong>
    EEZs are national Exclusive Economic Zones (200 nm offshore). Closing them bans commercial fishing in that area.<br />
    <div style={{ marginTop: 6 }}>PIPA alone covers ~408 000 km² — closure expected to raise central Pacific biomass by 5–12% over 20 years.</div>
  </div>
);

const HELP_CLIMATE = (
  <div>
    <strong style={{ color: 'var(--ice)', display: 'block', marginBottom: 4 }}>IPCC scenario</strong>
    <b>Low</b> — SSP1-2.6: aggressive mitigation, +1.5°C by 2100.<br />
    <b>Medium</b> — SSP2-4.5: moderate action, +2.7°C by 2100.<br />
    <b>High</b> — SSP5-8.5: business-as-usual, +4.4°C by 2100.
  </div>
);

const HELP_ESM = (
  <div>
    <strong style={{ color: 'var(--ice)', display: 'block', marginBottom: 4 }}>Earth-System Models</strong>
    <b>IPSL</b> — Institut Pierre-Simon Laplace (France)<br />
    <b>GFDL</b> — Geophysical Fluid Dynamics Lab (USA/NOAA)<br />
    <b>MPI</b> — Max-Planck-Institut für Meteorologie (Germany)<br />
    <b>NORESM</b> — Norwegian Earth System Model (Norway)<br />
    <div style={{ marginTop: 6, color: 'rgba(255,255,255,0.45)', fontSize: 9 }}>
      Multi-model ensemble reduces structural uncertainty.
    </div>
  </div>
);

// ── Fishery sub-block ────────────────────────────────────────────────────

const ZONE_COLORS: Record<string, string> = { A: 'var(--fish-a)', B: 'var(--fish-b)', C: 'var(--fish-c)' };
const CATCH_MODES: CatchMode[] = ['constant', 'per-year', 'increasing', 'decreasing'];

function FisheryBlock({
  zoneId, name, value, mode, perYear,
  onValueChange, onModeChange, onPerYearChange,
}: {
  zoneId: string; name: string; value: number; mode: CatchMode;
  perYear: Record<string, number>;
  onValueChange: (v: number) => void;
  onModeChange: (m: CatchMode) => void;
  onPerYearChange: (year: string, v: number) => void;
}) {
  const maxVal = Math.max(...Object.values(perYear));
  const perYearYears = Object.keys(perYear).sort();

  return (
    <div style={{ marginBottom: 10, padding: 8, background: 'var(--ink-500)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <div style={{ width: 10, height: 10, borderRadius: 2, background: ZONE_COLORS[zoneId], flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, color: 'var(--text-hi)', flex: 1 }}>{name}</span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: 'var(--text-lo)', marginBottom: 3, fontFamily: 'var(--font-ui)' }}>Annual catch</div>
          {mode === 'per-year'
            ? <div style={{ padding: '4px 7px', background: 'var(--ink-700)', border: '1px solid var(--ice-border)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-lo)' }}>—</div>
            : <NumInput value={value} onChange={onValueChange} unit="t / yr" />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: 'var(--text-lo)', marginBottom: 3, fontFamily: 'var(--font-ui)' }}>Mode</div>
          <SelectInput value={mode} options={CATCH_MODES} onChange={v => onModeChange(v as CatchMode)} />
        </div>
      </div>
      {mode === 'per-year' && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 9, color: 'var(--text-lo)', fontFamily: 'var(--font-ui)', marginBottom: 4 }}>
            Per-year input — 2026 → 2031
          </div>
          <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 40 }}>
            {perYearYears.map(yr => (
              <div key={yr} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }}
                title={`${yr}: ${perYear[yr].toLocaleString()} t`}>
                <div style={{
                  width: '100%', borderRadius: '1px 1px 0 0',
                  background: ZONE_COLORS[zoneId], opacity: 0.75,
                  height: `${Math.round((perYear[yr] / maxVal) * 32)}px`,
                  transition: 'height 0.2s', minHeight: 2,
                }} />
                <span style={{ fontSize: 7, color: 'var(--text-lo)', fontFamily: 'var(--font-mono)' }}>'{yr.slice(2)}</span>
              </div>
            ))}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{ width: '100%', background: ZONE_COLORS[zoneId], opacity: 0.4, height: 16, borderRadius: '1px 1px 0 0' }} />
              <span style={{ fontSize: 7, color: 'var(--text-lo)', fontFamily: 'var(--font-mono)' }}>…</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main config panel ────────────────────────────────────────────────────

export function ConfigPanel({ dimmed }: { dimmed?: boolean }) {
  const {
    catchA, catchAMode, catchB, catchBMode, catchBPerYear, catchC, catchCMode,
    catchConcentration, closures, drawingZone, customClosureZone, climateScenario, climateModels,
    setCatchA, setCatchAMode, setCatchB, setCatchBMode, setCatchBPerYear,
    setCatchC, setCatchCMode, setCatchConcentration, toggleClosure, setDrawingZone,
    setCustomClosureZone, setClimateScenario, toggleClimateModel, launchSimulation,
  } = useFishStore();

  const [showLoadModal, setShowLoadModal] = useState(false);

  return (
    <div style={{
      width: 'var(--panel-w)', minWidth: 'var(--panel-w)', display: 'flex', flexDirection: 'column',
      background: 'var(--ink-700)', borderRight: '1px solid var(--ink-500)',
      opacity: dimmed ? 0.35 : 1,
      pointerEvents: dimmed ? 'none' : 'auto',
      transition: 'opacity 0.2s',
    }}>
      {/* Panel header */}
      <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid var(--ink-500)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 600, color: 'var(--text-hi)' }}>Scenario parameters</span>
          <span style={{ fontSize: 9, color: 'var(--signal-warn)', fontFamily: 'var(--font-ui)', background: 'var(--warn-dim)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>
            unsaved
          </span>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Block 1 — Catch per fishery */}
        <div>
          <BlockHeader label="1 · Annual catch per super-fishery" helpContent={HELP_CATCH} />
          <FisheryBlock zoneId="A" name="A · West Pacific" value={catchA} mode={catchAMode} perYear={catchBPerYear}
            onValueChange={setCatchA} onModeChange={setCatchAMode} onPerYearChange={setCatchBPerYear} />
          <FisheryBlock zoneId="B" name="B · Central equatorial" value={catchB} mode={catchBMode} perYear={catchBPerYear}
            onValueChange={setCatchB} onModeChange={setCatchBMode} onPerYearChange={setCatchBPerYear} />
          <FisheryBlock zoneId="C" name="C · East tropical" value={catchC} mode={catchCMode} perYear={catchBPerYear}
            onValueChange={setCatchC} onModeChange={setCatchCMode} onPerYearChange={setCatchBPerYear} />
        </div>

        {/* Block 2 — Concentration */}
        <div>
          <BlockHeader label="2 · Catch concentration" helpContent={HELP_CONCENTRATION} />
          <SegBtn options={['low', 'medium', 'high']} value={catchConcentration} onChange={v => setCatchConcentration(v as Level)} />
        </div>

        {/* Block 3 — Closure zones */}
        <div>
          <BlockHeader label="3 · Fishing-closure zones" helpContent={HELP_CLOSURES} />
          <div style={{ fontSize: 9, color: 'var(--text-lo)', marginBottom: 6, fontFamily: 'var(--font-ui)' }}>EEZ list (multi-select)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 8 }}>
            {EEZ_LIST.map(eez => (
              <Checkbox key={eez} label={eez} checked={closures.includes(eez)} onChange={() => toggleClosure(eez)} />
            ))}
          </div>
          <button
            onClick={() => setDrawingZone(!drawingZone)}
            style={{
              width: '100%', padding: '5px 0', fontSize: 10, fontFamily: 'var(--font-ui)',
              background: drawingZone ? 'var(--ice-dim)' : 'transparent',
              border: `1px solid ${drawingZone ? 'var(--ice)' : 'var(--ice-border)'}`,
              borderRadius: 'var(--radius-sm)',
              color: drawingZone ? 'var(--ice)' : 'var(--text-mid)', cursor: 'pointer',
            }}>
            {drawingZone ? '✕ Exit draw mode' : '✏ Draw a zone on the map'}
          </button>
          {/* TASK-05: clear custom zone */}
          {customClosureZone && !drawingZone && (
            <button
              onClick={() => setCustomClosureZone(null)}
              style={{
                width: '100%', marginTop: 6, padding: '4px 0', fontSize: 10, fontFamily: 'var(--font-ui)',
                background: 'var(--danger-dim)', border: '1px solid var(--signal-danger)',
                borderRadius: 'var(--radius-sm)', color: 'var(--signal-danger)', cursor: 'pointer',
              }}>
              ✕ Clear drawn zone
            </button>
          )}
        </div>

        {/* Block 4 — Climate */}
        <div>
          <BlockHeader label="4 · Climate scenario" helpContent={HELP_CLIMATE} />
          <div style={{ fontSize: 9, color: 'var(--text-lo)', marginBottom: 4, fontFamily: 'var(--font-ui)' }}>IPCC scenario</div>
          <SegBtn options={['low', 'medium', 'high']} value={climateScenario} onChange={v => setClimateScenario(v as Level)} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 4 }}>
            <div style={{ fontSize: 9, color: 'var(--text-lo)', fontFamily: 'var(--font-ui)' }}>Earth-System model (multi-select)</div>
            <HelpTooltip content={HELP_ESM} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ESM_MODELS.map(m => (
              <div key={m} data-action onClick={() => toggleClimateModel(m)} style={{
                padding: '3px 10px', borderRadius: 3,
                border: `1px solid ${climateModels.includes(m) ? 'var(--ice)' : 'var(--ink-500)'}`,
                background: climateModels.includes(m) ? 'var(--ice-dim)' : 'transparent',
                fontFamily: 'var(--font-ui)', fontSize: 10,
                color: climateModels.includes(m) ? 'var(--ice)' : 'var(--text-lo)',
                cursor: 'pointer', transition: 'all 0.1s',
              }}>{m}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--ink-500)', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        <button
          onClick={() => setShowLoadModal(true)}
          style={{
            width: '100%', padding: '7px 0', fontSize: 11, fontFamily: 'var(--font-ui)',
            background: 'transparent', border: '1px solid var(--ice-border)',
            borderRadius: 'var(--radius-sm)', color: 'var(--text-mid)', cursor: 'pointer',
          }}>
          ⤓ Load a saved scenario
        </button>
        <button
          onClick={launchSimulation}
          style={{
            width: '100%', padding: '8px 0', fontSize: 12, fontFamily: 'var(--font-ui)', fontWeight: 600,
            background: 'var(--ice)', border: 'none',
            borderRadius: 'var(--radius-sm)', color: 'var(--ink-900)', cursor: 'pointer',
          }}>
          Launch the simulation →
        </button>
      </div>

      {/* TASK-10: Load modal */}
      {showLoadModal && <LoadScenarioModal onClose={() => setShowLoadModal(false)} />}
    </div>
  );
}
