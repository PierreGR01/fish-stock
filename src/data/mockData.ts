// Deterministic mock time series 2010–2099 (90 points)
// Uses sine functions — no Math.random

export const YEARS = Array.from({ length: 90 }, (_, i) => 2010 + i);
export const HISTORY_END = 15; // index of 2025 (last historical year)
export const YEAR_NOW_IDX = 16; // index of 2026

function wave(i: number, freq: number, phase: number): number {
  return Math.sin(i * freq + phase);
}

// ── Scenario A: declining ──────────────────────────────────────────────────
// Biomass A — starts ~100, declines to ~77 by 2055, ~55 by 2099
export const BIOMASS_A: number[] = YEARS.map((_, i) => {
  const base = 100;
  const hist = i <= HISTORY_END ? wave(i, 0.6, 0) * 5 + wave(i, 0.25, 1) * 3 : 0;
  const proj = i > HISTORY_END ? -0.68 * (i - HISTORY_END) + wave(i, 0.4, 0.5) * 4 : 0;
  return Math.max(10, base + hist + proj);
});

// Catch A — relatively flat with slight decline
export const CATCH_A: number[] = YEARS.map((_, i) => {
  const base = 42;
  const hist = i <= HISTORY_END ? wave(i, 0.8, 0.3) * 3 : 0;
  const proj = i > HISTORY_END ? -0.08 * (i - HISTORY_END) + wave(i, 0.5, 1) * 2.5 : 0;
  return Math.max(5, base + hist + proj);
});

// Recruitment A — most variable, declining
export const RECRUITMENT_A: number[] = YEARS.map((_, i) => {
  const base = 100;
  const hist = i <= HISTORY_END ? wave(i, 0.9, 0.7) * 8 + wave(i, 0.3, 2) * 5 : 0;
  const proj = i > HISTORY_END ? -0.45 * (i - HISTORY_END) + wave(i, 0.6, 1.2) * 7 : 0;
  return Math.max(5, base + hist + proj);
});

// Size distribution (schematic) — two regions, in decline scenario larger fish shrink
export const SIZE_DIST_A_R1: number[] = [2, 8, 18, 35, 28, 22, 14, 7, 3, 1].map(v => v + wave(v, 0.3, 0) * 1);
export const SIZE_DIST_A_R2: number[] = [3, 10, 22, 30, 26, 18, 10, 5, 2, 1].map(v => v + wave(v, 0.4, 1) * 1);

// ── Scenario B: recovering (lower catch C, more closures, lower IPCC) ─────
export const BIOMASS_B: number[] = YEARS.map((_, i) => {
  const base = 100;
  const hist = i <= HISTORY_END ? wave(i, 0.6, 0) * 5 + wave(i, 0.25, 1) * 3 : 0;
  const proj = i > HISTORY_END ? +0.38 * (i - HISTORY_END) + wave(i, 0.4, 0.5) * 4 - wave(i, 0.15, 0) * 2 : 0;
  return Math.max(10, base + hist + proj);
});

export const CATCH_B: number[] = YEARS.map((_, i) => {
  const base = 36;
  const hist = i <= HISTORY_END ? wave(i, 0.8, 0.3) * 3 : 0;
  const proj = i > HISTORY_END ? -0.02 * (i - HISTORY_END) + wave(i, 0.5, 1) * 2 : 0;
  return Math.max(5, base + hist + proj);
});

export const RECRUITMENT_B: number[] = YEARS.map((_, i) => {
  const base = 100;
  const hist = i <= HISTORY_END ? wave(i, 0.9, 0.7) * 8 + wave(i, 0.3, 2) * 5 : 0;
  const proj = i > HISTORY_END ? +0.15 * (i - HISTORY_END) + wave(i, 0.6, 1.2) * 6 : 0;
  return Math.max(10, base + hist + proj);
});

export const SIZE_DIST_B_R1: number[] = [1, 5, 14, 28, 32, 26, 18, 10, 5, 2].map(v => v + wave(v, 0.3, 0.5) * 1);
export const SIZE_DIST_B_R2: number[] = [1, 6, 16, 30, 30, 22, 15, 8, 4, 2].map(v => v + wave(v, 0.4, 1.5) * 1);

// ── Event markers ──────────────────────────────────────────────────────────
export const TIMELINE_EVENTS = [
  { year: 2028, label: 'climate step' },
  { year: 2046, label: 'critical threshold' },
  { year: 2055, label: 'quota horizon' },
];

// ── Verdict summary ───────────────────────────────────────────────────────
export const VERDICT_A = { trend: 'down', text: 'Stock in decline', detail: '−23% by 2055' };
export const VERDICT_B = { trend: 'up',   text: 'Stock recovering', detail: '+8% by 2055' };
