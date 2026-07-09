import { describe, it, expect } from 'vitest';
import { parseAppData } from './jsonIO';
import { seedFormula, seedIngredients } from './seed';
import { SCHEMA_VERSION } from '../types/models';
import type { AppData } from '../types/models';

function fullData(): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: '2026-07-09T00:00:00.000Z',
    ingredients: seedIngredients(),
    formulas: [seedFormula()],
    settings: { currency: '€', defaultUnit: 'grams', defaultGramsPerDrop: 0.02, theme: 'light' },
  };
}

describe('jsonIO — round trip', () => {
  it('export → parse restores the same ingredients and formulas', () => {
    const data = fullData();
    const { data: restored, warnings } = parseAppData(JSON.stringify(data));
    expect(restored.ingredients.length).toBe(data.ingredients.length);
    expect(restored.formulas.length).toBe(1);
    expect(restored.formulas[0].lines.length).toBe(data.formulas[0].lines.length);
    expect(restored.settings.currency).toBe('€');
    expect(warnings).toHaveLength(0);
  });
});

describe('jsonIO — validation & defaults', () => {
  it('throws on invalid JSON', () => {
    expect(() => parseAppData('{not json')).toThrow();
  });

  it('throws when neither ingredients nor formulas present', () => {
    expect(() => parseAppData(JSON.stringify({ schemaVersion: 1 }))).toThrow();
  });

  it('drops ingredients without a name, fills defaults', () => {
    const raw = {
      schemaVersion: 1,
      ingredients: [
        { id: 'a', name: 'Valid' },
        { id: 'b' }, // no name → dropped
      ],
      formulas: [],
    };
    const { data } = parseAppData(JSON.stringify(raw));
    expect(data.ingredients).toHaveLength(1);
    expect(data.ingredients[0].defaultDilution).toBe(100); // default filled
    expect(data.ingredients[0].noteTier).toBe('heart'); // default filled
  });

  it('coerces invalid enum values to defaults', () => {
    const raw = {
      ingredients: [{ id: 'a', name: 'X', noteTier: 'nonsense' }],
      formulas: [{ id: 'f', name: 'F', unit: 'bogus', lines: [] }],
    };
    const { data } = parseAppData(JSON.stringify(raw));
    expect(data.ingredients[0].noteTier).toBe('heart');
    expect(data.formulas[0].unit).toBe('grams');
  });
});

describe('jsonIO — migration & integrity', () => {
  it('bumps an older schemaVersion up to current', () => {
    const raw = { schemaVersion: 0, ingredients: [{ id: 'a', name: 'X' }], formulas: [] };
    const { data } = parseAppData(JSON.stringify(raw));
    expect(data.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('warns about lines referencing missing ingredients', () => {
    const raw = {
      ingredients: [{ id: 'a', name: 'X' }],
      formulas: [
        {
          id: 'f',
          name: 'F',
          unit: 'grams',
          lines: [
            { id: 'l1', ingredientId: 'a', amount: 1, dilution: 100 },
            { id: 'l2', ingredientId: 'ghost', amount: 1, dilution: 100 },
          ],
        },
      ],
    };
    const { warnings } = parseAppData(JSON.stringify(raw));
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toMatch(/1 /);
  });
});
