import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Formula, UUID } from '../types/models';
import { FormulaEditor } from '../components/formulas/FormulaEditor';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { toast } from '../components/ui/Toast';

export function FormulaEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const formula = useStore((s) => s.formulas.find((f) => f.id === id));
  const ingredients = useStore((s) => s.ingredients);
  const settings = useStore((s) => s.settings);
  const updateFormula = useStore((s) => s.updateFormula);
  const addIngredient = useStore((s) => s.addIngredient);

  const ingredientsById = useMemo(
    () => Object.fromEntries(ingredients.map((i) => [i.id, i])),
    [ingredients],
  ) as Record<UUID, (typeof ingredients)[number]>;

  if (!formula) {
    return (
      <>
        <PageHeader title="Rezeptur nicht gefunden" />
        <Link to="/">
          <Button variant="secondary" icon={<ArrowLeft size={16} />}>
            Zurück zur Übersicht
          </Button>
        </Link>
      </>
    );
  }

  const commit = (draft: Formula) => {
    updateFormula(draft.id, {
      name: draft.name,
      description: draft.description,
      unit: draft.unit,
      gramsPerDrop: draft.gramsPerDrop,
      targetConcentration: draft.targetConcentration,
      batchSizeGrams: draft.batchSizeGrams,
      lines: draft.lines,
      version: draft.version,
    });
    toast.success('Rezeptur gespeichert.');
  };

  const exportPdf = async (draft: Formula) => {
    try {
      const { exportFormulaToPdf } = await import('../lib/pdf');
      exportFormulaToPdf(draft, ingredientsById, settings);
    } catch (err) {
      console.error(err);
      toast.error('PDF-Export fehlgeschlagen.');
    }
  };

  return (
    <>
      <PageHeader
        title={formula.name || 'Rezeptur'}
        subtitle={`Version ${formula.version} · ${formula.lines.length} Zeilen`}
        actions={
          <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => navigate('/')}>
            Übersicht
          </Button>
        }
      />
      <FormulaEditor
        key={formula.id}
        formula={formula}
        ingredients={ingredients}
        currency={settings.currency}
        settingsCurrency={settings.currency}
        onCommit={commit}
        onExportPdf={exportPdf}
        addIngredient={addIngredient}
      />
    </>
  );
}
