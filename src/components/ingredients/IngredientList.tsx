import type { Ingredient } from '../../types/models';
import { Pencil, Trash2, Droplet } from 'lucide-react';
import { NoteTierBadge } from '../ui/NoteTierBadge';
import { Button } from '../ui/Button';
import { formatMoney, formatNumber2 } from '../../lib/units';
import styles from './IngredientList.module.css';

interface Props {
  ingredients: Ingredient[];
  currency: string;
  usageCount: (id: string) => number;
  onEdit: (ing: Ingredient) => void;
  onDelete: (ing: Ingredient) => void;
}

export function IngredientList({ ingredients, currency, usageCount, onEdit, onDelete }: Props) {
  if (ingredients.length === 0) {
    return <p className={styles.empty}>Keine Duftstoffe gefunden.</p>;
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Tier</th>
            <th className="num">Dichte</th>
            <th className="num">Std.-Verd.</th>
            <th className="num">Preis/g</th>
            <th className="num">Verwendung</th>
            <th aria-label="Aktionen" />
          </tr>
        </thead>
        <tbody>
          {ingredients.map((ing) => {
            const uses = usageCount(ing.id);
            return (
              <tr key={ing.id}>
                <td>
                  <div className={styles.name}>
                    {ing.isSolvent && (
                      <Droplet size={13} className={styles.solvent} aria-label="Lösungsmittel" />
                    )}
                    <span>{ing.name}</span>
                  </div>
                  {(ing.supplier || ing.tags?.length) && (
                    <div className={styles.meta}>
                      {ing.supplier}
                      {ing.supplier && ing.tags?.length ? ' · ' : ''}
                      {ing.tags?.join(', ')}
                    </div>
                  )}
                </td>
                <td>
                  <NoteTierBadge tier={ing.noteTier} />
                </td>
                <td className="num">{ing.density ? formatNumber2(ing.density) : '—'}</td>
                <td className="num">{ing.defaultDilution}%</td>
                <td className="num">
                  {ing.pricePerGram != null ? formatMoney(ing.pricePerGram, currency) : '—'}
                </td>
                <td className="num">{uses > 0 ? uses : '—'}</td>
                <td>
                  <div className={styles.actions}>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Pencil size={15} />}
                      aria-label="Bearbeiten"
                      onClick={() => onEdit(ing)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 size={15} />}
                      aria-label="Löschen"
                      onClick={() => onDelete(ing)}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
