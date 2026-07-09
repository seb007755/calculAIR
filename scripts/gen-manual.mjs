/**
 * Generates the German user manual for the "Parfum Rezeptur" (calculAIR) app
 * as a branded PDF, using the app's own jsPDF dependency.
 */
import { jsPDF } from 'jspdf';
import { writeFileSync } from 'node:fs';

const GOLD = [197, 160, 89];
const INK = [17, 17, 17];
const GREY = [107, 114, 128];
const LIGHT = [225, 222, 214];

const doc = new jsPDF({ unit: 'mm', format: 'a4' });
const PW = doc.internal.pageSize.getWidth(); // 210
const PH = doc.internal.pageSize.getHeight(); // 297
const ML = 18;
const MR = 18;
const MT = 22;
const MB = 20;
const CW = PW - ML - MR; // content width

let y = MT;
let page = 1;
let section = 0;

function footer() {
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.3);
  doc.line(ML, PH - MB + 6, PW - MR, PH - MB + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GREY);
  doc.text('Parfum Rezeptur · Benutzerhandbuch', ML, PH - MB + 11);
  doc.text(`Seite ${page}`, PW - MR, PH - MB + 11, { align: 'right' });
}

function newPage() {
  footer();
  doc.addPage();
  page += 1;
  y = MT;
}

function need(h) {
  if (y + h > PH - MB) newPage();
}

function space(h) {
  y += h;
}

function h2(text) {
  section += 1;
  need(18);
  space(4);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.line(ML, y, PW - MR, y);
  space(6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...INK);
  doc.text(`${section}.  ${safe(text)}`, ML, y);
  space(8);
}

function h3(text) {
  need(10);
  space(2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...GOLD);
  doc.text(safe(text), ML, y);
  space(5.5);
}

/** Replace glyphs outside the Latin-1 core-font range with safe equivalents. */
function safe(text) {
  return text
    .replace(/[−]/g, '-') // minus sign
    .replace(/[≈]/g, 'ca.') // ≈
    .replace(/[→➔⟶]/g, '->') // → arrows
    .replace(/[⇄↔⟷]/g, '/') // ⇄ ↔
    .replace(/[▲▼]/g, '') // ▲ ▼
    .replace(/[✕✖✗]/g, 'X'); // ✕
}

function p(text, opts = {}) {
  const size = opts.size ?? 9.5;
  const color = opts.color ?? INK;
  const indent = opts.indent ?? 0;
  doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
  doc.setFontSize(size);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(safe(text), CW - indent);
  const lh = size * 0.42;
  for (const ln of lines) {
    need(lh + 1);
    doc.text(ln, ML + indent, y);
    y += lh + 1.1;
  }
}

function bullet(text) {
  const size = 9.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  const lines = doc.splitTextToSize(safe(text), CW - 6);
  const lh = size * 0.42;
  lines.forEach((ln, i) => {
    need(lh + 1);
    if (i === 0) {
      doc.setTextColor(...GOLD);
      doc.text('•', ML + 1.5, y);
    }
    doc.setTextColor(...INK);
    doc.text(ln, ML + 6, y);
    y += lh + 1.1;
  });
}

/** Definition list: bold key in left column, wrapped value on the right. */
function kv(rows, keyW = 46) {
  const size = 9.5;
  const lh = size * 0.42;
  for (const [k, v] of rows) {
    doc.setFontSize(size);
    const vLines = doc.splitTextToSize(safe(v), CW - keyW - 2);
    const blockH = Math.max(lh + 1.1, vLines.length * (lh + 1.1));
    need(blockH);
    const startY = y;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...INK);
    doc.text(safe(k), ML, startY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    let vy = startY;
    for (const ln of vLines) {
      doc.text(ln, ML + keyW, vy);
      vy += lh + 1.1;
    }
    y = startY + blockH + 0.6;
  }
}

