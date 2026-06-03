import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useFishStore } from '../../store/fishStore';
import type { Phase, MapLayer } from '../../store/fishStore';

// ── Fishery zone GeoJSON ───────────────────────────────────────────────────
// A: West Pacific 130°E–180°, 20°N–15°S
// B: Central –180°–150°W (just across dateline), 15°N–15°S
// C: East tropical 150°W–85°W, 20°N–20°S

const FISHERY_FEATURES: GeoJSON.Feature[] = [
  {
    type: 'Feature',
    properties: { id: 'A', name: 'A · West Pacific', color: '#4DA8DA', opacity: 0.18 },
    geometry: { type: 'Polygon', coordinates: [[[130,-15],[180,-15],[180,20],[130,20],[130,-15]]] },
  },
  {
    type: 'Feature',
    properties: { id: 'B', name: 'B · Central', color: '#3AC58E', opacity: 0.18 },
    geometry: { type: 'Polygon', coordinates: [[[-180,-15],[-150,-15],[-150,15],[-180,15],[-180,-15]]] },
  },
  {
    type: 'Feature',
    properties: { id: 'C', name: 'C · East tropical', color: '#F2A93B', opacity: 0.18 },
    geometry: { type: 'Polygon', coordinates: [[[-150,-20],[-85,-20],[-85,20],[-150,20],[-150,-20]]] },
  },
];

// EEZ closure approximate boxes
const EEZ_SHAPES: Record<string, GeoJSON.Polygon> = {
  'Kiribati (PIPA)': { type: 'Polygon', coordinates: [[[-175,-5],[-168,-5],[-168,2],[-175,2],[-175,-5]]] },
  'Nauru EEZ':       { type: 'Polygon', coordinates: [[[164,-1],[170,-1],[170,2],[164,2],[164,-1]]] },
  'Tuvalu EEZ':      { type: 'Polygon', coordinates: [[[176,-11],[180,-11],[180,-7],[176,-7],[176,-11]]] },
  'Tokelau EEZ':     { type: 'Polygon', coordinates: [[[-173,-12],[-168,-12],[-168,-8],[-173,-8],[-173,-12]]] },
};

// Compute heatmap color for a zone at a given year/layer/scenario
function heatColor(zoneId: string, year: number, layer: MapLayer, scenario: 'A' | 'B'): string {
  const t = (year - 2026) / (2099 - 2026); // 0→1 across projection
  const multiplier = { A: -0.4, B: 0.15 }[scenario] ?? -0.4;
  let val = 0.8 + multiplier * t;
  // Zone C is more sensitive
  if (zoneId === 'C') val += scenario === 'A' ? -0.1 * t : 0.05 * t;
  // Layer adjustments
  if (layer === 'recruitment') val -= 0.1 * t * (scenario === 'A' ? 1 : 0);
  if (layer === 'catch') val = 0.8 - 0.05 * t; // roughly stable
  val = Math.max(0, Math.min(1, val));
  // Interpolate green→yellow→red
  if (val >= 0.5) {
    const s = (val - 0.5) * 2; // 0→1 = red→green
    const r = Math.round(58  + (229-58)  * (1-s));
    const g = Math.round(197 + (68-197)  * (1-s));
    const b = Math.round(142 + (58-142)  * (1-s));
    return `rgb(${r},${g},${b})`;
  } else {
    const s = val * 2; // 0→1 = red→yellow
    const r = Math.round(229 + (242-229) * s);
    const g = Math.round(68  + (169-68)  * s);
    const b = Math.round(58  + (59-58)   * s);
    return `rgb(${r},${g},${b})`;
  }
}

interface Props {
  phase: Phase;
}

