import { useSyncExternalStore } from "react";
import {
  DEFAULT_HEADCOUNT,
  DEFAULT_SCENARIOS,
  defaultBudget,
  type Budget,
  type HeadcountRow,
  type Scenario,
} from "./engine";

/**
 * FP&A state is deliberately backend-free: everything lives in one external
 * store, mirrored to localStorage so a planning session survives a refresh.
 */
export type FpaState = {
  scenarios: Scenario[];
  activeScenarioId: string;
  compareScenarioId: string;
  headcount: HeadcountRow[];
  budget: Budget;
};

const KEY = "fpa-workspace-v1";

function initial(): FpaState {
  return {
    scenarios: DEFAULT_SCENARIOS.map((s) => ({ ...s, assumptions: { ...s.assumptions } })),
    activeScenarioId: "base",
    compareScenarioId: "downside",
    headcount: DEFAULT_HEADCOUNT.map((h) => ({ ...h })),
    budget: defaultBudget(),
  };
}

let state: FpaState = initial();
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = { ...state, ...(JSON.parse(raw) as FpaState) };
  } catch {
    /* corrupt payload — keep the defaults */
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota or private mode — planning still works in memory */
  }
}

function set(next: Partial<FpaState>) {
  state = { ...state, ...next };
  persist();
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  hydrate();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const getSnapshot = () => state;
const getServerSnapshot = () => state;

export function useFpa(): FpaState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export const fpa = {
  get: () => state,
  setActive: (id: string) => set({ activeScenarioId: id }),
  setCompare: (id: string) => set({ compareScenarioId: id }),
  updateScenario(id: string, patch: Partial<Scenario>) {
    set({ scenarios: state.scenarios.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  },
  updateAssumption(id: string, key: string, value: number) {
    set({
      scenarios: state.scenarios.map((s) =>
        s.id === id ? { ...s, assumptions: { ...s.assumptions, [key]: value } } : s,
      ),
    });
  },
  addScenario(from: Scenario, name: string) {
    const id = `sc-${Date.now().toString(36)}`;
    set({
      scenarios: [
        ...state.scenarios,
        { id, name, description: `Cloned from ${from.name}`, color: "var(--accent-cyan)", assumptions: { ...from.assumptions } },
      ],
      activeScenarioId: id,
    });
    return id;
  },
  removeScenario(id: string) {
    if (state.scenarios.length <= 1) return;
    const scenarios = state.scenarios.filter((s) => s.id !== id);
    set({
      scenarios,
      activeScenarioId: state.activeScenarioId === id ? scenarios[0]!.id : state.activeScenarioId,
      compareScenarioId: state.compareScenarioId === id ? scenarios[0]!.id : state.compareScenarioId,
    });
  },
  setHeadcount(rows: HeadcountRow[]) {
    set({ headcount: rows });
  },
  setBudgetCell(lineKey: string, monthKey: string, value: number) {
    set({
      budget: { ...state.budget, [lineKey]: { ...(state.budget[lineKey] ?? {}), [monthKey]: value } },
    });
  },
  setBudgetRow(lineKey: string, values: Record<string, number>) {
    set({ budget: { ...state.budget, [lineKey]: values } });
  },
  resetAll() {
    state = initial();
    persist();
    for (const l of listeners) l();
  },
};

export function activeScenario(s: FpaState) {
  return s.scenarios.find((x) => x.id === s.activeScenarioId) ?? s.scenarios[0]!;
}

export function compareScenario(s: FpaState) {
  return s.scenarios.find((x) => x.id === s.compareScenarioId) ?? s.scenarios[0]!;
}