/** Boxed callout for important notes. */
function callout(title, text) {
  const size = 9;
  const lh = size * 0.42;
  doc.setFontSize(size);
  const lines = doc.splitTextToSize(safe(text), CW - 10);
  const boxH = 8 + lines.length * (lh + 1.1);
  need(boxH + 3);
  const top = y;
  doc.setFillColor(250, 247, 240);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.3);
  doc.rect(ML, top, CW, boxH, 'FD');
  // gold left accent
  doc.setFillColor(...GOLD);
  doc.rect(ML, top, 1.4, boxH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...INK);
  doc.text(safe(title), ML + 5, top + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 60, 40);
  let ty = top + 10.5;
  for (const ln of lines) {
    doc.text(ln, ML + 5, ty);
    ty += lh + 1.1;
  }
  y = top + boxH + 4;
}

/** Monospace formula line. */
function formula(text) {
  const size = 9;
  const lh = size * 0.5;
  doc.setFont('courier', 'normal');
  doc.setFontSize(size);
  const lines = doc.splitTextToSize(safe(text), CW - 6);
  for (const ln of lines) {
    need(lh + 1);
    doc.setTextColor(...INK);
    doc.text(ln, ML + 3, y);
    y += lh + 1.2;
  }
  doc.setFont('helvetica', 'normal');
  space(1);
}

// ============================ COVER ==========================================
doc.setFillColor(...INK);
doc.rect(0, 0, PW, 70, 'F');
doc.setFillColor(...GOLD);
doc.rect(0, 70, PW, 2.2, 'F');

doc.setFont('helvetica', 'normal');
doc.setFontSize(11);
doc.setTextColor(...GOLD);
doc.text('BENUTZERHANDBUCH', ML, 34);

doc.setFont('helvetica', 'bold');
doc.setFontSize(30);
doc.setTextColor(255, 255, 255);
doc.text('Parfum Rezeptur', ML, 48);

doc.setFont('helvetica', 'normal');
doc.setFontSize(11);
doc.setTextColor(210, 200, 180);
doc.text('Der lokale Editor für Parfum-Rezepturen  ·  calculAIR', ML, 58);

y = 92;
doc.setFont('helvetica', 'normal');
doc.setFontSize(11);
doc.setTextColor(...INK);
p(
  'Dieses Handbuch erklärt Schritt für Schritt, wie Sie mit „Parfum Rezeptur" arbeiten: ' +
    'Duftstoffe verwalten, Rezepturen komponieren, die Live-Berechnung verstehen, Mengen ' +
    'skalieren, als PDF exportieren und Ihre Daten sichern. Die Oberfläche ist auf Deutsch.',
  { size: 11 },
);
space(4);

// Quick facts box on cover
const factTop = y;
doc.setDrawColor(...LIGHT);
doc.setLineWidth(0.3);
doc.setFillColor(250, 249, 246);
doc.rect(ML, factTop, CW, 46, 'FD');
doc.setFontSize(9.5);
let fy = factTop + 8;
const facts = [
  ['Anwendung', 'Web-App, läuft im Browser – keine Installation nötig'],
  ['Live-URL', 'https://seb007755.github.io/calculAIR/'],
  ['Datenhaltung', 'Lokal im Browser (localStorage) – nichts wird hochgeladen'],
  ['Oberfläche', 'Deutsch  ·  Version 1.0'],
  ['Stand', '09.07.2026'],
];
for (const [k, v] of facts) {
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...INK);
  doc.text(k, ML + 5, fy);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 70);
  doc.text(v, ML + 42, fy);
  fy += 7.6;
}
y = factTop + 46 + 8;

doc.setFont('helvetica', 'italic');
doc.setFontSize(8.5);
doc.setTextColor(...GREY);
p(
  'Hinweis: Die App führt keine automatische IFRA-Prüfung durch. Sicherheits- und ' +
    'Regulierungsangaben liegen in Ihrer Verantwortung.',
  { size: 8.5, color: GREY },
);

newPage();

