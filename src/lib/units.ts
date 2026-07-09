/**
 * Unit conversions and display formatting.
 * Pure helpers — no React, no store.
 */
import type { Ingredient, Formula } from '../types/models';

/**
 * Standard assumption: 1 drop ≈ 0.05 ml.
 * Combined with an ingredient density (g/ml) this yields grams per drop.
 */
export const DROP_VOLUME_ML = 0.05;

/** Default density (g/ml) used for volume when an ingredient has none. */
export const DEFAULT_DENSITY = 1.0;

/**
 * Grams contributed by one drop of the given ingredient.
 * If the ingredient has a density → density * DROP_VOLUME_ML.
 * Otherwise fall back to the formula-wide gramsPerDrop.
 */
export function gramsPerDropFor(ingredient: Ingredient | undefined, formula: Formula): number {
  if (ingredient?.density && ingredient.density > 0) {
    return ingredient.density * DROP_VOLUME_ML;
  }
  return formula.gramsPerDrop;
}

/** Density used for volume math (falls back to 1.0). */
export function densityFor(ingredient: Ingredient | undefined): number {
  return ingredient?.density && ingredient.density > 0 ? ingredient.density : DEFAULT_DENSITY;
}

/** Parse a user-entered number that may use a comma decimal separator. */
export function parseNumber(input: string): number {
  const normalized = input.replace(/\s/g, '').replace(',', '.');
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : 0;
}

// --- Display formatting (locale de-DE) -------------------------------------

const nf = (min: number, max: number) =>
  new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });

const grams2 = nf(2, 2);
const percent1 = nf(1, 1);

/** Weights/volumes: 2 decimals, e.g. "120,50 g". */
export function formatGrams(value: number): string {
  return `${grams2.format(safe(value))} g`;
}

export function formatMl(value: number): string {
  return `${grams2.format(safe(value))} ml`;
}

/** Percent: 1 decimal, e.g. "85,0 %". */
export function formatPercent(value: number): string {
  return `${percent1.format(safe(value))} %`;
}

/** Money: currency + 2 decimals, e.g. "€ 12,40". */
export function formatMoney(value: number, currency = '€'): string {
  return `${currency} ${grams2.format(safe(value))}`;
}

/** Plain 2-decimal number (no unit) for table cells. */
export function formatNumber2(value: number): string {
  return grams2.format(safe(value));
}

/** Guard against NaN/Infinity leaking into the UI. */
function safe(value: number): number {
  return Number.isFinite(value) ? value : 0;
}
