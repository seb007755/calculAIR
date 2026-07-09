import { describe, it, expect } from 'vitest';
import { computeFormula, scaleFormulaToMass, solventToAddForTargetConcentration } from './calc';
import type { AmountUnit, Formula, FormulaLine, Ingredient, UUID } from '../types/models';

// --- Test factories --------------------------------------------------------

let counter = 0;
const id = (): UUID => `id-${counter++}`;

function ing(partial: Partial<Ingredient> & { id: UUID; name: string }): Ingredient {
  return {
    noteTier: 'heart',
    defaultDilution: 100,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

function line(partial: Partial<FormulaLine> & { ingredientId: UUID; amount: number }): FormulaLine {
  return {
    id: id(),
    dilution: 100,
    ...partial,
  };
}

function formula(unit: AmountUnit, lines: FormulaLine[], extra: Partial<Formula> = {}): Formula {
  return {
    id: id(),
    name: 'Test',
    unit,
    gramsPerDrop: 0.02,
    targetConcentration: 20,
    lines,
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...extra,
  };
}

function byId(...ingredients: Ingredient[]): Record<UUID, Ingredient> {
  return Object.fromEntries(ingredients.map((i) => [i.id, i]));
}

// --- Mandatory test cases (spec §5.5) --------------------------------------

describe('computeFormula', () => {
  it('1. grams: percentOfTotal sums to 100', () => {
    const a = ing({ id: 'a', name: 'A' });
    const b = ing({ id: 'b', name: 'B' });
    const c = ing({ id: 'c', name: 'C' });
    const f = formula('grams', [
      line({ ingredientId: 'a', amount: 3 }),
      line({ ingredientId: 'b', amount: 5 }),
      line({ ingredientId: 'c', amount: 12 }),
    ]);
    const r = computeFormula(f, byId(a, b, c));
    const sum = r.lines.reduce((acc, l) => acc + l.percentOfTotal, 0);
    expect(sum).toBeCloseTo(100, 3);
    expect(r.totalMassGrams).toBe(20);
  });

  it('2. drops with density 0.95 → amount * 0.95 * 0.05', () => {
    const a = ing({ id: 'a', name: 'A', density: 0.95 });
    const f = formula('drops', [line({ ingredientId: 'a', amount: 10 })]);
    const r = computeFormula(f, byId(a));
    expect(r.lines[0].massGrams).toBeCloseTo(10 * 0.95 * 0.05, 10);
  });

  it('3. percent mode, batch 100, [50,30,20] → [50,30,20] g', () => {
    const a = ing({ id: 'a', name: 'A' });
    const b = ing({ id: 'b', name: 'B' });
    const c = ing({ id: 'c', name: 'C' });
    const f = formula(
      'percent',
      [
        line({ ingredientId: 'a', amount: 50 }),
        line({ ingredientId: 'b', amount: 30 }),
        line({ ingredientId: 'c', amount: 20 }),
      ],
      { batchSizeGrams: 100 },
    );
    const r = computeFormula(f, byId(a, b, c));
    expect(r.lines.map((l) => l.massGrams)).toEqual([50, 30, 20]);
  });

  it('4. percent mode, unnormalized [1,1,2] → [25,25,50] g at 100 g', () => {
    const a = ing({ id: 'a', name: 'A' });
    const b = ing({ id: 'b', name: 'B' });
    const c = ing({ id: 'c', name: 'C' });
    const f = formula('percent', [
      line({ ingredientId: 'a', amount: 1 }),
      line({ ingredientId: 'b', amount: 1 }),
      line({ ingredientId: 'c', amount: 2 }),
    ]);
    const r = computeFormula(f, byId(a, b, c), { batchSizeGrams: 100 });
    expect(r.lines.map((l) => l.massGrams)).toEqual([25, 25, 50]);
  });

  it('5. dilution 10% → activeGrams = massGrams * 0.1', () => {
    const a = ing({ id: 'a', name: 'A' });
    const f = formula('grams', [line({ ingredientId: 'a', amount: 8, dilution: 10 })]);
    const r = computeFormula(f, byId(a));
    expect(r.lines[0].massGrams).toBe(8);
    expect(r.lines[0].activeGrams).toBeCloseTo(0.8, 10);
  });

  it('6. solvent line contributes to solventGrams, not concentrateGrams', () => {
    const oil = ing({ id: 'oil', name: 'Oil' });
    const eth = ing({ id: 'eth', name: 'Ethanol', isSolvent: true });
    const f = formula('grams', [
      line({ ingredientId: 'oil', amount: 20 }),
      line({ ingredientId: 'eth', amount: 80 }),
    ]);
    const r = computeFormula(f, byId(oil, eth));
    expect(r.concentrateGrams).toBe(20);
    expect(r.solventGrams).toBe(80);
    expect(r.actualConcentrationPercent).toBeCloseTo(20, 10);
  });

  it('8. empty formula / totalMass 0 → no NaN, all aggregates 0', () => {
    const f = formula('grams', []);
    const r = computeFormula(f, {});
    for (const v of [
      r.totalMassGrams,
      r.totalActiveGrams,
      r.totalVolumeMl,
      r.totalCost,
      r.costPerGram,
      r.costPerMl,
      r.concentrateGrams,
      r.solventGrams,
      r.actualConcentrationPercent,
    ]) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBe(0);
    }
  });

  it('9. unknown ingredientId → no crash, massGrams 0, marked unknown', () => {
    const f = formula('grams', [line({ ingredientId: 'ghost', amount: 5 })]);
    const r = computeFormula(f, {});
    expect(r.lines[0].unknown).toBe(true);
    expect(r.lines[0].massGrams).toBe(0);
    expect(r.lines[0].ingredientName).toBe('Unbekannt');
  });

  it('10. costs: 5g@2€ + 5g@4€ → totalCost 30, costPerGram 3', () => {
    const a = ing({ id: 'a', name: 'A', pricePerGram: 2 });
    const b = ing({ id: 'b', name: 'B', pricePerGram: 4 });
    const f = formula('grams', [
      line({ ingredientId: 'a', amount: 5 }),
      line({ ingredientId: 'b', amount: 5 }),
    ]);
    const r = computeFormula(f, byId(a, b));
    expect(r.totalCost).toBe(30);
    expect(r.costPerGram).toBe(3);
  });
});

describe('scaleFormulaToMass', () => {
  it('7. 10 g → 100 g scales all amounts ×10, ratios identical', () => {
    const a = ing({ id: 'a', name: 'A' });
    const b = ing({ id: 'b', name: 'B' });
    const f = formula('grams', [
      line({ ingredientId: 'a', amount: 3 }),
      line({ ingredientId: 'b', amount: 7 }),
    ]);
    const scaled = scaleFormulaToMass(f, byId(a, b), 100);
    expect(scaled.lines.map((l) => l.amount)).toEqual([30, 70]);
    expect(scaled.version).toBe(f.version + 1);
    // ratios identical
    const r0 = computeFormula(f, byId(a, b));
    const r1 = computeFormula(scaled, byId(a, b));
    expect(r1.lines[0].percentOfTotal).toBeCloseTo(r0.lines[0].percentOfTotal, 10);
  });

  it('percent mode scaling only changes batchSizeGrams', () => {
    const a = ing({ id: 'a', name: 'A' });
    const f = formula('percent', [line({ ingredientId: 'a', amount: 100 })], { batchSizeGrams: 50 });
    const scaled = scaleFormulaToMass(f, byId(a), 250);
    expect(scaled.batchSizeGrams).toBe(250);
    expect(scaled.lines[0].amount).toBe(100);
  });
});

describe('solventToAddForTargetConcentration', () => {
  it('dilutes 20 g concentrate to 20% → add 80 g solvent', () => {
    expect(solventToAddForTargetConcentration(20, 20)).toBeCloseTo(80, 10);
  });

  it('accounts for existing solvent', () => {
    expect(solventToAddForTargetConcentration(20, 20, 30)).toBeCloseTo(50, 10);
  });

  it('never returns negative', () => {
    expect(solventToAddForTargetConcentration(20, 20, 999)).toBe(0);
  });
});
