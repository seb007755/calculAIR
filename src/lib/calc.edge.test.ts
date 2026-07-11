/**
 * Edge-case coverage for the calculation engine, complementing calc.test.ts.
 * Focuses on paths the mandatory spec cases don't exercise: gramsPerDrop
 * fallback, volume/density fallback, cost-per-ml, tier overrides, dilution
 * clamping, solvent volume, and scaling corner cases.
 */
import { describe, it, expect } from 'vitest';
import { computeFormula, scaleFormulaToMass, solventToAddForTargetConcentration } from './calc';
import type { AmountUnit, Formula, FormulaLine, Ingredient, UUID } from '../types/models';

let counter = 0;
const id = (): UUID => `e-${counter++}`;
function ing(p: Partial<Ingredient> & { id: UUID; name: string }): Ingredient {
  return { noteTier: 'heart', defaultDilution: 100, createdAt: '', updatedAt: '', ...p };
}
function line(p: Partial<FormulaLine> & { ingredientId: UUID; amount: number }): FormulaLine {
  return { id: id(), dilution: 100, ...p };
}
function formula(unit: AmountUnit, lines: FormulaLine[], extra: Partial<Formula> = {}): Formula {
  return {
    id: id(), name: 'T', unit, gramsPerDrop: 0.02, targetConcentration: 20,
    lines, version: 1, createdAt: '', updatedAt: '', ...extra,
  };
}
const byId = (...xs: Ingredient[]): Record<UUID, Ingredient> =>
  Object.fromEntries(xs.map((i) => [i.id, i]));

describe('drops — gramsPerDrop fallback', () => {
  it('no density → uses formula.gramsPerDrop', () => {
    const a = ing({ id: 'a', name: 'A' }); // no density
    const f = formula('drops', [line({ ingredientId: 'a', amount: 10 })], { gramsPerDrop: 0.03 });
    const r = computeFormula(f, byId(a));
    expect(r.lines[0].massGrams).toBeCloseTo(10 * 0.03, 10);
  });
  it('density present overrides gramsPerDrop', () => {
    const a = ing({ id: 'a', name: 'A', density: 0.9 });
    const f = formula('drops', [line({ ingredientId: 'a', amount: 10 })], { gramsPerDrop: 0.03 });
    const r = computeFormula(f, byId(a));
    expect(r.lines[0].massGrams).toBeCloseTo(10 * 0.9 * 0.05, 10); // 0.45, not 0.30
  });
});

describe('volume & density', () => {
  it('volume = mass / density', () => {
    const a = ing({ id: 'a', name: 'A', density: 0.8 });
    const f = formula('grams', [line({ ingredientId: 'a', amount: 8 })]);
    const r = computeFormula(f, byId(a));
    expect(r.lines[0].volumeMl).toBeCloseTo(10, 10); // 8 / 0.8
  });
  it('missing density → falls back to 1.0 (volume == mass)', () => {
    const a = ing({ id: 'a', name: 'A' });
    const f = formula('grams', [line({ ingredientId: 'a', amount: 8 })]);
    const r = computeFormula(f, byId(a));
    expect(r.lines[0].volumeMl).toBeCloseTo(8, 10);
  });
});

describe('cost per ml', () => {
  it('costPerMl = totalCost / totalVolume', () => {
    const a = ing({ id: 'a', name: 'A', density: 0.5, pricePerGram: 2 });
    const f = formula('grams', [line({ ingredientId: 'a', amount: 10 })]);
    const r = computeFormula(f, byId(a));
    // mass 10 → volume 20 ml, cost 20 → costPerMl 1
    expect(r.totalVolumeMl).toBeCloseTo(20, 10);
    expect(r.costPerMl).toBeCloseTo(1, 10);
  });
});

