// TASK-08 — Local scenario persistence
const STORAGE_KEY = 'fishstock_scenarios';

export interface ScenarioParams {
  catchA: number;
  catchAMode: string;
  catchB: number;
  catchBMode: string;
  catchBPerYear: Record<string, number>;
  catchC: number;
  catchCMode: string;
  catchConcentration: string;
  closures: string[];
  climateScenario: string;
  climateModels: string[];
}

export interface ScenarioEntry {
  id: string;
  name: string;
  createdAt: string;
  params: ScenarioParams;
}

export function listScenarios(): ScenarioEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveScenario(name: string, params: ScenarioParams): ScenarioEntry {
  const scenarios = listScenarios();
  const entry: ScenarioEntry = {
    id: `sc_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    name,
    createdAt: new Date().toISOString(),
    params,
  };
  scenarios.push(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
  return entry;
}

export function loadScenario(id: string): ScenarioEntry | null {
  return listScenarios().find(s => s.id === id) ?? null;
}

export function deleteScenario(id: string): void {
  const scenarios = listScenarios().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
}
