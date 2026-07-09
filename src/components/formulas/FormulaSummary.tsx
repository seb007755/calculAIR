import { Save, Scaling, FileDown, RotateCcw } from 'lucide-react';
import type { FormulaResult } from '../../lib/calc';
import { solventToAddForTargetConcentration } from '../../lib/calc';
import type { AppSettings, NoteTier } from '../../types/models';
import { NOTE_TIERS } from '../../types/models';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { noteTierLabels } from '../../lib/strings';
import { formatGrams, formatMl, formatMoney, formatNumber2, formatPercent } from '../../lib/units';
import styles from './FormulaSummary.module.css';

interface Props {
  result: FormulaResult;
  settings: AppSettings;
  targetConcentration: number;
  dirty: boolean;
  onSave: () => void;
  onScale: () => void;
  onPdf: () => void;
  onReset: () => void;
}

const tierColors: Record<NoteTier, string> = {
  top: '#9a3412',
  heart: '#9d174d',
  base: '#075985',
  modifier: '#6b7280',
};

export function FormulaSummary({
  result,
  settings,
  targetConcentration,
  dirty,
  onSave,
  onScale,
  onPdf,
  onReset,
}: Props) {
  const { currency } = settings;
  const solventToAdd = solventToAddForTargetConcentration(
    result.concentrateGrams,
    targetConcentration,
    result.solventGrams,
  );

  return (
    <Card className={styles.card}>
      <div className={styles.metricLabel}>Gesamtmenge</div>
      <div className={styles.metric}>
        {formatNumber2(result.totalMassGrams)} <span className={styles.unit}>g</span>
      </div>
      <div className={styles.subMetric}>{formatMl(result.totalVolumeMl)}</div>

      <div className={styles.goldDivider} />

      <dl className={styles.details}>
        <div className={styles.detailRow}>
          <dt>Konzentrat-Anteil</dt>
          <dd>{formatPercent(result.actualConcentrationPercent)}</dd>
        </div>
        <div className={styles.detailRow}>
          <dt>Ziel-Konzentration</dt>
          <dd>{formatPercent(targetConcentration)}</dd>
        </div>
        <div className={styles.detailRow}>
          <dt>Lösungsmittel</dt>
          <dd>{formatGrams(result.solventGrams)}</dd>
        </div>
        <div className={styles.detailRow}>
          <dt>Kosten gesamt</dt>
          <dd>{formatMoney(result.totalCost, currency)}</dd>
        </div>
        <div className={styles.detailRow}>
          <dt>Kosten / ml</dt>
          <dd>{formatMoney(result.costPerMl, currency)}</dd>
        </div>
      </dl>

      {solventToAdd > 0.005 && (
        <p className={styles.hint}>
          Für {formatPercent(targetConcentration)} Ziel-Konzentration ca.{' '}
          <strong>{formatGrams(solventToAdd)}</strong> Lösungsmittel zugeben.
        </p>
      )}

      <div className={styles.pyramid}>
        <div className={styles.metricLabel}>Duftpyramide</div>
        {NOTE_TIERS.filter((t) => t !== 'modifier' || result.tierBreakdown.modifier.grams > 0).map(
          (tier) => {
            const b = result.tierBreakdown[tier];
            return (
              <div key={tier} className={styles.pyramidRow}>
                <span className={styles.pyramidLabel}>{noteTierLabels[tier]}</span>
                <div className={styles.bar}>
                  <div
                    className={styles.barFill}
                    style={{
                      width: `${Math.min(100, b.percent)}%`,
                      background: tierColors[tier],
                    }}
                  />
                </div>
                <span className={[styles.pyramidPct, 'num'].join(' ')}>
                  {formatPercent(b.percent)}
                </span>
              </div>
            );
          },
        )}
      </div>

      <div className={styles.actions}>
        <Button icon={<Save size={16} />} fullWidth onClick={onSave} disabled={!dirty}>
          {dirty ? 'Rezeptur speichern' : 'Gespeichert'}
        </Button>
        <div className={styles.actionRow}>
          <Button variant="secondary" icon={<Scaling size={15} />} onClick={onScale}>
            Skalieren…
          </Button>
          <Button variant="secondary" icon={<FileDown size={15} />} onClick={onPdf}>
            Als PDF
          </Button>
        </div>
        <Button
          variant="ghost"
          icon={<RotateCcw size={15} />}
          fullWidth
          onClick={onReset}
          disabled={!dirty}
        >
          Zurücksetzen
        </Button>
      </div>
    </Card>
  );
}
