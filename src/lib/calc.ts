/**
 * Calculation engine — THE HEART OF THE APP.
 *
 * Contains ONLY pure functions (no React, no store imports).
 * Every function is unit-tested in calc.test.ts.
 * Rule: never round internally — round only for display.
 */
import type { Formula, Ingredient, NoteTier, UUID } from '../types/models';
import { NOTE_TIERS } from '../types/models';
import { densityFor, gramsPerDropFor } from './units';

/** Default reference batch mass (grams) for percent-mode formulas. */
export const DEFAULT_BATCH_SIZE_GRAMS = 100;

export interface LineResult {
  lineId: UUID;
  ingredientId: UUID;
  ingredientName: string;
  noteTier: NoteTier;
  /** true if the line references an ingredient that could not be resolved. */
  unknown: boolean;
  isSolvent: boolean;
  /** Raw material mass in grams, as used in the formula (incl. dilution carrier). */
  massGrams: number;
  /** Pure active material in grams (massGrams * dilution/100). */
  activeGrams: number;
  /** Volume in ml (massGrams / density). */
  volumeMl: number;
  /** Share of total mass in percent. */
  percentOfTotal: number;
  /** Cost of this line (massGrams * pricePerGram). */
  cost: number;
}

export interface FormulaResult {
  lines: LineResult[];
  totalMassGrams: number;
  totalActiveGrams: number;
  totalVolumeMl: number;
  totalCost: number;
  costPerGram: number;
  costPerMl: number;
  /** Pyramid breakdown: active grams per tier + share of total active mass. */
  tierBreakdown: Record<NoteTier, { grams: number; percent: number }>;
  /** Active (non-solvent) concentrate mass. */
  concentrateGrams: number;
  /** Solvent mass (lines with isSolvent === true). */
  solventGrams: number;
  /** concentrateGrams / totalMassGrams * 100. */
  actualConcentrationPercent: number;
}

/** Reference batch size used for percent-mode interpretation. */
function batchSizeFor(formula: Formula, opts?: { batchSizeGrams?: number }): number {
  return (
    opts?.batchSizeGrams ??
    (formula.batchSizeGrams && formula.batchSizeGrams > 0
      ? formula.batchSizeGrams
      : DEFAULT_BATCH_SIZE_GRAMS)
  );
}

/**
 * Compute per-line and aggregate results for a formula.
 * Robust against unknown ingredients and empty/zero-mass formulas.
 */
