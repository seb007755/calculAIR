# Parfum Rezeptur — Perfume Formula Editor

**Live:** https://seb007755.github.io/calculAIR/

A local-first web app to compose, manage and calculate perfume formulas —
functionally inspired by [Formulair](https://formulair.app/). All data lives in
the browser (`localStorage`), can be exported/imported as JSON, and individual
formulas can be exported to PDF. Deployed via GitHub Pages.

UI language is **German**; code, comments and commits are **English**.

## Features

- **Ingredient library** (Duftstoffe): raw materials, absolutes, essential oils,
  aroma chemicals and solvents with density, price/g, default dilution, CAS,
  supplier, tags and free-text IFRA notes.
- **Formula editor** (Rezepturen): line-based recipes in drops, grams or percent,
  with per-line dilution and pyramid tier (top/heart/base/modifier).
- **Live calculation**: total mass, per-line share, volume, concentrate vs.
  solvent, actual concentration, cost per formula and per ml, pyramid breakdown.
- **Scaling**: turn a 10 g trial into a 100 g batch (by target mass or factor).
- **Persistence**: everything is saved to `localStorage` automatically.
- **JSON export/import** with validation, migration scaffold and merge/replace.
- **PDF export** per formula (table, aggregates, pyramid, notes).
- **PWA**: manifest + icons, installable, works offline for the app shell.

## Tech stack

React 18 + TypeScript · Vite · CSS Modules + CSS variables · Zustand (persist) ·
react-router-dom (**HashRouter**, required for GitHub Pages) · jsPDF +
jspdf-autotable · lucide-react · Vitest.

## Getting started

```bash
npm install
npm run dev      # start dev server
npm run test     # run the calculation unit tests
npm run build    # typecheck + production build to dist/
npm run preview  # preview the production build
```

Requires Node 20+.

## Data model (overview)

- **Ingredient** — a material in the library (name, noteTier, density,
  pricePerGram, defaultDilution, isSolvent, …).
- **FormulaLine** — one row of a formula: `ingredientId`, `amount` (interpreted
  per the formula unit), `dilution`, optional tier override and note.
- **Formula** — `unit` (`drops` | `grams` | `percent`), `gramsPerDrop`,
  `targetConcentration`, `batchSizeGrams` (percent mode), `lines`, `version`.
- **AppData** — root export object: `schemaVersion`, `ingredients`, `formulas`,
  `settings`.

The full contract is in [`src/types/models.ts`](src/types/models.ts). The pure,
unit-tested calculation engine lives in [`src/lib/calc.ts`](src/lib/calc.ts).

### Calculation notes

- 1 drop ≈ `0.05 ml` (`DROP_VOLUME_ML` in `src/lib/units.ts`). Grams per drop =
  `density * 0.05`, falling back to the formula's `gramsPerDrop`.
- Percent mode normalizes line amounts to their sum, then maps onto
  `batchSizeGrams` (default 100 g).
- Values are never rounded internally — only for display (`formatGrams`,
  `formatPercent`, `formatMoney` in `units.ts`).

## Icons

Icons are pre-rendered into `public/icons/`. To regenerate them from
`public/favicon.svg`:

```bash
npm i -D sharp
npm run gen-icons
```

`sharp` is not a runtime dependency.

## Deployment (GitHub Pages)

1. `vite.config.ts` sets `base: '/calculAIR/'` (the repository name). For a user
   page (`<user>.github.io`) this would be `/` instead.
2. Routing uses `HashRouter` so deep links work on Pages without 404s.
3. Push to `main`: the workflow in `.github/workflows/deploy.yml` builds and
   deploys automatically.
4. In the repo: **Settings → Pages → Source: GitHub Actions**.

Live URL after first deploy: `https://<user>.github.io/calculAIR/`.

## Design decisions (pragmatic)

- Line reordering uses up/down buttons (drag & drop was de-scoped for v1).
- The ingredient picker in a line uses a native `<select>` with type-ahead plus
  an inline "+ Neuer Duftstoff" option.
- Percent-mode batch size is stored per formula (`batchSizeGrams`).
- Strings are centralized in `src/lib/strings.ts` to ease future i18n.
