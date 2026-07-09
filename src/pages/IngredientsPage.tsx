import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import type { Ingredient, NoteTier } from '../types/models';
import { NOTE_TIERS } from '../types/models';
import { useStore } from '../store/useStore';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { toast } from '../components/ui/Toast';
import { IngredientList } from '../components/ingredients/IngredientList';
import { IngredientForm, type IngredientDraft } from '../components/ingredients/IngredientForm';
import { noteTierLabels } from '../lib/strings';
import styles from './IngredientsPage.module.css';

export function IngredientsPage() {
  const ingredients = useStore((s) => s.ingredients);
  const settings = useStore((s) => s.settings);
  const addIngredient = useStore((s) => s.addIngredient);
  const updateIngredient = useStore((s) => s.updateIngredient);
  const deleteIngredient = useStore((s) => s.deleteIngredient);
  const usageCount = useStore((s) => s.ingredientUsageCount);

  const [query, setQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | NoteTier>('all');
  const [solventFilter, setSolventFilter] = useState<'all' | 'solvent' | 'material'>('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Ingredient | undefined>(undefined);
  const [toDelete, setToDelete] = useState<Ingredient | undefined>(undefined);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ingredients
      .filter((i) => {
        if (tierFilter !== 'all' && i.noteTier !== tierFilter) return false;
        if (solventFilter === 'solvent' && !i.isSolvent) return false;
        if (solventFilter === 'material' && i.isSolvent) return false;
        if (!q) return true;
        const hay = [i.name, i.supplier, i.cas, ...(i.tags ?? [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }, [ingredients, query, tierFilter, solventFilter]);

  const openNew = () => {
    setEditing(undefined);
    setFormOpen(true);
  };
  const openEdit = (ing: Ingredient) => {
    setEditing(ing);
    setFormOpen(true);
  };

  const submit = (draft: IngredientDraft) => {
    if (editing) {
      updateIngredient(editing.id, draft);
      toast.success('Duftstoff aktualisiert.');
    } else {
      addIngredient(draft);
      toast.success('Duftstoff hinzugefügt.');
    }
    setFormOpen(false);
    setEditing(undefined);
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    deleteIngredient(toDelete.id);
    toast.success(`„${toDelete.name}" gelöscht.`);
    setToDelete(undefined);
  };

  const deleteUses = toDelete ? usageCount(toDelete.id) : 0;

  return (
    <>
      <PageHeader
        title="Duftstoffe"
        subtitle={`${ingredients.length} Duftstoffe in der Bibliothek`}
        actions={
          <Button icon={<Plus size={16} />} onClick={openNew}>
            Neuer Duftstoff
          </Button>
        }
      />

      <Card padded={false}>
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <Search size={15} className={styles.searchIcon} />
            <input
              className={styles.search}
              placeholder="Suchen…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select
            className={styles.filter}
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as 'all' | NoteTier)}
          >
            <option value="all">Alle Tiers</option>
            {NOTE_TIERS.map((t) => (
              <option key={t} value={t}>
                {noteTierLabels[t]}
              </option>
            ))}
          </Select>
          <Select
            className={styles.filter}
            value={solventFilter}
            onChange={(e) => setSolventFilter(e.target.value as 'all' | 'solvent' | 'material')}
          >
            <option value="all">Alle Typen</option>
            <option value="material">Nur Riechstoffe</option>
            <option value="solvent">Nur Lösungsmittel</option>
          </Select>
        </div>

        <div className={styles.listArea}>
          <IngredientList
            ingredients={filtered}
            currency={settings.currency}
            usageCount={usageCount}
            onEdit={openEdit}
            onDelete={setToDelete}
          />
        </div>
      </Card>

      <IngredientForm
        open={formOpen}
        initial={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(undefined);
        }}
        onSubmit={submit}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Duftstoff löschen"
        danger
        confirmLabel="Löschen"
        message={
          deleteUses > 0
            ? `„${toDelete?.name}" wird in ${deleteUses} Rezeptur-Zeile(n) verwendet. Beim Löschen werden diese Zeilen als „Unbekannt" markiert. Trotzdem löschen?`
            : `„${toDelete?.name}" wirklich löschen?`
        }
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(undefined)}
      />
    </>
  );
}
