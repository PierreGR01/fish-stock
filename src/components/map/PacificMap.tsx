import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useFishStore } from '../../store/fishStore';
import type { Phase, MapLayer, CustomZone } from '../../store/fishStore';
import { MapLegend } from './MapLegend';
import { CurrentsLayer } from './CurrentsLayer';
import eezZonesRaw from '../../data/eez_zones.json';

// ── Fishery zone GeoJSON ───────────────────────────────────────────────────
// Polygons follow approximate WCPFC/IATTC treaty boundaries (not rectangles).
const FISHERY_FEATURES: GeoJSON.Feature[] = [
  {
    // WCPFC western area: 130°E → 180°, tropical band, following Micronesia/Melanesia coastlines
    type: 'Feature',
    properties: { id: 'A', name: 'A · West Pacific', color: '#A8D4EE', opacity: 0.22 },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [130,  20],  // NW – Luzon / Taiwan latitude
        [155,  22],  // N  – Caroline Islands
        [170,  20],  // N  – Marshall Islands
        [180,  15],  // NE – approaching dateline
        [180,  -5],  // E  – equatorial
        [175, -12],  // E  – Wallis & Futuna
        [165, -20],  // SE – Vanuatu
        [148, -22],  // S  – Coral Sea
        [140, -18],  // S  – PNG southeast
        [132,  -8],  // SW – PNG north coast
        [130,   5],  // W  – Sulawesi
        [130,  20],
      ]],
    },
  },
  {
    // WCPFC/IATTC overlap zone: dateline → 130°W, central equatorial Pacific
    type: 'Feature',
    properties: { id: 'B', name: 'B · Central', color: '#6ABADE', opacity: 0.20 },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-180,  15],  // NW – dateline
        [-162,  22],  // N  – south of Hawaii
        [-145,  20],  // NE
        [-130,  12],  // E  – north
        [-130, -15],  // E  – south
        [-148, -22],  // SE – French Polynesia
        [-165, -20],  // S  – Tonga / Samoa
        [-180, -15],  // SW – dateline
        [-180,  15],
      ]],
    },
  },
  {
    // IATTC eastern tropical Pacific: 130°W → 78°W, following continental shelf geometry
    type: 'Feature',
    properties: { id: 'C', name: 'C · East tropical', color: '#3A98C8', opacity: 0.18 },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-130,  12],  // NW
        [-115,  25],  // N  – Baja California
        [ -85,  22],  // NE – Gulf of California
        [ -78,   8],  // E  – Panama / Costa Rica
        [ -82,  -5],  // E  – Ecuador
        [ -88, -18],  // SE – Peru
        [-110, -22],  // S
        [-130, -15],  // SW
        [-130,  12],
      ]],
    },
  },
];

interface EezZone {
  name: string;
  mrgid: number;
  area_km2: number;
  labelCoord: [number, number];
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}
// Real EEZ geometries from tuna-viewer.lab.dive.edito.eu/data/eez_reduced.json (MRGID source: MarineRegions)
const EEZ_ZONES = eezZonesRaw as unknown as EezZone[];

// ── Choropleth palette ────────────────────────────────────────────────────
// min (#1a3a5c) → layer-specific max color (mirrors --metric-* tokens)
const LAYER_MAX_RGB: Record<MapLayer, [number, number, number]> = {
  biomass:     [ 45, 212, 191],  // #2DD4BF — teal
  catch:       [132, 204,  22],  // #84CC16 — lime
  recruitment: [234, 179,   8],  // #EAB308 — golden amber
};
const MIN_RGB: [number, number, number] = [26, 58, 92]; // #1a3a5c