export function PacificMap({ phase }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(false);

  const closures     = useFishStore(s => s.closures);
  const drawingZone  = useFishStore(s => s.drawingZone);
  const activeYear   = useFishStore(s => s.activeYear);
  const mapLayer     = useFishStore(s => s.mapLayer);
  const mapScenario  = useFishStore(s => s.mapScenario);
  const compMode     = useFishStore(s => s.comparisonMode);

  const scenario: 'A' | 'B' = phase === 'decide' && compMode ? mapScenario : 'A';
  const isDecide = phase === 'decide';

  // ── Init map ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [160, 0],
      zoom: 2.2,
      minZoom: 1,
      maxZoom: 7,
      attributionControl: false,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    map.on('load', () => {
      readyRef.current = true;

      // ── Fishery zones ──────────────────────────────────────────────────
      map.addSource('fisheries', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: FISHERY_FEATURES },
      });
      map.addLayer({
        id: 'fisheries-fill',
        type: 'fill',
        source: 'fisheries',
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': ['get', 'opacity'],
        },
      });
      map.addLayer({
        id: 'fisheries-outline',
        type: 'line',
        source: 'fisheries',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 1.5,
          'line-opacity': 0.6,
          'line-dasharray': [4, 2],
        },
      });

      // ── Zone labels ────────────────────────────────────────────────────
      map.addSource('fishery-labels', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            { type: 'Feature', properties: { id: 'A', label: 'A · West Pacific',    color: '#4DA8DA' }, geometry: { type: 'Point', coordinates: [155, 5] } },
            { type: 'Feature', properties: { id: 'B', label: 'B · Central',         color: '#3AC58E' }, geometry: { type: 'Point', coordinates: [-165, 3] } },
            { type: 'Feature', properties: { id: 'C', label: 'C · East tropical',   color: '#F2A93B' }, geometry: { type: 'Point', coordinates: [-120, 5] } },
          ],
        },
      });
      map.addLayer({
        id: 'fishery-labels',
        type: 'symbol',
        source: 'fishery-labels',
        layout: {
          'text-field': ['get', 'label'],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 11,
          'text-anchor': 'center',
        },
        paint: {
          'text-color': ['get', 'color'],
          'text-halo-color': '#0A1428',
          'text-halo-width': 2,
        },
      });

      // ── Closures source (empty initially) ──────────────────────────────
      map.addSource('closures', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'closures-fill',
        type: 'fill',
        source: 'closures',
        paint: { 'fill-color': '#E5443A', 'fill-opacity': 0.18 },
      });
      map.addLayer({
        id: 'closures-line',
        type: 'line',
        source: 'closures',
        paint: { 'line-color': '#E5443A', 'line-width': 2, 'line-dasharray': [3, 2] },
      });

      // ── Heatmap overlay (decide mode) ──────────────────────────────────
      map.addSource('heatmap', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'heatmap-fill',
        type: 'fill',
        source: 'heatmap',
        paint: {
          'fill-color': ['get', 'heatColor'],
          'fill-opacity': 0.45,
        },
      });

      applyState(map, closures, isDecide, activeYear, mapLayer, scenario);
    });

    return () => { map.remove(); mapRef.current = null; readyRef.current = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Reactive updates ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!readyRef.current || !mapRef.current) return;
    applyState(mapRef.current, closures, isDecide, activeYear, mapLayer, scenario);
  }, [closures, isDecide, activeYear, mapLayer, scenario]);

  return (
    <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Map title strip */}
      <div style={{
        position: 'absolute', top: 8, left: 8,
        background: 'rgba(10,20,40,0.75)',
        border: '1px solid var(--ink-500)',
        borderRadius: 'var(--radius-sm)',
        padding: '3px 8px',
        fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-mid)',
        pointerEvents: 'none',
      }}>
        {isDecide
          ? `${mapLayer.charAt(0).toUpperCase() + mapLayer.slice(1)} · Year ${activeYear}${compMode ? ` · Scenario ${scenario}` : ''}`
          : 'Pacific Ocean — equatorial view'}
      </div>

      {/* Drawing mode indicator */}
      {drawingZone && (
        <div style={{
          position: 'absolute', inset: 0,
          border: '2px dashed var(--signal-info)',
          borderRadius: 4,
          pointerEvents: 'none',
          zIndex: 10,
        }}>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            background: 'rgba(10,20,40,0.85)',
            border: '1px solid var(--signal-info)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 14px',
            fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--signal-info)',
          }}>
            ✏ Draw mode active — click map to place points
          </div>
        </div>
      )}

      {/* Layer toggles (configure mode only) */}
      {!isDecide && <LayerToggles />}
    </div>
  );
}

function LayerToggles() {
  return (
    <div style={{
      position: 'absolute', bottom: 32, right: 8,
      background: 'rgba(10,20,40,0.85)',
      border: '1px solid var(--ink-500)',
      borderRadius: 'var(--radius-sm)',
      padding: '8px 10px',
      fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-mid)',
      minWidth: 110,
    }}>
      <div style={{ fontWeight: 600, color: 'var(--text-hi)', marginBottom: 6, fontSize: 9, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
        Data layers
      </div>
      {[
        { label: 'SST', on: true },
        { label: 'Currents', on: true },
        { label: 'Plankton', on: false },
      ].map(({ label, on }) => (
        <LayerToggleRow key={label} label={label} on={on} />
      ))}
    </div>
  );
}

function LayerToggleRow({ label, on: defaultOn }: { label: string; on: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
      <span style={{ color: 'var(--text-mid)' }}>{label}</span>
      <div style={{
        width: 26, height: 14, borderRadius: 7,
        background: defaultOn ? 'var(--signal-ok)' : 'var(--ink-500)',
        position: 'relative', cursor: 'pointer', transition: 'background 0.15s',
        flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: 2,
          left: defaultOn ? 14 : 2,
          width: 10, height: 10, borderRadius: '50%',
          background: 'white', transition: 'left 0.15s',
        }} />
      </div>
    </div>
  );
}

// ── State application ──────────────────────────────────────────────────────
function applyState(
  map: maplibregl.Map,
  closures: string[],
  isDecide: boolean,
  activeYear: number,
  mapLayer: MapLayer,
  scenario: 'A' | 'B',
) {
  // Closures layer
  const closureFeatures: GeoJSON.Feature[] = closures
    .filter(eez => EEZ_SHAPES[eez])
    .map(eez => ({ type: 'Feature' as const, properties: { eez }, geometry: EEZ_SHAPES[eez] }));
  (map.getSource('closures') as maplibregl.GeoJSONSource)?.setData({
    type: 'FeatureCollection', features: closureFeatures,
  });

  // Heatmap layer (decide mode)
  if (isDecide) {
    const heatFeatures: GeoJSON.Feature[] = FISHERY_FEATURES.map(f => ({
      ...f,
      properties: {
        ...f.properties,
        heatColor: heatColor(f.properties!.id as string, activeYear, mapLayer, scenario),
      },
    }));
    (map.getSource('heatmap') as maplibregl.GeoJSONSource)?.setData({
      type: 'FeatureCollection', features: heatFeatures,
    });
    map.setPaintProperty('fisheries-fill', 'fill-opacity', 0.06);
    map.setPaintProperty('heatmap-fill', 'fill-opacity', 0.45);
  } else {
    (map.getSource('heatmap') as maplibregl.GeoJSONSource)?.setData({
      type: 'FeatureCollection', features: [],
    });
    map.setPaintProperty('fisheries-fill', 'fill-opacity', 0.18);
    map.setPaintProperty('heatmap-fill', 'fill-opacity', 0);
  }
}
