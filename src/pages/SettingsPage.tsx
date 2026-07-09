import { useRef, useState } from 'react';
import { Download, Upload, Trash2, Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { AmountUnit, AppData } from '../types/models';
import { AMOUNT_UNITS } from '../types/models';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Label } from '../components/ui/Label';
import { Select } from '../components/ui/Select';
import { TextInput } from '../components/ui/TextInput';
import { NumberInput } from '../components/ui/NumberInput';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { toast } from '../components/ui/Toast';
import { downloadAppData, parseAppData } from '../lib/jsonIO';
import { amountUnitLabels } from '../lib/strings';
import styles from './SettingsPage.module.css';

export function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const exportData = useStore((s) => s.exportData);
  const replaceAll = useStore((s) => s.replaceAll);
  const mergeData = useStore((s) => s.mergeData);
  const clearAll = useStore((s) => s.clearAll);
  const loadSeed = useStore((s) => s.loadSeed);
  const ingredientCount = useStore((s) => s.ingredients.length);
  const formulaCount = useStore((s) => s.formulas.length);

  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ data: AppData; warnings: string[] } | null>(null);
  const [clearStep, setClearStep] = useState<0 | 1 | 2>(0);

  const doExport = () => {
    downloadAppData(exportData());
    toast.success('Daten exportiert.');
  };

  const onFile = async (file: File) => {
    try {
      const text = await file.text();
      const result = parseAppData(text);
      setPending(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import fehlgeschlagen.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const applyImport = (mode: 'replace' | 'merge') => {
    if (!pending) return;
    if (mode === 'replace') replaceAll(pending.data);
    else mergeData(pending.data);
    pending.warnings.forEach((w) => toast.info(w));
    toast.success(
      `Import erfolgreich: ${pending.data.ingredients.length} Duftstoffe, ${pending.data.formulas.length} Rezepturen.`,
    );
    setPending(null);
  };

  return (
    <>
      <PageHeader title="Einstellungen" subtitle="Daten, Währung und Standardwerte" />

      <div className={styles.stack}>
        <Card>
          <h2 className={styles.sectionTitle}>Daten sichern & laden</h2>
          <p className={styles.sectionText}>
            Alle Daten liegen lokal im Browser. Exportiere sie als JSON-Datei zur Sicherung oder
            importiere eine vorhandene Datei.
          </p>
          <div className={styles.row}>
            <Button icon={<Download size={16} />} onClick={doExport}>
              JSON exportieren
            </Button>
            <Button
              variant="secondary"
              icon={<Upload size={16} />}
              onClick={() => fileRef.current?.click()}
            >
              JSON importieren
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
            />
          </div>
        </Card>

        <Card>
          <h2 className={styles.sectionTitle}>Standardwerte</h2>
          <div className={styles.grid}>
            <div>
              <Label htmlFor="s-currency">Währung</Label>
              <TextInput
                id="s-currency"
                value={settings.currency}
                onChange={(e) => updateSettings({ currency: e.target.value || '€' })}
              />
            </div>
            <div>
              <Label htmlFor="s-unit">Standard-Einheit</Label>
              <Select
                id="s-unit"
                value={settings.defaultUnit}
                onChange={(e) => updateSettings({ defaultUnit: e.target.value as AmountUnit })}
                options={AMOUNT_UNITS.map((u) => ({ value: u, label: amountUnitLabels[u] }))}
              />
            </div>
            <div>
              <Label>Standard g pro Tropfen</Label>
              <NumberInput
                value={settings.defaultGramsPerDrop}
                suffix="g"
                min={0}
                onValueChange={(v) => updateSettings({ defaultGramsPerDrop: v })}
              />
            </div>
          </div>
        </Card>

        <Card>
          <h2 className={styles.sectionTitle}>Bibliothek</h2>
          <p className={styles.sectionText}>
            {ingredientCount} Duftstoffe · {formulaCount} Rezepturen gespeichert.
          </p>
          <div className={styles.row}>
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
            <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => setClearStep(1)}>
              Alle Daten löschen
            </Button>
          </div>
        </Card>
      </div>

      {/* Import mode chooser */}
      <Modal
        open={!!pending}
        onClose={() => setPending(null)}
        title="Import-Modus wählen"
        width={460}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPending(null)}>
              Abbrechen
            </Button>
            <Button variant="secondary" onClick={() => applyImport('merge')}>
              Zusammenführen
            </Button>
            <Button onClick={() => applyImport('replace')}>Ersetzen</Button>
          </>
        }
      >
        <p className={styles.sectionText}>
          Die Datei enthält <strong>{pending?.data.ingredients.length ?? 0}</strong> Duftstoffe und{' '}
          <strong>{pending?.data.formulas.length ?? 0}</strong> Rezepturen.
        </p>
        <ul className={styles.modeList}>
          <li>
            <strong>Zusammenführen:</strong> vorhandene Daten behalten, neue ergänzen (bei gleicher
            ID gewinnt die neuere Version).
          </li>
          <li>
            <strong>Ersetzen:</strong> alle aktuellen Daten verwerfen und durch die Datei ersetzen.
          </li>
        </ul>
        {pending?.warnings.map((w, i) => (
          <p key={i} className={styles.warning}>
            {w}
          </p>
        ))}
      </Modal>

      {/* Double-confirm clear all */}
      <ConfirmDialog
        open={clearStep === 1}
        title="Alle Daten löschen?"
        danger
        confirmLabel="Weiter"
        message="Dies entfernt alle Duftstoffe und Rezepturen unwiderruflich. Fortfahren?"
        onConfirm={() => setClearStep(2)}
        onCancel={() => setClearStep(0)}
      />
      <ConfirmDialog
        open={clearStep === 2}
        title="Wirklich endgültig löschen?"
        danger
        confirmLabel="Endgültig löschen"
        message="Letzte Bestätigung: Alle lokalen Daten werden gelöscht."
        onConfirm={() => {
          clearAll();
          setClearStep(0);
          toast.success('Alle Daten gelöscht.');
        }}
        onCancel={() => setClearStep(0)}
      />
    </>
  );
}
