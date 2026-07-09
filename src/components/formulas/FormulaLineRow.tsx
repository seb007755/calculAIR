import { GripVertical, X, ChevronUp, ChevronDown } from 'lucide-react';
import type { AmountUnit, FormulaLine, Ingredient, NoteTier } from '../../types/models';
import { NOTE_TIERS } from '../../types/models';
import type { LineResult } from '../../lib/calc';
import { NumberInput } from '../ui/NumberInput';
import { NoteTierBadge } from '../ui/NoteTierBadge';
import { Button } from '../ui/Button';
import { amountUnitSuffix } from '../../lib/strings';
import { formatGrams, formatPercent } from '../../lib/units';
import styles from './FormulaLineRow.module.css';

interface Props {
  line: FormulaLine;
  result: LineResult;
  unit: AmountUnit;
  ingredients: Ingredient[];
  index: number;
  count: number;
  onPatch: (patch: Partial<FormulaLine>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onAddIngredient: () => void;
}

const NEW_INGREDIENT = '__new__';

export function FormulaLineRow({
  line,
  result,
  unit,
  ingredients,
  index,
  count,
  onPatch,
  onRemove,
  onMove,
  onAddIngredient,
}: Props) {
  const effectiveTier: NoteTier = result.noteTier;

  const cycleTier = () => {
    const i = NOTE_TIERS.indexOf(effectiveTier);
    onPatch({ noteTierOverride: NOTE_TIERS[(i + 1) % NOTE_TIERS.length] });
  };

  const onSelectIngredient = (value: string) => {
    if (value === NEW_INGREDIENT) {
      onAddIngredient();
      return;
    }
    const ing = ingredients.find((i) => i.id === value);
    // Adopt the ingredient's default dilution when (re)assigning.
    onPatch({ ingredientId: value, dilution: ing?.defaultDilution ?? line.dilution });
  };

  return (
    <div className={[styles.row, result.unknown ? styles.unknown : ''].join(' ')}>
      <div className={styles.handle} aria-hidden>
        <GripVertical size={14} />
      </div>

      <div className={styles.ingredient}>
        <select
          className={styles.select}
          value={result.unknown ? '' : line.ingredientId}
          onChange={(e) => onSelectIngredient(e.target.value)}
        >
          {result.unknown && (
            <option value="" disabled>
              Unbekannt — bitte wählen
            </option>
          )}
          {ingredients.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
              {i.isSolvent ? ' (Lösungsmittel)' : ''}
            </option>
          ))}
          <option value={NEW_INGREDIENT}>+ Neuer Duftstoff…</option>
        </select>
      </div>

      <div className={styles.tier}>
        <NoteTierBadge tier={effectiveTier} onClick={cycleTier} title="Tier ändern" />
      </div>

      <div className={styles.amount}>
        <NumberInput
          value={line.amount}
          suffix={amountUnitSuffix[unit]}
          min={0}
          ariaLabel="Menge"
          onValueChange={(v) => onPatch({ amount: v })}
        />
      </div>

      <div className={styles.dilution}>
        <NumberInput
          value={line.dilution}
          suffix="%"
          min={0}
          max={100}
          ariaLabel="Verdünnung"
          onValueChange={(v) => onPatch({ dilution: v })}
        />
      </div>

      <div className={[styles.computed, 'num'].join(' ')}>{formatGrams(result.massGrams)}</div>
      <div className={[styles.computed, 'num'].join(' ')}>
        {formatPercent(result.percentOfTotal)}
      </div>

      <div className={styles.rowActions}>
        <button
          className={styles.moveBtn}
          disabled={index === 0}
          onClick={() => onMove(-1)}
          aria-label="Nach oben"
        >
          <ChevronUp size={14} />
        </button>
        <button
          className={styles.moveBtn}
          disabled={index === count - 1}
          onClick={() => onMove(1)}
          aria-label="Nach unten"
        >
          <ChevronDown size={14} />
        </button>
        <Button
          variant="ghost"
          size="sm"
          icon={<X size={15} />}
          aria-label="Zeile entfernen"
          onClick={onRemove}
        />
      </div>
    </div>
  );
}
