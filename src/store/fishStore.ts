import { create } from 'zustand';

export type Phase = 'configure' | 'simulate' | 'decide';
export type CatchMode = 'constant' | 'per-year' | 'increasing' | 'decreasing';
export type Level = 'low' | 'medium' | 'high';
export type MapLayer = 'biomass' | 'catch' | 'recruitment';
export type ScenarioId = 'A' | 'B';

const SIM_MESSAGES = [
  'The model is computing the drift of skipjack larvae under the surface currents of the tropical Pacific…',
  'Estimating bigeye tuna recruitment rates under the projected SST anomaly for 2030–2035…',
  'Integrating catch pressure from the three super-fisheries over the 30-year projection window…',
  'Applying IPCC SSP2-4.5 sea-surface warming to adjust habitat suitability maps…',
  'Aggregating spatial results into annual biomass indices for each fishery zone…',
];

export const EEZ_LIST = ['Kiribati (PIPA)', 'Nauru EEZ', 'Tuvalu EEZ', 'Tokelau EEZ'];
export const ESM_MODELS = ['IPSL', 'GFDL', 'MPI', 'NORESM'];

export const YEAR_MIN = 2010;
export const YEAR_NOW = 2026;
export const YEAR_MAX = 2099;

interface FishState {
  phase: Phase;
  onboardingDismissed: boolean;

  // — Configure ——————————————————————————————
  catchA: number;
  catchAMode: CatchMode;
  catchB: number;
  catchBMode: CatchMode;
  catchBPerYear: Record<string, number>;
  catchC: number;
  catchCMode: CatchMode;
  catchConcentration: Level;
  closures: string[];
  drawingZone: boolean;
  climateScenario: Level;
  climateModels: string[];

  // — Simulate ———————————————————————————————
  simProgress: number;
  simPhaseIdx: number;
  simMessageIdx: number;

  // — Decide ————————————————————————————————
  activeYear: number;
  playing: boolean;
  playSpeed: 1 | 2 | 4;
  mapLayer: MapLayer;
  comparisonMode: boolean;
  mapScenario: ScenarioId;

  // — Actions ————————————————————————————————
  dismissOnboarding: () => void;
  setPhase: (p: Phase) => void;

  setCatchA: (v: number) => void;
  setCatchAMode: (m: CatchMode) => void;
  setCatchB: (v: number) => void;
  setCatchBMode: (m: CatchMode) => void;
  setCatchBPerYear: (year: string, v: number) => void;
  setCatchC: (v: number) => void;
  setCatchCMode: (m: CatchMode) => void;
  setCatchConcentration: (c: Level) => void;
  toggleClosure: (eez: string) => void;
  setDrawingZone: (v: boolean) => void;
  setClimateScenario: (c: Level) => void;
  toggleClimateModel: (m: string) => void;

  launchSimulation: () => void;
  cancelSimulation: () => void;
  tickSimulation: () => void;

  setActiveYear: (y: number) => void;
  setPlaying: (v: boolean) => void;
  setPlaySpeed: (s: 1 | 2 | 4) => void;
  setMapLayer: (l: MapLayer) => void;
  setComparisonMode: (v: boolean) => void;
  setMapScenario: (s: ScenarioId) => void;
}

export const useFishStore = create<FishState>((set, get) => ({
  phase: 'configure',
  onboardingDismissed: false,

  catchA: 42000,
  catchAMode: 'constant',
  catchB: 0,
  catchBMode: 'per-year',
  catchBPerYear: { '2026': 35000, '2027': 37500, '2028': 36000, '2029': 40000, '2030': 38500, '2031': 42000 },
  catchC: 28500,
  catchCMode: 'decreasing',
  catchConcentration: 'medium',
  closures: [],
  drawingZone: false,
  climateScenario: 'medium',
  climateModels: ['IPSL', 'GFDL'],

  simProgress: 0,
  simPhaseIdx: 0,
  simMessageIdx: 0,

  activeYear: 2042,
  playing: false,
  playSpeed: 1,
  mapLayer: 'biomass',
  comparisonMode: false,
  mapScenario: 'A',

  dismissOnboarding: () => set({ onboardingDismissed: true }),
  setPhase: (phase) => set({ phase }),

  setCatchA: (v) => set({ catchA: v }),
  setCatchAMode: (m) => set({ catchAMode: m }),
  setCatchB: (v) => set({ catchB: v }),
  setCatchBMode: (m) => set({ catchBMode: m }),
  setCatchBPerYear: (year, v) => set((s) => ({ catchBPerYear: { ...s.catchBPerYear, [year]: v } })),
  setCatchC: (v) => set({ catchC: v }),
  setCatchCMode: (m) => set({ catchCMode: m }),
  setCatchConcentration: (c) => set({ catchConcentration: c }),
  toggleClosure: (eez) => set((s) => ({
    closures: s.closures.includes(eez) ? s.closures.filter(e => e !== eez) : [...s.closures, eez],
  })),
  setDrawingZone: (v) => set({ drawingZone: v }),
  setClimateScenario: (c) => set({ climateScenario: c }),
  toggleClimateModel: (m) => set((s) => ({
    climateModels: s.climateModels.includes(m) ? s.climateModels.filter(x => x !== m) : [...s.climateModels, m],
  })),

  launchSimulation: () => set({
    phase: 'simulate',
    simProgress: 0,
    simPhaseIdx: 0,
    simMessageIdx: 0,
  }),

  cancelSimulation: () => set({ phase: 'configure', simProgress: 0, simPhaseIdx: 0 }),

  tickSimulation: () => {
    const s = get();
    const nextProgress = Math.min(100, s.simProgress + 0.8);
    const nextPhaseIdx = nextProgress < 20 ? 0 : nextProgress < 70 ? 1 : nextProgress < 100 ? 2 : 3;
    const nextMsgIdx = (s.simMessageIdx + 1) % SIM_MESSAGES.length;

    if (nextProgress >= 100) {
      set({ simProgress: 100, simPhaseIdx: 3, phase: 'decide', activeYear: YEAR_NOW });
    } else {
      set({ simProgress: nextProgress, simPhaseIdx: nextPhaseIdx });
    }
    return nextMsgIdx;
  },

  setActiveYear: (y) => set({ activeYear: Math.max(YEAR_MIN, Math.min(YEAR_MAX, y)) }),
  setPlaying: (v) => set({ playing: v }),
  setPlaySpeed: (s) => set({ playSpeed: s }),
  setMapLayer: (l) => set({ mapLayer: l }),
  setComparisonMode: (v) => set({ comparisonMode: v }),
  setMapScenario: (s) => set({ mapScenario: s }),
}));

export { SIM_MESSAGES };
