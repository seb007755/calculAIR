export type UUID = string;

/** Fragrance tier for the scent pyramid. */
export type NoteTier = 'top' | 'heart' | 'base' | 'modifier';

/** How a line amount is interpreted. */
export type AmountUnit = 'drops' | 'grams' | 'percent';

/**
 * Percentage distribution of a material across pyramid tiers.
 * Values are in percent and should sum to ~100. A material is no longer
 * forced into a single tier: e.g. { top: 70, heart: 30 } for a "Kopf-Herz".
 * Partial: only the tiers a material actually contributes to are listed.
 */
export type TierWeights = Partial<Record<NoteTier, number>>;

/** One price point for a given pack size (total price for `grams` grams). */
export interface PriceTier {
  grams: number; // pack size in grams (1, 2.5, 5, 10, 20, 50, …)
  price: number; // total price for that pack in the app currency
}

/** A single fragrance material in the library. */
export interface Ingredient {
  id: UUID;
  name: string; // "Iso E Super", "Bergamot Calabria"
  cas?: string; // optional CAS number
  manufacturer?: string; // producer, e.g. "Firmenich", "Givaudan"
  supplier?: string; // sourcing / reseller, e.g. "perfumiarz", "Hekserij"
  noteTier: NoteTier; // dominant tier (max of tierWeights); used for filter/sort/badge
  /**
   * Optional per-tier percentage split. When present, the pyramid distributes
   * the line's active mass across these tiers. When absent, the material
   * behaves as 100 % `noteTier` (backward compatible).
   */
  tierWeights?: TierWeights;
  /** Density in g/ml — for drops<->grams & volume calculation. Default 1.0 if empty. */
  density?: number;
  /** Price per gram in the app currency (net raw material). Best €/g across priceTiers. */
  pricePerGram?: number;
  /** All known pack prices (total price per pack size). */
  priceTiers?: PriceTier[];
  /** Default dilution in % (e.g. 10 = 10% solution). 100 = neat. */
  defaultDilution: number; // 0 < x <= 100, default 100
  /** Stocked dilution / solvent as free text, e.g. "10% DPG", "1% ETH". */
  dilutionSolvent?: string;
  /** Odour strength, e.g. "stark", "nicht sehr stark". */
  odorStrength?: string;
  /** Recommended usage rate in a product, e.g. "Spur - 0,5%". */
  usageRate?: string;
  /** Shelf life as free text, e.g. "recht lange", "6-12 Mon". */
  shelfLife?: string;
  /** Purchase date (ISO yyyy-mm-dd). */
  purchaseDate?: string;
  /** Expiry date (ISO yyyy-mm-dd). */
  expiryDate?: string;
  /** Scent description / properties (free text). */
  characteristics?: string;
  ifraNote?: string; // free text, NO automatic checking
  tags?: string[];
  isSolvent?: boolean; // true for ethanol/alcohol/DPG etc.
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

/** A single line inside a formula. */
export interface FormulaLine {
  id: UUID;
  ingredientId: UUID;
  amount: number; // value, interpreted per Formula.unit
  /** Dilution of THIS line in % (overrides Ingredient.defaultDilution). */
  dilution: number; // 0 < x <= 100
  noteTierOverride?: NoteTier; // optional differing pyramid placement
  note?: string; // note for the line
}

/** A complete formula. */
export interface Formula {
  id: UUID;
  name: string; // "Vetiver Study #3"
  description?: string;
  /** Interpretation basis for all line amounts. */
  unit: AmountUnit; // "drops" | "grams" | "percent"
  /** Only relevant when unit === "drops": global g-per-drop fallback
   *  if an ingredient has no density. Default 0.02 g/drop. */
  gramsPerDrop: number;
  /** Target concentration of the finished perfume (concentrate share %):
   *  Parfum ~20-30, EdP ~15-20, EdT ~5-15, EdC ~2-5. */
  targetConcentration: number; // default 20
  /** Reference batch mass for unit === "percent" (grams). MVP default 100 g. */
  batchSizeGrams?: number;
  lines: FormulaLine[];
  version: number; // formula revision (increment on scale/edit)
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  currency: string; // "€"
  defaultUnit: AmountUnit; // "grams"
  defaultGramsPerDrop: number; // 0.02
  theme: 'light'; // v1 light only
}

/** Root object for JSON export/import. */
export interface AppData {
  schemaVersion: number; // currently 1 — for migrations
  exportedAt: string;
  ingredients: Ingredient[];
  formulas: Formula[];
  settings: AppSettings;
}

export const NOTE_TIERS: NoteTier[] = ['top', 'heart', 'base', 'modifier'];
export const AMOUNT_UNITS: AmountUnit[] = ['drops', 'grams', 'percent'];
export const SCHEMA_VERSION = 1;

/** The dominant tier of a weight distribution (highest %, ties → pyramid order). */
export function primaryTier(weights: TierWeights | undefined, fallback: NoteTier): NoteTier {
  if (!weights) return fallback;
  let best: NoteTier | undefined;
  let bestVal = -1;
  for (const tier of NOTE_TIERS) {
    const v = weights[tier];
    if (typeof v === 'number' && v > bestVal) {
      bestVal = v;
      best = tier;
    }
  }
  return best ?? fallback;
}

/**
 * Clean a raw weight map: keep finite positive entries and rescale so the sum
 * is 100. Returns undefined when there is nothing usable (→ caller falls back
 * to a single tier). Percentages are not rounded (display rounds).
 */
export function normalizeTierWeights(weights: TierWeights | undefined): TierWeights | undefined {
  if (!weights) return undefined;
  const entries = NOTE_TIERS.map((t) => [t, weights[t]] as const).filter(
    ([, v]) => typeof v === 'number' && Number.isFinite(v) && (v as number) > 0,
  ) as [NoteTier, number][];
  if (entries.length === 0) return undefined;
  const sum = entries.reduce((a, [, v]) => a + v, 0);
  const out: TierWeights = {};
  for (const [t, v] of entries) out[t] = (v / sum) * 100;
  return out;
}
