import { describe, it, expect } from 'vitest';
import {
  DROP_VOLUME_ML,
  DEFAULT_DENSITY,
  gramsPerDropFor,
  densityFor,
  parseNumber,
  formatGrams,
  formatMl,
  formatPercent,
  formatMoney,
  formatNumber2,
} from './units';
import type { Formula, Ingredient } from '../types/models';

const baseFormula = (gramsPerDrop = 0.02): Formula => ({
  id: 'f',
  name: 'f',
  unit: 'drops',
  gramsPerDrop,
  targetConcentration: 20,
  lines: [],
  version: 1,
  createdAt: '',
  updatedAt: '',
});

const ing = (density?: number): Ingredient => ({
  id: 'i',
  name: 'i',
  noteTier: 'heart',
  defaultDilution: 100,
  density,
  createdAt: '',
  updatedAt: '',
});

describe('units — conversions', () => {
  it('DROP_VOLUME_ML constant is 0.05', () => {
    expect(DROP_VOLUME_ML).toBe(0.05);
  });

  it('gramsPerDropFor uses density*0.05 when density present', () => {
    expect(gramsPerDropFor(ing(0.95), baseFormula())).toBeCloseTo(0.0475, 10);
  });

  it('gramsPerDropFor falls back to formula.gramsPerDrop without density', () => {
    expect(gramsPerDropFor(ing(undefined), baseFormula(0.03))).toBe(0.03);
    expect(gramsPerDropFor(undefined, baseFormula(0.03))).toBe(0.03);
  });

  it('densityFor falls back to 1.0', () => {
    expect(densityFor(ing(undefined))).toBe(DEFAULT_DENSITY);
    expect(densityFor(ing(0))).toBe(1.0);
    expect(densityFor(ing(0.9))).toBe(0.9);
  });

  it('parseNumber accepts comma and dot, strips spaces', () => {
    expect(parseNumber('1,5')).toBe(1.5);
    expect(parseNumber('1.5')).toBe(1.5);
    expect(parseNumber('1 000,25')).toBe(1000.25);
    expect(parseNumber('abc')).toBe(0);
    expect(parseNumber('')).toBe(0);
  });
});

describe('units — de-DE formatting', () => {
  it('formatGrams: 2 decimals + unit', () => {
    expect(formatGrams(120.5)).toBe('120,50 g');
    expect(formatGrams(0)).toBe('0,00 g');
  });
  it('formatMl', () => {
    expect(formatMl(3.1)).toBe('3,10 ml');
  });
  it('formatPercent: 1 decimal', () => {
    expect(formatPercent(85)).toBe('85,0 %');
  });
  it('formatMoney: currency + 2 decimals', () => {
    expect(formatMoney(12.4, '€')).toBe('€ 12,40');
    expect(formatMoney(12.4, '$')).toBe('$ 12,40');
  });
  it('formatNumber2 plain', () => {
    expect(formatNumber2(1000)).toBe('1.000,00');
  });
  it('never emits NaN/Infinity', () => {
    expect(formatGrams(NaN)).toBe('0,00 g');
    expect(formatPercent(Infinity)).toBe('0,0 %');
    expect(formatMoney(NaN)).toBe('€ 0,00');
  });
});
