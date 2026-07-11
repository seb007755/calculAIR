import { useState } from 'react';
import type { Ingredient, NoteTier, PriceTier } from '../../types/models';
import { NOTE_TIERS, normalizeTierWeights, primaryTier } from '../../types/models';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Label } from '../ui/Label';
import { TextInput, TextArea } from '../ui/TextInput';
import { Select } from '../ui/Select';
import { NumberInput } from '../ui/NumberInput';
import { noteTierLabels } from '../../lib/strings';
import { formatMoney } from '../../lib/units';
import styles from './IngredientForm.module.css';

/** Shape used by the form (no id/timestamps). */
export type IngredientDraft = Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'>;

interface Props {
  open: boolean;
  initial?: Ingredient;
  onClose: () => void;
  onSubmit: (draft: IngredientDraft) => void;
}

/** Pack sizes (grams) offered for tiered pricing. */
const PACK_SIZES = [1, 2.5, 5, 10, 20, 50];
/** Normalized odour-strength vocabulary. */
const ODOR_OPTIONS = [
  'schwach',
  'nicht sehr stark',
  'mittel',
  'mittel stark',
  'recht stark',
  'stark',
  'sehr stark',
];

type TierMap = Record<NoteTier, number>;
type PriceMap = Record<number, number>;

function emptyDraft(): IngredientDraft {
  return {
    name: '',
    cas: '',
    manufacturer: '',
    supplier: '',
    noteTier: 'heart',
    tierWeights: undefined,
    density: undefined,
    pricePerGram: undefined,
    priceTiers: undefined,
    defaultDilution: 100,
    dilutionSolvent: '',
    odorStrength: '',
    usageRate: '',
    shelfLife: '',
    purchaseDate: '',
    expiryDate: '',
    characteristics: '',
    ifraNote: '',
    tags: [],
    isSolvent: false,
  };
}

function initTierPct(ing?: Ingredient): TierMap {
  const base: TierMap = { top: 0, heart: 0, base: 0, modifier: 0 };
  const w = ing?.tierWeights;
  if (w && Object.keys(w).length) {
    for (const t of NOTE_TIERS) base[t] = w[t] ?? 0;
    return base;
  }
  base[ing?.noteTier ?? 'heart'] = 100;
  return base;
}

function initPrices(ing?: Ingredient): PriceMap {
  const m: PriceMap = {};
  for (const g of PACK_SIZES) m[g] = 0;
  for (const pt of ing?.priceTiers ?? []) if (m[pt.grams] !== undefined) m[pt.grams] = pt.price;
  return m;
}

/** Best (lowest) price per gram across the filled pack sizes. */
function bestPricePerGram(prices: PriceMap): number | undefined {
  let best: number | undefined;
  for (const g of PACK_SIZES) {
    const p = prices[g];
    if (p > 0) {
      const perG = p / g;
      if (best === undefined || perG < best) best = perG;
    }
  }
  return best;
}

const gramLabel = (g: number) => `${g.toString().replace('.', ',')} g`;

