// TASK-12/13 — LineChart with Y axis, trend annotation, critical-year marker
import { useMemo } from 'react';
import { YEARS, HISTORY_END } from '../../data/mockData';

interface Props {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  activeYearIdx?: number;
  unit?: string;
  showAnnotation?: boolean;
}

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

// TASK-13 — Y axis with 3 graduations (left padding 30px in viewBox)
const PAD_LEFT = 30;
const PAD_RIGHT = 4;

export function LineChart({ data, height = 60, color = 'var(--ice)', activeYearIdx, unit, showAnnotation = false }: Props) {
  const { pts, minV, maxV } = useMemo(() => {
    const minV = Math.min(...data) * 0.9;
    const maxV = Math.max(...data) * 1.05;
    const span  = maxV - minV || 1;
    const totalW = 100 - PAD_LEFT - PAD_RIGHT;
    const pts = data.map((v, i) => {
      const x = PAD_LEFT + (i / (data.length - 1)) * totalW;
      const y = height - ((v - minV) / span) * (height - 8) - 4;
      return [x, y] as [number, number];
    });
    return { pts, minV, maxV };
  }, [data, height]);

  const histPts = pts.slice(0, HISTORY_END + 1);
  const projPts = pts.slice(HISTORY_END);
  const histPath = smoothPath(histPts);
  const projPath = smoothPath(projPts);

  const cursorX = activeYearIdx !== undefined ? pts[activeYearIdx]?.[0] : null;
  const cursorY = activeYearIdx !== undefined ? pts[activeYearIdx]?.[1] : null;

  // TASK-12 — annotation: delta% from first projection point to 2055 (index 45)
  const baseVal   = data[HISTORY_END + 1] ?? data[HISTORY_END];
  const val2055   = data[45];
  const deltaPct  = baseVal > 0 ? ((val2055 - baseVal) / baseVal * 100) : 0;
  const totalW    = 100 - PAD_LEFT - PAD_RIGHT;
  const annX      = PAD_LEFT + (45 / (data.length - 1)) * totalW;
  const annY      = pts[45]?.[1] ?? 20;

  // Critical year: first year where data[i] < 0.7 * baseVal (for projection only)
  const critIdx = data.findIndex((v, i) => i > HISTORY_END && v < 0.7 * baseVal);
  const critX   = critIdx > 0 ? PAD_LEFT + (critIdx / (data.length - 1)) * totalW : null;

  // Y axis ticks
  const span = maxV - minV || 1;
  const yTicks = [maxV, (maxV + minV) / 2, minV];

  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height, display: 'block' }}
    >
      {/* Area fill under projection */}
      <defs>
        <linearGradient id={`area-grad-${color.replace(/[^a-z]/gi, '')}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* TASK-13 — Y axis line + ticks + labels */}
      <line x1={PAD_LEFT} y1={4} x2={PAD_LEFT} y2={height - 2} stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
      {yTicks.map((tick, i) => {
        const yPos = height - ((tick - minV) / span) * (height - 8) - 4;
        const fmt = tick >= 1000 ? `${(tick / 1000).toFixed(0)}k` : tick.toFixed(0);
        return (
          <g key={i}>
            <line x1={PAD_LEFT - 2} y1={yPos} x2={PAD_LEFT} y2={yPos} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
            <text x={PAD_LEFT - 3} y={yPos + 1.5} textAnchor="end" fontSize="4.5" fill="rgba(255,255,255,0.4)" fontFamily="JetBrains Mono, monospace">{fmt}</text>
          </g>
        );
      })}
      {unit && (
        <text x={2} y={height / 2} textAnchor="middle" fontSize="4" fill="rgba(255,255,255,0.3)" fontFamily="Inter, sans-serif" transform={`rotate(-90, 5, ${height / 2})`}>{unit}</text>
      )}

      {/* Area under projection */}
      {projPts.length > 1 && (
        <path
          d={`${projPath} L ${projPts[projPts.length-1][0]} ${height} L ${projPts[0][0]} ${height} Z`}
          fill={`url(#area-grad-${color.replace(/[^a-z]/gi, '')})`}
        />
      )}

      {/* History line */}
      {histPath && <path d={histPath} fill="none" stroke={color} strokeWidth="1.5" opacity="0.9" vectorEffect="non-scaling-stroke" />}

      {/* History/projection boundary */}
      {histPts.length > 0 && (
        <line x1={histPts[histPts.length-1][0]} y1={4} x2={histPts[histPts.length-1][0]} y2={height - 2}
          stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" strokeDasharray="2,2" vectorEffect="non-scaling-stroke" />
      )}

      {/* Projection line */}
      {projPath && <path d={projPath} fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="4,3" opacity="0.65" vectorEffect="non-scaling-stroke" />}

      {/* TASK-12 — trend annotation at 2055 */}
      {showAnnotation && Math.abs(deltaPct) > 1 && (
        <g>
          <line x1={annX} y1={annY - 6} x2={annX} y2={annY - 12} stroke={deltaPct < 0 ? '#E5443A' : '#3AC58E'} strokeWidth="0.7" vectorEffect="non-scaling-stroke" />
          <text x={annX + 1} y={annY - 13} fontSize="4.5" fill={deltaPct < 0 ? '#E5443A' : '#3AC58E'} fontFamily="Inter, sans-serif" fontWeight="600">
            {deltaPct > 0 ? '+' : ''}{deltaPct.toFixed(0)}% by 2055
          </text>
        </g>
      )}

      {/* TASK-12 — critical year marker */}
      {critX !== null && (
        <g>
          <line x1={critX} y1={4} x2={critX} y2={height - 2} stroke="var(--signal-danger)" strokeWidth="0.7" strokeDasharray="2,2" opacity="0.7" vectorEffect="non-scaling-stroke" />
          <text x={critX + 1} y={8} fontSize="4" fill="var(--signal-danger)" fontFamily="Inter, sans-serif">critical</text>
        </g>
      )}

      {/* Active year cursor */}
      {cursorX !== null && cursorY !== null && (
        <>
          <line x1={cursorX} y1={4} x2={cursorX} y2={height - 2} stroke="var(--ice)" strokeWidth="0.8" opacity="0.7" vectorEffect="non-scaling-stroke" />
          <circle cx={cursorX} cy={cursorY} r="2" fill="var(--ice)" opacity="0.9" vectorEffect="non-scaling-stroke" />
        </>
      )}
    </svg>
  );
}

export function HistogramChart({ data, color = 'var(--ice)', height = 50 }: {
  data: number[]; color?: string; height?: number;
}) {
  const maxV = Math.max(...data);
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
      {data.map((v, i) => {
        const barW = 100 / data.length;
        const barH = (v / maxV) * (height - 4);
        return <rect key={i} x={i * barW + 0.5} y={height - barH} width={barW - 1} height={barH} fill={color} opacity="0.7" rx="0.5" />;
      })}
    </svg>
  );
}