// ============================ 1. ÜBERBLICK ===================================
h2('Überblick – was die App kann');
p(
  '„Parfum Rezeptur" ist ein lokaler Rezeptur-Editor für Parfümeurinnen und Parfümeure. ' +
    'Sie legen eine Bibliothek von Duftstoffen an und stellen daraus Rezepturen zusammen. ' +
    'Während Sie Mengen eintippen, berechnet die App laufend Masse, Volumen, Konzentration, ' +
    'Kosten und die Duftpyramide. Alle Daten bleiben auf Ihrem Gerät.',
);
space(1);
h3('Die wichtigsten Funktionen');
bullet('Duftstoff-Bibliothek mit Dichte, Preis, Standard-Verdünnung, CAS, Bezugsquelle, Tags und IFRA-Notiz.');
bullet('Rezeptur-Editor mit Zeilen in Tropfen, Gramm oder Prozent – je Zeile mit eigener Verdünnung und Pyramiden-Stufe.');
bullet('Live-Berechnung: Gesamtmasse, Anteil je Zeile, Volumen, Konzentrat- und Lösungsmittel-Anteil, Ist-Konzentration, Kosten gesamt und je ml.');
bullet('Skalieren: aus einem 10-g-Versuch mit einem Klick einen 100-g-Ansatz machen (nach Zielmasse oder Faktor).');
bullet('PDF-Export je Rezeptur (Tabelle, Kennzahlen, Duftpyramide, Notizen).');
bullet('JSON-Export/-Import zur Sicherung und zum Austausch, wahlweise Ersetzen oder Zusammenführen.');
bullet('Automatische Speicherung im Browser; installierbar als App (PWA), App-Hülle funktioniert offline.');

h2('Erste Schritte');
p(
  'Öffnen Sie die App im Browser unter https://seb007755.github.io/calculAIR/. Es ist keine ' +
    'Anmeldung und keine Installation erforderlich. Beim ersten Start ist die App leer.',
);
h3('Mit Demo-Daten starten');
p(
  'Um die App sofort auszuprobieren, klicken Sie auf der Startseite „Rezepturen" auf ' +
    '„Demo-Daten laden" (auch unter „Einstellungen" verfügbar). Damit werden Beispiel-Duftstoffe ' +
    '(z. B. Bergamot Calabria, Rose Absolute, Iso E Super, Ethanol 96 %) und eine Beispiel-Rezeptur ' +
    '(„Vetiver Study #3") angelegt.',
);
callout(
  'Ihre Daten bleiben lokal',
  'Alles wird ausschließlich im Speicher Ihres Browsers (localStorage) abgelegt. Es findet keine ' +
    'Übertragung an einen Server statt. Zwei Konsequenzen: (1) Auf einem anderen Gerät oder in einem ' +
    'anderen Browser sind Ihre Daten nicht automatisch vorhanden. (2) Wird der Browser-Speicher ' +
    'gelöscht, sind auch die Rezepturen weg. Sichern Sie wichtige Arbeit deshalb regelmäßig als JSON.',
);

h2('Aufbau und Navigation');
p('Die App hat drei Bereiche, erreichbar über die Navigation:');
kv([
  ['Rezepturen', 'Startseite mit allen Rezepturen. Hier legen Sie neue an, duplizieren, löschen oder exportieren sie als PDF.'],
  ['Duftstoffe', 'Ihre Material-Bibliothek. Hier pflegen Sie alle Riechstoffe und Lösungsmittel.'],
  ['Einstellungen', 'Daten sichern/laden (JSON), Standardwerte (Währung, Einheit, g pro Tropfen) und Demo-Daten / Alle Daten löschen.'],
]);

