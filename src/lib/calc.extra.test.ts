import { describe, it, expect } from 'vitest';
import { computeFormula, scaleFormulaToMass } from './calc';
import { seedFormula, seedIngredients } from './seed';
import type { Formula, Ingredient, UUID } from '../types/models';

const byId = (arr: Ingredient[]): Record<UUID, Ingredient> =>
  Object.fromEntries(arr.map((i) => [i.id, i]));

describe('calc — additional coverage', () => {
  it('drops without density use formula.gramsPerDrop', () => {
    const a: Ingredient = {
      id: 'a',
      name: 'A',
      noteTier: 'heart',
      defaultDilution: 100,
      createdAt: '',
      updatedAt: '',
    };
    const f: Formula = {
      id: 'f',
      name: 'f',
      unit: 'drops',
      gramsPerDrop: 0.03,
      targetConcentration: 20,
      lines: [{ id: 'l', ingredientId: 'a', amount: 10, dilution: 100 }],
      version: 1,
      createdAt: '',
      updatedAt: '',
    };
    expect(computeFormula(f, byId([a])).lines[0].massGrams).toBeCloseTo(0.3, 10);
  });

  it('volume uses density; cost/ml derived correctly', () => {
    const a: Ingredient = {
      id: 'a',
      name: 'A',
      noteTier: 'heart',
      defaultDilution: 100,
      density: 0.8,
      pricePerGram: 2,
      createdAt: '',
      updatedAt: '',
    };
    const f: Formula = {
      id: 'f',
      name: 'f',
      unit: 'grams',
      gramsPerDrop: 0.02,
      targetConcentration: 20,
      lines: [{ id: 'l', ingredientId: 'a', amount: 8, dilution: 100 }],
      version: 1,
      createdAt: '',
      updatedAt: '',
    };
    const r = computeFormula(f, byId([a]));
    expect(r.totalVolumeMl).toBeCloseTo(10, 10); // 8g / 0.8
    expect(r.totalCost).toBe(16);
    expect(r.costPerMl).toBeCloseTo(1.6, 10); // 16 / 10ml
  });

  it('tier breakdown percentages sum to 100 over active mass', () => {
    const r = computeFormula(seedFormula(), byId(seedIngredients()));
    const sum =
      r.tierBreakdown.top.percent +
      r.tierBreakdown.heart.percent +
      r.tierBreakdown.base.percent +
      r.tierBreakdown.modifier.percent;
    expect(sum).toBeCloseTo(100, 6);
  });

  it('seed formula: sane aggregate numbers', () => {
    const r = computeFormula(seedFormula(), byId(seedIngredients()));
    expect(r.totalMassGrams).toBeCloseTo(19, 6); // 3+1.5+2+1+4+6+1.5
    // rose (dil 10) and ambroxan (dil 10) reduce active mass
    expect(r.totalActiveGrams).toBeCloseTo(16.75, 6);
    expect(r.concentrateGrams).toBeCloseTo(16.75, 6);
    expect(r.solventGrams).toBe(0);
    expect(Number.isFinite(r.costPerMl)).toBe(true);
  });

  it('scaling drops with roundDrops yields whole numbers', () => {
    const a: Ingredient = {
      id: 'a',
      name: 'A',
      noteTier: 'heart',
      defaultDilution: 100,
      density: 0.9,
      createdAt: '',
      updatedAt: '',
    };
    const f: Formula = {
      id: 'f',
      name: 'f',
      unit: 'drops',
      gramsPerDrop: 0.02,
      targetConcentration: 20,
      lines: [{ id: 'l', ingredientId: 'a', amount: 7, dilution: 100 }],
      version: 1,
      createdAt: '',
      updatedAt: '',
    };
    const current = computeFormula(f, byId([a])).totalMassGrams;
    const scaled = scaleFormulaToMass(f, byId([a]), current * 2.3, { roundDrops: true });
    expect(Number.isInteger(scaled.lines[0].amount)).toBe(true);
  });
});
