// ResultsPanel v3: unified toggle drives featured series, chart fills height
import { useMemo, useState, useEffect, useRef } from 'react';
import { useFishStore } from '../../store/fishStore';
import type { MapLayer } from '../../store/fishStore';
import {
  YEARS, YEAR_NOW_IDX, HISTORY_END,
  BIOMASS_A, CATCH_A, RECRUITMENT_A, SIZE_DIST_A_R1, SIZE_DIST_A_R2,
  BIOMASS_B, CATCH_B, RECRUITMENT_B, SIZE_DIST_B_R1, SIZE_DIST_B_R2,
} from '../../data/mockData';
import { LineChart, HistogramChart } from './LineChart';

// ── KPI calculation ────────────────────────────────────────────────────────

export function calcKPIs(biomass: number[]) {
  const base  = biomass[YEAR_NOW_IDX];
  const v2055 = biomass[45];
  const v2099 = biomass[89];
  const d2055 = base > 0 ? ((v2055 - base) / base * 100) : 0;
  const d2099 = base > 0 ? ((v2099 - base) / base * 100) : 0;

  let critYear: number | null = null;
  for (let i = HISTORY_END + 1; i < biomass.length; i++) {
    if (biomass[i] < 0.7 * base) { critYear = YEARS[i]; break; }
  }

  return { v2055, v2099, d2055, d2099, critYear };
}

// ── Multi-series chart ────────────────────────────────────────────────────

const CHART_SERIES = [
  { key: 'biomass'     as MapLayer, label: 'Biomass',     unit: 't/km²', color: 'var(--fish-a)' },
  { key: 'catch'       as MapLayer, label: 'Catch',       unit: 't/yr',  color: 'var(--fish-b)' },
  { key: 'recruitment' as MapLayer, label: 'Recruitment', unit: 'index', color: 'var(--fish-c)' },
] as const;

const PAD_L = 32;
const PAD_R = 8;

function smoothPath(points: [number, number][]): string {
  if (points.length < 2) return '';
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpX = (prev[0] + curr[0]) / 2;
    d += ` C ${cpX} ${prev[1]} ${cpX} ${curr[1]} ${curr[0]} ${curr[1]}`;
  }
  return d;
}

function computePts(data: number[], w: number, h: number): [number, number][] {
  const minV = Math.min(...data) * 0.9;
  const maxV = Math.max(...data) * 1.05;
  const span = maxV - minV || 1;
  const chartW = w - PAD_L - PAD_R;
  return data.map((v, i) => [
    PAD_L + (i / (data.length - 1)) * chartW,
    h - ((v - minV) / span) * (h - 8) - 4,
  ] as [number, number]);
}

interface MultiSeriesChartProps {
  biomassData: number[];
  catchData: number[];
  recruitmentData: number[];
  featured: MapLayer;
  activeYearIdx?: number;
}

