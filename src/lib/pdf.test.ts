import { describe, it, expect, vi } from 'vitest';
import { seedFormula, seedIngredients } from './seed';
import type { AppSettings, UUID, Ingredient } from '../types/models';

const settings: AppSettings = {
  currency: '€',
  defaultUnit: 'grams',
  defaultGramsPerDrop: 0.02,
  theme: 'light',
};

const byId = (arr: Ingredient[]): Record<UUID, Ingredient> =>
  Object.fromEntries(arr.map((i) => [i.id, i]));

describe('pdf export', () => {
  it('builds and "saves" a formula PDF without throwing', async () => {
    // jsPDF's save() ultimately triggers a browser download; stub the sink.
    const urlAny = URL as unknown as { createObjectURL?: unknown; revokeObjectURL?: unknown };
    urlAny.createObjectURL = vi.fn(() => 'blob:mock');
    urlAny.revokeObjectURL = vi.fn();
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    const { exportFormulaToPdf } = await import('./pdf');
    expect(() =>
      exportFormulaToPdf(seedFormula(), byId(seedIngredients()), settings),
    ).not.toThrow();

    clickSpy.mockRestore();
  });

  it('handles a formula with unknown ingredients and empty lines', async () => {
    const { exportFormulaToPdf } = await import('./pdf');
    const f = { ...seedFormula(), lines: [{ id: 'x', ingredientId: 'ghost', amount: 5, dilution: 100 }] };
    expect(() => exportFormulaToPdf(f, {}, settings)).not.toThrow();

    const empty = { ...seedFormula(), lines: [] };
    expect(() => exportFormulaToPdf(empty, {}, settings)).not.toThrow();
  });
});
