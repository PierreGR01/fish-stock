import { useMemo } from 'react';
import { useFishStore } from '../../store/fishStore';
import {
  YEARS, YEAR_NOW_IDX,
  BIOMASS_A, CATCH_A, RECRUITMENT_A, SIZE_DIST_A_R1, SIZE_DIST_A_R2,
  BIOMASS_B, CATCH_B, RECRUITMENT_B, SIZE_DIST_B_R1, SIZE_DIST_B_R2,
} from '../../data/mockData';
import { LineChart, HistogramChart } from './LineChart';

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
  const activeYear = useFishStore(s => s.activeYear);
  const activeIdx  = useMemo(() => YEARS.indexOf(activeYear), [activeYear]);

  const biomass     = scenario === 'A' ? BIOMASS_A     : BIOMASS_B;
  const catch_data  = scenario === 'A' ? CATCH_A       : CATCH_B;
  const recruitment = scenario === 'A' ? RECRUITMENT_A : RECRUITMENT_B;
  const sizeR1      = scenario === 'A' ? SIZE_DIST_A_R1 : SIZE_DIST_B_R1;
  const sizeR2      = scenario === 'A' ? SIZE_DIST_A_R2 : SIZE_DIST_B_R2;

  const chartH = compact ? 44 : 60;

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: compact ? '8px 10px' : '12px 14px' }}>
      {/* A · Biomass */}
      <ChartBlock title="A · Biomass" subtitle="t/km²">
        <LineChart data={biomass} height={chartH} color="var(--fish-a)" activeYearIdx={activeIdx >= 0 ? activeIdx : undefined} />
      </ChartBlock>

      {/* B · Catch */}
      <ChartBlock title="B · Catch" subtitle="target — history & projection">
        <LineChart data={catch_data} height={chartH} color="var(--fish-b)" activeYearIdx={activeIdx >= 0 ? activeIdx : undefined} />
      </ChartBlock>

      {/* C · Recruitment */}
      <ChartBlock title="C · Recruitment" subtitle="history & projection">
        <LineChart data={recruitment} height={chartH} color="var(--fish-c)" activeYearIdx={activeIdx >= 0 ? activeIdx : undefined} />
      </ChartBlock>

      {/* D · Size distribution */}
      {!compact && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, color: 'var(--text-hi)' }}>D · Catch size distribution</span>
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
  );
}
