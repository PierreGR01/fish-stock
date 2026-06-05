import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { useFishStore } from '../../store/fishStore';

type TrailPoint = { lon: number; lat: number };
type Particle   = { lon: number; lat: number; age: number; trail: TrailPoint[] };

type CurrentGrid = {
  lats: number[];
  lons: number[];  // in 0–360
  u: number[][];   // u[iLat][iLon]
  v: number[][];   // v[iLat][iLon]
};

function dirToUV(speed: number, dir: number): [number, number] {
  const rad = (dir * Math.PI) / 180;
  return [speed * Math.sin(rad), speed * Math.cos(rad)];
}

async function fetchCurrentGrid(): Promise<CurrentGrid> {
  const lats = [-55, -40, -25, -10, 5, 20, 35, 50, 65];
  const lons360 = [110, 130, 150, 170, 190, 210, 230, 250, 270];
  const lonsApi = lons360.map(l => l > 180 ? l - 360 : l);

  const allLats: number[] = [];
  const allLons: number[] = [];
  for (const lat of lats) for (const lon of lonsApi) {
    allLats.push(lat);
    allLons.push(lon);
  }

  const url =
    `https://marine-api.open-meteo.com/v1/marine` +
    `?latitude=${allLats.join(',')}&longitude=${allLons.join(',')}` +
    `&hourly=ocean_current_velocity,ocean_current_direction` +
    `&forecast_days=1&timezone=UTC`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Open-Meteo ${resp.status}`);
  const json = await resp.json();

  const u: number[][] = lats.map(() => new Array(lons360.length).fill(0));
  const v: number[][] = lats.map(() => new Array(lons360.length).fill(0));

  let idx = 0;
  for (let iLat = 0; iLat < lats.length; iLat++) {
    for (let iLon = 0; iLon < lons360.length; iLon++) {
      const pt = Array.isArray(json) ? json[idx] : json;
      const speed = pt?.hourly?.ocean_current_velocity?.[0] ?? 0;
      const dir   = pt?.hourly?.ocean_current_direction?.[0] ?? 0;
      const [pu, pv] = dirToUV(speed, dir);
      u[iLat][iLon] = pu;
      v[iLat][iLon] = pv;
      idx++;
    }
  }

  return { lats, lons: lons360, u, v };
}

function bilinearUV(grid: CurrentGrid, lon360d: number, lat: number): [number, number] {
  const { lats, lons, u, v } = grid;

  const clampedLat = Math.max(lats[0], Math.min(lats[lats.length - 1], lat));
  const clampedLon = Math.max(lons[0], Math.min(lons[lons.length - 1], lon360d));

  let iLat = lats.findIndex(l => l >= clampedLat);
  if (iLat <= 0) iLat = 1;
  if (iLat >= lats.length) iLat = lats.length - 1;

  let iLon = lons.findIndex(l => l >= clampedLon);
  if (iLon <= 0) iLon = 1;
  if (iLon >= lons.length) iLon = lons.length - 1;

  const latFrac = (clampedLat - lats[iLat - 1]) / (lats[iLat] - lats[iLat - 1]);
  const lonFrac = (clampedLon - lons[iLon - 1]) / (lons[iLon] - lons[iLon - 1]);

  const interp = (field: number[][]): number => {
    const a = field[iLat - 1][iLon - 1];
    const b = field[iLat - 1][iLon];
    const c = field[iLat][iLon - 1];
    const d = field[iLat][iLon];
    return a * (1 - latFrac) * (1 - lonFrac)
         + b * (1 - latFrac) * lonFrac
         + c * latFrac * (1 - lonFrac)
         + d * latFrac * lonFrac;
  };

  return [interp(u), interp(v)];
}

// ── Static geographic land mask ────────────────────────────────────────────
const MASK_COLS = 90;
const MASK_ROWS = 42;

// [lonMin360, lonMax360, latMin, latMax]
const LAND_BOXES: [number, number, number, number][] = [
  [100, 123,  20,  65],  // China, Russian Far East
  [100, 117,   0,  25],  // SE Asia mainland
  [129, 146,  30,  46],  // Japan
  [126, 131,  34,  39],  // Korean Peninsula
  [117, 127,   5,  21],  // Philippines
  [100, 142, -11,   8],  // Indonesia, Borneo, Sumatra
  [140, 152, -10,   0],  // Papua New Guinea
  [113, 155, -39, -11],  // Australia
  [166, 179, -47, -34],  // New Zealand
  [193, 240,  54,  72],  // Alaska Peninsula
  [234, 275,  14,  72],  // North America (Pacific coast)
  [258, 275,   8,  22],  // Mexico & Central America
];

function buildLandMask(): Uint8Array {
  const mask = new Uint8Array(MASK_COLS * MASK_ROWS).fill(1);
  const lonRange = LON_MAX_360 - LON_MIN_360;
  const latRange = LAT_MAX - LAT_MIN;
  for (let row = 0; row < MASK_ROWS; row++) {
    for (let col = 0; col < MASK_COLS; col++) {
      const lon360d = LON_MIN_360 + (col + 0.5) / MASK_COLS * lonRange;
      const lat     = LAT_MAX    - (row + 0.5) / MASK_ROWS * latRange;
      if (LAND_BOXES.some(([l0, l1, la0, la1]) =>
        lon360d >= l0 && lon360d <= l1 && lat >= la0 && lat <= la1)
      ) {
        mask[row * MASK_COLS + col] = 0;
      }
    }
  }
  return mask;
}

function maskIsOcean(mask: Uint8Array, lon360d: number, lat: number): boolean {
  const col = Math.floor((lon360d - LON_MIN_360) / (LON_MAX_360 - LON_MIN_360) * MASK_COLS);
  const row = Math.floor((LAT_MAX - lat) / (LAT_MAX - LAT_MIN) * MASK_ROWS);
  const c = Math.max(0, Math.min(MASK_COLS - 1, col));
  const r = Math.max(0, Math.min(MASK_ROWS - 1, row));
  return mask[r * MASK_COLS + c] === 1;
}

// ── Constants ─────────────────────────────────────────────────────────────
const LON_MIN_360 = 100;
const LON_MAX_360 = 275;
const LAT_MIN = -60;
const LAT_MAX = 65;
const SPEED = 0.25;
const N_PARTICLES = 800;
// How long a particle lives (seconds). Long enough to build a full trail.
const MAX_AGE = 90;
// Number of geographic positions to keep in each particle's trail history.
const MAX_TRAIL = 90;
// Sample a trail position every N animation frames (avoids storing duplicates at 60 fps).
const TRAIL_SAMPLE = 2;

function lon360(lon: number): number {
  return lon < 0 ? lon + 360 : lon;
}

function normLon(lon: number): number {
  if (lon > 180) return lon - 360;
  if (lon < -180) return lon + 360;
  return lon;
}

// Synthetic fallback while the real grid is loading
function currentAt(lon360d: number, lat: number): [number, number] {
  const latR = lat * Math.PI / 180;
  const lonR = lon360d * Math.PI / 180;
  let u = -0.6 - 0.3 * Math.cos(2 * latR);
  if (lat > 5 && lat < 12) u += 1.4;
  if (lon360d > 140 && lon360d < 200 && lat > 20) u += 0.6;
  u += 0.15 * Math.sin(lonR * 3);
  let v = 0.25 * Math.sin(latR * 4) * Math.cos(lonR * 2);
  if (lon360d > 130 && lon360d < 160 && lat > 15) v += 0.5;
  if (lat < -10) v -= 0.2;
  return [u, v];
}

const OCEAN_MASK = buildLandMask();

function randomParticle(age?: number): Particle {
  for (let i = 0; i < 15; i++) {
    const lon360d = LON_MIN_360 + Math.random() * (LON_MAX_360 - LON_MIN_360);
    const lat = LAT_MIN + Math.random() * (LAT_MAX - LAT_MIN);
    if (!maskIsOcean(OCEAN_MASK, lon360d, lat)) continue;
    return { lon: normLon(lon360d), lat, age: age ?? Math.random() * MAX_AGE, trail: [] };
  }
  const lon360d = LON_MIN_360 + Math.random() * (LON_MAX_360 - LON_MIN_360);
  const lat = LAT_MIN + Math.random() * (LAT_MAX - LAT_MIN);
  return { lon: normLon(lon360d), lat, age: age ?? Math.random() * MAX_AGE, trail: [] };
}

function generateParticles(): Particle[] {
  return Array.from({ length: N_PARTICLES }, () => randomParticle());
}

interface Props {
  mapRef: React.RefObject<maplibregl.Map | null>;
}

export function CurrentsLayer({ mapRef }: Props) {
  const layerCurrents = useFishStore(s => s.layerCurrents);
  const visibleRef = useRef(layerCurrents);
  visibleRef.current = layerCurrents;

  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>(generateParticles());
  const gridRef      = useRef<CurrentGrid | null>(null);

  useEffect(() => {
    fetchCurrentGrid()
      .then(g => { gridRef.current = g; })
      .catch(() => { /* silent fallback to synthetic currents */ });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    const particles = particlesRef.current;
    let rafId = 0;
    let syncCb: (() => void) | null = null;
    let lastTime = 0;
    let frameCount = 0;

    const startAnimation = (map: maplibregl.Map) => {
      const syncSize = () => {
        const mc = map.getCanvas();
        const w = mc.offsetWidth;
        const h = mc.offsetHeight;
        if (w > 0 && h > 0) {
          // Setting canvas dimensions clears the canvas — that's fine because
          // we rebuild the full scene from geographic coordinates every frame.
          canvas.width  = w;
          canvas.height = h;
          canvas.style.width  = `${w}px`;
          canvas.style.height = `${h}px`;
          canvas.style.left = '0';
          canvas.style.top  = '0';
        }
      };

      syncCb = syncSize;
      syncSize();
      map.on('resize', syncSize);

      const animate = (time: number) => {
        const mc = map.getCanvas();
        const w = mc.offsetWidth;
        const h = mc.offsetHeight;
        if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
          canvas.width  = w;
          canvas.height = h;
          canvas.style.width  = `${w}px`;
          canvas.style.height = `${h}px`;
        }

        const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0;
        lastTime = time;

        // Always clear the full canvas. The scene is rebuilt every frame from
        // geographic coordinates, so pan/zoom never corrupts the trail.
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!visibleRef.current || canvas.width === 0 || canvas.height === 0) {
          rafId = requestAnimationFrame(animate);
          return;
        }

        ctx.globalCompositeOperation = 'source-over';

        for (const p of particles) {
          const l360cur = lon360(p.lon);

          // Reset immediately if on land
          if (!maskIsOcean(OCEAN_MASK, l360cur, p.lat)) {
            Object.assign(p, randomParticle(0));
            continue;
          }

          // Sample a geographic trail position every TRAIL_SAMPLE frames so the
          // stored history spans real distance rather than tiny sub-pixel moves.
          if (frameCount % TRAIL_SAMPLE === 0) {
            p.trail.push({ lon: p.lon, lat: p.lat });
            if (p.trail.length > MAX_TRAIL) p.trail.shift();
          }

          // Advect
          const [u, v] = gridRef.current
            ? bilinearUV(gridRef.current, l360cur, p.lat)
            : currentAt(l360cur, p.lat);

          p.lon = normLon(p.lon + u * SPEED * dt);
          p.lat += v * SPEED * dt;
          p.age += dt;

          // Reset if out of bounds or too old
          const l360 = lon360(p.lon);
          if (l360 > LON_MAX_360 || l360 < LON_MIN_360 || p.lat > LAT_MAX || p.lat < LAT_MIN || p.age > MAX_AGE) {
            Object.assign(p, randomParticle(0));
            continue;
          }

          // Fade in at birth, fade out near death
          const lifeRatio = p.age / MAX_AGE;
          const lifeAlpha = lifeRatio < 0.05
            ? lifeRatio / 0.05
            : lifeRatio > 0.88
              ? (1 - lifeRatio) / 0.12
              : 1;

          // ── Draw trail (geographic history → re-project each frame) ──────
          // Oldest point has low alpha, newest has high alpha.
          const tLen = p.trail.length;
          for (let ti = 0; ti < tLen; ti++) {
            const tp = p.trail[ti];
            // ti=0 is oldest; ramp from 0.03 to 0.65
            const trailRatio = (ti + 1) / tLen;
            const trailAlpha = (0.03 + trailRatio * 0.62) * lifeAlpha;

            for (const wlon of [tp.lon, tp.lon - 360, tp.lon + 360]) {
              const px = map.project([wlon, tp.lat]);
              if (px.x < -4 || px.x > canvas.width + 4) continue;
              if (px.y < -4 || px.y > canvas.height + 4) continue;
              ctx.globalAlpha = trailAlpha;
              ctx.fillStyle = '#7EC8E3';
              // fillRect is ~3× faster than arc for small dots
              ctx.fillRect(px.x - 0.5, px.y - 0.5, 1, 1);
            }
          }

          // ── Draw particle head (brighter, slightly larger) ───────────────
          for (const wlon of [p.lon, p.lon - 360, p.lon + 360]) {
            const px = map.project([wlon, p.lat]);
            if (px.x < -3 || px.x > canvas.width + 3) continue;
            if (px.y < -3 || px.y > canvas.height + 3) continue;
            ctx.globalAlpha = lifeAlpha * 0.95;
            ctx.fillStyle = '#D4F0FF';
            ctx.beginPath();
            ctx.arc(px.x, px.y, 1.1, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.globalAlpha = 1;
        frameCount++;
        rafId = requestAnimationFrame(animate);
      };

      rafId = requestAnimationFrame(animate);
    };

    const pollId = setInterval(() => {
      const map = mapRef.current;
      if (map) {
        clearInterval(pollId);
        startAnimation(map);
      }
    }, 50);

    return () => {
      clearInterval(pollId);
      cancelAnimationFrame(rafId);
      const map = mapRef.current;
      if (map && syncCb) map.off('resize', syncCb);
      lastTime = 0;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', pointerEvents: 'none', zIndex: 1 }}
    />
  );
}