// ============================ DUFTSTOFFE =====================================
h2('Duftstoffe verwalten');
p(
  'Öffnen Sie „Duftstoffe". Oben rechts legen Sie mit „Neuer Duftstoff" ein Material an. ' +
    'Über die Suchleiste sowie die Filter „Alle Tiers" und „Alle Typen" (Nur Riechstoffe / Nur ' +
    'Lösungsmittel) finden Sie Einträge schnell wieder. Die Liste ist alphabetisch sortiert.',
);
h3('Felder eines Duftstoffs');
kv([
  ['Name', 'Pflichtfeld. Bezeichnung des Materials, z. B. „Iso E Super".'],
  ['Duftpyramide', 'Standard-Stufe: Kopf, Herz, Basis oder Modifier. Bestimmt die Vorbelegung in Rezepturen.'],
  ['Standard-Verdünnung', 'Voreingestellte Verdünnung in % (100 % = pur). Wird beim Einfügen in eine Rezeptur übernommen.'],
  ['Dichte', 'g/ml. Wird für die Umrechnung Tropfen ⇄ Gramm und für das Volumen genutzt. Leer = 1,0 g/ml.'],
  ['Preis pro Gramm', 'Materialpreis je Gramm in Ihrer Währung. Grundlage der Kostenrechnung.'],
  ['CAS-Nummer', 'Optionale CAS-Kennung.'],
  ['Bezugsquelle', 'Optionaler Lieferant/Händler.'],
  ['Tags', 'Komma-getrennte Schlagworte (z. B. „citrus, natural") – helfen bei der Suche.'],
  ['IFRA-Notiz', 'Freitext für Hinweise. Achtung: rein informativ, keine automatische Prüfung.'],
  ['Lösungsmittel', 'Ankreuzen für Alkohol/DPG etc. Solche Zeilen zählen zum Lösungsmittel-Anteil statt zum Konzentrat.'],
]);
h3('Bearbeiten und Löschen');
p(
  'Klicken Sie einen Eintrag zum Bearbeiten an. Beim Löschen prüft die App, ob das Material in ' +
    'Rezepturen verwendet wird: Ist das der Fall, werden die betroffenen Zeilen anschließend als ' +
    '„Unbekannt" markiert (die Rezeptur bleibt erhalten, diese Zeilen tragen dann aber keine Masse bei).',
);

// ============================ REZEPTUREN ÜBERSICHT ===========================
h2('Rezepturen – Übersicht');
p(
  'Die Startseite „Rezepturen" listet alle Rezepturen, zuletzt geänderte zuerst. Je Eintrag ' +
    'sehen Sie Kennzahlen auf einen Blick und haben folgende Aktionen:',
);
kv([
  ['Neue Rezeptur', 'Legt eine leere Rezeptur an und öffnet direkt den Editor.'],
  ['Öffnen', 'Öffnet die Rezeptur im Editor.'],
  ['Duplizieren', 'Erstellt eine Kopie („… (Kopie)"), Version wird auf 1 zurückgesetzt.'],
  ['Als PDF', 'Exportiert die Rezeptur als PDF-Datenblatt.'],
  ['Löschen', 'Entfernt die Rezeptur nach Rückfrage endgültig.'],
]);

