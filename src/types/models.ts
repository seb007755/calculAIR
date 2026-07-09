export type UUID = string;

/** Fragrance tier for the scent pyramid. */
export type NoteTier = 'top' | 'heart' | 'base' | 'modifier';

/** How a line amount is interpreted. */
export type AmountUnit = 'drops' | 'grams' | 'percent';

/** A single fragrance material in the library. */
export interface Ingredient {
  id: UUID;
  name: string; // "Iso E Super", "Bergamot Calabria"
  cas?: string; // optional CAS number
  supplier?: string; // sourcing
  noteTier: NoteTier; // default pyramid placement
  /** Density in g/ml — for drops<->grams & volume calculation. Default 1.0 if empty. */
  density?: number;
  /** Price per gram in the app currency (net raw material). */
  pricePerGram?: number;
  /** Default dilution in % (e.g. 10 = 10% solution). 100 = neat. */
  defaultDilution: number; // 0 < x <= 100, default 100
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
