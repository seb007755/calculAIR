#!/usr/bin/env python3
"""
Liest Duftrohstoffe_Juli_2026.numbers, harmonisiert die Daten und erzeugt
- calculair-import.json (AppData-Schema für calculAIR)
- harmonisierung-report.md (alle Änderungen + Flags)
"""
import json, re, datetime, unicodedata, sys
from collections import Counter, OrderedDict
from numbers_parser import Document

SRC = "/home/sebastian/Claude/calculAIR/Duftrohstoffe_Juli_2026.numbers"
OUT_DIR = "/home/sebastian/Claude/calculAIR/perfume-formulator/import"
NOW = datetime.datetime.now().replace(microsecond=0).isoformat()

# ---- Spalten (aus Kopfzeile 1) ----
COLS = ['Duftrohstoff','Hersteller','Liefereant','Preis/1g','Preis/2,5g','Preis/5g',
        'Preis/10g','Preis/20g','Preis/50g','Kaufdatum','Datum Ablauf','CAS-Nummer EU',
        'Haltbarkeit','Duftausprägung','Wirkbereich','Verwendung im Produkt',
        'Verdünnung/Lösungsmittel','Eigenschaften']
PACK_SIZES = OrderedDict([('Preis/1g',1.0),('Preis/2,5g',2.5),('Preis/5g',5.0),
                          ('Preis/10g',10.0),('Preis/20g',20.0),('Preis/50g',50.0)])

# ---- Mappings ----
MANUFACTURER = {
    'Fir':'Firmenich','IFF':'IFF','Giv':'Givaudan','Sym':'Symrise','Ventos':'Ventós',
    'Biolan':'Biolandes','PayBer':'Payan Bertrand','AlbVe':'Albert Vieille',
    'Bedoukian':'Bedoukian','DRT':'DRT','KAO':'Kao','Oleolio':'Oleolio','Rob':'Robertet',
    'Synarome':'Synarome','TakaS':'Takasago',
}
SUPPLIER = {
    'hekserij':'Hekserij','perfumiarz':'perfumiarz','parfumiarz':'perfumiarz',
    'scentfriends':'scentfriends','scentfriend':'scentfriends','sentfriends':'scentfriends',
    'manasse':'Manasse',
}
TIER_WORD = {'kopf':'top','herz':'heart','basis':'base','modifier':'modifier'}
TIER_LABEL = {'top':'Kopf','heart':'Herz','base':'Basis','modifier':'Modifier'}
WEIGHTS = {1:[100],2:[70,30],3:[50,30,20]}
ODOR_FIX = {'mittelstark':'mittel stark'}

report = {'names':[], 'suppliers':[], 'manufacturers':[], 'cas':[], 'cas_flags':[],
          'tiers':Counter(), 'tier_empty':[], 'flags':[], 'unmapped_mfr':set(), 'unmapped_sup':set()}

# ---------- Harmonisierer ----------
def fix_name(n):
    if not n: return n, None
    orig = n
    n = re.sub(r'\s+', ' ', n).strip()
    n = re.sub(r'\bCoer\b', 'Coeur', n)
    n = n.replace('Chamomille', 'Chamomile').replace('Coreander', 'Coriander')
    n = n.replace('Fixateuer', 'Fixateur').replace('Malezja', 'Malaysia')
    n = re.sub(r'\bsynth\b', 'Synth', n)
    if n != orig:
        report['names'].append((orig, n))
    return n, (orig if n != orig else None)

def fix_supplier(s):
    if not s: return None
    key = str(s).strip().lower()
    if key in SUPPLIER:
        out = SUPPLIER[key]
        if str(s).strip() != out:
            report['suppliers'].append((str(s).strip(), out))
        return out
    report['unmapped_sup'].add(str(s).strip())
    return str(s).strip()

def fix_manufacturer(m):
    if not m: return None
    key = str(m).strip()
    if key in MANUFACTURER:
        out = MANUFACTURER[key]
        report['manufacturers'].append((key, out))
        return out
    report['unmapped_mfr'].add(key)
    return key

def cas_correct_checkdigit(cas):
    m = re.match(r'^(\d+)-(\d{2})-\d$', cas)
    if not m: return None
    digits = (m.group(1) + m.group(2))[::-1]
    return sum(int(d) * (i + 1) for i, d in enumerate(digits)) % 10

