/**
 * Central UI strings (German). Kept in one place to ease later i18n.
 * The app UI language is German; code/comments stay English.
 */
import type { NoteTier, AmountUnit } from '../types/models';

export const strings = {
  appName: 'Parfum Rezeptur',
  nav: {
    dashboard: 'Rezepturen',
    ingredients: 'Duftstoffe',
    settings: 'Einstellungen',
  },
  common: {
    save: 'Speichern',
    cancel: 'Abbrechen',
    delete: 'Löschen',
    duplicate: 'Duplizieren',
    open: 'Öffnen',
    reset: 'Zurücksetzen',
    apply: 'Anwenden',
    add: 'Hinzufügen',
    edit: 'Bearbeiten',
    confirm: 'Bestätigen',
    close: 'Schließen',
    search: 'Suchen…',
    unknownIngredient: 'Unbekannter Duftstoff',
    yes: 'Ja',
    no: 'Nein',
  },
  units: {
    grams: 'g',
    ml: 'ml',
    percent: '%',
    drops: 'Tropfen',
    perMl: '/ml',
    perGram: '/g',
  },
} as const;

export const noteTierLabels: Record<NoteTier, string> = {
  top: 'Kopf',
  heart: 'Herz',
  base: 'Basis',
  modifier: 'Modifier',
};

export const amountUnitLabels: Record<AmountUnit, string> = {
  drops: 'Tropfen',
  grams: 'Gramm',
  percent: 'Prozent',
};

/** Suffix shown in a NumberInput for a given formula unit. */
export const amountUnitSuffix: Record<AmountUnit, string> = {
  drops: 'Tr',
  grams: 'g',
  percent: '%',
};
