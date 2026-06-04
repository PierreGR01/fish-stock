import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useFishStore } from '../../store/fishStore';
import type { Phase, MapLayer, CustomZone } from '../../store/fishStore';
import { MapLegend } from './MapLegend';
import { CurrentsLayer } from './CurrentsLayer';

// ── Fishery zone GeoJSON ───────────────────────────────────────────────────
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

const EEZ_SHAPES: Record<string, GeoJSON.Polygon> = {
  'Kiribati (PIPA)': { type: 'Polygon', coordinates: [[[-175,-5],[-168,-5],[-168,2],[-175,2],[-175,-5]]] },
  'Nauru EEZ':       { type: 'Polygon', coordinates: [[[164,-1],[170,-1],[170,2],[164,2],[164,-1]]] },
  'Tuvalu EEZ':      { type: 'Polygon', coordinates: [[[176,-11],[180,-11],[180,-7],[176,-7],[176,-11]]] },
  'Tokelau EEZ':     { type: 'Polygon', coordinates: [[[-173,-12],[-168,-12],[-168,-8],[-173,-8],[-173,-12]]] },
};

const ZONE_AREAS: Record<string, string> = { A: '8 400', B: '4 100', C: '11 800' };

// Each zone starts at a distinct base and follows its own trajectory per layer.
// val=1 → deep green (healthy/low-pressure), val=0 → deep red (critical/high-pressure).
function heatColor(zoneId: string, year: number, layer: MapLayer, scenario: 'A' | 'B'): string {
  const t = (year - 2026) / (2099 - 2026);
  const sA = scenario === 'A';

  // { base at 2026,  trend over 2026-2099 }
  const cfg: Record<MapLayer, Record<string, [number, number]>> = {
    // Biomass = stock health index. A well-managed, B overfished, C critically low.
    biomass: {
      A: [0.82, sA ? -0.40 : 0.12],
      B: [0.54, sA ? -0.52 : 0.22],
      C: [0.36, sA ? -0.33 : 0.10],
    },
    // Catch pressure = intensity relative to sustainable yield. C heavily fished.
    catch: {
      A: [0.68, sA ? -0.18 : -0.06],
      B: [0.58, sA ? -0.25 : 0.28],
      C: [0.82, sA ? -0.08 : 0.04],
    },
    // Recruitment = juvenile success, sensitive to SST rise. B highest, C weakest.
    recruitment: {
      A: [0.62, sA ? -0.58 : 0.16],
      B: [0.76, sA ? -0.44 : 0.18],
      C: [0.40, sA ? -0.38 : 0.08],
    },
  };

  const [base, trend] = cfg[layer]?.[zoneId] ?? [0.6, -0.3];
  const val = Math.max(0, Math.min(1, base + trend * t));

  if (val >= 0.5) {
    const s = (val - 0.5) * 2;
    return `rgb(${Math.round(58+(229-58)*(1-s))},${Math.round(197+(68-197)*(1-s))},${Math.round(142+(58-142)*(1-s))})`;
  } else {
    const s = val * 2;
    return `rgb(${Math.round(229+(242-229)*s)},${Math.round(68+(169-68)*s)},${Math.round(58+(59-58)*s)})`;
  }
}

const WMTS = 'https://wmts.marine.copernicus.eu/teroWmts'

const SST_TILES = [
  `${WMTS}?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0` +
  `&LAYER=GLOBAL_ANALYSISFORECAST_PHY_001_024/cmems_mod_glo_phy-thetao_anfc_0.083deg_P1D-m_202406/thetao` +
  `&TILEMATRIXSET=EPSG:3857&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}` +
  `&FORMAT=image/png&STYLE=default`,
]

const PLANKTON_TILES = [
  `${WMTS}?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0` +
  `&LAYER=GLOBAL_ANALYSISFORECAST_BGC_001_028/cmems_mod_glo_bgc-pft_anfc_0.25deg_P1D-m_202311/chl` +
  `&TILEMATRIXSET=EPSG:3857&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}` +
  `&FORMAT=image/png&STYLE=default`,
]

