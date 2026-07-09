import { useEffect, useState } from 'react';
import type { Formula, Ingredient, UUID } from '../../types/models';
import { computeFormula, scaleFormulaToMass } from '../../lib/calc';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Label } from '../ui/Label';
import { NumberInput } from '../ui/NumberInput';
import { formatGrams } from '../../lib/units';
import styles from './ScaleDialog.module.css';

interface Props {
  open: boolean;
  formula: Formula;
  ingredientsById: Record<UUID, Ingredient>;
  onClose: () => void;
  onApply: (scaled: Formula) => void;
}

export function ScaleDialog({ open, formula, ingredientsById, onClose, onApply }: Props) {
  const currentMass = computeFormula(formula, ingredientsById).totalMassGrams;
  const [target, setTarget] = useState<number>(currentMass || 100);
  const [factor, setFactor] = useState<number>(1);
  const [mode, setMode] = useState<'mass' | 'factor'>('mass');

  // Reset inputs each time the dialog opens.
  useEffect(() => {
    if (open) {
      setTarget(currentMass || 100);
      setFactor(1);
      setMode('mass');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const effectiveTarget =
    mode === 'mass' ? target : currentMass > 0 ? currentMass * factor : target;

  const apply = () => {
    const scaled = scaleFormulaToMass(formula, ingredientsById, effectiveTarget);
    onApply(scaled);
  };

  const isPercent = formula.unit === 'percent';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Rezeptur skalieren"
      width={460}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button onClick={apply} disabled={!(effectiveTarget > 0)}>
            Anwenden
          </Button>
        </>
      }
    >
      <p className={styles.intro}>
        Aktuelle Gesamtmenge: <strong>{formatGrams(currentMass)}</strong>
        {isPercent && (
          <>
            <br />
            Im Prozent-Modus wird nur die Bezugsmenge (Batch) gesetzt; die Anteile bleiben gleich.
          </>
        )}
      </p>

      <div className={styles.tabs}>
        <button
          className={[styles.tab, mode === 'mass' ? styles.tabActive : ''].join(' ')}
          onClick={() => setMode('mass')}
        >
          Zielmasse
        </button>
        <button
          className={[styles.tab, mode === 'factor' ? styles.tabActive : ''].join(' ')}
          onClick={() => setMode('factor')}
          disabled={isPercent || !(currentMass > 0)}
        >
          Faktor
        </button>
      </div>

      {mode === 'mass' ? (
        <div>
          <Label>Zielmasse</Label>
          <NumberInput value={target} suffix="g" min={0} onValueChange={setTarget} />
        </div>
      ) : (
        <div>
          <Label>Faktor</Label>
          <NumberInput value={factor} suffix="×" min={0} onValueChange={setFactor} />
        </div>
      )}

      <div className={styles.preview}>
        <span>Neue Gesamtmenge</span>
        <strong className="num">{formatGrams(effectiveTarget)}</strong>
      </div>
    </Modal>
  );
}
