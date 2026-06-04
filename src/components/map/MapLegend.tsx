// TASK-04 — Dynamic legend for active data layers
import { useFishStore } from '../../store/fishStore';

interface LegendEntry {
  label: string;
  unit: string;
  gradient: string;
  min: string;
  max: string;
}

export function MapLegend() {
  const { layerSST, layerPlankton, phase } = useFishStore();

  const entries: LegendEntry[] = [];

  if (layerSST && phase === 'configure') {
    entries.push({
      label: 'SST',
      unit: '°C',
      gradient: 'linear-gradient(to right, #2c7bb6, #abd9e9, #ffffbf, #fdae61, #d7191c)',
      min: '22°C',
      max: '32°C',
    });
  }
  if (layerPlankton && phase === 'configure') {
    entries.push({
      label: 'Chlorophyll',
      unit: 'mg/m³',
      gradient: 'linear-gradient(to right, #440154, #31688e, #35b779, #fde725)',
      min: '0.01',
      max: '1.0',
    });
  }

  if (entries.length === 0) return null;

  return (
    <div style={{
      position: 'absolute', bottom: 36, left: 8,
      background: 'rgba(10,20,40,0.88)',
      border: '1px solid var(--ink-500)',
      borderRadius: 'var(--radius-sm)',
      padding: '8px 10px',
      fontFamily: 'var(--font-ui)',
      zIndex: 5,
      minWidth: 130,
      pointerEvents: 'none',
    }}>
      {entries.map((entry, idx) => (
        <div key={entry.label} style={{ marginBottom: idx < entries.length - 1 ? 8 : 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-hi)' }}>{entry.label}</span>
            <span style={{ fontSize: 8, color: 'var(--text-lo)' }}>{entry.unit}</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: entry.gradient, marginBottom: 2 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 7, color: 'var(--text-lo)' }}>{entry.min}</span>
            <span style={{ fontSize: 7, color: 'var(--text-lo)' }}>{entry.max}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
