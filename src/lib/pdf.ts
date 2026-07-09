import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AppSettings, Formula, Ingredient, UUID } from '../types/models';
import { computeFormula } from './calc';
import { formatGrams, formatMl, formatMoney, formatNumber2, formatPercent } from './units';
import { amountUnitLabels, noteTierLabels, strings } from './strings';

const GOLD: [number, number, number] = [197, 160, 89];
const INK: [number, number, number] = [17, 17, 17];
const GREY: [number, number, number] = [107, 114, 128];

function sanitizeFilename(name: string): string {
  return (
    name
      .normalize('NFKD')
      .replace(/[^\w\s.-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .toLowerCase() || 'rezeptur'
  );
}

/** Render a single formula to a downloadable PDF. */
export function exportFormulaToPdf(
  formula: Formula,
  ingredientsById: Record<UUID, Ingredient>,
  settings: AppSettings,
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const result = computeFormula(formula, ingredientsById, {
    batchSizeGrams: formula.batchSizeGrams,
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  let y = margin;

  // --- Header ---------------------------------------------------------------
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GREY);
  doc.text(strings.appName.toUpperCase(), margin, y);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  doc.text(formula.name, margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GREY);
  const dateStr = new Date().toLocaleDateString('de-DE');
  doc.text(`Version ${formula.version}  ·  ${dateStr}`, margin, y);
  y += 4;

  // Gold divider
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // --- Metadata block -------------------------------------------------------
  const meta: [string, string][] = [
    ['Einheit', amountUnitLabels[formula.unit]],
    ['Ziel-Konzentration', formatPercent(formula.targetConcentration)],
    ['Ist-Konzentration', formatPercent(result.actualConcentrationPercent)],
    ['Gesamtmenge', `${formatGrams(result.totalMassGrams)} / ${formatMl(result.totalVolumeMl)}`],
    ['Kosten gesamt', formatMoney(result.totalCost, settings.currency)],
    ['Kosten / ml', formatMoney(result.costPerMl, settings.currency)],
  ];
  doc.setFontSize(9);
  const colW = (pageWidth - margin * 2) / 3;
  meta.forEach(([label, value], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = margin + col * colW;
    const yy = y + row * 12;
    doc.setTextColor(...GREY);
    doc.text(label.toUpperCase(), x, yy);
    doc.setTextColor(...INK);
    doc.setFont('helvetica', 'bold');
    doc.text(value, x, yy + 5);
    doc.setFont('helvetica', 'normal');
  });
  y += Math.ceil(meta.length / 3) * 12 + 4;

  if (formula.description) {
    doc.setTextColor(...GREY);
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(formula.description, pageWidth - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 4 + 4;
  }

  // --- Line table -----------------------------------------------------------
  const body = formula.lines.map((line, i) => {
    const r = result.lines[i];
    return [
      String(i + 1),
      r.ingredientName + (r.unknown ? ' (?)' : ''),
      noteTierLabels[r.noteTier],
      formatNumber2(line.amount),
      `${line.dilution}%`,
      formatNumber2(r.massGrams),
      formatNumber2(r.volumeMl),
      formatPercent(r.percentOfTotal),
      formatMoney(r.cost, settings.currency),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [
      ['#', 'Duftstoff', 'Tier', 'Menge', 'Verd.', 'Masse g', 'Vol. ml', 'Anteil', 'Kosten'],
    ],
    body,
    theme: 'plain',
    styles: { font: 'courier', fontSize: 8, cellPadding: 1.6, textColor: INK },
    headStyles: {
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 7,
      textColor: GREY,
      lineWidth: { bottom: 0.3 },
      lineColor: INK,
    },
    columnStyles: {
      0: { halign: 'right', cellWidth: 8 },
      1: { halign: 'left', font: 'helvetica' },
      2: { halign: 'left', font: 'helvetica', cellWidth: 16 },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
      8: { halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  // @ts-expect-error autotable augments the doc instance at runtime
  y = (doc.lastAutoTable?.finalY ?? y) + 10;

  // --- Pyramid summary ------------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text('DUFTPYRAMIDE', margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GREY);
  (['top', 'heart', 'base', 'modifier'] as const)
    .filter((t) => t !== 'modifier' || result.tierBreakdown.modifier.grams > 0)
    .forEach((tier) => {
      const b = result.tierBreakdown[tier];
      doc.text(
        `${noteTierLabels[tier]}: ${formatPercent(b.percent)}  (${formatGrams(b.grams)})`,
        margin,
        y,
      );
      y += 5;
    });

  // --- Notes ----------------------------------------------------------------
  const lineNotes = formula.lines
    .map((l, i) => (l.note ? `• ${result.lines[i].ingredientName}: ${l.note}` : null))
    .filter(Boolean) as string[];
  const ifraNotes = Array.from(new Set(formula.lines.map((l) => ingredientsById[l.ingredientId])))
    .filter((ing): ing is Ingredient => !!ing && !!ing.ifraNote)
    .map((ing) => `• ${ing.name}: ${ing.ifraNote}`);

  if (lineNotes.length || ifraNotes.length) {
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...INK);
    doc.text('NOTIZEN', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GREY);
    [...lineNotes, ...ifraNotes].forEach((n) => {
      const wrapped = doc.splitTextToSize(n, pageWidth - margin * 2);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 4.5;
    });
  }

  doc.save(`${sanitizeFilename(formula.name)}-v${formula.version}.pdf`);
}