// Each zone starts at a distinct base and follows its own trajectory per layer.
// val=1 → max color (healthy/low-pressure), val=0 → deep navy (critical/high-pressure).
function heatColor(zoneId: string, year: number, layer: MapLayer, scenario: 'A' | 'B'): string {
  const t = (year - 2026) / (2099 - 2026);
  const sA = scenario === 'A';

  const cfg: Record<MapLayer, Record<string, [number, number]>> = {
    biomass: {
      A: [0.82, sA ? -0.40 : 0.12],
      B: [0.54, sA ? -0.52 : 0.22],
      C: [0.36, sA ? -0.33 : 0.10],
    },
    catch: {
      A: [0.68, sA ? -0.18 : -0.06],
      B: [0.58, sA ? -0.25 : 0.28],
      C: [0.82, sA ? -0.08 : 0.04],
    },
    recruitment: {
      A: [0.62, sA ? -0.58 : 0.16],
      B: [0.76, sA ? -0.44 : 0.18],
      C: [0.40, sA ? -0.38 : 0.08],
    },
  };

  const [base, trend] = cfg[layer]?.[zoneId] ?? [0.6, -0.3];
  const val = Math.max(0, Math.min(1, base + trend * t));

  const maxRgb = LAYER_MAX_RGB[layer];
  const r = Math.round(MIN_RGB[0] + (maxRgb[0] - MIN_RGB[0]) * val);
  const g = Math.round(MIN_RGB[1] + (maxRgb[1] - MIN_RGB[1]) * val);
  const b = Math.round(MIN_RGB[2] + (maxRgb[2] - MIN_RGB[2]) * val);
  return `rgb(${r},${g},${b})`;
}