describe('tier breakdown & overrides', () => {
  it('noteTierOverride reassigns a line to another tier', () => {
    const a = ing({ id: 'a', name: 'A', noteTier: 'heart' });
    const f = formula('grams', [line({ ingredientId: 'a', amount: 10, noteTierOverride: 'base' })]);
    const r = computeFormula(f, byId(a));
    expect(r.tierBreakdown.base.grams).toBeCloseTo(10, 10);
    expect(r.tierBreakdown.heart.grams).toBe(0);
    expect(r.tierBreakdown.base.percent).toBeCloseTo(100, 10);
  });
  it('tier percent is relative to total ACTIVE grams (dilution-aware)', () => {
    const top = ing({ id: 't', name: 'T', noteTier: 'top' });
    const base = ing({ id: 'b', name: 'B', noteTier: 'base' });
    const f = formula('grams', [
      line({ ingredientId: 't', amount: 10, dilution: 50 }), // active 5
      line({ ingredientId: 'b', amount: 10, dilution: 100 }), // active 10
    ]);
    const r = computeFormula(f, byId(top, base));
    expect(r.totalActiveGrams).toBeCloseTo(15, 10);
    expect(r.tierBreakdown.top.percent).toBeCloseTo((5 / 15) * 100, 6);
    expect(r.tierBreakdown.base.percent).toBeCloseTo((10 / 15) * 100, 6);
  });
});

describe('dilution clamping', () => {
  it('dilution > 100 clamps to 100', () => {
    const a = ing({ id: 'a', name: 'A' });
    const f = formula('grams', [line({ ingredientId: 'a', amount: 10, dilution: 150 })]);
    expect(computeFormula(f, byId(a)).lines[0].activeGrams).toBeCloseTo(10, 10);
  });
  it('negative dilution clamps to 0 (no active)', () => {
    const a = ing({ id: 'a', name: 'A' });
    const f = formula('grams', [line({ ingredientId: 'a', amount: 10, dilution: -5 })]);
    expect(computeFormula(f, byId(a)).lines[0].activeGrams).toBe(0);
  });
  it('NaN dilution defaults to 100', () => {
    const a = ing({ id: 'a', name: 'A' });
    const f = formula('grams', [line({ ingredientId: 'a', amount: 10, dilution: NaN })]);
    expect(computeFormula(f, byId(a)).lines[0].activeGrams).toBeCloseTo(10, 10);
  });
});

describe('solvent handling', () => {
  it('solventGrams counts full mass; concentrate uses active of non-solvent', () => {
    const oil = ing({ id: 'oil', name: 'Oil' });
    const eth = ing({ id: 'eth', name: 'Eth', isSolvent: true });
    const f = formula('grams', [
      line({ ingredientId: 'oil', amount: 20, dilution: 50 }), // active 10
      line({ ingredientId: 'eth', amount: 80 }),
    ]);
    const r = computeFormula(f, byId(oil, eth));
    expect(r.concentrateGrams).toBeCloseTo(10, 10);
    expect(r.solventGrams).toBe(80);
    // actual concentration = concentrate / totalMass = 10 / 100
    expect(r.actualConcentrationPercent).toBeCloseTo(10, 10);
  });
});

describe('percent mode edge', () => {
  it('all amounts zero → masses all 0, no NaN', () => {
    const a = ing({ id: 'a', name: 'A' });
    const b = ing({ id: 'b', name: 'B' });
    const f = formula('percent', [
      line({ ingredientId: 'a', amount: 0 }),
      line({ ingredientId: 'b', amount: 0 }),
    ], { batchSizeGrams: 100 });
    const r = computeFormula(f, byId(a, b));
    expect(r.lines.map((l) => l.massGrams)).toEqual([0, 0]);
    expect(Number.isFinite(r.totalMassGrams)).toBe(true);
  });
  it('default batch size 100 when unset', () => {
    const a = ing({ id: 'a', name: 'A' });
    const f = formula('percent', [line({ ingredientId: 'a', amount: 10 })]); // no batchSizeGrams
    expect(computeFormula(f, byId(a)).totalMassGrams).toBeCloseTo(100, 10);
  });
});