// ============================ EDITOR =========================================
h2('Der Rezeptur-Editor');
p(
  'Der Editor ist zweigeteilt: links bearbeiten Sie Kopfdaten und Zeilen, rechts sehen Sie die ' +
    'laufende Berechnung („Zusammenfassung"). Änderungen sind sofort sichtbar, werden aber erst mit ' +
    '„Rezeptur speichern" dauerhaft gesichert. Über der Speichern-Schaltfläche zeigt der Zustand ' +
    '„Gespeichert" bzw. „Rezeptur speichern" an, ob es ungespeicherte Änderungen gibt.',
);
h3('Kopfdaten der Rezeptur');
kv([
  ['Name / Beschreibung', 'Titel und optionaler Beschreibungstext.'],
  ['Einheit', 'Bezugsgröße aller Zeilen: Tropfen, Gramm oder Prozent (siehe Kapitel „Einheiten & Berechnung").'],
  ['Ziel-Konzentration', 'Angestrebter Konzentrat-Anteil in %. Dient dem Soll/Ist-Vergleich und dem Lösungsmittel-Hinweis.'],
  ['g pro Tropfen (Fallback)', 'Nur bei Einheit „Tropfen": Gewicht eines Tropfens, wenn der Duftstoff keine Dichte hat (Standard 0,02 g).'],
  ['Bezugsmenge (Batch)', 'Nur bei Einheit „Prozent": Gesamtmasse in Gramm, auf die die Prozentanteile gerechnet werden (Standard 100 g).'],
]);
h3('Zeilen bearbeiten');
p('Jede Zeile ist ein Duftstoff mit Menge. Die Spalten sind:');
kv([
  ['Duftstoff', 'Auswahl aus der Bibliothek. Über „+ Neuer Duftstoff…" legen Sie direkt aus der Zeile ein neues Material an.'],
  ['Tier', 'Pyramiden-Stufe der Zeile. Klick auf das farbige Feld wechselt Kopf -> Herz -> Basis -> Modifier (überschreibt die Standard-Stufe des Materials).'],
  ['Menge', 'Wert in der gewählten Einheit (Tr, g oder %).'],
  ['Verd.', 'Verdünnung dieser Zeile in % – überschreibt die Standard-Verdünnung des Materials.'],
  ['Masse / Anteil', 'Von der App berechnet: tatsächliche Masse in g und Anteil an der Gesamtmasse.'],
]);
p(
  'Mit den Pfeilen (nach oben / nach unten) verschieben Sie eine Zeile, mit dem X-Symbol entfernen Sie sie. Über „Zeile hinzufügen" ' +
    'am Fuß der Liste ergänzen Sie eine weitere Zeile. Tipp: Legen Sie zuerst mindestens einen ' +
    'Duftstoff an – ohne Materialien lässt sich keine Zeile hinzufügen.',
  { size: 9.5 },
);

// ============================ ZUSAMMENFASSUNG ================================
h2('Die Zusammenfassung (Live-Berechnung)');
p('Rechts im Editor stehen die laufend berechneten Kennzahlen:');
kv([
  ['Gesamtmenge', 'Summe aller Zeilen-Massen in g, darunter das Gesamtvolumen in ml.'],
  ['Konzentrat-Anteil', 'Ist-Konzentration: aktiver (nicht-Lösungsmittel-)Anteil geteilt durch Gesamtmasse.'],
  ['Ziel-Konzentration', 'Ihr Sollwert aus den Kopfdaten – zum direkten Vergleich.'],
  ['Lösungsmittel', 'Masse aller als Lösungsmittel markierten Zeilen.'],
  ['Kosten gesamt / je ml', 'Materialkosten der Rezeptur insgesamt und pro Milliliter.'],
  ['Duftpyramide', 'Balken je Stufe (Kopf/Herz/Basis/Modifier), gemessen am aktiven Anteil. Modifier erscheint nur, wenn vorhanden.'],
]);
callout(
  'Lösungsmittel-Hinweis',
  'Liegt die Ist-Konzentration über der Ziel-Konzentration, blendet die App einen Hinweis ein, ' +
    'wie viel Lösungsmittel (z. B. Ethanol) Sie ungefähr zugeben müssen, um die Ziel-Konzentration ' +
    'zu erreichen. Bereits vorhandenes Lösungsmittel wird dabei berücksichtigt.',
);