function updateDrawPreview(map: maplibregl.Map, points: [number, number][]) {
  const features: GeoJSON.Feature[] = [];
  if (points.length >= 2) {
    features.push({
      type: 'Feature', properties: { type: 'line' },
      geometry: { type: 'LineString', coordinates: points },
    });
  }
  if (points.length >= 3) {
    features.push({
      type: 'Feature', properties: { type: 'fill' },
      geometry: { type: 'Polygon', coordinates: [[...points, points[0]]] },
    });
  }
  points.forEach((pt, i) => {
    features.push({
      type: 'Feature',
      properties: { type: 'point', first: i === 0 },
      geometry: { type: 'Point', coordinates: pt },
    });
  });
  (map.getSource('draw-preview') as maplibregl.GeoJSONSource)?.setData({
    type: 'FeatureCollection', features,
  });
}

interface Props { phase: Phase }

export function PacificMap({ phase }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<maplibregl.Map | null>(null);
  const readyRef      = useRef(false);

  // Draw state
  const [drawPoints, setDrawPoints]       = useState<[number, number][]>([]);
  const drawPointsRef  = useRef<[number, number][]>([]);
  const drawingZoneRef = useRef(false);

  // WMS availability
  const [sstUnavailable, setSstUnavailable]         = useState(false);
  const [planktonUnavailable, setPlanktonUnavailable] = useState(false);

  // Layer opacity
  const [opacitySST, setOpacitySST]           = useState(0.55);
  const [opacityPlankton, setOpacityPlankton] = useState(0.6);

  // Store subscriptions
  const closures          = useFishStore(s => s.closures);
  const customClosureZone = useFishStore(s => s.customClosureZone);
  const drawingZone       = useFishStore(s => s.drawingZone);
  const activeYear        = useFishStore(s => s.activeYear);
  const mapLayer          = useFishStore(s => s.mapLayer);
  const mapScenario       = useFishStore(s => s.mapScenario);
  const compMode          = useFishStore(s => s.comparisonMode);
  const layerSST          = useFishStore(s => s.layerSST);
  const layerPlankton     = useFishStore(s => s.layerPlankton);
  const catchA            = useFishStore(s => s.catchA);
  const catchB            = useFishStore(s => s.catchB);
  const catchC            = useFishStore(s => s.catchC);
  const setCustomClosureZone = useFishStore(s => s.setCustomClosureZone);
  const setDrawingZone       = useFishStore(s => s.setDrawingZone);
  const setLayerSST          = useFishStore(s => s.setLayerSST);
  const setLayerCurrents     = useFishStore(s => s.setLayerCurrents);
  const setLayerPlankton     = useFishStore(s => s.setLayerPlankton);

  // Refs for popup content (avoid stale closures in event handlers)
  const catchARef = useRef(catchA);
  const catchBRef = useRef(catchB);
  const catchCRef = useRef(catchC);
  useEffect(() => { catchARef.current = catchA; }, [catchA]);
  useEffect(() => { catchBRef.current = catchB; }, [catchB]);
  useEffect(() => { catchCRef.current = catchC; }, [catchC]);

  const scenario: 'A' | 'B' = phase === 'decide' && compMode ? mapScenario : 'A';
  const isDecide = phase === 'decide';

  drawingZoneRef.current = drawingZone;
  drawPointsRef.current  = drawPoints;

  // ── Map init ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [160, 0], zoom: 2.2, minZoom: 1, maxZoom: 7,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    map.on('load', () => {
      readyRef.current = true;

      // Fishery zones
      map.addSource('fisheries', { type: 'geojson', data: { type: 'FeatureCollection', features: FISHERY_FEATURES } });
      map.addLayer({ id: 'fisheries-fill', type: 'fill', source: 'fisheries', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': ['get', 'opacity'] } });
      map.addLayer({ id: 'fisheries-outline', type: 'line', source: 'fisheries', paint: { 'line-color': ['get', 'color'], 'line-width': 1.5, 'line-opacity': 0.6, 'line-dasharray': [4, 2] } });

      // Zone labels
      map.addSource('fishery-labels', { type: 'geojson', data: { type: 'FeatureCollection', features: [
        { type: 'Feature', properties: { label: 'A · West Pacific', color: '#4DA8DA' }, geometry: { type: 'Point', coordinates: [155, 5] } },
        { type: 'Feature', properties: { label: 'B · Central', color: '#3AC58E' }, geometry: { type: 'Point', coordinates: [-165, 3] } },
        { type: 'Feature', properties: { label: 'C · East tropical', color: '#F2A93B' }, geometry: { type: 'Point', coordinates: [-120, 5] } },
      ]}});
      map.addLayer({ id: 'fishery-labels', type: 'symbol', source: 'fishery-labels', layout: { 'text-field': ['get', 'label'], 'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'], 'text-size': 11, 'text-anchor': 'center' }, paint: { 'text-color': ['get', 'color'], 'text-halo-color': '#0A1428', 'text-halo-width': 2 } });

      // Closures
      map.addSource('closures', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'closures-fill', type: 'fill', source: 'closures', paint: { 'fill-color': '#E5443A', 'fill-opacity': 0.18 } });
      map.addLayer({ id: 'closures-line', type: 'line', source: 'closures', paint: { 'line-color': '#E5443A', 'line-width': 2, 'line-dasharray': [3, 2] } });

      // Heatmap overlay
      map.addSource('heatmap', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'heatmap-fill', type: 'fill', source: 'heatmap', paint: { 'fill-color': ['get', 'heatColor'], 'fill-opacity': 0.45 } });

      // ── TASK-01: SST WMS layer ─────────────────────────────────────────────
      try {
        map.addSource('sst-wms', { type: 'raster', tiles: SST_TILES, tileSize: 256 });
        map.addLayer({ id: 'sst-layer', type: 'raster', source: 'sst-wms', paint: { 'raster-opacity': 0.55 } });
      } catch { setSstUnavailable(true); }

      // ── TASK-03: Plankton WMS layer ────────────────────────────────────────
      try {
        map.addSource('plankton-wms', { type: 'raster', tiles: PLANKTON_TILES, tileSize: 256 });
        map.addLayer({ id: 'plankton-layer', type: 'raster', source: 'plankton-wms', paint: { 'raster-opacity': 0.6 } });
      } catch { setPlanktonUnavailable(true); }

      // ── TASK-19: WMS error detection ───────────────────────────────────────
      map.on('error', (e) => {
        const err = e as unknown as { sourceId?: string; error?: { message?: string } };
        if (err.sourceId === 'sst-wms') setSstUnavailable(true);
        if (err.sourceId === 'plankton-wms') setPlanktonUnavailable(true);
      });

      // ── Drawing preview sources ────────────────────────────────────────────
      map.addSource('draw-preview', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'draw-fill', type: 'fill', source: 'draw-preview', filter: ['==', ['get', 'type'], 'fill'], paint: { 'fill-color': '#E5443A', 'fill-opacity': 0.10 } });
      map.addLayer({ id: 'draw-line', type: 'line', source: 'draw-preview', filter: ['any', ['==', ['get', 'type'], 'line'], ['==', ['get', 'type'], 'fill']], paint: { 'line-color': '#E5443A', 'line-width': 2, 'line-dasharray': [4, 2] } });
      map.addLayer({ id: 'draw-points', type: 'circle', source: 'draw-preview', filter: ['==', ['get', 'type'], 'point'], paint: { 'circle-radius': 5, 'circle-color': '#E5443A', 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5 } });

      // ── TASK-06: Hover popup on fishery zones ──────────────────────────────
      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 8 });
      map.on('mouseenter', 'fisheries-fill', (e) => {
        if (!e.features?.length) return;
        const id = e.features[0].properties?.id as string;
        const name = e.features[0].properties?.name as string;
        const catchVal = id === 'A' ? catchARef.current : id === 'B' ? catchBRef.current : catchCRef.current;
        const mode = id === 'A' ? useFishStore.getState().catchAMode : id === 'B' ? useFishStore.getState().catchBMode : useFishStore.getState().catchCMode;
        popup.setLngLat(e.lngLat).setHTML(
          `<div style="font-family:Inter,sans-serif;font-size:11px;line-height:1.5;padding:4px 2px;">
            <strong style="color:#fff;display:block;margin-bottom:2px;">${name}</strong>
            <span style="color:#ccc;">Catch: </span><span style="color:#A8D8E8;font-family:monospace;">${catchVal?.toLocaleString() ?? '–'} t/yr</span>
            <span style="color:#888;margin-left:6px;">${mode}</span><br>
            <span style="color:#ccc;">Area: </span><span style="color:#888;">~${ZONE_AREAS[id] ?? '–'} km²</span>
          </div>`
        ).addTo(map);
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'fisheries-fill', () => { popup.remove(); map.getCanvas().style.cursor = ''; });

      applyState(map, closures, customClosureZone, isDecide, activeYear, mapLayer, scenario);
    });

    return () => { map.remove(); mapRef.current = null; readyRef.current = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Reactive: closures + heatmap ──────────────────────────────────────────
  useEffect(() => {
    if (!readyRef.current || !mapRef.current) return;
    applyState(mapRef.current, closures, customClosureZone, isDecide, activeYear, mapLayer, scenario);
  }, [closures, customClosureZone, isDecide, activeYear, mapLayer, scenario]);

  // ── Reactive: WMS visibility + opacity ───────────────────────────────────
  useEffect(() => {
    if (!readyRef.current || !mapRef.current) return;
    const map = mapRef.current;
    if (map.getLayer('sst-layer')) {
      map.setLayoutProperty('sst-layer', 'visibility', (layerSST && !isDecide) ? 'visible' : 'none');
    }
    if (map.getLayer('plankton-layer')) {
      map.setLayoutProperty('plankton-layer', 'visibility', (layerPlankton && !isDecide) ? 'visible' : 'none');
    }
  }, [layerSST, layerPlankton, isDecide]);

  useEffect(() => {
    if (!readyRef.current || !mapRef.current) return;
    if (mapRef.current.getLayer('sst-layer'))
      mapRef.current.setPaintProperty('sst-layer', 'raster-opacity', opacitySST);
  }, [opacitySST]);

  useEffect(() => {
    if (!readyRef.current || !mapRef.current) return;
    if (mapRef.current.getLayer('plankton-layer'))
      mapRef.current.setPaintProperty('plankton-layer', 'raster-opacity', opacityPlankton);
  }, [opacityPlankton]);

  // ── Reactive: drawing zone (TASK-05) ─────────────────────────────────────
  useEffect(() => {
    if (!readyRef.current || !mapRef.current) return;
    const map = mapRef.current;

    if (!drawingZone) {
      (map.getSource('draw-preview') as maplibregl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    const onClick = (e: maplibregl.MapMouseEvent) => {
      if (!drawingZoneRef.current) return;
      const pt: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      const next = [...drawPointsRef.current, pt];
      setDrawPoints(next);
      drawPointsRef.current = next;
      updateDrawPreview(map, next);
    };

    map.on('click', onClick);
    map.getCanvas().style.cursor = 'crosshair';
    return () => { map.off('click', onClick); map.getCanvas().style.cursor = ''; };
  }, [drawingZone]);

  const finishDrawing = () => {
    if (drawPoints.length < 3) return;
    setCustomClosureZone({ type: 'Polygon', coordinates: [[...drawPoints, drawPoints[0]]] });
    setDrawingZone(false);
    setDrawPoints([]);
    drawPointsRef.current = [];
    if (mapRef.current?.getSource('draw-preview')) {
      (mapRef.current.getSource('draw-preview') as maplibregl.GeoJSONSource)
        .setData({ type: 'FeatureCollection', features: [] });
    }
  };

  const cancelDrawing = () => {
    setDrawingZone(false);
    setDrawPoints([]);
    drawPointsRef.current = [];
    if (mapRef.current?.getSource('draw-preview')) {
      (mapRef.current.getSource('draw-preview') as maplibregl.GeoJSONSource)
        .setData({ type: 'FeatureCollection', features: [] });
    }
  };

  return (
    <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      <CurrentsLayer mapRef={mapRef} />

      {/* Map title strip */}
      <div style={{
        position: 'absolute', top: 8, left: 8,
        background: 'rgba(10,20,40,0.75)', border: '1px solid var(--ink-500)',
        borderRadius: 'var(--radius-sm)', padding: '3px 8px',
        fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-mid)', pointerEvents: 'none',
      }}>
        {isDecide
          ? `${mapLayer.charAt(0).toUpperCase() + mapLayer.slice(1)} · Year ${activeYear}${compMode ? ` · Scenario ${scenario}` : ''}`
          : 'Pacific Ocean — equatorial view'}
      </div>

      {/* Drawing mode overlay (TASK-05) */}
      {drawingZone && (
        <div style={{
          position: 'absolute', inset: 0, border: '2px dashed var(--signal-info)',
          borderRadius: 4, pointerEvents: 'none', zIndex: 10,
        }}>
          <div style={{
            position: 'absolute', bottom: 50, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 8, pointerEvents: 'auto',
          }}>
            {drawPoints.length >= 3 && (
              <button onClick={finishDrawing} style={{
                padding: '6px 14px', fontSize: 11, fontFamily: 'var(--font-ui)', fontWeight: 600,
                background: 'var(--signal-danger)', border: 'none', borderRadius: 'var(--radius-sm)',
                color: '#fff', cursor: 'pointer',
              }}>✓ Validate zone ({drawPoints.length} pts)</button>
            )}
            <button onClick={cancelDrawing} style={{
              padding: '6px 14px', fontSize: 11, fontFamily: 'var(--font-ui)',
              background: 'rgba(10,20,40,0.85)', border: '1px solid var(--ice-border)',
              borderRadius: 'var(--radius-sm)', color: 'var(--text-mid)', cursor: 'pointer',
            }}>✕ Cancel</button>
          </div>
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: 'rgba(10,20,40,0.85)', border: '1px solid var(--signal-info)',
            borderRadius: 'var(--radius-sm)', padding: '6px 14px',
            fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--signal-info)',
            pointerEvents: 'none',
          }}>
            ✏ Click to add points{drawPoints.length > 0 ? ` — ${drawPoints.length} placed` : ''}
          </div>
        </div>
      )}

      {/* TASK-18: Mock data banner (decide phase) */}
      {isDecide && (
        <div style={{
          position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)',
          fontSize: 9, color: 'var(--text-lo)', fontFamily: 'var(--font-ui)',
          pointerEvents: 'none', zIndex: 5, whiteSpace: 'nowrap',
        }}>
          Projection data: mock — will be replaced by SEAPODYM via EDITO API
        </div>
      )}

      {/* Layer panel: toggles + legend + opacity (configure only) */}
      {!isDecide && (
        <LayerToggles
          sstUnavailable={sstUnavailable}
          planktonUnavailable={planktonUnavailable}
          layerSST={layerSST}
          layerPlankton={layerPlankton}
          opacitySST={opacitySST}
          opacityPlankton={opacityPlankton}
          onToggleSST={() => setLayerSST(!layerSST)}
          onToggleCurrents={() => setLayerCurrents(!useFishStore.getState().layerCurrents)}
          onTogglePlankton={() => setLayerPlankton(!layerPlankton)}
          onOpacitySST={setOpacitySST}
          onOpacityPlankton={setOpacityPlankton}
        />
      )}
    </div>
  );
}

