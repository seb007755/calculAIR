/**
 * JSON export/import: serialization, lightweight validation, migration
 * scaffold and referential-integrity checks. Hand-written (no schema lib).
 */
import type {
  AmountUnit,
  AppData,
  AppSettings,
  Formula,
  FormulaLine,
  Ingredient,
  NoteTier,
  UUID,
} from '../types/models';
import { AMOUNT_UNITS, NOTE_TIERS, SCHEMA_VERSION } from '../types/models';

export interface ImportResult {
  data: AppData;
  warnings: string[];
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const num = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;
const optNum = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;
const bool = (v: unknown): boolean | undefined => (typeof v === 'boolean' ? v : undefined);
const nowIso = () => new Date().toISOString();

const noteTier = (v: unknown): NoteTier =>
  NOTE_TIERS.includes(v as NoteTier) ? (v as NoteTier) : 'heart';
const amountUnit = (v: unknown): AmountUnit =>
  AMOUNT_UNITS.includes(v as AmountUnit) ? (v as AmountUnit) : 'grams';

function coerceIngredient(raw: unknown): Ingredient | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id) || crypto.randomUUID();
  const name = str(raw.name).trim();
  if (!name) return null;
  return {
    id,
    name,
    cas: raw.cas != null ? str(raw.cas) : undefined,
    supplier: raw.supplier != null ? str(raw.supplier) : undefined,
    noteTier: noteTier(raw.noteTier),
    density: optNum(raw.density),
    pricePerGram: optNum(raw.pricePerGram),
    defaultDilution: clamp(num(raw.defaultDilution, 100), 0, 100) || 100,
    ifraNote: raw.ifraNote != null ? str(raw.ifraNote) : undefined,
    tags: Array.isArray(raw.tags) ? raw.tags.filter((t): t is string => typeof t === 'string') : undefined,
    isSolvent: bool(raw.isSolvent),
    createdAt: str(raw.createdAt) || nowIso(),
    updatedAt: str(raw.updatedAt) || nowIso(),
  };
}

function coerceLine(raw: unknown): FormulaLine | null {
  if (!isObj(raw)) return null;
  const ingredientId = str(raw.ingredientId);
  if (!ingredientId) return null;
  return {
    id: str(raw.id) || crypto.randomUUID(),
    ingredientId,
    amount: num(raw.amount, 0),
    dilution: clamp(num(raw.dilution, 100), 0, 100),
    noteTierOverride: NOTE_TIERS.includes(raw.noteTierOverride as NoteTier)
      ? (raw.noteTierOverride as NoteTier)
      : undefined,
    note: raw.note != null ? str(raw.note) : undefined,
  };
}

function coerceFormula(raw: unknown): Formula | null {
  if (!isObj(raw)) return null;
  const name = str(raw.name).trim();
  if (!name) return null;
  const lines = Array.isArray(raw.lines)
    ? (raw.lines.map(coerceLine).filter(Boolean) as FormulaLine[])
    : [];
  return {
    id: str(raw.id) || crypto.randomUUID(),
    name,
    description: raw.description != null ? str(raw.description) : undefined,
    unit: amountUnit(raw.unit),
    gramsPerDrop: num(raw.gramsPerDrop, 0.02),
    targetConcentration: num(raw.targetConcentration, 20),
    batchSizeGrams: optNum(raw.batchSizeGrams),
    lines,
    version: num(raw.version, 1),
    createdAt: str(raw.createdAt) || nowIso(),
    updatedAt: str(raw.updatedAt) || nowIso(),
  };
}

function coerceSettings(raw: unknown): AppSettings {
  const o = isObj(raw) ? raw : {};
  return {
    currency: str(o.currency, '€') || '€',
    defaultUnit: amountUnit(o.defaultUnit),
    defaultGramsPerDrop: num(o.defaultGramsPerDrop, 0.02),
    theme: 'light',
  };
}

/** Migration scaffold. v1 is current; older versions would be upgraded here. */
function migrate(raw: Record<string, unknown>): Record<string, unknown> {
  const version = num(raw.schemaVersion, 1);
  // Example placeholder for future migrations:
  // if (version < 2) { ...transform...; version = 2; }
  return { ...raw, schemaVersion: Math.max(version, SCHEMA_VERSION) };
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** Parse and validate a JSON string into AppData. Throws on unrecoverable input. */
export function parseAppData(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Datei ist kein gültiges JSON.');
  }
  if (!isObj(parsed)) throw new Error('Unerwartetes JSON-Format.');

  const raw = migrate(parsed);
  const warnings: string[] = [];

  if (!Array.isArray(raw.ingredients) && !Array.isArray(raw.formulas)) {
    throw new Error('Keine Duftstoffe oder Rezepturen in der Datei gefunden.');
  }

  const ingredients = (Array.isArray(raw.ingredients) ? raw.ingredients : [])
    .map(coerceIngredient)
    .filter(Boolean) as Ingredient[];
  const formulas = (Array.isArray(raw.formulas) ? raw.formulas : [])
    .map(coerceFormula)
    .filter(Boolean) as Formula[];
  const settings = coerceSettings(raw.settings);

  // Referential integrity: warn about lines pointing at missing ingredients.
  const knownIds = new Set<UUID>(ingredients.map((i) => i.id));
  let dangling = 0;
  for (const f of formulas) {
    for (const l of f.lines) {
      if (!knownIds.has(l.ingredientId)) dangling += 1;
    }
  }
  if (dangling > 0) {
    warnings.push(
      `${dangling} Rezeptur-Zeile(n) verweisen auf nicht enthaltene Duftstoffe und werden als „Unbekannt" markiert.`,
    );
  }

  return {
    data: {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: str(raw.exportedAt) || nowIso(),
      ingredients,
      formulas,
      settings,
    },
    warnings,
  };
}

/** Trigger a browser download of AppData as pretty-printed JSON. */
export function downloadAppData(data: AppData): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `perfume-data-${date}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
