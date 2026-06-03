import { useMemo } from 'react';
import { YEARS, HISTORY_END } from '../../data/mockData';

interface Props {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  activeYearIdx?: number;
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

export function LineChart({ data, height = 60, color = 'var(--ice)', activeYearIdx }: Props) {
  const pts = useMemo(() => {
    const minV = Math.min(...data) * 0.9;
    const maxV = Math.max(...data) * 1.05;
    const span = maxV - minV || 1;
    return data.map((v, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = height - ((v - minV) / span) * (height - 8) - 4;
      return [x, y] as [number, number];
    });
  }, [data, height]);

  const histPts = pts.slice(0, HISTORY_END + 1);
  const projPts = pts.slice(HISTORY_END);

  const histPath = smoothPath(histPts);
  const projPath = smoothPath(projPts);

  // Active year indicator
  const cursorX = activeYearIdx !== undefined ? pts[activeYearIdx]?.[0] : null;
  const cursorY = activeYearIdx !== undefined ? pts[activeYearIdx]?.[1] : null;

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
      {projPts.length > 1 && (
        <path
          d={`${projPath} L ${projPts[projPts.length-1][0]} ${height} L ${projPts[0][0]} ${height} Z`}
          fill={`url(#area-grad-${color.replace(/[^a-z]/gi, '')})`}
        />
      )}

      {/* History line (solid) */}
      {histPath && (
        <path d={histPath} fill="none" stroke={color} strokeWidth="1.5" opacity="0.9" vectorEffect="non-scaling-stroke" />
      )}

      {/* History/projection boundary */}
      {histPts.length > 0 && (
        <line
          x1={histPts[histPts.length - 1][0]} y1={4}
          x2={histPts[histPts.length - 1][0]} y2={height - 2}
          stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" strokeDasharray="2,2"
          vectorEffect="non-scaling-stroke"
        />
      )}

      {/* Projection line (dashed) */}
      {projPath && (
        <path d={projPath} fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="4,3" opacity="0.65" vectorEffect="non-scaling-stroke" />
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
        const x = i * barW + 0.5;
        const y = height - barH;
        return (
          <rect key={i} x={x} y={y} width={barW - 1} height={barH}
            fill={color} opacity="0.7" rx="0.5" />
        );
      })}
    </svg>
  );
}
