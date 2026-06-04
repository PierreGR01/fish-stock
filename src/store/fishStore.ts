import { create } from 'zustand';
import {
  listScenarios, saveScenario, loadScenario, deleteScenario,
} from '../services/scenarioStorage';
import type { ScenarioEntry } from '../services/scenarioStorage';

export type Phase = 'configure' | 'simulate' | 'decide';
export type CatchMode = 'constant' | 'per-year' | 'increasing' | 'decreasing';
export type Level = 'low' | 'medium' | 'high';
export type MapLayer = 'biomass' | 'catch' | 'recruitment';
export type ScenarioId = 'A' | 'B';

// TASK-17 — Scientifically improved simulation messages
const SIM_MESSAGES = [
  'Initialising SEAPODYM spatial domain over the tropical Pacific (100°E–80°W, 30°N–30°S)…',
  'Computing skipjack larvae drift under CMEMS surface current climatology for 2026–2055…',
  'Estimating bigeye tuna recruitment rates under projected SST anomaly (+0.8°C by 2035)…',
  'Integrating fishing pressure from the three super-fisheries and configured EEZ closures…',
  'Applying IPCC Earth-System Model ensemble to adjust habitat suitability maps over 73-year window…',
  'Resolving age-structured population dynamics: linking recruitment, growth, and natural mortality…',
  'Aggregating spatial biomass indices by fishery zone and calibrating to 2010–2025 historical catch…',
  'Finalising size-distribution forecasts and computing critical-threshold crossing probabilities…',
];

export const EEZ_LIST = ['Kiribati (PIPA)', 'Nauru EEZ', 'Tuvalu EEZ', 'Tokelau EEZ'];
export const ESM_MODELS = ['IPSL', 'GFDL', 'MPI', 'NORESM'];

export const YEAR_MIN = 2010;
export const YEAR_NOW = 2026;
export const YEAR_MAX = 2099;

export type CustomZone = { type: 'Polygon'; coordinates: [number, number][][] } | null;

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
  customClosureZone: CustomZone;
  climateScenario: Level;
  climateModels: string[];

  // — Map data layers (TASK-01/03) ————————————
  layerSST: boolean;
  layerCurrents: boolean;
  layerPlankton: boolean;

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

  // — Saved scenarios (TASK-08) ——————————————
  savedScenarios: ScenarioEntry[];

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
  setCustomClosureZone: (zone: CustomZone) => void;
  setClimateScenario: (c: Level) => void;
  toggleClimateModel: (m: string) => void;

  setLayerSST: (v: boolean) => void;
  setLayerCurrents: (v: boolean) => void;
  setLayerPlankton: (v: boolean) => void;

  launchSimulation: () => void;
  cancelSimulation: () => void;
  tickSimulation: () => void;

  setActiveYear: (y: number) => void;
  setPlaying: (v: boolean) => void;
  setPlaySpeed: (s: 1 | 2 | 4) => void;
  setMapLayer: (l: MapLayer) => void;
  setComparisonMode: (v: boolean) => void;
  setMapScenario: (s: ScenarioId) => void;

  saveCurrentScenario: (name: string) => void;
  loadSavedScenario: (id: string) => void;
  deleteSavedScenario: (id: string) => void;
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
  customClosureZone: null,
  climateScenario: 'medium',
  climateModels: ['IPSL', 'GFDL'],

  layerSST: true,
  layerCurrents: true,
  layerPlankton: false,

  simProgress: 0,
  simPhaseIdx: 0,
  simMessageIdx: 0,

  activeYear: 2042,
  playing: false,
  playSpeed: 1,
  mapLayer: 'biomass',
  comparisonMode: false,
  mapScenario: 'A',

  savedScenarios: listScenarios(),

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
  setCustomClosureZone: (zone) => set({ customClosureZone: zone }),
  setClimateScenario: (c) => set({ climateScenario: c }),
  toggleClimateModel: (m) => set((s) => ({
    climateModels: s.climateModels.includes(m) ? s.climateModels.filter(x => x !== m) : [...s.climateModels, m],
  })),

  setLayerSST: (v) => set({ layerSST: v }),
  setLayerCurrents: (v) => set({ layerCurrents: v }),
  setLayerPlankton: (v) => set({ layerPlankton: v }),

  launchSimulation: () => set({
    phase: 'simulate',
    simProgress: 0,
    simPhaseIdx: 0,
    simMessageIdx: 0,
  }),

  cancelSimulation: () => set({ phase: 'configure', simProgress: 0, simPhaseIdx: 0 }),

  tickSimulation: () => {
    const s = get();
    const nextProgress = Math.min(100, s.simProgress + 0.6);
    const nextPhaseIdx = nextProgress < 20 ? 0 : nextProgress < 70 ? 1 : nextProgress < 100 ? 2 : 3;

    if (nextProgress >= 100) {
      set({ simProgress: 100, simPhaseIdx: 3, phase: 'decide', activeYear: YEAR_NOW });
    } else {
      set({ simProgress: nextProgress, simPhaseIdx: nextPhaseIdx });
    }
  },

  setActiveYear: (y) => set({ activeYear: Math.max(YEAR_MIN, Math.min(YEAR_MAX, y)) }),
  setPlaying: (v) => set({ playing: v }),
  setPlaySpeed: (s) => set({ playSpeed: s }),
  setMapLayer: (l) => set({ mapLayer: l }),
  setComparisonMode: (v) => set({ comparisonMode: v }),
  setMapScenario: (s) => set({ mapScenario: s }),

  saveCurrentScenario: (name) => {
    const s = get();
    const entry = saveScenario(name, {
      catchA: s.catchA, catchAMode: s.catchAMode,
      catchB: s.catchB, catchBMode: s.catchBMode,
      catchBPerYear: s.catchBPerYear,
      catchC: s.catchC, catchCMode: s.catchCMode,
      catchConcentration: s.catchConcentration,
      closures: s.closures,
      climateScenario: s.climateScenario,
      climateModels: s.climateModels,
    });
    set({ savedScenarios: [...s.savedScenarios, entry] });
  },

  loadSavedScenario: (id) => {
    const entry = loadScenario(id);
    if (!entry) return;
    const p = entry.params;
    set({
      catchA: p.catchA, catchAMode: p.catchAMode as CatchMode,
      catchB: p.catchB, catchBMode: p.catchBMode as CatchMode,
      catchBPerYear: p.catchBPerYear,
      catchC: p.catchC, catchCMode: p.catchCMode as CatchMode,
      catchConcentration: p.catchConcentration as Level,
      closures: p.closures,
      climateScenario: p.climateScenario as Level,
      climateModels: p.climateModels,
    });
  },

  deleteSavedScenario: (id) => {
    deleteScenario(id);
    set((s) => ({ savedScenarios: s.savedScenarios.filter(x => x.id !== id) }));
  },
}));

export { SIM_MESSAGES };
export type { ScenarioEntry };