// ============================ EINHEITEN & BERECHNUNG =========================
h2('Einheiten & Berechnung im Detail');
p(
  'Die Berechnung ist bewusst nachvollziehbar. Intern wird nie gerundet; gerundet wird nur für ' +
    'die Anzeige (Gramm/Volumen 2 Nachkommastellen, Prozent 1). Es gibt drei Einheiten-Modi:',
);
h3('Gramm');
p('Die eingetragene Menge ist direkt die Masse in Gramm.');
h3('Tropfen');
p('Masse je Zeile = Tropfen × Gramm-pro-Tropfen. Gramm-pro-Tropfen ergibt sich aus der Dichte des Materials:');
formula('g_pro_Tropfen = Dichte × 0,05 ml      (1 Tropfen ≈ 0,05 ml)');
p('Fehlt die Dichte, greift der Rezeptur-Wert „g pro Tropfen (Fallback)" (Standard 0,02 g).');
h3('Prozent');
p(
  'Die Zeilenwerte werden auf ihre Summe normiert und auf die „Bezugsmenge (Batch)" gerechnet. ' +
    'Beispiel: Werte 50/30/20 bei Batch 100 g ergeben 50/30/20 g. Auch unnormierte Werte funktionieren: ' +
    '1/1/2 ergeben bei 100 g die Massen 25/25/50 g.',
);
h3('Verdünnung, Konzentrat und Konzentration');
p('Der aktive (reine) Anteil einer Zeile berücksichtigt ihre Verdünnung:');
formula('aktive_Masse = Masse × (Verdünnung / 100)');
p(
  'Das Konzentrat ist die Summe der aktiven Massen aller Zeilen, die keine Lösungsmittel sind. ' +
    'Die Ist-Konzentration ist:',
);
formula('Ist-Konzentration = Konzentrat / Gesamtmasse × 100');
p('Die benötigte Lösungsmittelmenge für eine Ziel-Konzentration berechnet sich als:');
formula('Lösungsmittel = Konzentrat × (100 / Ziel − 1) − vorhandenes_Lösungsmittel');
h3('Volumen und Kosten');
formula('Volumen = Masse / Dichte      (fehlende Dichte = 1,0 g/ml)');
formula('Kosten  = Masse × Preis_pro_Gramm');
p('Kosten je ml = Gesamtkosten / Gesamtvolumen. Fehlende Preise zählen als 0.');
callout(
  'Unbekannte Duftstoffe',
  'Verweist eine Zeile auf ein gelöschtes/fehlendes Material, wird sie als „Unbekannt" markiert und ' +
    'trägt 0 g zur Berechnung bei – die App rechnet trotzdem stabil weiter (keine Fehler, keine NaN-Werte). ' +
    'Wählen Sie in der Zeile einfach ein gültiges Material aus, um sie zu reparieren.',
);

// ============================ SKALIEREN ======================================
h2('Rezepturen skalieren');
p(
  'Über „Skalieren…" in der Zusammenfassung rechnen Sie die ganze Rezeptur auf eine neue Menge um – ' +
    'ideal, um aus einem kleinen Versuch einen größeren Ansatz zu machen. Zwei Modi:',
);
kv([
  ['Zielmasse', 'Sie geben die gewünschte neue Gesamtmasse in g ein; alle Zeilen werden proportional angepasst.'],
  ['Faktor', 'Sie multiplizieren alle Mengen mit einem Faktor (z. B. 10×). Nicht verfügbar im Prozent-Modus.'],
]);
p(
  'Der Dialog zeigt die aktuelle und die neue Gesamtmenge zur Kontrolle. Die Mengenverhältnisse ' +
    '(und damit Konzentration und Pyramide) bleiben identisch; die Versionsnummer der Rezeptur wird ' +
    'um 1 erhöht. Im Prozent-Modus wird nur die Bezugsmenge (Batch) gesetzt – die Prozentanteile ' +
    'bleiben unverändert. Skalierungen werden erst mit „Rezeptur speichern" dauerhaft.',
);

// ============================ PDF ============================================
h2('PDF-Export');
p(
  'Sowohl in der Rezeptur-Übersicht („Als PDF") als auch im Editor erzeugen Sie ein PDF-Datenblatt ' +
    'der Rezeptur. Es enthält Kopfzeile mit Name und Version, eine Kennzahlen-Übersicht ' +
    '(Einheit, Ziel- und Ist-Konzentration, Gesamtmenge/-volumen, Kosten gesamt und je ml), die ' +
    'Zeilentabelle (Duftstoff, Tier, Menge, Verdünnung, Masse, Volumen, Anteil, Kosten), die ' +
    'Duftpyramide sowie Notizen (Zeilen-Notizen und IFRA-Hinweise der verwendeten Materialien). ' +
    'Die Datei wird nach dem Rezepturnamen benannt (z. B. „vetiver-study-3-v1.pdf").',
);