// ── Legend metadata ───────────────────────────────────────────────────────
const LAYER_MAX_HEX: Record<MapLayer, string> = {
  biomass:     '#2DD4BF',
  catch:       '#84CC16',
  recruitment: '#EAB308',
};
const LEGEND_INFO: Record<MapLayer, { label: string; min: string; max: string }> = {
  biomass:     { label: 'Biomass · t/km²',  min: '40',  max: '140' },
  catch:       { label: 'Catch · t/yr',     min: '10k', max: '50k' },
  recruitment: { label: 'Recruitment · idx', min: '0.2', max: '1.0' },
};

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
  const selectedZone      = useFishStore(s => s.selectedZone);
  const setCustomClosureZone = useFishStore(s => s.setCustomClosureZone);
  const setDrawingZone       = useFishStore(s => s.setDrawingZone);
  const setLayerSST          = useFishStore(s => s.setLayerSST);
  const setLayerCurrents     = useFishStore(s => s.setLayerCurrents);
  const setLayerPlankton     = useFishStore(s => s.setLayerPlankton);

  const scenario: 'A' | 'B' = phase === 'decide' && compMode ? (mapScenario ?? 'A') : 'A';
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

      // ── Raster data layers (added FIRST = bottom of z-stack, under all vector layers) ──
      try {
        const { layerSST: initSST, phase: initPhase } = useFishStore.getState();
        map.addSource('sst-wms', { type: 'raster', tiles: SST_TILES, tileSize: 256 });
        map.addLayer({ id: 'sst-layer', type: 'raster', source: 'sst-wms', layout: { visibility: (initSST && initPhase !== 'decide') ? 'visible' : 'none' }, paint: { 'raster-opacity': 0.55 } });
      } catch { setSstUnavailable(true); }

      try {
        const { layerPlankton: initPlankton, phase: initPhase2 } = useFishStore.getState();
        map.addSource('plankton-wms', { type: 'raster', tiles: PLANKTON_TILES, tileSize: 256 });
        map.addLayer({ id: 'plankton-layer', type: 'raster', source: 'plankton-wms', layout: { visibility: (initPlankton && initPhase2 !== 'decide') ? 'visible' : 'none' }, paint: { 'raster-opacity': 0.6 } });
      } catch { setPlanktonUnavailable(true); }

      map.on('error', (e) => {
        const err = e as unknown as { sourceId?: string; error?: { message?: string } };
        if (err.sourceId === 'sst-wms') setSstUnavailable(true);
        if (err.sourceId === 'plankton-wms') setPlanktonUnavailable(true);
      });

      // ── Fishery super-zones (promoteId uses 'id' property for feature-state) ──
      map.addSource('fisheries', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: FISHERY_FEATURES },
        promoteId: 'id',
      });
      map.addLayer({ id: 'fisheries-fill', type: 'fill', source: 'fisheries', paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': ['get', 'opacity'],
      }});
      map.addLayer({ id: 'fisheries-outline-casing', type: 'line', source: 'fisheries', paint: {
        'line-color': '#0A1428',
        'line-width': 3.5,
        'line-opacity': 0.65,
      }});
      map.addLayer({ id: 'fisheries-outline', type: 'line', source: 'fisheries', paint: {
        'line-color': ['get', 'color'],
        'line-width': 2.0,
        'line-opacity': 0.85,
        'line-dasharray': [4, 2],
      }});

      // ── Heatmap overlay (promoteId for feature-state dimming) ─────────────
      map.addSource('heatmap', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        promoteId: 'id',
      });
      map.addLayer({ id: 'heatmap-fill', type: 'fill', source: 'heatmap', paint: { 'fill-color': ['get', 'heatColor'], 'fill-opacity': 0.45 } });

      // ── EEZ zones ─────────────────────────────────────────────────────────
      let hoveredEezId: number | null = null;
      const eezInitial: GeoJSON.Feature[] = EEZ_ZONES.map((z, idx) => ({
        type: 'Feature' as const,
        id: idx,
        properties: { name: z.name, closed: false, area_km2: z.area_km2 },
        geometry: z.geometry,
      }));
      map.addSource('eez-zones', { type: 'geojson', data: { type: 'FeatureCollection', features: eezInitial } });
      map.addLayer({
        id: 'eez-fill', type: 'fill', source: 'eez-zones',
        paint: {
          'fill-color': ['case', ['get', 'closed'], '#E5443A', '#ffffff'],
          'fill-opacity': ['case',
            ['get', 'closed'],
            ['case', ['boolean', ['feature-state', 'hover'], false], 0.32, 0.20],
            ['case', ['boolean', ['feature-state', 'hover'], false], 0.16, 0.04],
          ],
        },
      });
      map.addLayer({
        id: 'eez-outline-casing', type: 'line', source: 'eez-zones',
        paint: {
          'line-color': '#0A1428',
          'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 3.5, 2.5],
          'line-opacity': 0.60,
        },
      });
      map.addLayer({
        id: 'eez-outline', type: 'line', source: 'eez-zones',
        paint: {
          'line-color': ['case', ['get', 'closed'], '#E5443A', '#aab4cc'],
          'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 2.0, 1.5],
          'line-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 1.0, ['case', ['get', 'closed'], 0.9, 0.80]],
          'line-dasharray': [3, 2],
        },
      });
      map.addLayer({
        id: 'eez-names', type: 'symbol', source: 'eez-zones',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
          'text-size': 8,
          'text-anchor': 'center',
          'text-optional': true,
        },
        paint: {
          'text-color': ['case', ['get', 'closed'], '#E5443A', 'rgba(190,200,220,0.85)'],
          'text-halo-color': '#0A1428',
          'text-halo-width': 1.5,
        },
      });

      // ── Closures ──────────────────────────────────────────────────────────
      map.addSource('closures', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'closures-fill', type: 'fill', source: 'closures', paint: { 'fill-color': '#E5443A', 'fill-opacity': 0.18 } });
      map.addLayer({ id: 'closures-line-casing', type: 'line', source: 'closures', paint: { 'line-color': '#0A1428', 'line-width': 4.5, 'line-opacity': 0.65 } });
      map.addLayer({ id: 'closures-line', type: 'line', source: 'closures', paint: { 'line-color': '#E5443A', 'line-width': 2.5, 'line-dasharray': [3, 2] } });

      // ── Zone labels ───────────────────────────────────────────────────────
      map.addSource('fishery-labels', { type: 'geojson', data: { type: 'FeatureCollection', features: [
        { type: 'Feature', properties: { label: 'A · West Pacific', color: '#A8D4EE' }, geometry: { type: 'Point', coordinates: [155, 3] } },
        { type: 'Feature', properties: { label: 'B · Central', color: '#6ABADE' }, geometry: { type: 'Point', coordinates: [-155, 3] } },
        { type: 'Feature', properties: { label: 'C · East tropical', color: '#3A98C8' }, geometry: { type: 'Point', coordinates: [-108, 3] } },
      ]}});
      map.addLayer({ id: 'fishery-labels', type: 'symbol', source: 'fishery-labels', layout: { 'text-field': ['get', 'label'], 'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'], 'text-size': 11, 'text-anchor': 'center' }, paint: { 'text-color': ['get', 'color'], 'text-halo-color': '#0A1428', 'text-halo-width': 2 } });

      // ── Selected zone glow (above heatmap, below labels) ──────────────────
      map.addSource('fisheries-selected', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'fisheries-selected-glow',
        type: 'line',
        source: 'fisheries-selected',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 5,
          'line-opacity': 0.55,
          'line-blur': 4,
        },
      }, 'fishery-labels');
      map.addLayer({
        id: 'fisheries-selected-outline',
        type: 'line',
        source: 'fisheries-selected',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 2.5,
          'line-opacity': 1.0,
        },
      }, 'fishery-labels');

      // ── Drawing preview ────────────────────────────────────────────────────
      map.addSource('draw-preview', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'draw-fill', type: 'fill', source: 'draw-preview', filter: ['==', ['get', 'type'], 'fill'], paint: { 'fill-color': '#E5443A', 'fill-opacity': 0.10 } });
      map.addLayer({ id: 'draw-line', type: 'line', source: 'draw-preview', filter: ['any', ['==', ['get', 'type'], 'line'], ['==', ['get', 'type'], 'fill']], paint: { 'line-color': '#E5443A', 'line-width': 2, 'line-dasharray': [4, 2] } });
      map.addLayer({ id: 'draw-points', type: 'circle', source: 'draw-preview', filter: ['==', ['get', 'type'], 'point'], paint: { 'circle-radius': 5, 'circle-color': '#E5443A', 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5 } });

      // ── EEZ hover handlers ────────────────────────────────────────────────
      const eezPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 8 });
      const showEezPopup = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
        if (!e.features?.length) return;
        const name = e.features[0].properties?.name as string;
        const closed = !!e.features[0].properties?.closed;
        const area = (e.features[0].properties?.area_km2 as number | undefined)?.toLocaleString() ?? '–';
        eezPopup.setLngLat(e.lngLat).setHTML(
          `<div style="font-family:Inter,sans-serif;font-size:11px;line-height:1.5;padding:4px 2px;">
            <strong style="color:#fff;display:block;margin-bottom:2px;">${name}</strong>
            <span style="color:${closed ? '#E5443A' : '#22C55E'};">${closed ? '⛔ Closed to fishing' : '✓ Open to fishing'}</span><br>
            <span style="color:#ccc;">Area: </span><span style="color:#888;">${area} km²</span><br>
            <span style="color:#666;font-style:italic;">${closed ? 'Click to reopen' : 'Click to close'}</span>
          </div>`
        ).addTo(map);
      };
      map.on('mouseenter', 'eez-fill', (e) => {
        if (!e.features?.length) return;
        const id = e.features[0].id as number;
        if (hoveredEezId !== null) map.setFeatureState({ source: 'eez-zones', id: hoveredEezId }, { hover: false });
        hoveredEezId = id;
        map.setFeatureState({ source: 'eez-zones', id }, { hover: true });
        showEezPopup(e);
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mousemove', 'eez-fill', (e) => { showEezPopup(e); });
      map.on('mouseleave', 'eez-fill', () => {
        if (hoveredEezId !== null) map.setFeatureState({ source: 'eez-zones', id: hoveredEezId }, { hover: false });
        hoveredEezId = null;
        eezPopup.remove();
        map.getCanvas().style.cursor = '';
      });
      map.on('click', 'eez-fill', (e) => {
        if (!e.features?.length) return;
        const name = e.features[0].properties?.name as string;
        useFishStore.getState().toggleClosure(name);
      });

      // ── Fishery zone click (decide phase only) ────────────────────────────
      map.on('mouseenter', 'fisheries-fill', () => {
        if (useFishStore.getState().phase === 'decide') {
          map.getCanvas().style.cursor = 'pointer';
        }
      });
      map.on('mouseleave', 'fisheries-fill', () => {
        if (useFishStore.getState().phase === 'decide') {
          map.getCanvas().style.cursor = '';
        }
      });
      map.on('click', 'fisheries-fill', (e) => {
        if (useFishStore.getState().phase !== 'decide') return;
        if (!e.features?.length) return;
        const zoneId = e.features[0].properties?.id as 'A' | 'B' | 'C';
        const store = useFishStore.getState();
        store.setSelectedZone(store.selectedZone === zoneId ? null : zoneId);
        e.originalEvent.stopPropagation();
      });

      const { selectedZone: initZone } = useFishStore.getState();
      applyState(map, closures, customClosureZone, isDecide, activeYear, mapLayer, scenario, initZone);
    });

    return () => { map.remove(); mapRef.current = null; readyRef.current = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Reactive: closures + heatmap + selectedZone ───────────────────────────
  useEffect(() => {
    if (!readyRef.current || !mapRef.current) return;
    applyState(mapRef.current, closures, customClosureZone, isDecide, activeYear, mapLayer, scenario, selectedZone);
  }, [closures, customClosureZone, isDecide, activeYear, mapLayer, scenario, selectedZone]);

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

  // ── Reactive: drawing zone ────────────────────────────────────────────────
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

  const legendInfo = LEGEND_INFO[mapLayer];
  const legendMaxColor = LAYER_MAX_HEX[mapLayer];

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

      {/* Drawing mode overlay */}
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

      {/* P2 — Colorimetric legend (decide phase only) */}
      {isDecide && (
        <div style={{
          position: 'absolute', bottom: 36, left: 12, zIndex: 10,
          background: 'rgba(10,20,40,0.82)', border: '1px solid var(--ink-500)',
          borderRadius: 'var(--radius-sm)', padding: '6px 10px', pointerEvents: 'none',
        }}>
          <div style={{
            fontFamily: 'var(--font-ui)', fontSize: 8, textTransform: 'uppercase',
            letterSpacing: '0.5px', color: 'var(--text-mid)', marginBottom: 4,
          }}>
            {legendInfo.label}
          </div>
          <div style={{
            width: 120, height: 12, borderRadius: 2,
            background: `linear-gradient(to right, #1a3a5c, ${legendMaxColor})`,
            marginBottom: 3,
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', width: 120 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-lo)' }}>{legendInfo.min}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-lo)' }}>{legendInfo.max}</span>
          </div>
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

      <LayerToggleRow label="Currents" on={layerCurrents} unavailable={false} onToggle={onToggleCurrents} />

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
  selectedZone: 'A' | 'B' | 'C' | null,
) {
  const eezFeatures: GeoJSON.Feature[] = EEZ_ZONES.map((z, idx) => ({
    type: 'Feature' as const,
    id: idx,
    properties: { name: z.name, closed: closures.includes(z.name), area_km2: z.area_km2 },
    geometry: z.geometry,
  }));
  (map.getSource('eez-zones') as maplibregl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: eezFeatures });

  const customFeatures: GeoJSON.Feature[] = customZone
    ? [{ type: 'Feature' as const, properties: { eez: 'custom' }, geometry: customZone }]
    : [];
  (map.getSource('closures') as maplibregl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: customFeatures });

  if (isDecide) {
    const heatFeatures: GeoJSON.Feature[] = FISHERY_FEATURES.map(f => ({
      ...f, properties: { ...f.properties, heatColor: heatColor(f.properties!.id as string, activeYear, mapLayer, scenario) },
    }));
    (map.getSource('heatmap') as maplibregl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: heatFeatures });

    // Feature-state dimming for selection
    const hasSelection = selectedZone !== null;
    FISHERY_FEATURES.forEach(f => {
      const zoneId = f.properties!.id as string;
      const dimmed = hasSelection && zoneId !== selectedZone;
      map.setFeatureState({ source: 'fisheries', id: zoneId }, { dimmed });
      map.setFeatureState({ source: 'heatmap', id: zoneId }, { dimmed });
    });

    // Selected zone glow source
    const selFeature = selectedZone
      ? FISHERY_FEATURES.find(f => f.properties?.id === selectedZone) ?? null
      : null;
    (map.getSource('fisheries-selected') as maplibregl.GeoJSONSource)?.setData({
      type: 'FeatureCollection', features: selFeature ? [selFeature] : [],
    });

    // Paint expressions using feature-state
    map.setPaintProperty('fisheries-fill', 'fill-opacity', [
      'case',
      ['boolean', ['feature-state', 'dimmed'], false], 0.01,
      ['case', ['boolean', ['feature-state', 'hover'], false], 0.20, 0.06],
    ]);
    map.setPaintProperty('heatmap-fill', 'fill-opacity', [
      'case', ['boolean', ['feature-state', 'dimmed'], false], 0.12, 0.45,
    ]);
    map.setPaintProperty('fisheries-outline', 'line-opacity', [
      'case', ['boolean', ['feature-state', 'dimmed'], false], 0.18, 0.85,
    ]);
    map.setPaintProperty('fisheries-outline-casing', 'line-opacity', [
      'case', ['boolean', ['feature-state', 'dimmed'], false], 0.08, 0.65,
    ]);
  } else {
    (map.getSource('heatmap') as maplibregl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: [] });
    (map.getSource('fisheries-selected') as maplibregl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: [] });
    map.setPaintProperty('fisheries-fill', 'fill-opacity', ['case', ['boolean', ['feature-state', 'hover'], false], 0.35, ['get', 'opacity']]);
    map.setPaintProperty('heatmap-fill', 'fill-opacity', 0);
    map.setPaintProperty('fisheries-outline', 'line-opacity', 0.85);
    map.setPaintProperty('fisheries-outline-casing', 'line-opacity', 0.65);
  }
}