def fix_cas(c, name):
    if c is None or str(c).strip() == '': return None
    # Datum-Objekt (Numbers hat die CAS als Datum interpretiert, z. B. 0123-11-04)
    if isinstance(c, datetime.datetime):
        cas = f"{c.year}-{c.month:02d}-{c.day}"
        report['cas'].append((name, c.strftime('%Y-%m-%d'), cas))
        if not cas_checksum_ok(cas):
            cd = cas_correct_checkdigit(cas)
            report['cas_flags'].append((name, c.strftime('%Y-%m-%d'), f"{cas} (Prüfziffer sollte {cd} sein)"))
        return cas
    s = str(c).strip()
    if s.lower() == 'mix':
        return 'mix'
    # Datum-verhunzt: DD.MM.YYYY -> CAS YYYY-MM-{int(DD)}
    m = re.match(r'^(\d{2})\.(\d{2})\.(\d{4})$', s)
    if m:
        dd, mm, yyyy = m.group(1), m.group(2), m.group(3)
        cas = f"{yyyy}-{mm}-{int(dd)}"
        report['cas'].append((name, s, cas))
        return cas
    # Führende Nullen der ersten Gruppe entfernen
    m2 = re.match(r'^0*(\d+)-(\d{2})-(\d+)$', s)
    if m2:
        cas = f"{m2.group(1)}-{m2.group(2)}-{m2.group(3)}"
        # Prüfziffer validieren
        if not cas_checksum_ok(cas):
            report['cas_flags'].append((name, s, cas))
        if cas != s:
            report['cas'].append((name, s, cas))
        return cas
    report['cas_flags'].append((name, s, s))
    return s

def cas_checksum_ok(cas):
    m = re.match(r'^(\d+)-(\d{2})-(\d)$', cas)
    if not m: return False
    digits = (m.group(1) + m.group(2))[::-1]
    total = sum(int(d) * (i + 1) for i, d in enumerate(digits))
    return total % 10 == int(m.group(3))

def parse_price(v):
    if v is None or v == '': return None, None
    if isinstance(v, (int, float)): return round(float(v), 2), None
    s = str(v)
    note = None
    mp = re.search(r'\(([^)]*)\)', s)
    if mp: note = mp.group(1).strip()
    s2 = re.sub(r'\([^)]*\)', '', s)
    mn = re.search(r'\d+(?:[.,]\d+)?', s2)
    if not mn: return None, note
    return round(float(mn.group(0).replace(',', '.')), 2), note

def parse_tier(s):
    if s is None or str(s).strip() == '':
        return None, 'modifier'
    raw = str(s).strip()
    report['tiers'][raw] += 1
    m = re.match(r'(.+?)\s*\(auch\s+(.+?)\)', raw, re.I)
    if m:
        seq = [m.group(1).strip(), m.group(2).strip()]
    else:
        seq = [p.strip() for p in raw.split('-') if p.strip()]
    tiers = []
    for p in seq:
        t = TIER_WORD.get(p.lower())
        if t and t not in tiers:
            tiers.append(t)
    if not tiers:
        return None, 'modifier'
    w = WEIGHTS.get(len(tiers), [round(100/len(tiers))]*len(tiers))
    weights = {tiers[i]: w[i] for i in range(len(tiers))}
    return weights, tiers[0]

def parse_default_dilution(s):
    if s is None or str(s).strip() == '': return 100.0
    t = str(s).strip()
    if '/' in t or '-' in t: return 100.0
    m = re.match(r'^(\d+(?:[.,]\d+)?)\s*%\s*[A-Za-z]', t)
    if m:
        return float(m.group(1).replace(',', '.'))
    return 100.0

def norm_odor(s):
    if not s: return None
    v = str(s).strip().lower()
    return ODOR_FIX.get(v, v)

MONTHS = {'jan':1,'feb':2,'mar':3,'mär':3,'apr':4,'may':5,'mai':5,'jun':6,'jul':7,
          'aug':8,'sep':9,'oct':10,'okt':10,'nov':11,'dec':12,'dez':12}