// ── Layer panel: toggles + legend + opacity ──────────────────────────────────
interface LayerTogglesProps {
  sstUnavailable: boolean;
  planktonUnavailable: boolean;
  layerSST: boolean;
  layerPlankton: boolean;
  opacitySST: number;
  opacityPlankton: number;
  onToggleSST: () => void;
  onToggleCurrents: () => void;
  onTogglePlankton: () => void;
  onOpacitySST: (v: number) => void;
  onOpacityPlankton: (v: number) => void;
}

function LayerToggles({
  sstUnavailable, planktonUnavailable,
  layerSST, layerPlankton,
  opacitySST, opacityPlankton,
  onToggleSST, onToggleCurrents, onTogglePlankton,
  onOpacitySST, onOpacityPlankton,
}: LayerTogglesProps) {
  const layerCurrents = useFishStore(s => s.layerCurrents);
  return (
    <div style={{
      position: 'absolute', bottom: 36, left: 8,
      background: 'rgba(10,20,40,0.88)', border: '1px solid var(--ink-500)',
      borderRadius: 'var(--radius-sm)', padding: '8px 10px',
      fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-mid)', minWidth: 148,
      zIndex: 10,
    }}>
      <div style={{ fontWeight: 600, color: 'var(--text-hi)', marginBottom: 6, fontSize: 9, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
        Data layers
      </div>

      {/* SST */}
      <LayerToggleRow label="SST" on={layerSST} unavailable={sstUnavailable} onToggle={onToggleSST} />
      {layerSST && !sstUnavailable && (
        <div style={{ marginBottom: 6, marginTop: 2 }}>
          <div style={{ height: 5, borderRadius: 3, marginBottom: 2, background: 'linear-gradient(to right, #2c7bb6, #abd9e9, #ffffbf, #fdae61, #d7191c)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 7, color: 'var(--text-lo)' }}>22°C</span>
            <span style={{ fontSize: 7, color: 'var(--text-lo)' }}>32°C</span>
          </div>
          <OpacitySlider value={opacitySST} onChange={onOpacitySST} />
        </div>
      )}

      {/* Currents */}
      <LayerToggleRow label="Currents" on={layerCurrents} unavailable={false} onToggle={onToggleCurrents} />

      {/* Plankton */}
      <div style={{ marginTop: layerCurrents ? 0 : 0 }}>
        <LayerToggleRow label="Plankton" on={layerPlankton} unavailable={planktonUnavailable} onToggle={onTogglePlankton} />
        {layerPlankton && !planktonUnavailable && (
          <div style={{ marginBottom: 2, marginTop: 2 }}>
            <div style={{ height: 5, borderRadius: 3, marginBottom: 2, background: 'linear-gradient(to right, #440154, #31688e, #35b779, #fde725)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 7, color: 'var(--text-lo)' }}>0.01 mg/m³</span>
              <span style={{ fontSize: 7, color: 'var(--text-lo)' }}>1.0</span>
            </div>
            <OpacitySlider value={opacityPlankton} onChange={onOpacityPlankton} />
          </div>
        )}
      </div>
    </div>
  );
}

function OpacitySlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ fontSize: 7, color: 'var(--text-lo)', flexShrink: 0 }}>opacity</span>
      <input
        type="range" min={0} max={1} step={0.05} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ flex: 1, height: 3, cursor: 'pointer', accentColor: 'var(--signal-ok)' }}
      />
      <span style={{ fontSize: 7, color: 'var(--text-lo)', width: 24, textAlign: 'right', flexShrink: 0 }}>
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}

