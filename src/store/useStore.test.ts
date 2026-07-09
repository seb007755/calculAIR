import { describe, it, expect, beforeEach } from 'vitest';
import { useStore, defaultSettings } from './useStore';
import { SCHEMA_VERSION } from '../types/models';

const reset = () =>
  useStore.setState({ ingredients: [], formulas: [], settings: { ...defaultSettings } });

beforeEach(reset);

describe('store — ingredients', () => {
  it('addIngredient assigns id + timestamps', () => {
    const ing = useStore.getState().addIngredient({
      name: 'Iso E',
      noteTier: 'base',
      defaultDilution: 100,
    });
    expect(ing.id).toBeTruthy();
    expect(ing.createdAt).toBeTruthy();
    expect(useStore.getState().ingredients).toHaveLength(1);
  });

  it('updateIngredient patches and keeps id', () => {
    const ing = useStore.getState().addIngredient({ name: 'A', noteTier: 'top', defaultDilution: 100 });
    useStore.getState().updateIngredient(ing.id, { name: 'B' });
    const updated = useStore.getState().ingredients[0];
    expect(updated.id).toBe(ing.id);
    expect(updated.name).toBe('B');
  });

  it('ingredientUsageCount counts across formula lines', () => {
    const ing = useStore.getState().addIngredient({ name: 'A', noteTier: 'top', defaultDilution: 100 });
    const f = useStore.getState().addFormula({ name: 'F', unit: 'grams' });
    useStore.getState().addLine(f.id, { ingredientId: ing.id, amount: 1, dilution: 100 });
    useStore.getState().addLine(f.id, { ingredientId: ing.id, amount: 2, dilution: 100 });
    expect(useStore.getState().ingredientUsageCount(ing.id)).toBe(2);
  });

  it('deleteIngredient removes it', () => {
    const ing = useStore.getState().addIngredient({ name: 'A', noteTier: 'top', defaultDilution: 100 });
    useStore.getState().deleteIngredient(ing.id);
    expect(useStore.getState().ingredients).toHaveLength(0);
  });
});

describe('store — formulas', () => {
  it('addFormula uses defaults from settings', () => {
    const f = useStore.getState().addFormula();
    expect(f.unit).toBe(defaultSettings.defaultUnit);
    expect(f.version).toBe(1);
    expect(f.lines).toEqual([]);
  });

  it('updateFormula bumps updatedAt', async () => {
    const f = useStore.getState().addFormula({ name: 'F' });
    const before = f.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    useStore.getState().updateFormula(f.id, { name: 'F2' });
    const after = useStore.getState().formulas[0];
    expect(after.name).toBe('F2');
    expect(after.updatedAt >= before).toBe(true);
  });

  it('duplicateFormula copies with new ids, resets version, deep-copies lines', () => {
    const ing = useStore.getState().addIngredient({ name: 'A', noteTier: 'top', defaultDilution: 100 });
    const f = useStore.getState().addFormula({ name: 'Orig', version: 4 });
    useStore.getState().addLine(f.id, { ingredientId: ing.id, amount: 1, dilution: 100 });
    const copy = useStore.getState().duplicateFormula(f.id)!;
    expect(copy.id).not.toBe(f.id);
    expect(copy.name).toBe('Orig (Kopie)');
    expect(copy.version).toBe(1);
    expect(copy.lines[0].id).not.toBe(useStore.getState().formulas[0].lines[0].id);
    expect(useStore.getState().formulas).toHaveLength(2);
  });

  it('moveLine reorders and clamps at bounds', () => {
    const f = useStore.getState().addFormula({ name: 'F' });
    useStore.getState().addLine(f.id, { ingredientId: 'a', amount: 1, dilution: 100 });
    useStore.getState().addLine(f.id, { ingredientId: 'b', amount: 2, dilution: 100 });
    const [l1, l2] = useStore.getState().formulas[0].lines;
    useStore.getState().moveLine(f.id, l2.id, -1);
    expect(useStore.getState().formulas[0].lines.map((l) => l.id)).toEqual([l2.id, l1.id]);
    // moving top item up is a no-op
    useStore.getState().moveLine(f.id, l2.id, -1);
    expect(useStore.getState().formulas[0].lines.map((l) => l.id)).toEqual([l2.id, l1.id]);
  });

  it('updateLine and removeLine work', () => {
    const f = useStore.getState().addFormula({ name: 'F' });
    useStore.getState().addLine(f.id, { ingredientId: 'a', amount: 1, dilution: 100 });
    const lineId = useStore.getState().formulas[0].lines[0].id;
    useStore.getState().updateLine(f.id, lineId, { amount: 9 });
    expect(useStore.getState().formulas[0].lines[0].amount).toBe(9);
    useStore.getState().removeLine(f.id, lineId);
    expect(useStore.getState().formulas[0].lines).toHaveLength(0);
  });
});

describe('store — bulk / IO', () => {
  it('loadSeed populates ingredients and a demo formula', () => {
    useStore.getState().loadSeed();
    expect(useStore.getState().ingredients.length).toBeGreaterThan(0);
    expect(useStore.getState().formulas.length).toBe(1);
  });

  it('exportData produces a valid AppData snapshot', () => {
    useStore.getState().loadSeed();
    const data = useStore.getState().exportData();
    expect(data.schemaVersion).toBe(SCHEMA_VERSION);
    expect(data.ingredients.length).toBeGreaterThan(0);
    expect(data.exportedAt).toBeTruthy();
  });

  it('replaceAll swaps the entire dataset', () => {
    useStore.getState().addIngredient({ name: 'Old', noteTier: 'top', defaultDilution: 100 });
    useStore.getState().replaceAll({
      schemaVersion: SCHEMA_VERSION,
      exportedAt: '',
      ingredients: [
        {
          id: 'new',
          name: 'New',
          noteTier: 'base',
          defaultDilution: 100,
          createdAt: '',
          updatedAt: '',
        },
      ],
      formulas: [],
      settings: defaultSettings,
    });
    expect(useStore.getState().ingredients.map((i) => i.name)).toEqual(['New']);
  });

  it('mergeData keeps the record with newer updatedAt', () => {
    useStore.getState().replaceAll({
      schemaVersion: SCHEMA_VERSION,
      exportedAt: '',
      ingredients: [
        {
          id: 'x',
          name: 'Old name',
          noteTier: 'top',
          defaultDilution: 100,
          createdAt: '2020-01-01',
          updatedAt: '2020-01-01',
        },
      ],
      formulas: [],
      settings: defaultSettings,
    });
    useStore.getState().mergeData({
      schemaVersion: SCHEMA_VERSION,
      exportedAt: '',
      ingredients: [
        {
          id: 'x',
          name: 'New name',
          noteTier: 'top',
          defaultDilution: 100,
          createdAt: '2020-01-01',
          updatedAt: '2026-01-01',
        },
      ],
      formulas: [],
      settings: defaultSettings,
    });
    expect(useStore.getState().ingredients).toHaveLength(1);
    expect(useStore.getState().ingredients[0].name).toBe('New name');
  });
});