export function computeFormula(
  formula: Formula,
  ingredientsById: Record<UUID, Ingredient>,
  opts?: { batchSizeGrams?: number },
): FormulaResult {
  const emptyTiers = (): Record<NoteTier, { grams: number; percent: number }> => ({
    top: { grams: 0, percent: 0 },
    heart: { grams: 0, percent: 0 },
    base: { grams: 0, percent: 0 },
    modifier: { grams: 0, percent: 0 },
  });

  // For percent mode we need the sum of amounts up front to normalize.
  const sumOfAmounts =
    formula.unit === 'percent'
      ? formula.lines.reduce((acc, l) => acc + (Number.isFinite(l.amount) ? l.amount : 0), 0)
      : 0;
  const batchSize = batchSizeFor(formula, opts);

  // First pass: mass, active, volume, cost per line (no percentages yet).
  const partial = formula.lines.map((line) => {
    const ingredient = ingredientsById[line.ingredientId];
    const unknown = !ingredient;
    const dilution = clampDilution(line.dilution);

    // Unknown ingredients never contribute mass (spec §5.2): keep them visible
    // but out of the aggregates instead of crashing or double-counting.
    let massGrams = 0;
    if (unknown) {
      massGrams = 0;
    } else if (formula.unit === 'grams') {
      massGrams = safeNum(line.amount);
    } else if (formula.unit === 'drops') {
      massGrams = safeNum(line.amount) * gramsPerDropFor(ingredient, formula);
    } else {
      // percent
      massGrams = sumOfAmounts > 0 ? (safeNum(line.amount) / sumOfAmounts) * batchSize : 0;
    }

    const activeGrams = massGrams * (dilution / 100);
    const volumeMl = massGrams / densityFor(ingredient);
    const cost = massGrams * (ingredient?.pricePerGram ?? 0);
    const noteTier: NoteTier = line.noteTierOverride ?? ingredient?.noteTier ?? 'modifier';
    const isSolvent = ingredient?.isSolvent === true;

    return {
      line,
      ingredient,
      unknown,
      isSolvent,
      massGrams,
      activeGrams,
      volumeMl,
      cost,
      noteTier,
    };
  });

  const totalMassGrams = partial.reduce((a, p) => a + p.massGrams, 0);
  const totalActiveGrams = partial.reduce((a, p) => a + p.activeGrams, 0);
  const totalVolumeMl = partial.reduce((a, p) => a + p.volumeMl, 0);
  const totalCost = partial.reduce((a, p) => a + p.cost, 0);

  const lines: LineResult[] = partial.map((p) => ({
    lineId: p.line.id,
    ingredientId: p.line.ingredientId,
    ingredientName: p.ingredient?.name ?? 'Unbekannt',
    noteTier: p.noteTier,
    unknown: p.unknown,
    isSolvent: p.isSolvent,
    massGrams: p.massGrams,
    activeGrams: p.activeGrams,
    volumeMl: p.volumeMl,
    percentOfTotal: totalMassGrams > 0 ? (p.massGrams / totalMassGrams) * 100 : 0,
    cost: p.cost,
  }));

  // Tier breakdown by active grams; percent relative to total active mass.
  const tierBreakdown = emptyTiers();
  for (const p of partial) {
    tierBreakdown[p.noteTier].grams += p.activeGrams;
  }
  for (const tier of NOTE_TIERS) {
    tierBreakdown[tier].percent =
      totalActiveGrams > 0 ? (tierBreakdown[tier].grams / totalActiveGrams) * 100 : 0;
  }

  const concentrateGrams = partial
    .filter((p) => !p.isSolvent)
    .reduce((a, p) => a + p.activeGrams, 0);
  const solventGrams = partial.filter((p) => p.isSolvent).reduce((a, p) => a + p.massGrams, 0);

  return {
    lines,
    totalMassGrams,
    totalActiveGrams,
    totalVolumeMl,
    totalCost,
    costPerGram: totalMassGrams > 0 ? totalCost / totalMassGrams : 0,
    costPerMl: totalVolumeMl > 0 ? totalCost / totalVolumeMl : 0,
    tierBreakdown,
    concentrateGrams,
    solventGrams,
    actualConcentrationPercent: totalMassGrams > 0 ? (concentrateGrams / totalMassGrams) * 100 : 0,
  };
}

/**
 * Scale all line amounts so the total mass reaches targetGrams.
 * Returns a NEW formula (immutable), version + 1.
 */
export function scaleFormulaToMass(
  formula: Formula,
  ingredientsById: Record<UUID, Ingredient>,
  targetGrams: number,
  opts?: { roundDrops?: boolean },
): Formula {
  const now = new Date().toISOString();

  // Percent mode: amounts stay, only the reference batch size changes.
  if (formula.unit === 'percent') {
    return {
      ...formula,
      batchSizeGrams: targetGrams > 0 ? targetGrams : formula.batchSizeGrams,
      version: formula.version + 1,
      updatedAt: now,
    };
  }

  const current = computeFormula(formula, ingredientsById).totalMassGrams;
  if (!(current > 0) || !(targetGrams > 0)) {
    // Nothing sensible to scale; still bump version to signal a revision.
    return { ...formula, version: formula.version + 1, updatedAt: now };
  }

  const factor = targetGrams / current;
  const lines = formula.lines.map((line) => {
    let amount = line.amount * factor;
    if (formula.unit === 'drops' && opts?.roundDrops) {
      amount = Math.round(amount);
    }
    return { ...line, amount };
  });

  return { ...formula, lines, version: formula.version + 1, updatedAt: now };
}

/**
 * Grams of solvent to add to move from the current concentrate to a target
 * concentration. Positive result = add this much solvent.
 *
 * solvent = concentrateGrams * (100/target - 1) - existingSolventGrams
 */
export function solventToAddForTargetConcentration(
  concentrateGrams: number,
  targetConcentrationPercent: number,
  existingSolventGrams = 0,
): number {
  if (!(targetConcentrationPercent > 0)) return 0;
  const needed = concentrateGrams * (100 / targetConcentrationPercent - 1) - existingSolventGrams;
  return needed > 0 ? needed : 0;
}

function clampDilution(value: number): number {
  if (!Number.isFinite(value)) return 100;
  if (value <= 0) return 0;
  if (value > 100) return 100;
  return value;
}

function safeNum(value: number): number {
  return Number.isFinite(value) ? value : 0;
}
