import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppData,
  AppSettings,
  Formula,
  FormulaLine,
  Ingredient,
  UUID,
} from '../types/models';
import { SCHEMA_VERSION } from '../types/models';
import { seedFormula, seedIngredients } from '../lib/seed';

const uuid = (): UUID =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;

export const defaultSettings: AppSettings = {
  currency: '€',
  defaultUnit: 'grams',
  defaultGramsPerDrop: 0.02,
  theme: 'light',
};

interface StoreState {
  ingredients: Ingredient[];
  formulas: Formula[];
  settings: AppSettings;

  // Ingredients CRUD
  addIngredient: (data: Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'>) => Ingredient;
  updateIngredient: (id: UUID, patch: Partial<Ingredient>) => void;
  deleteIngredient: (id: UUID) => void;
  ingredientUsageCount: (id: UUID) => number;

  // Formulas CRUD
  addFormula: (partial?: Partial<Formula>) => Formula;
  updateFormula: (id: UUID, patch: Partial<Formula>) => void;
  replaceFormula: (formula: Formula) => void;
  deleteFormula: (id: UUID) => void;
  duplicateFormula: (id: UUID) => Formula | undefined;

  // Formula line helpers
  addLine: (formulaId: UUID, line: Omit<FormulaLine, 'id'>) => void;
  updateLine: (formulaId: UUID, lineId: UUID, patch: Partial<FormulaLine>) => void;
  removeLine: (formulaId: UUID, lineId: UUID) => void;
  moveLine: (formulaId: UUID, lineId: UUID, dir: -1 | 1) => void;

  // Settings
  updateSettings: (patch: Partial<AppSettings>) => void;

  // Bulk / IO
  loadSeed: () => void;
  clearAll: () => void;
  exportData: () => AppData;
  replaceAll: (data: AppData) => void;
  mergeData: (data: AppData) => void;
}

function now(): string {
  return new Date().toISOString();
}

/** Keep the record with the newer updatedAt when merging by id. */
function mergeById<T extends { id: UUID; updatedAt?: string }>(existing: T[], incoming: T[]): T[] {
  const map = new Map<UUID, T>();
  for (const item of existing) map.set(item.id, item);
  for (const item of incoming) {
    const prev = map.get(item.id);
    if (!prev) {
      map.set(item.id, item);
    } else {
      const prevTime = Date.parse(prev.updatedAt ?? '') || 0;
      const nextTime = Date.parse(item.updatedAt ?? '') || 0;
      map.set(item.id, nextTime >= prevTime ? item : prev);
    }
  }
  return [...map.values()];
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ingredients: [],
      formulas: [],
      settings: defaultSettings,

      addIngredient: (data) => {
        const ingredient: Ingredient = {
          ...data,
          id: uuid(),
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ ingredients: [...s.ingredients, ingredient] }));
        return ingredient;
      },

      updateIngredient: (id, patch) =>
        set((s) => ({
          ingredients: s.ingredients.map((i) =>
            i.id === id ? { ...i, ...patch, id: i.id, updatedAt: now() } : i,
          ),
        })),

      deleteIngredient: (id) =>
        set((s) => ({ ingredients: s.ingredients.filter((i) => i.id !== id) })),

      ingredientUsageCount: (id) =>
        get().formulas.reduce(
          (acc, f) => acc + f.lines.filter((l) => l.ingredientId === id).length,
          0,
        ),

      addFormula: (partial) => {
        const formula: Formula = {
          id: uuid(),
          name: partial?.name ?? 'Neue Rezeptur',
          description: partial?.description,
          unit: partial?.unit ?? get().settings.defaultUnit,
          gramsPerDrop: partial?.gramsPerDrop ?? get().settings.defaultGramsPerDrop,
          targetConcentration: partial?.targetConcentration ?? 20,
          batchSizeGrams: partial?.batchSizeGrams ?? 100,
          lines: partial?.lines ?? [],
          version: partial?.version ?? 1,
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ formulas: [...s.formulas, formula] }));
        return formula;
      },

      updateFormula: (id, patch) =>
        set((s) => ({
          formulas: s.formulas.map((f) =>
            f.id === id ? { ...f, ...patch, id: f.id, updatedAt: now() } : f,
          ),
        })),

      replaceFormula: (formula) =>
        set((s) => ({
          formulas: s.formulas.map((f) => (f.id === formula.id ? formula : f)),
        })),

      deleteFormula: (id) => set((s) => ({ formulas: s.formulas.filter((f) => f.id !== id) })),

      duplicateFormula: (id) => {
        const src = get().formulas.find((f) => f.id === id);
        if (!src) return undefined;
        const copy: Formula = {
          ...src,
          id: uuid(),
          name: `${src.name} (Kopie)`,
          version: 1,
          createdAt: now(),
          updatedAt: now(),
          lines: src.lines.map((l) => ({ ...l, id: uuid() })),
        };
        set((s) => ({ formulas: [...s.formulas, copy] }));
        return copy;
      },

      addLine: (formulaId, line) =>
        set((s) => ({
          formulas: s.formulas.map((f) =>
            f.id === formulaId
              ? { ...f, lines: [...f.lines, { ...line, id: uuid() }], updatedAt: now() }
              : f,
          ),
        })),

      updateLine: (formulaId, lineId, patch) =>
        set((s) => ({
          formulas: s.formulas.map((f) =>
            f.id === formulaId
              ? {
                  ...f,
                  lines: f.lines.map((l) => (l.id === lineId ? { ...l, ...patch, id: l.id } : l)),
                  updatedAt: now(),
                }
              : f,
          ),
        })),

      removeLine: (formulaId, lineId) =>
        set((s) => ({
          formulas: s.formulas.map((f) =>
            f.id === formulaId
              ? { ...f, lines: f.lines.filter((l) => l.id !== lineId), updatedAt: now() }
              : f,
          ),
        })),

      moveLine: (formulaId, lineId, dir) =>
        set((s) => ({
          formulas: s.formulas.map((f) => {
            if (f.id !== formulaId) return f;
            const idx = f.lines.findIndex((l) => l.id === lineId);
            const target = idx + dir;
            if (idx < 0 || target < 0 || target >= f.lines.length) return f;
            const lines = [...f.lines];
            [lines[idx], lines[target]] = [lines[target], lines[idx]];
            return { ...f, lines, updatedAt: now() };
          }),
        })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      loadSeed: () =>
        set((s) => ({
          ingredients: mergeById(s.ingredients, seedIngredients()),
          formulas: mergeById(s.formulas, [seedFormula()]),
        })),

      clearAll: () => set({ ingredients: [], formulas: [], settings: defaultSettings }),

      exportData: () => ({
        schemaVersion: SCHEMA_VERSION,
        exportedAt: now(),
        ingredients: get().ingredients,
        formulas: get().formulas,
        settings: get().settings,
      }),

      replaceAll: (data) =>
        set({
          ingredients: data.ingredients,
          formulas: data.formulas,
          settings: { ...defaultSettings, ...data.settings },
        }),

      mergeData: (data) =>
        set((s) => ({
          ingredients: mergeById(s.ingredients, data.ingredients),
          formulas: mergeById(s.formulas, data.formulas),
          settings: { ...s.settings, ...data.settings },
        })),
    }),
    {
      name: 'perfume-formulator-v1',
      partialize: (s) => ({
        ingredients: s.ingredients,
        formulas: s.formulas,
        settings: s.settings,
      }),
    },
  ),
);

/** Selector helper: ingredients keyed by id, for the calc engine. */
export function selectIngredientsById(state: StoreState): Record<UUID, Ingredient> {
  return Object.fromEntries(state.ingredients.map((i) => [i.id, i]));
}
