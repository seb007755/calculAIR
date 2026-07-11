# Harmonisierungs-Report — Duftrohstoffe

Stand: 2026-07-09T15:46:21

- Eingelesene Zeilen: **121**
- Rohstoffe nach Dubletten-Merge: **120**

## 1. Namens-Korrekturen
| vorher | nachher |
|---|---|
| Apo Patchone Coer | Apo Patchone Coeur |
| Castoreum synth | Castoreum Synth |
| Chamomille flower CO2 | Chamomile flower CO2 |
| Coreander Leaf Oil Extra | Coriander Leaf Oil Extra |
| Fixateuer 505 | Fixateur 505 |
| Gurjun Balsam (Malezja) | Gurjun Balsam (Malaysia) |
| Patchouli Coer Oil (Indon) | Patchouli Coeur Oil (Indon) |
| Vertofix Coer | Vertofix Coeur |

## 2. Lieferanten normalisiert
| vorher | nachher |
|---|---|
| Perfumiarz | perfumiarz |
| parfumiarz | perfumiarz |
| scentfriend | scentfriends |
| sentfriends | scentfriends |

Nicht zugeordnete Lieferanten (unverändert): —

## 3. Hersteller ausgeschrieben
| Kürzel | ausgeschrieben |
|---|---|
| AlbVe | Albert Vieille |
| Bedoukian | Bedoukian |
| Biolan | Biolandes |
| DRT | DRT |
| Fir | Firmenich |
| Giv | Givaudan |
| IFF | IFF |
| KAO | Kao |
| Oleolio | Oleolio |
| PayBer | Payan Bertrand |
| Rob | Robertet |
| Sym | Symrise |
| Synarome | Synarome |
| TakaS | Takasago |
| Ventos | Ventós |

Nicht zugeordnete Hersteller (unverändert): —

## 4. CAS entwirrt (Datum→CAS / Normalisierung)
| Rohstoff | vorher | nachher |
|---|---|---|
| Anisaldehyde | 0123-11-04 | 123-11-4 |
| Apo Patchone Coeur | 09.04.4621 | 4621-04-9 |
| Davana Oil Extra | 03.03.8016 | 8016-03-3 |
| Ethyl Maltol | 08.11.4940 | 4940-11-8 |
| Olibanum res. 50% DPG | 05.07.8050 | 8050-07-5 |
| Patchouli Coeur Oil (Indon) | 03.09.8014 | 8014-09-3 |

### CAS-Prüfziffer verdächtig / ungültiges Format
| Rohstoff | vorher | übernommen |
|---|---|---|
| Anisaldehyde | 0123-11-04 | 123-11-4 (Prüfziffer sollte 5 sein) |

## 5. Tier → Prozent-Verteilung (Reihenfolge = Dominanz)
| Wirkbereich | Anzahl | Verteilung |
|---|---|---|
| Basis | 46 | Basis 100% |
| Kopf-Herz | 15 | Kopf 70%, Herz 30% |
| Kopf | 12 | Kopf 100% |
| Herz-Basis | 11 | Herz 70%, Basis 30% |
| Herz | 9 | Herz 100% |
| Basis (auch Kopf) | 3 | Basis 70%, Kopf 30% |
| Basis-Herz | 3 | Basis 70%, Herz 30% |
| Basis-Kopf | 2 | Basis 70%, Kopf 30% |
| Kopf-Herz-Basis | 1 | Kopf 50%, Herz 30%, Basis 20% |

**Zur Kontrolle:** „Herz-Basis" und „Basis-Herz" sind durch die Dominanz-Reihenfolge unterschiedlich (Herz- vs. Basis-dominant). Bitte prüfen, ob das so gewollt ist.

## 6. Flags & offene Punkte
- Rohstoffe ohne Tier → auf **Modifier 100 %** gesetzt (19): Apo Patchone Coeur, Benzoe, Birch Tar EO, Cade EO (Dampfdestillation), Cedarwood China, Cedarwood Virginia, Citronellol LAEVO, Hedione, Immortele Abs 50% TEC, Iso E Super, Leather Oud, Lindenol (α-terpineol), Muscenone, Myrrhe, Nelkenknospe, Oak Moss abs 5% DPG, Patchouli EO, Vetiver Haiti, Zirbe
- Namenlose Zeile mit Platzhalter aufgenommen: 'Unbenannt (CAS 470-40-6)' (Hersteller 'Ventos', Wirkbereich 'Herz').
- Dublette zusammengeführt: 'Olibanum res. 50% DPG'.

## 7. Preis/Gramm
`pricePerGram` = bester €/g über alle Packungsgrößen; alle Preisstufen bleiben in `priceTiers`. Klammer-Zusätze in Preiszellen (z. B. „(H)", „(perf)") wurden entfernt.