// ============================ DATEN ==========================================
h2('Daten sichern, laden & Standardwerte');
p('Alle folgenden Funktionen finden Sie unter „Einstellungen".');
h3('JSON-Export / -Import');
p(
  'Mit „JSON exportieren" laden Sie eine Datei mit allen Duftstoffen, Rezepturen und Einstellungen ' +
    'herunter (Dateiname „perfume-data-JJJJ-MM-TT.json"). Mit „JSON importieren" lesen Sie eine solche ' +
    'Datei wieder ein. Die App prüft die Datei und meldet z. B. Zeilen, die auf fehlende Duftstoffe ' +
    'verweisen. Anschließend wählen Sie den Import-Modus:',
);
kv([
  ['Zusammenführen', 'Vorhandene Daten bleiben, neue werden ergänzt. Bei gleicher ID gewinnt die neuere Version (nach Änderungsdatum).'],
  ['Ersetzen', 'Alle aktuellen Daten werden verworfen und vollständig durch die Datei ersetzt.'],
]);
h3('Standardwerte');
kv([
  ['Währung', 'Symbol für alle Geldbeträge (Standard €).'],
  ['Standard-Einheit', 'Vorbelegung der Einheit für neue Rezepturen (Tropfen/Gramm/Prozent).'],
  ['Standard g pro Tropfen', 'Fallback-Tropfengewicht für neue Rezepturen (Standard 0,02 g).'],
]);
h3('Bibliothek & Löschen');
p(
  '„Demo-Daten laden" ergänzt die Beispieldaten. „Alle Daten löschen" entfernt sämtliche Duftstoffe ' +
    'und Rezepturen unwiderruflich – aus Sicherheitsgründen mit doppelter Rückfrage. Exportieren Sie ' +
    'vorher, wenn Sie die Daten behalten möchten.',
);

// ============================ HINWEISE =======================================
h2('Wichtige Hinweise & Grenzen');
bullet('Keine IFRA-Prüfung: IFRA-Notizen sind reiner Freitext; die App prüft oder begrenzt nichts automatisch.');
bullet('Lokal & gerätegebunden: Daten liegen nur in diesem Browser. Für Umzug/Backup den JSON-Export nutzen.');
bullet('Speichern nicht vergessen: Änderungen im Editor gelten erst nach „Rezeptur speichern".');
bullet('Version 1 ist auf helles Design ausgelegt; die App ist als PWA installierbar und offline-fähig für die App-Hülle.');

h2('Kurz-Glossar');
kv([
  ['Konzentrat', 'Summe der aktiven (reinen) Riechstoffe ohne Lösungsmittel.'],
  ['Konzentration', 'Anteil des Konzentrats an der Gesamtmasse. Richtwerte: Parfum ~20–30 %, EdP ~15–20 %, EdT ~5–15 %, EdC ~2–5 %.'],
  ['Verdünnung', 'Anteil reinen Materials in einer Lösung (100 % = pur).'],
  ['Tier / Duftpyramide', 'Stufe im Duftverlauf: Kopf (flüchtig), Herz, Basis (langanhaltend), Modifier.'],
  ['Batch / Bezugsmenge', 'Gesamtmasse, auf die im Prozent-Modus gerechnet wird.'],
  ['PWA', 'Progressive Web App – die Web-App lässt sich wie eine App installieren.'],
]);

space(3);
doc.setFont('helvetica', 'italic');
doc.setFontSize(8.5);
doc.setTextColor(...GREY);
p(
  'Parfum Rezeptur (calculAIR) · Benutzerhandbuch · Stand 09.07.2026 · ' +
    'https://seb007755.github.io/calculAIR/',
  { size: 8.5, color: GREY },
);

footer(); // footer for the last page

const out = process.argv[2] || 'Benutzerhandbuch.pdf';
writeFileSync(out, Buffer.from(doc.output('arraybuffer')));
console.log(`OK -> ${out} (${page} Seiten)`);
