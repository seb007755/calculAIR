import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Formula, UUID } from '../types/models';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { toast } from '../components/ui/Toast';
import { FormulaList } from '../components/formulas/FormulaList';
import styles from './DashboardPage.module.css';

export function DashboardPage() {
  const navigate = useNavigate();
  const formulas = useStore((s) => s.formulas);
  const ingredients = useStore((s) => s.ingredients);
  const settings = useStore((s) => s.settings);
  const addFormula = useStore((s) => s.addFormula);
  const duplicateFormula = useStore((s) => s.duplicateFormula);
  const deleteFormula = useStore((s) => s.deleteFormula);
  const loadSeed = useStore((s) => s.loadSeed);

  const [toDelete, setToDelete] = useState<Formula | undefined>(undefined);

  const ingredientsById = useMemo(
    () => Object.fromEntries(ingredients.map((i) => [i.id, i])),
    [ingredients],
  ) as Record<UUID, (typeof ingredients)[number]>;

  const sorted = useMemo(
    () => [...formulas].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
    [formulas],
  );

  const createNew = () => {
    const f = addFormula({ name: 'Neue Rezeptur' });
    navigate(`/formula/${f.id}`);
  };

  const duplicate = (f: Formula) => {
    const copy = duplicateFormula(f.id);
    if (copy) toast.success(`„${f.name}" dupliziert.`);
  };

  const exportPdf = async (f: Formula) => {
    try {
      const { exportFormulaToPdf } = await import('../lib/pdf');
      exportFormulaToPdf(f, ingredientsById, settings);
    } catch (err) {
      console.error(err);
      toast.error('PDF-Export fehlgeschlagen.');
    }
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    deleteFormula(toDelete.id);
    toast.success(`„${toDelete.name}" gelöscht.`);
    setToDelete(undefined);
  };

  return (
    <>
      <PageHeader
        title="Rezepturen"
        subtitle={`${formulas.length} Rezepturen`}
        actions={
          <Button icon={<Plus size={16} />} onClick={createNew}>
            Neue Rezeptur
          </Button>
        }
      />

      {sorted.length === 0 ? (
        <Card className={styles.empty}>
          <Sparkles size={28} className={styles.emptyIcon} />
          <h2 className={styles.emptyTitle}>Noch keine Rezepturen</h2>
          <p className={styles.emptyText}>
            Lege deine erste Rezeptur an oder starte mit Beispiel-Daten, um die App
            auszuprobieren.
          </p>
          <div className={styles.emptyActions}>
            <Button icon={<Plus size={16} />} onClick={createNew}>
              Neue Rezeptur
            </Button>
            <Button
              variant="secondary"
              icon={<Sparkles size={16} />}
              onClick={() => {
                loadSeed();
                toast.success('Demo-Daten geladen.');
              }}
            >
              Demo-Daten laden
            </Button>
          </div>
        </Card>
      ) : (
        <FormulaList
          formulas={sorted}
          ingredientsById={ingredientsById}
          currency={settings.currency}
          onDuplicate={duplicate}
          onDelete={setToDelete}
          onPdf={exportPdf}
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Rezeptur löschen"
        danger
        confirmLabel="Löschen"
        message={`„${toDelete?.name}" wirklich löschen? Dies kann nicht rückgängig gemacht werden.`}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(undefined)}
      />
    </>
  );
}
