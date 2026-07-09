import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import type { AmountUnit, Formula, FormulaLine, Ingredient, UUID } from '../../types/models';
import { AMOUNT_UNITS } from '../../types/models';
import { computeFormula } from '../../lib/calc';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Label } from '../ui/Label';
import { TextInput, TextArea } from '../ui/TextInput';
import { Select } from '../ui/Select';
import { NumberInput } from '../ui/NumberInput';
import { toast } from '../ui/Toast';
import { FormulaLineRow } from './FormulaLineRow';
import { FormulaSummary } from './FormulaSummary';
import { ScaleDialog } from './ScaleDialog';
import { IngredientForm, type IngredientDraft } from '../ingredients/IngredientForm';
import { amountUnitLabels } from '../../lib/strings';
import styles from './FormulaEditor.module.css';

interface Props {
  formula: Formula;
  ingredients: Ingredient[];
  currency: string;
  settingsCurrency: string;
  onCommit: (draft: Formula) => void;
  onExportPdf: (draft: Formula) => void;
  addIngredient: (draft: IngredientDraft) => Ingredient;
}

export function FormulaEditor({
  formula,
  ingredients,
  onCommit,
  onExportPdf,
  addIngredient,
  settingsCurrency,
}: Props) {
  const [draft, setDraft] = useState<Formula>(formula);
  const [dirty, setDirty] = useState(false);
  const [scaleOpen, setScaleOpen] = useState(false);
  const [ingFormOpen, setIngFormOpen] = useState(false);
  const [pendingLineId, setPendingLineId] = useState<UUID | null>(null);

  const ingredientsById = useMemo(
    () => Object.fromEntries(ingredients.map((i) => [i.id, i])) as Record<UUID, Ingredient>,
    [ingredients],
  );
  const sortedIngredients = useMemo(
    () => [...ingredients].sort((a, b) => a.name.localeCompare(b.name, 'de')),
    [ingredients],
  );

  const result = useMemo(
    () => computeFormula(draft, ingredientsById, { batchSizeGrams: draft.batchSizeGrams }),
    [draft, ingredientsById],
  );

  const patch = (p: Partial<Formula>) => {
    setDraft((d) => ({ ...d, ...p }));
    setDirty(true);
  };

  const patchLine = (lineId: UUID, p: Partial<FormulaLine>) => {
    setDraft((d) => ({
      ...d,
      lines: d.lines.map((l) => (l.id === lineId ? { ...l, ...p } : l)),
    }));
    setDirty(true);
  };

  const addLine = () => {
    const first = sortedIngredients[0];
    const line: FormulaLine = {
      id: crypto.randomUUID(),
      ingredientId: first?.id ?? '',
      amount: 0,
      dilution: first?.defaultDilution ?? 100,
    };
    patch({ lines: [...draft.lines, line] });
  };

  const removeLine = (lineId: UUID) =>
    patch({ lines: draft.lines.filter((l) => l.id !== lineId) });

  const moveLine = (lineId: UUID, dir: -1 | 1) => {
    const idx = draft.lines.findIndex((l) => l.id === lineId);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= draft.lines.length) return;
    const lines = [...draft.lines];
    [lines[idx], lines[target]] = [lines[target], lines[idx]];
    patch({ lines });
  };

  const save = () => {
    onCommit(draft);
    setDirty(false);
  };
  const reset = () => {
    setDraft(formula);
    setDirty(false);
  };

  const onAddIngredientFor = (lineId: UUID) => {
    setPendingLineId(lineId);
    setIngFormOpen(true);
  };
  const submitNewIngredient = (idraft: IngredientDraft) => {
    const created = addIngredient(idraft);
    if (pendingLineId) {
      patchLine(pendingLineId, { ingredientId: created.id, dilution: created.defaultDilution });
    }
    setIngFormOpen(false);
    setPendingLineId(null);
    toast.success('Duftstoff angelegt.');
  };

  return (
    <div className={styles.layout}>
      {/* Left column — line editor */}
      <div className={styles.left}>
        <Card>
          <div className={styles.metaGrid}>
            <div className={styles.full}>
              <Label htmlFor="f-name">Name</Label>
              <TextInput
                id="f-name"
                value={draft.name}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </div>
            <div className={styles.full}>
              <Label htmlFor="f-desc">Beschreibung</Label>
              <TextArea
                id="f-desc"
                value={draft.description ?? ''}
                placeholder="Optional"
                onChange={(e) => patch({ description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="f-unit">Einheit</Label>
              <Select
                id="f-unit"
                value={draft.unit}
                onChange={(e) => patch({ unit: e.target.value as AmountUnit })}
                options={AMOUNT_UNITS.map((u) => ({ value: u, label: amountUnitLabels[u] }))}
              />
            </div>
            <div>
              <Label>Ziel-Konzentration</Label>
              <NumberInput
                value={draft.targetConcentration}
                suffix="%"
                min={0}
                max={100}
                onValueChange={(v) => patch({ targetConcentration: v })}
              />
            </div>
            {draft.unit === 'drops' && (
              <div>
                <Label>g pro Tropfen (Fallback)</Label>
                <NumberInput
                  value={draft.gramsPerDrop}
                  suffix="g"
                  min={0}
                  onValueChange={(v) => patch({ gramsPerDrop: v })}
                />
              </div>
            )}
            {draft.unit === 'percent' && (
              <div>
                <Label>Bezugsmenge (Batch)</Label>
                <NumberInput
                  value={draft.batchSizeGrams ?? 100}
                  suffix="g"
                  min={0}
                  onValueChange={(v) => patch({ batchSizeGrams: v })}
                />
              </div>
            )}
          </div>
        </Card>

        <Card padded={false} className={styles.linesCard}>
          <div className={styles.linesHeader}>
            <span>Duftstoff</span>
            <span>Tier</span>
            <span className="num">Menge</span>
            <span className="num">Verd.</span>
            <span className="num">Masse</span>
            <span className="num">Anteil</span>
            <span />
          </div>

          <div className={styles.lines}>
            {draft.lines.length === 0 && (
              <p className={styles.emptyLines}>
                Noch keine Zeilen. Füge unten deinen ersten Duftstoff hinzu.
              </p>
            )}
            {draft.lines.map((line, i) => {
              const lineResult = result.lines[i];
              return (
                <FormulaLineRow
                  key={line.id}
                  line={line}
                  result={lineResult}
                  unit={draft.unit}
                  ingredients={sortedIngredients}
                  index={i}
                  count={draft.lines.length}
                  onPatch={(p) => patchLine(line.id, p)}
                  onRemove={() => removeLine(line.id)}
                  onMove={(dir) => moveLine(line.id, dir)}
                  onAddIngredient={() => onAddIngredientFor(line.id)}
                />
              );
            })}
          </div>

          <div className={styles.linesFooter}>
            <Button
              variant="secondary"
              icon={<Plus size={16} />}
              onClick={addLine}
              disabled={sortedIngredients.length === 0}
            >
              Zeile hinzufügen
            </Button>
            {sortedIngredients.length === 0 && (
              <span className={styles.hint}>Lege zuerst einen Duftstoff an.</span>
            )}
          </div>
        </Card>
      </div>

      {/* Right column — summary */}
      <div className={styles.right}>
        <FormulaSummary
          result={result}
          settings={{
            currency: settingsCurrency,
            defaultUnit: draft.unit,
            defaultGramsPerDrop: draft.gramsPerDrop,
            theme: 'light',
          }}
          targetConcentration={draft.targetConcentration}
          dirty={dirty}
          onSave={save}
          onScale={() => setScaleOpen(true)}
          onPdf={() => onExportPdf(draft)}
          onReset={reset}
        />
      </div>

      <ScaleDialog
        open={scaleOpen}
        formula={draft}
        ingredientsById={ingredientsById}
        onClose={() => setScaleOpen(false)}
        onApply={(scaled) => {
          setDraft(scaled);
          setDirty(true);
          setScaleOpen(false);
          toast.info(`Skaliert auf Version ${scaled.version}.`);
        }}
      />

      <IngredientForm
        open={ingFormOpen}
        onClose={() => {
          setIngFormOpen(false);
          setPendingLineId(null);
        }}
        onSubmit={submitNewIngredient}
      />
    </div>
  );
}
