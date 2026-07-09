/**
 * Example ingredients + a demo formula. Used for the empty-state
 * "Demo-Daten laden" action and for first-run seeding.
 */
import type { Formula, Ingredient } from '../types/models';

const ISO = '2026-01-01T00:00:00.000Z';

function ingredient(
  id: string,
  name: string,
  rest: Partial<Ingredient> = {},
): Ingredient {
  return {
    id,
    name,
    noteTier: 'heart',
    defaultDilution: 100,
    createdAt: ISO,
    updatedAt: ISO,
    ...rest,
  };
}

export function seedIngredients(): Ingredient[] {
  return [
    ingredient('seed-bergamot', 'Bergamot Calabria', {
      noteTier: 'top',
      cas: '8007-75-8',
      supplier: 'Hermitage',
      density: 0.88,
      pricePerGram: 0.35,
      defaultDilution: 100,
      tags: ['citrus', 'natural'],
    }),
    ingredient('seed-lemon', 'Lemon Italy', {
      noteTier: 'top',
      density: 0.85,
      pricePerGram: 0.28,
      tags: ['citrus'],
    }),
    ingredient('seed-lavender', 'Lavender 40/42', {
      noteTier: 'heart',
      cas: '8000-28-0',
      density: 0.885,
      pricePerGram: 0.22,
      tags: ['herbal', 'natural'],
    }),
    ingredient('seed-rose', 'Rose Absolute', {
      noteTier: 'heart',
      density: 0.96,
      pricePerGram: 12.5,
      defaultDilution: 10,
      tags: ['floral', 'absolute'],
      ifraNote: 'Rose ketones — IFRA-Grenzwerte beachten.',
    }),
    ingredient('seed-isoe', 'Iso E Super', {
      noteTier: 'base',
      cas: '54464-57-2',
      supplier: 'IFF',
      density: 0.96,
      pricePerGram: 0.09,
      tags: ['woody', 'aromachemical'],
    }),
    ingredient('seed-vetiver', 'Vetiver Haiti', {
      noteTier: 'base',
      density: 0.99,
      pricePerGram: 1.9,
      defaultDilution: 100,
      tags: ['woody', 'earthy', 'natural'],
    }),
    ingredient('seed-ambroxan', 'Ambroxan', {
      noteTier: 'base',
      cas: '6790-58-5',
      density: 0.9,
      pricePerGram: 1.4,
      defaultDilution: 10,
      tags: ['ambery', 'aromachemical'],
    }),
    ingredient('seed-ethanol', 'Ethanol 96%', {
      noteTier: 'modifier',
      density: 0.81,
      pricePerGram: 0.02,
      isSolvent: true,
      tags: ['solvent'],
    }),
  ];
}

export function seedFormula(): Formula {
  return {
    id: 'seed-formula-vetiver',
    name: 'Vetiver Study #3',
    description: 'Frische Kopfnote über erdigem Vetiver-Herz, mit Iso E Super im Fond.',
    unit: 'grams',
    gramsPerDrop: 0.02,
    targetConcentration: 20,
    batchSizeGrams: 100,
    version: 1,
    createdAt: ISO,
    updatedAt: ISO,
    lines: [
      { id: 'seed-l1', ingredientId: 'seed-bergamot', amount: 3, dilution: 100, note: 'Kopf' },
      { id: 'seed-l2', ingredientId: 'seed-lemon', amount: 1.5, dilution: 100 },
      { id: 'seed-l3', ingredientId: 'seed-lavender', amount: 2, dilution: 100 },
      { id: 'seed-l4', ingredientId: 'seed-rose', amount: 1, dilution: 10 },
      { id: 'seed-l5', ingredientId: 'seed-vetiver', amount: 4, dilution: 100 },
      { id: 'seed-l6', ingredientId: 'seed-isoe', amount: 6, dilution: 100 },
      { id: 'seed-l7', ingredientId: 'seed-ambroxan', amount: 1.5, dilution: 10 },
    ],
  };
}