describe('scaleFormulaToMass edge', () => {
  it('drops + roundDrops rounds amounts to whole drops', () => {
    const a = ing({ id: 'a', name: 'A', density: 1 }); // 0.05 g/drop
    const f = formula('drops', [line({ ingredientId: 'a', amount: 7 })]);
    // current mass = 7 * 0.05 = 0.35 g; target 1 g → factor ~2.857 → 20 drops
    const scaled = scaleFormulaToMass(f, byId(a), 1, { roundDrops: true });
    expect(Number.isInteger(scaled.lines[0].amount)).toBe(true);
    expect(scaled.lines[0].amount).toBe(20);
  });
  it('zero current mass → only version bumps, amounts unchanged', () => {
    const f = formula('grams', [line({ ingredientId: 'ghost', amount: 5 })]);
    const scaled = scaleFormulaToMass(f, {}, 100);
    expect(scaled.version).toBe(f.version + 1);
    expect(scaled.lines[0].amount).toBe(5);
  });
  it('target 0 → no divide-by-zero, version bumps', () => {
    const a = ing({ id: 'a', name: 'A' });
    const f = formula('grams', [line({ ingredientId: 'a', amount: 5 })]);
    const scaled = scaleFormulaToMass(f, byId(a), 0);
    expect(scaled.version).toBe(f.version + 1);
    expect(scaled.lines[0].amount).toBe(5);
  });
});

describe('tier weight distribution (pyramid)', () => {
  it('splits active mass across tierWeights', () => {
    const a = ing({ id: 'a', name: 'A', noteTier: 'top', tierWeights: { top: 70, heart: 30 } });
    const f = formula('grams', [line({ ingredientId: 'a', amount: 10 })]);
    const r = computeFormula(f, byId(a));
    expect(r.tierBreakdown.top.grams).toBeCloseTo(7, 10);
    expect(r.tierBreakdown.heart.grams).toBeCloseTo(3, 10);
    expect(r.tierBreakdown.top.percent).toBeCloseTo(70, 6);
    expect(r.tierBreakdown.heart.percent).toBeCloseTo(30, 6);
  });

  it('unnormalized weights are rescaled to 100 %', () => {
    const a = ing({ id: 'a', name: 'A', noteTier: 'top', tierWeights: { top: 35, heart: 15 } });
    const f = formula('grams', [line({ ingredientId: 'a', amount: 10 })]);
    const r = computeFormula(f, byId(a));
    expect(r.tierBreakdown.top.grams).toBeCloseTo(7, 10); // 35/50
    expect(r.tierBreakdown.heart.grams).toBeCloseTo(3, 10); // 15/50
  });

  it('no tierWeights → 100 % of single noteTier (backward compatible)', () => {
    const a = ing({ id: 'a', name: 'A', noteTier: 'base' });
    const f = formula('grams', [line({ ingredientId: 'a', amount: 10 })]);
    const r = computeFormula(f, byId(a));
    expect(r.tierBreakdown.base.grams).toBeCloseTo(10, 10);
    expect(r.tierBreakdown.base.percent).toBeCloseTo(100, 10);
  });

  it('line noteTierOverride forces 100 % that tier over the distribution', () => {
    const a = ing({ id: 'a', name: 'A', noteTier: 'top', tierWeights: { top: 70, heart: 30 } });
    const f = formula('grams', [line({ ingredientId: 'a', amount: 10, noteTierOverride: 'base' })]);
    const r = computeFormula(f, byId(a));
    expect(r.tierBreakdown.base.grams).toBeCloseTo(10, 10);
    expect(r.tierBreakdown.top.grams).toBe(0);
    expect(r.lines[0].noteTier).toBe('base');
  });

  it('distribution respects dilution (uses active mass)', () => {
    const a = ing({ id: 'a', name: 'A', noteTier: 'top', tierWeights: { top: 50, base: 50 } });
    const f = formula('grams', [line({ ingredientId: 'a', amount: 10, dilution: 50 })]); // active 5
    const r = computeFormula(f, byId(a));
    expect(r.totalActiveGrams).toBeCloseTo(5, 10);
    expect(r.tierBreakdown.top.grams).toBeCloseTo(2.5, 10);
    expect(r.tierBreakdown.base.grams).toBeCloseTo(2.5, 10);
  });
});

describe('solventToAddForTargetConcentration edge', () => {
  it('target 100% → add nothing', () => {
    expect(solventToAddForTargetConcentration(20, 100)).toBeCloseTo(0, 10);
  });
  it('target 0 or negative → 0 (guarded)', () => {
    expect(solventToAddForTargetConcentration(20, 0)).toBe(0);
    expect(solventToAddForTargetConcentration(20, -5)).toBe(0);
  });
  it('50 g concentrate to 25% → add 150 g', () => {
    expect(solventToAddForTargetConcentration(50, 25)).toBeCloseTo(150, 10);
  });
});
