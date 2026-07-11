import { describe, it, expect } from 'vitest';
import { parseAppData } from './jsonIO';
import { computeFormula } from './calc';
import type { Formula, UUID } from '../types/models';
import importFile from '../../import/calculair-import.json';

describe('coerceIngredient — new fields', () => {
  it('normalizes tierWeights and derives the primary noteTier', () => {
    const json = JSON.stringify({
      ingredients: [
        {
          name: 'X',
          tierWeights: { top: 35, heart: 15 }, // sum 50 → rescaled to 70/30
          manufacturer: 'Firmenich',
          supplier: 'perfumiarz',
          priceTiers: [
            { grams: 5, price: 4 },
            { grams: 10, price: 6 },
          ],
          purchaseDate: '2026-05',
          odorStrength: 'stark',
          usageRate: '0,1-5%',
          shelfLife: 'recht lange',
          dilutionSolvent: '10% DPG',
          characteristics: 'holzig',
        },
      ],
    });
    const { data } = parseAppData(json);
    const ing = data.ingredients[0];
    expect(ing.noteTier).toBe('top');
    expect(ing.tierWeights?.top).toBeCloseTo(70, 6);
    expect(ing.tierWeights?.heart).toBeCloseTo(30, 6);
    expect(ing.manufacturer).toBe('Firmenich');
    expect(ing.supplier).toBe('perfumiarz');
    expect(ing.priceTiers).toHaveLength(2);
    expect(ing.characteristics).toBe('holzig');
    expect(ing.purchaseDate).toBe('2026-05');
  });

  it('drops empty/invalid tierWeights but keeps an explicit noteTier', () => {
    const { data } = parseAppData(
      JSON.stringify({ ingredients: [{ name: 'Y', noteTier: 'base', tierWeights: {} }] }),
    );
    expect(data.ingredients[0].tierWeights).toBeUndefined();
    expect(data.ingredients[0].noteTier).toBe('base');
  });

  it('ignores non-numeric price tiers', () => {
    const { data } = parseAppData(
      JSON.stringify({
        ingredients: [{ name: 'Z', priceTiers: [{ grams: 5, price: 'x' }, { grams: 10, price: 6 }] }],
      }),
    );
    expect(data.ingredients[0].priceTiers).toEqual([{ grams: 10, price: 6 }]);
  });
});

describe('generated import file (calculair-import.json)', () => {
  it('parses cleanly with the expected ingredient count and valid tier weights', () => {
    const { data, warnings } = parseAppData(JSON.stringify(importFile));
    expect(data.ingredients.length).toBe(120);
    expect(data.formulas.length).toBe(0);
    expect(warnings.length).toBe(0);
    for (const ing of data.ingredients) {
      expect(ing.name.length).toBeGreaterThan(0);
      if (ing.tierWeights) {
        const sum = Object.values(ing.tierWeights).reduce((a, b) => a + (b as number), 0);
        expect(sum).toBeCloseTo(100, 4);
      }
    }
  });

  it('end-to-end: a multi-tier imported material splits across a formula pyramid', () => {
    const { data } = parseAppData(JSON.stringify(importFile));
    const byId = Object.fromEntries(data.ingredients.map((i) => [i.id, i])) as Record<
      UUID,
      (typeof data.ingredients)[number]
    >;
    const ing = data.ingredients.find(
      (i) => i.tierWeights && Object.keys(i.tierWeights).length > 1,
    );
    expect(ing).toBeDefined();
    const formula: Formula = {
      id: 'f',
      name: 't',
      unit: 'grams',
      gramsPerDrop: 0.02,
      targetConcentration: 20,
      lines: [{ id: 'l1', ingredientId: ing!.id, amount: 10, dilution: 100 }],
      version: 1,
      createdAt: '',
      updatedAt: '',
    };
    const r = computeFormula(formula, byId);
    for (const [tier, w] of Object.entries(ing!.tierWeights!)) {
      expect(r.tierBreakdown[tier as 'top'].grams).toBeCloseTo((10 * (w as number)) / 100, 6);
    }
  });
});
