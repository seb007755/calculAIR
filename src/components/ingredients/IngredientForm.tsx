import { useState } from 'react';
import type { Ingredient, NoteTier } from '../../types/models';
import { NOTE_TIERS } from '../../types/models';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Label } from '../ui/Label';
import { TextInput, TextArea } from '../ui/TextInput';
import { Select } from '../ui/Select';
import { NumberInput } from '../ui/NumberInput';
import { noteTierLabels } from '../../lib/strings';
import styles from './IngredientForm.module.css';

/** Shape used by the form (no id/timestamps). */
export type IngredientDraft = Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'>;

interface Props {
  open: boolean;
  initial?: Ingredient;
  onClose: () => void;
  onSubmit: (draft: IngredientDraft) => void;
}

function emptyDraft(): IngredientDraft {
  return {
    name: '',
    cas: '',
    supplier: '',
    noteTier: 'heart',
    density: undefined,
    pricePerGram: undefined,
    defaultDilution: 100,
    ifraNote: '',
    tags: [],
    isSolvent: false,
  };
}

export function IngredientForm({ open, initial, onClose, onSubmit }: Props) {
  const [draft, setDraft] = useState<IngredientDraft>(() =>
    initial ? { ...initial } : emptyDraft(),
  );
  const [tagsText, setTagsText] = useState<string>((initial?.tags ?? []).join(', '));
  const [error, setError] = useState<string | null>(null);

  // Re-seed the form whenever it opens for a different ingredient.
  const key = initial?.id ?? 'new';
  const [seededKey, setSeededKey] = useState(key);
  if (open && seededKey !== key) {
    setDraft(initial ? { ...initial } : emptyDraft());
    setTagsText((initial?.tags ?? []).join(', '));
    setError(null);
    setSeededKey(key);
  }

  const set = <K extends keyof IngredientDraft>(field: K, value: IngredientDraft[K]) =>
    setDraft((d) => ({ ...d, [field]: value }));

  const submit = () => {
    if (!draft.name.trim()) {
      setError('Bitte einen Namen angeben.');
      return;
    }
    const tags = tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    onSubmit({
      ...draft,
      name: draft.name.trim(),
      cas: draft.cas?.trim() || undefined,
      supplier: draft.supplier?.trim() || undefined,
      ifraNote: draft.ifraNote?.trim() || undefined,
      defaultDilution: draft.defaultDilution > 0 ? draft.defaultDilution : 100,
      tags: tags.length ? tags : undefined,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Duftstoff bearbeiten' : 'Neuer Duftstoff'}
      width={620}
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
          <Label htmlFor="ing-tier">Duftpyramide</Label>
          <Select
            id="ing-tier"
            value={draft.noteTier}
            onChange={(e) => set('noteTier', e.target.value as NoteTier)}
            options={NOTE_TIERS.map((t) => ({ value: t, label: noteTierLabels[t] }))}
          />
        </div>

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
          <Label>Dichte</Label>
          <NumberInput
            value={draft.density ?? 0}
            suffix="g/ml"
            min={0}
            ariaLabel="Dichte"
            onValueChange={(v) => set('density', v > 0 ? v : undefined)}
          />
        </div>

        <div>
          <Label>Preis pro Gramm</Label>
          <NumberInput
            value={draft.pricePerGram ?? 0}
            suffix="/g"
            min={0}
            ariaLabel="Preis pro Gramm"
            onValueChange={(v) => set('pricePerGram', v > 0 ? v : undefined)}
          />
        </div>

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
          <Label htmlFor="ing-supplier">Bezugsquelle</Label>
          <TextInput
            id="ing-supplier"
            value={draft.supplier ?? ''}
            placeholder="optional"
            onChange={(e) => set('supplier', e.target.value)}
          />
        </div>

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