def iso_date(v):
    if v is None or v == '': return None
    if isinstance(v, datetime.datetime): return v.strftime('%Y-%m-%d')
    s = str(v).strip()
    # Textmonate wie "Apr. 26", "May-26", "Mai-26" -> "2026-04"
    m = re.match(r'([A-Za-zäöü]{3,})\.?\s*[-/ ]?\s*(\d{2,4})', s)
    if m:
        mon = MONTHS.get(m.group(1)[:3].lower())
        if mon:
            yy = m.group(2)
            yr = yy if len(yy) == 4 else '20' + yy
            return f"{yr}-{mon:02d}"
    return s

def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    s = re.sub(r'[^a-zA-Z0-9]+', '-', s).strip('-').lower()
    return s or 'x'

def clean(v):
    if v is None: return None
    s = str(v).strip()
    return s or None

# ---------- Einlesen ----------
doc = Document(SRC)
table = doc.sheets[0].tables[0]
rows = table.rows(values_only=True)
data = []
for r in rows[2:]:
    rec = {COLS[i]: r[i] for i in range(len(COLS))}
    if any(v not in (None, '') for v in rec.values()):
        data.append(rec)

# ---------- Aufbau Ingredients ----------
ingredients = []
for rec in data:
    name_raw = clean(rec['Duftrohstoff'])
    if not name_raw:
        # namenlose Zeile -> Platzhalter
        cas_hint = clean(rec['CAS-Nummer EU'])
        name_raw = f"Unbenannt (CAS {cas_hint})" if cas_hint else "Unbenannt"
        report['flags'].append(f"Namenlose Zeile mit Platzhalter aufgenommen: {name_raw!r} "
                               f"(Hersteller {rec['Hersteller']!r}, Wirkbereich {rec['Wirkbereich']!r}).")
    name, _ = fix_name(name_raw)

    weights, primary = parse_tier(rec['Wirkbereich'])
    if weights is None and (rec['Wirkbereich'] in (None, '') or str(rec['Wirkbereich']).strip() == ''):
        report['tier_empty'].append(name)

    price_tiers = []
    best_pg = None
    for col, grams in PACK_SIZES.items():
        val, note = parse_price(rec[col])
        if val is not None:
            price_tiers.append({'grams': grams, 'price': val})
            pg = val / grams
            if best_pg is None or pg < best_pg:
                best_pg = pg

    ing = {
        'id': 'imp-' + slug(name),
        'name': name,
        'cas': fix_cas(rec['CAS-Nummer EU'], name),
        'manufacturer': fix_manufacturer(rec['Hersteller']),
        'supplier': fix_supplier(rec['Liefereant']),
        'noteTier': primary,
        'tierWeights': weights,
        'pricePerGram': round(best_pg, 4) if best_pg is not None else None,
        'priceTiers': price_tiers or None,
        'defaultDilution': parse_default_dilution(rec['Verdünnung/Lösungsmittel']),
        'dilutionSolvent': clean(rec['Verdünnung/Lösungsmittel']),
        'odorStrength': norm_odor(rec['Duftausprägung']),
        'usageRate': clean(rec['Verwendung im Produkt']),
        'shelfLife': clean(rec['Haltbarkeit']),
        'purchaseDate': iso_date(rec['Kaufdatum']),
        'expiryDate': iso_date(rec['Datum Ablauf']),
        'characteristics': clean(rec['Eigenschaften']),
        'isSolvent': False,
        'createdAt': NOW,
        'updatedAt': NOW,
    }
    ingredients.append(ing)

# ---------- Dubletten zusammenführen (gleicher harmonisierter Name) ----------
merged = OrderedDict()
for ing in ingredients:
    k = ing['name'].lower()
    if k in merged:
        base = merged[k]
        for f, v in ing.items():
            if f in ('id', 'name', 'createdAt', 'updatedAt'):
                continue
            if base.get(f) in (None, [], '') and v not in (None, [], ''):
                base[f] = v
        report['flags'].append(f"Dublette zusammengeführt: {ing['name']!r}.")
    else:
        merged[k] = ing
ingredients = list(merged.values())

# Felder mit None entfernen (kompakter, Import-Coercion füllt Defaults)
def prune(d):
    return {k: v for k, v in d.items() if v is not None}
ingredients = [prune(i) for i in ingredients]

appdata = {
    'schemaVersion': 1,
    'exportedAt': NOW,
    'ingredients': ingredients,
    'formulas': [],
    'settings': {'currency': '€', 'defaultUnit': 'grams', 'defaultGramsPerDrop': 0.02, 'theme': 'light'},
}