export function IngredientForm({ open, initial, onClose, onSubmit }: Props) {
  const [draft, setDraft] = useState<IngredientDraft>(() =>
    initial ? { ...initial } : emptyDraft(),
  );
  const [tierPct, setTierPct] = useState<TierMap>(() => initTierPct(initial));
  const [prices, setPrices] = useState<PriceMap>(() => initPrices(initial));
  const [tagsText, setTagsText] = useState<string>((initial?.tags ?? []).join(', '));
  const [error, setError] = useState<string | null>(null);

  // Re-seed the form whenever it opens for a different ingredient.
  const key = initial?.id ?? 'new';
  const [seededKey, setSeededKey] = useState(key);
  if (open && seededKey !== key) {
    setDraft(initial ? { ...initial } : emptyDraft());
    setTierPct(initTierPct(initial));
    setPrices(initPrices(initial));
    setTagsText((initial?.tags ?? []).join(', '));
    setError(null);
    setSeededKey(key);
  }

  const set = <K extends keyof IngredientDraft>(field: K, value: IngredientDraft[K]) =>
    setDraft((d) => ({ ...d, [field]: value }));

  const tierSum = NOTE_TIERS.reduce((a, t) => a + (tierPct[t] || 0), 0);
  const tierOk = Math.abs(tierSum - 100) < 0.5;

  const normalizeTiers = () => {
    if (tierSum <= 0) return;
    setTierPct((p) => {
      const out = { ...p };
      for (const t of NOTE_TIERS) out[t] = (p[t] / tierSum) * 100;
      return out;
    });
  };

  const derivedPerGram = bestPricePerGram(prices);

  const submit = () => {
    if (!draft.name.trim()) {
      setError('Bitte einen Namen angeben.');
      return;
    }
    const tags = tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    // Tier weights: keep positive entries; derive dominant tier.
    const rawWeights = Object.fromEntries(
      NOTE_TIERS.filter((t) => (tierPct[t] || 0) > 0).map((t) => [t, tierPct[t]]),
    );
    const tierWeights = normalizeTierWeights(rawWeights);
    const noteTier = primaryTier(tierWeights, draft.noteTier ?? 'heart');

    // Price tiers + best €/g (explicit pricePerGram wins if set).
    const priceTiers: PriceTier[] = PACK_SIZES.filter((g) => prices[g] > 0).map((g) => ({
      grams: g,
      price: prices[g],
    }));
    const pricePerGram =
      draft.pricePerGram && draft.pricePerGram > 0 ? draft.pricePerGram : bestPricePerGram(prices);

    onSubmit({
      ...draft,
      name: draft.name.trim(),
      cas: draft.cas?.trim() || undefined,
      manufacturer: draft.manufacturer?.trim() || undefined,
      supplier: draft.supplier?.trim() || undefined,
      noteTier,
      tierWeights,
      pricePerGram,
      priceTiers: priceTiers.length ? priceTiers : undefined,
      defaultDilution: draft.defaultDilution > 0 ? draft.defaultDilution : 100,
      dilutionSolvent: draft.dilutionSolvent?.trim() || undefined,
      odorStrength: draft.odorStrength?.trim() || undefined,
      usageRate: draft.usageRate?.trim() || undefined,
      shelfLife: draft.shelfLife?.trim() || undefined,
      purchaseDate: draft.purchaseDate?.trim() || undefined,
      expiryDate: draft.expiryDate?.trim() || undefined,
      characteristics: draft.characteristics?.trim() || undefined,
      ifraNote: draft.ifraNote?.trim() || undefined,
      tags: tags.length ? tags : undefined,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Duftstoff bearbeiten' : 'Neuer Duftstoff'}
      width={680}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button onClick={submit}>Speichern</Button>
        </>
      }
    >
      <div className={styles.grid}>
        <div className={styles.full}>
          <Label htmlFor="ing-name">Name</Label>
          <TextInput
            id="ing-name"
            value={draft.name}
            placeholder="z. B. Iso E Super"
            onChange={(e) => set('name', e.target.value)}
          />
          {error && <p className={styles.error}>{error}</p>}
        </div>

        <div>
          <Label htmlFor="ing-manufacturer">Hersteller</Label>
          <TextInput
            id="ing-manufacturer"
            value={draft.manufacturer ?? ''}
            placeholder="z. B. Firmenich"
            onChange={(e) => set('manufacturer', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="ing-supplier">Lieferant</Label>
          <TextInput
            id="ing-supplier"
            value={draft.supplier ?? ''}
            placeholder="z. B. perfumiarz"
            onChange={(e) => set('supplier', e.target.value)}
          />
        </div>

        {/* --- Duftpyramide (prozentuale Tier-Verteilung) --- */}
        <div className={styles.sectionLabel}>Duftpyramide (prozentuale Verteilung)</div>
        <div className={styles.tierEditor}>
          {NOTE_TIERS.map((t) => (
            <div key={t} className={styles.tierCell}>
              <span className={styles.tierCellLabel}>{noteTierLabels[t]}</span>
              <NumberInput
                value={tierPct[t]}
                suffix="%"
                min={0}
                max={100}
                ariaLabel={`Anteil ${noteTierLabels[t]}`}
                onValueChange={(v) => setTierPct((p) => ({ ...p, [t]: v }))}
              />
            </div>
          ))}
        </div>
        <div className={styles.sumRow}>
          <span>
            Summe:{' '}
            <span className={tierOk ? styles.sumOk : styles.sumWarn}>
              {tierSum.toFixed(0)} %
            </span>
          </span>
          {!tierOk && tierSum > 0 && (
            <button type="button" className={styles.linkBtn} onClick={normalizeTiers}>
              auf 100 % normalisieren
            </button>
          )}
        </div>

        {/* --- Preise je Packungsgröße --- */}
        <div className={styles.sectionLabel}>Preise je Packungsgröße (Gesamtpreis)</div>
        <div className={styles.priceGrid}>
          {PACK_SIZES.map((g) => (
            <div key={g} className={styles.cell}>
              <span className={styles.cellLabel}>{gramLabel(g)}</span>
              <NumberInput
                value={prices[g]}
                min={0}
                ariaLabel={`Preis ${gramLabel(g)}`}
                onValueChange={(v) => setPrices((p) => ({ ...p, [g]: v }))}
              />
            </div>
          ))}
        </div>
        <div className={styles.priceHint}>
          {derivedPerGram != null
            ? `Bester Preis/g aus den Stufen: ${formatMoney(derivedPerGram)}`
            : 'Kein Preis erfasst — Preis/g bleibt leer.'}
        </div>

        <div>
          <Label>Preis pro Gramm (überschreibt)</Label>
          <NumberInput
            value={draft.pricePerGram ?? 0}
            suffix="/g"
            min={0}
            ariaLabel="Preis pro Gramm"
            onValueChange={(v) => set('pricePerGram', v > 0 ? v : undefined)}
          />
        </div>
        <div>
          <Label>Dichte</Label>
          <NumberInput
            value={draft.density ?? 0}
            suffix="g/ml"
            min={0}
            ariaLabel="Dichte"
            onValueChange={(v) => set('density', v > 0 ? v : undefined)}
          />
        </div>

        {/* --- Verarbeitung --- */}
        <div className={styles.sectionLabel}>Verarbeitung</div>
        <div>
          <Label>Standard-Verdünnung</Label>
          <NumberInput
            value={draft.defaultDilution}
            suffix="%"
            min={0}
            max={100}
            ariaLabel="Standard-Verdünnung"
            onValueChange={(v) => set('defaultDilution', v)}
          />
        </div>
        <div>
          <Label htmlFor="ing-dilsolv">Verdünnung / Lösungsmittel</Label>
          <TextInput
            id="ing-dilsolv"
            value={draft.dilutionSolvent ?? ''}
            placeholder="z. B. 10% DPG"
            onChange={(e) => set('dilutionSolvent', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="ing-odor">Duftausprägung</Label>
          <Select
            id="ing-odor"
            value={draft.odorStrength ?? ''}
            onChange={(e) => set('odorStrength', e.target.value)}
            options={[
              { value: '', label: '—' },
              ...ODOR_OPTIONS.map((o) => ({ value: o, label: o })),
            ]}
          />
        </div>
        <div>
          <Label htmlFor="ing-usage">Verwendung im Produkt</Label>
          <TextInput
            id="ing-usage"
            value={draft.usageRate ?? ''}
            placeholder="z. B. Spur - 0,5%"
            onChange={(e) => set('usageRate', e.target.value)}
          />
        </div>

        {/* --- Bestand & Haltbarkeit --- */}
        <div className={styles.sectionLabel}>Bestand & Haltbarkeit</div>
        <div>
          <Label htmlFor="ing-cas">CAS-Nummer</Label>
          <TextInput
            id="ing-cas"
            value={draft.cas ?? ''}
            placeholder="optional"
            onChange={(e) => set('cas', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="ing-shelf">Haltbarkeit</Label>
          <TextInput
            id="ing-shelf"
            value={draft.shelfLife ?? ''}
            placeholder="z. B. recht lange"
            onChange={(e) => set('shelfLife', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="ing-purchase">Kaufdatum</Label>
          <TextInput
            id="ing-purchase"
            value={draft.purchaseDate ?? ''}
            placeholder="JJJJ-MM-TT"
            onChange={(e) => set('purchaseDate', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="ing-expiry">Ablaufdatum</Label>
          <TextInput
            id="ing-expiry"
            value={draft.expiryDate ?? ''}
            placeholder="JJJJ-MM-TT"
            onChange={(e) => set('expiryDate', e.target.value)}
          />
        </div>

        {/* --- Beschreibung --- */}
        <div className={styles.sectionLabel}>Beschreibung</div>
        <div className={styles.full}>
          <Label htmlFor="ing-tags">Tags (Komma-getrennt)</Label>
          <TextInput
            id="ing-tags"
            value={tagsText}
            placeholder="citrus, natural"
            onChange={(e) => setTagsText(e.target.value)}
          />
        </div>
        <div className={styles.full}>
          <Label htmlFor="ing-char">Eigenschaften / Duftbeschreibung</Label>
          <TextArea
            id="ing-char"
            value={draft.characteristics ?? ''}
            placeholder="z. B. holzig, ambriert, langanhaltend"
            onChange={(e) => set('characteristics', e.target.value)}
          />
        </div>
        <div className={styles.full}>
          <Label htmlFor="ing-ifra">IFRA-Notiz (nur Freitext)</Label>
          <TextArea
            id="ing-ifra"
            value={draft.ifraNote ?? ''}
            placeholder="Keine automatische Prüfung."
            onChange={(e) => set('ifraNote', e.target.value)}
          />
        </div>

        <div className={styles.full}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={draft.isSolvent ?? false}
              onChange={(e) => set('isSolvent', e.target.checked)}
            />
            <span>Lösungsmittel (Alkohol/DPG etc.) — zählt zum Lösungsmittel-Anteil</span>
          </label>
        </div>
      </div>
    </Modal>
  );
}