function MultiSeriesChart({
  biomassData, catchData, recruitmentData,
  featured, activeYearIdx,
}: MultiSeriesChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 600, h: 200 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect;
      if (rect && rect.width > 20 && rect.height > 20) {
        setDims({ w: rect.width, h: rect.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dataMap: Record<MapLayer, number[]> = {
    biomass: biomassData,
    catch: catchData,
    recruitment: recruitmentData,
  };

  const pointsMap = useMemo(() => ({
    biomass:     computePts(biomassData,     dims.w, dims.h),
    catch:       computePts(catchData,       dims.w, dims.h),
    recruitment: computePts(recruitmentData, dims.w, dims.h),
  }), [biomassData, catchData, recruitmentData, dims.w, dims.h]);

  const featuredData = dataMap[featured] ?? [];
  const minV = featuredData.length ? Math.min(...featuredData) * 0.9 : 0;
  const maxV = featuredData.length ? Math.max(...featuredData) * 1.05 : 1;
  const span = (maxV - minV) || 1;

  const yTicks = [maxV, (maxV * 0.5 + minV * 0.5), minV];
  const yTickItems = yTicks.map(tick => ({
    fmt: tick >= 10000 ? `${(tick / 1000).toFixed(0)}k` : tick.toFixed(1),
    yPct: (dims.h - ((tick - minV) / span) * (dims.h - 8) - 4) / dims.h * 100,
    yPos: dims.h - ((tick - minV) / span) * (dims.h - 8) - 4,
  }));

  const baseVal  = featuredData[HISTORY_END + 1] ?? featuredData[HISTORY_END];
  const val2055  = featuredData[45];
  const deltaPct = baseVal > 0 ? ((val2055 - baseVal) / baseVal * 100) : 0;
  const chartW   = dims.w - PAD_L - PAD_R;
  const annX     = PAD_L + (45 / (featuredData.length - 1)) * chartW;
  const featPts  = pointsMap[featured];
  const annY     = featPts[45]?.[1] ?? 20;
  const annColor = deltaPct < 0 ? '#E5443A' : '#3AC58E';

  const _cursorXRaw = activeYearIdx !== undefined ? featPts[activeYearIdx]?.[0] : null;
  const _cursorYRaw = activeYearIdx !== undefined ? featPts[activeYearIdx]?.[1] : null;
  const cursorX = (_cursorXRaw != null && Number.isFinite(_cursorXRaw)) ? _cursorXRaw : null;
  const cursorY = (_cursorYRaw != null && Number.isFinite(_cursorYRaw)) ? _cursorYRaw : null;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Chart canvas — flex: 1 */}
      <div ref={containerRef} style={{ flex: 1, minHeight: 0, position: 'relative', width: '100%' }}>
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${dims.w} ${dims.h}`}
          preserveAspectRatio="none"
          style={{ display: 'block', position: 'absolute', inset: 0 }}
        >
          {/* Y axis */}
          <line x1={PAD_L} y1={4} x2={PAD_L} y2={dims.h - 2} stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
          {yTickItems.filter(t => Number.isFinite(t.yPos)).map((t, i) => (
            <line key={i} x1={PAD_L - 2} y1={t.yPos} x2={PAD_L} y2={t.yPos} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
          ))}

          {/* Each series */}
          {CHART_SERIES.map(s => {
            const isFeatured = s.key === featured;
            const pts = pointsMap[s.key];
            const histPts = pts.slice(0, HISTORY_END + 1);
            const projPts = pts.slice(HISTORY_END);
            const histPath = smoothPath(histPts);
            const projPath = smoothPath(projPts);
            const sw = isFeatured ? 2 : 1;
            const op = isFeatured ? 1 : 0.18;

            return (
              <g key={s.key} style={{ opacity: op, transition: 'opacity 0.2s ease' }}>
                {isFeatured && projPts.length > 1 && (
                  <path
                    d={`${projPath} L ${projPts[projPts.length - 1][0]} ${dims.h} L ${projPts[0][0]} ${dims.h} Z`}
                    fill={s.color} fillOpacity="0.1"
                  />
                )}
                {histPath && <path d={histPath} fill="none" stroke={s.color} strokeWidth={sw} vectorEffect="non-scaling-stroke" />}
                {isFeatured && histPts.length > 0 && (
                  <line
                    x1={histPts[histPts.length - 1][0]} y1={4}
                    x2={histPts[histPts.length - 1][0]} y2={dims.h - 2}
                    stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" strokeDasharray="2,2" vectorEffect="non-scaling-stroke"
                  />
                )}
                {projPath && (
                  <path d={projPath} fill="none" stroke={s.color} strokeWidth={sw}
                    strokeDasharray="4,3" opacity={isFeatured ? 0.65 : 1} vectorEffect="non-scaling-stroke" />
                )}
              </g>
            );
          })}

          {/* Annotation stem */}
          {Math.abs(deltaPct) > 1 && Number.isFinite(annY) && (
            <line x1={annX} y1={annY - 4} x2={annX} y2={annY - 10} stroke={annColor} strokeWidth="0.7" vectorEffect="non-scaling-stroke" />
          )}

          {/* Cursor line */}
          {cursorX !== null && (
            <line x1={cursorX} y1={4} x2={cursorX} y2={dims.h - 2} stroke="var(--ice)" strokeWidth="0.8" opacity="0.7" vectorEffect="non-scaling-stroke" />
          )}
        </svg>

        {/* Y axis tick labels */}
        {yTickItems.map((t, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: 0,
            top: `${t.yPct}%`,
            transform: 'translateY(-50%)',
            width: PAD_L - 2,
            fontSize: 8, lineHeight: 1,
            color: 'rgba(255,255,255,0.45)',
            fontFamily: 'var(--font-mono)',
            whiteSpace: 'nowrap', pointerEvents: 'none',
            textAlign: 'right',
          }}>{t.fmt}</div>
        ))}

        {/* Annotation label */}
        {Math.abs(deltaPct) > 1 && (
          <div style={{
            position: 'absolute',
            left: `${annX / dims.w * 100}%`,
            top: `${(annY - 14) / dims.h * 100}%`,
            transform: 'translateX(-50%)',
            fontSize: 9, fontWeight: 600, color: annColor,
            fontFamily: 'var(--font-ui)',
            whiteSpace: 'nowrap', pointerEvents: 'none',
            transition: 'opacity 0.15s ease',
          }}>
            {deltaPct > 0 ? '+' : ''}{deltaPct.toFixed(0)}% by 2055
          </div>
        )}

        {/* Cursor circle */}
        {cursorX !== null && cursorY !== null && (
          <div style={{
            position: 'absolute',
            left: `${cursorX / dims.w * 100}%`,
            top: `${(cursorY / dims.h) * 100}%`,
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--ice)', opacity: 0.9,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }} />
        )}
      </div>

      {/* Legend — flex-shrink: 0 */}
      <div style={{ flexShrink: 0, display: 'flex', gap: 12, padding: '4px 0 2px' }}>
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

// ── ResultsPanel ──────────────────────────────────────────────────────────

interface Props {
  scenario?: 'A' | 'B';
  compact?: boolean;
}

export function ResultsPanel({ scenario = 'A', compact = false }: Props) {
  const activeYear    = useFishStore(s => s.activeYear);
  const selectedZone  = useFishStore(s => s.selectedZone);
  const featuredSeries = useFishStore(s => s.featuredSeries);
  const setKpis       = useFishStore(s => s.setKpis);
  const activeIdx     = useMemo(() => YEARS.indexOf(activeYear), [activeYear]);

  const [sizeExpanded, setSizeExpanded] = useState(false);
  const [sizeHover, setSizeHover] = useState(false);
  const [exportHover, setExportHover] = useState(false);

  const biomass     = scenario === 'A' ? BIOMASS_A     : BIOMASS_B;
  const catch_data  = scenario === 'A' ? CATCH_A       : CATCH_B;
  const recruitment = scenario === 'A' ? RECRUITMENT_A : RECRUITMENT_B;
  const sizeR1      = scenario === 'A' ? SIZE_DIST_A_R1 : SIZE_DIST_B_R1;
  const sizeR2      = scenario === 'A' ? SIZE_DIST_A_R2 : SIZE_DIST_B_R2;

  const kpis = useMemo(() => calcKPIs(biomass), [biomass]);

  useEffect(() => {
    if (!compact && scenario === 'A') setKpis(kpis);
  }, [kpis, compact, scenario, setKpis]);

  const handlePDF = () => {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prev = document.title;
    document.title = `FISHSTOCK_${date}_Scenario1`;
    window.print();
    document.title = prev;
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Chart area — flex: 1 */}
      <div style={{ flex: 1, minHeight: 0, padding: compact ? '8px 10px 4px' : '10px 14px 4px', display: 'flex', flexDirection: 'column' }}>
        {compact ? (
          <LineChart
            data={biomass} height={44} color="var(--fish-a)"
            activeYearIdx={activeIdx >= 0 ? activeIdx : undefined}
            unit="t/km²"
          />
        ) : (
          <MultiSeriesChart
            biomassData={biomass}
            catchData={catch_data}
            recruitmentData={recruitment}
            featured={featuredSeries}
            activeYearIdx={activeIdx >= 0 ? activeIdx : undefined}
          />
        )}
      </div>

      {/* Zone data placeholder */}
      {!compact && selectedZone && (
        <div style={{
          flexShrink: 0, margin: '0 14px 8px',
          padding: '8px 10px',
          background: 'var(--ink-500)', border: '1px solid var(--ink-400)',
          borderRadius: 'var(--radius-sm)',
          fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--text-lo)',
          fontStyle: 'italic',
        }}>
          Zone data — available after SEAPODYM integration
        </div>
      )}

      {/* Size distribution expanded content */}
      {!compact && sizeExpanded && (
        <div style={{ flexShrink: 0, padding: '0 14px 8px' }}>
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

      {/* Bottom row — Size distribution + Export PDF */}
      {!compact && (
        <div style={{
          flexShrink: 0, display: 'flex', gap: 8,
          padding: '8px 12px',
          borderTop: '1px solid var(--ink-500)',
        }}>
          <button
            onClick={() => setSizeExpanded(v => !v)}
            onMouseEnter={() => setSizeHover(true)}
            onMouseLeave={() => setSizeHover(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px',
              background: sizeHover ? 'var(--ink-500)' : 'rgba(255,255,255,0.04)',
              border: '1px solid var(--ink-400)',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-mid)',
              transition: 'background 0.15s ease',
            }}
          >
            {sizeExpanded ? '✕ Close size distribution' : '↗ Size distribution'}
          </button>

          <button
            onClick={handlePDF}
            onMouseEnter={() => setExportHover(true)}
            onMouseLeave={() => setExportHover(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px',
              background: exportHover ? 'var(--ink-500)' : 'rgba(255,255,255,0.04)',
              border: '1px solid var(--ink-400)',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-mid)',
              marginLeft: 'auto',
              transition: 'background 0.15s ease',
            }}
          >
            ⎙ Export PDF
          </button>
        </div>
      )}
    </div>
  );
}