import os
os.makedirs(OUT_DIR, exist_ok=True)
with open(f"{OUT_DIR}/calculair-import.json", 'w', encoding='utf-8') as f:
    json.dump(appdata, f, ensure_ascii=False, indent=2)

# ---------- Report ----------
def md_table(rows, head):
    out = ['| ' + ' | '.join(head) + ' |', '|' + '|'.join(['---']*len(head)) + '|']
    for r in rows:
        out.append('| ' + ' | '.join(str(c) for c in r) + ' |')
    return '\n'.join(out)

R = []
R.append("# Harmonisierungs-Report — Duftrohstoffe\n")
R.append(f"Stand: {NOW}\n")
R.append(f"- Eingelesene Zeilen: **{len(data)}**")
R.append(f"- Rohstoffe nach Dubletten-Merge: **{len(ingredients)}**\n")

R.append("## 1. Namens-Korrekturen")
R.append(md_table(report['names'], ['vorher','nachher']) if report['names'] else "_keine_")
R.append("")
R.append("## 2. Lieferanten normalisiert")
sup = sorted(set(report['suppliers']))
R.append(md_table(sup, ['vorher','nachher']) if sup else "_keine Änderung_")
R.append(f"\nNicht zugeordnete Lieferanten (unverändert): {sorted(report['unmapped_sup']) or '—'}")
R.append("")
R.append("## 3. Hersteller ausgeschrieben")
mfr = sorted(set(report['manufacturers']))
R.append(md_table(mfr, ['Kürzel','ausgeschrieben']) if mfr else "_keine_")
R.append(f"\nNicht zugeordnete Hersteller (unverändert): {sorted(report['unmapped_mfr']) or '—'}")
R.append("")
R.append("## 4. CAS entwirrt (Datum→CAS / Normalisierung)")
R.append(md_table(report['cas'], ['Rohstoff','vorher','nachher']) if report['cas'] else "_keine_")
R.append("")
R.append("### CAS-Prüfziffer verdächtig / ungültiges Format")
R.append(md_table(report['cas_flags'], ['Rohstoff','vorher','übernommen']) if report['cas_flags'] else "_keine_")
R.append("")
R.append("## 5. Tier → Prozent-Verteilung (Reihenfolge = Dominanz)")
tier_rows = []
for val, n in sorted(report['tiers'].items(), key=lambda x: -x[1]):
    w, prim = parse_tier(val)  # rekonstruieren (zählt hoch, egal)
    wtxt = ', '.join(f"{TIER_LABEL[t]} {w[t]}%" for t in w) if w else '—'
    tier_rows.append((val, n, wtxt))
# doppelte Zählung aus obiger Schleife korrigieren: nur anzeigen
R.append(md_table(tier_rows, ['Wirkbereich','Anzahl','Verteilung']))
R.append('\n**Zur Kontrolle:** „Herz-Basis" und „Basis-Herz" sind durch die Dominanz-Reihenfolge '
         'unterschiedlich (Herz- vs. Basis-dominant). Bitte prüfen, ob das so gewollt ist.')
R.append("")
R.append("## 6. Flags & offene Punkte")
R.append(f"- Rohstoffe ohne Tier → auf **Modifier 100 %** gesetzt ({len(report['tier_empty'])}): "
         f"{', '.join(report['tier_empty']) or '—'}")
for fl in report['flags']:
    R.append(f"- {fl}")
R.append("")
R.append("## 7. Preis/Gramm")
R.append('`pricePerGram` = bester €/g über alle Packungsgrößen; alle Preisstufen bleiben in `priceTiers`. '
         'Klammer-Zusätze in Preiszellen (z. B. „(H)", „(perf)") wurden entfernt.')

with open(f"{OUT_DIR}/harmonisierung-report.md", 'w', encoding='utf-8') as f:
    f.write('\n'.join(R) + '\n')

print(f"OK: {len(ingredients)} Rohstoffe -> {OUT_DIR}/calculair-import.json")
print(f"Report -> {OUT_DIR}/harmonisierung-report.md")
print(f"Namens-Fixes: {len(report['names'])}, CAS-Fixes: {len(report['cas'])}, "
      f"CAS-Flags: {len(report['cas_flags'])}, leere Tiers: {len(report['tier_empty'])}")
