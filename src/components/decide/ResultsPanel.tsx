// TASK-11/12/13 — ResultsPanel with KPI cards, annotated charts, Y axis
import { useMemo } from 'react';
import { useFishStore } from '../../store/fishStore';
import {
  YEARS, YEAR_NOW_IDX, HISTORY_END,
  BIOMASS_A, CATCH_A, RECRUITMENT_A, SIZE_DIST_A_R1, SIZE_DIST_A_R2,
  BIOMASS_B, CATCH_B, RECRUITMENT_B, SIZE_DIST_B_R1, SIZE_DIST_B_R2,
} from '../../data/mockData';
import { LineChart, HistogramChart } from './LineChart';

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

// ── KPI calculation helpers ────────────────────────────────────────────────

function calcKPIs(biomass: number[]) {
  const base  = biomass[YEAR_NOW_IDX];
  const v2055 = biomass[45]; // 2055 = index 45
  const v2099 = biomass[89]; // 2099 = index 89
  const d2055 = base > 0 ? ((v2055 - base) / base * 100) : 0;
  const d2099 = base > 0 ? ((v2099 - base) / base * 100) : 0;

  let critYear: number | null = null;
  for (let i = HISTORY_END + 1; i < biomass.length; i++) {
    if (biomass[i] < 0.7 * base) { critYear = YEARS[i]; break; }
  }

  return { v2055, v2099, d2055, d2099, critYear };
}

function KPICard({ label, value, delta, unit, critYear, selectedZone }: {
  label: string;
  value?: number;
  delta?: number;
  unit?: string;
  critYear?: number | null;
  selectedZone?: 'A' | 'B' | 'C' | null;
}) {
  const isOk = delta !== undefined ? delta >= 0 : critYear === null;
  const signalColor = isOk ? 'var(--signal-ok)' : 'var(--signal-danger)';

  return (
    <div style={{
      flex: 1,
      padding: '8px 10px',
      background: 'var(--ink-500)',
      borderRadius: 'var(--radius-sm)',
      border: `1px solid ${isOk ? 'rgba(58,197,142,0.2)' : 'rgba(229,68,58,0.2)'}`,
    }}>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 8, color: 'var(--text-lo)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        {label}
      </div>
      {selectedZone !== undefined && (
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 7, color: selectedZone ? ZONE_COLORS[selectedZone] : 'var(--text-lo)', marginBottom: 3 }}>
          {selectedZone ? `Zone ${selectedZone}` : 'global'}
        </div>
      )}
      {critYear !== undefined ? (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: signalColor }}>
          {critYear !== null ? critYear : <span style={{ color: 'var(--signal-ok)', fontSize: 11 }}>Not reached</span>}
        </div>
      ) : (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--text-hi)' }}>
            {value?.toFixed(1)} <span style={{ fontSize: 9, fontWeight: 400, color: 'var(--text-lo)' }}>{unit}</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: signalColor, marginTop: 2 }}>
            {delta !== undefined && (delta >= 0 ? '+' : '')}{delta?.toFixed(1)}% vs 2026
          </div>
        </>
      )}
    </div>
  );
}

// ── Scope header ──────────────────────────────────────────────────────────

function ScopeHeader({ selectedZone }: { selectedZone: 'A' | 'B' | 'C' | null }) {
  return (
    <div style={{
      height: 28, display: 'flex', alignItems: 'center',
      padding: '0 14px', flexShrink: 0,
      background: 'var(--ink-500)',
      borderBottom: '1px solid var(--ink-400)',
      fontFamily: 'var(--font-ui)', fontSize: 9,
      textTransform: 'uppercase', letterSpacing: '0.5px',
    }}>
      {selectedZone ? (
        <>
          <span style={{ color: ZONE_COLORS[selectedZone], marginRight: 6, fontSize: 11 }}>◉</span>
          <span style={{ color: 'var(--text-hi)' }}>
            Zone {selectedZone} · {ZONE_NAMES[selectedZone]}
          </span>
          <span style={{ color: 'var(--text-lo)', marginLeft: 8 }}>— données filtrées</span>
        </>
      ) : (
        <>
          <span style={{ color: 'var(--text-lo)', marginRight: 6, fontSize: 11 }}>○</span>
          <span style={{ color: 'var(--text-lo)' }}>Vue globale · 3 zones agrégées</span>
        </>
      )}
    </div>
  );
}

