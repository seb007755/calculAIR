import { useNavigate } from 'react-router-dom';
import { Copy, FileDown, Trash2, Layers } from 'lucide-react';
import type { Formula, Ingredient, UUID } from '../../types/models';
import { computeFormula } from '../../lib/calc';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { amountUnitLabels } from '../../lib/strings';
import { formatGrams, formatMoney } from '../../lib/units';
import styles from './FormulaList.module.css';

interface Props {
  formulas: Formula[];
  ingredientsById: Record<UUID, Ingredient>;
  currency: string;
  onDuplicate: (f: Formula) => void;
  onDelete: (f: Formula) => void;
  onPdf: (f: Formula) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('de-DE');
}

export function FormulaList({
  formulas,
  ingredientsById,
  currency,
  onDuplicate,
  onDelete,
  onPdf,
}: Props) {
  const navigate = useNavigate();

  return (
    <div className={styles.grid}>
      {formulas.map((f) => {
        const r = computeFormula(f, ingredientsById, { batchSizeGrams: f.batchSizeGrams });
        return (
          <Card key={f.id} className={styles.card}>
            <button
              className={styles.body}
              onClick={() => navigate(`/formula/${f.id}`)}
              aria-label={`${f.name} öffnen`}
            >
              <div className={styles.top}>
                <h3 className={styles.name}>{f.name}</h3>
                <span className={styles.version}>v{f.version}</span>
              </div>
              {f.description && <p className={styles.desc}>{f.description}</p>}
              <div className={styles.stats}>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>
                    <Layers size={12} /> Zeilen
                  </span>
                  <span className={[styles.statValue, 'num'].join(' ')}>{f.lines.length}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Gesamt</span>
                  <span className={[styles.statValue, 'num'].join(' ')}>
                    {formatGrams(r.totalMassGrams)}
                  </span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Kosten/ml</span>
                  <span className={[styles.statValue, 'num'].join(' ')}>
                    {formatMoney(r.costPerMl, currency)}
                  </span>
                </div>
              </div>
            </button>

            <div className={styles.footer}>
              <span className={styles.metaText}>
                {amountUnitLabels[f.unit]} · geändert {formatDate(f.updatedAt)}
              </span>
              <div className={styles.actions}>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Copy size={14} />}
                  aria-label="Duplizieren"
                  onClick={() => onDuplicate(f)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<FileDown size={14} />}
                  aria-label="Als PDF"
                  onClick={() => onPdf(f)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 size={14} />}
                  aria-label="Löschen"
                  onClick={() => onDelete(f)}
                />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