function LayerToggleRow({ label, on, unavailable, onToggle }: { label: string; on: boolean; unavailable: boolean; onToggle: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
      <span style={{ color: unavailable ? 'var(--text-lo)' : 'var(--text-mid)', display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}
        {unavailable && (
          <span title="Data unavailable" style={{ fontSize: 8, color: 'var(--signal-warn)', fontFamily: 'var(--font-mono)' }}>⚠</span>
        )}
      </span>
      <div
        onClick={onToggle}
        style={{
          width: 26, height: 14, borderRadius: 7,
          background: on && !unavailable ? 'var(--signal-ok)' : 'var(--ink-500)',
          position: 'relative', cursor: 'pointer', transition: 'background 0.15s', flexShrink: 0,
        }}>
        <div style={{
          position: 'absolute', top: 2, left: on && !unavailable ? 14 : 2,
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
  customZone: CustomZone,
  isDecide: boolean,
  activeYear: number,
  mapLayer: MapLayer,
  scenario: 'A' | 'B',
) {
  const closureFeatures: GeoJSON.Feature[] = closures
    .filter(eez => EEZ_SHAPES[eez])
    .map(eez => ({ type: 'Feature' as const, properties: { eez }, geometry: EEZ_SHAPES[eez] }));

  // TASK-05: custom drawn zone also shown as closure
  if (customZone) {
    closureFeatures.push({ type: 'Feature' as const, properties: { eez: 'custom' }, geometry: customZone });
  }

  (map.getSource('closures') as maplibregl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: closureFeatures });

  if (isDecide) {
    const heatFeatures: GeoJSON.Feature[] = FISHERY_FEATURES.map(f => ({
      ...f, properties: { ...f.properties, heatColor: heatColor(f.properties!.id as string, activeYear, mapLayer, scenario) },
    }));
    (map.getSource('heatmap') as maplibregl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: heatFeatures });
    map.setPaintProperty('fisheries-fill', 'fill-opacity', 0.06);
    map.setPaintProperty('heatmap-fill', 'fill-opacity', 0.45);
  } else {
    (map.getSource('heatmap') as maplibregl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: [] });
    map.setPaintProperty('fisheries-fill', 'fill-opacity', 0.18);
    map.setPaintProperty('heatmap-fill', 'fill-opacity', 0);
  }
}