// ── Chart block wrapper ───────────────────────────────────────────────────

function ChartBlock({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, color: 'var(--text-hi)' }}>{title}</span>
        {subtitle && <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--text-lo)' }}>{subtitle}</span>}
      </div>
      {children}
      <div style={{ display: 'flex', gap: 12, marginTop: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2" stroke="var(--ice)" strokeWidth="1.5" /></svg>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 8, color: 'var(--text-lo)' }}>history</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2" stroke="var(--ice)" strokeWidth="1.5" strokeDasharray="3,2" /></svg>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 8, color: 'var(--text-lo)' }}>projection</span>
        </div>
      </div>
    </div>
  );
}

interface Props {
  scenario?: 'A' | 'B';
  compact?: boolean;
}

export function ResultsPanel({ scenario = 'A', compact = false }: Props) {
  const activeYear   = useFishStore(s => s.activeYear);
  const selectedZone = useFishStore(s => s.selectedZone);
  const activeIdx    = useMemo(() => YEARS.indexOf(activeYear), [activeYear]);

  const biomass     = scenario === 'A' ? BIOMASS_A     : BIOMASS_B;
  const catch_data  = scenario === 'A' ? CATCH_A       : CATCH_B;
  const recruitment = scenario === 'A' ? RECRUITMENT_A : RECRUITMENT_B;
  const sizeR1      = scenario === 'A' ? SIZE_DIST_A_R1 : SIZE_DIST_B_R1;
  const sizeR2      = scenario === 'A' ? SIZE_DIST_A_R2 : SIZE_DIST_B_R2;

  const kpis = useMemo(() => calcKPIs(biomass), [biomass]);
  const chartH = compact ? 44 : 60;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Scope header */}
      {!compact && <ScopeHeader selectedZone={selectedZone} />}

      <div style={{ flex: 1, overflowY: 'auto', padding: compact ? '8px 10px' : '12px 14px' }}>

        {/* TASK-11 — KPI cards */}
        {!compact && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            <KPICard
              label="Biomass 2055"
              value={kpis.v2055}
              delta={kpis.d2055}
              unit="t/km²"
              selectedZone={selectedZone}
            />
            <KPICard
              label="Biomass 2099"
              value={kpis.v2099}
              delta={kpis.d2099}
              unit="t/km²"
              selectedZone={selectedZone}
            />
            <KPICard
              label="Critical year"
              critYear={kpis.critYear}
              selectedZone={selectedZone}
            />
          </div>
        )}

        {/* Biomass */}
        <ChartBlock title="Biomass" subtitle="t/km²">
          <LineChart
            data={biomass} height={chartH} color="var(--fish-a)"
            activeYearIdx={activeIdx >= 0 ? activeIdx : undefined}
            unit="t/km²" showAnnotation={!compact}
          />
        </ChartBlock>

        {/* Catch */}
        <ChartBlock title="Catch" subtitle="t/yr">
          <LineChart
            data={catch_data} height={chartH} color="var(--fish-b)"
            activeYearIdx={activeIdx >= 0 ? activeIdx : undefined}
            unit="t/yr"
          />
        </ChartBlock>

        {/* Recruitment */}
        <ChartBlock title="Recruitment" subtitle="index">
          <LineChart
            data={recruitment} height={chartH} color="var(--fish-c)"
            activeYearIdx={activeIdx >= 0 ? activeIdx : undefined}
            unit="idx"
          />
        </ChartBlock>

        {/* Size distribution */}
        {!compact && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, color: 'var(--text-hi)' }}>Size distribution</span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--text-lo)' }}>period: {activeYear}</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 8, color: 'var(--text-lo)', marginBottom: 2 }}>Region 1</div>
                <HistogramChart data={sizeR1} color="var(--ice)" height={44} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 8, color: 'var(--text-lo)', marginBottom: 2 }}>Region 2</div>
                <HistogramChart data={sizeR2} color="var(--ice)" height={44} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
