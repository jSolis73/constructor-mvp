# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
Разговаривай со мной на русском языке

## Project Overview

Frontend-only MVP of **Конструктор заключений** — a visual Excel-form editor for creating and filling conclusion templates. All data is mocked client-side; there is no backend.

See [SPEC.md](SPEC.md) for full requirements and acceptance criteria.

## Tech Stack

| Layer              | Technology                                                          | Version                                             |
| ------------------ | ------------------------------------------------------------------- | --------------------------------------------------- |
| Language           | TypeScript                                                          | ^5.4                                                |
| Framework          | React                                                               | ^18.3                                               |
| Build              | Vite                                                                | ^5.x                                                |
| Spreadsheet editor | Univer Sheets (`@univerjs/presets`, `@univerjs/preset-sheets-core`) | 0.25.1                                              |
| UI kit             | PrimeReact                                                          | **9.6.5** (intentionally pinned — see SPEC.md §2.1) |
| Icons              | PrimeIcons                                                          | ^7.x                                                |
| XLSX generation    | ExcelJS                                                             | ^4.4                                                |
| State              | Zustand                                                             | ^4.x                                                |
| Validation         | Zod                                                                 | ^3.x                                                |

> PrimeReact is pinned at 9.6.5, not 10.x. The project is archived upstream (June 2026), future migration to PrimeUI is a separate task. Do not upgrade PrimeReact without explicit instruction.

## Common Commands

```bash
npm install          # install dependencies
npm run dev          # start Vite dev server
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
```

## Architecture

```
React App (Vite)
├── AppShell            — PrimeReact Toolbar + layout
├── TemplateEditor      — Univer Sheets instance (editable)
├── EditorToolbar       — PrimeReact toolbar wrapping Univer Facade API commands
├── FieldCatalogPanel   — PrimeReact Sidebar + Accordion; writes bindings to cells
├── PreviewDialog       — PrimeReact Dialog containing a read-only Univer instance
├── TemplateListDialog  — PrimeReact DataTable; loads/saves templates from localStorage
└── NewTemplateDialog   — base template chooser

templateStore (Zustand)
├── current JSON-spec
├── selected cell / range (FWorkbook reference)
├── mock Field Catalog
└── mock Conclusion Data

Core logic (src/core/)
├── spec/specMapper.ts    — bidirectional: JSON-spec ↔ IWorkbookData (Univer)
├── spec/types.ts         — JsonSpec, SpecCell, Region, Style types
├── spec/specValidator.ts — Zod schemas
├── xlsx/xlsxRenderer.ts  — ExcelJS renderer (JSON-spec + ConclusionData → Blob)
└── blocks/resolveBlockRefs.ts — expands block_ref using mock table blocks
```

**Key architectural rule:** Univer Sheets handles only the visual editor and preview. Final `.xlsx` generation uses ExcelJS independently from the JSON-spec — same separation as the production architecture.

## Critical Implementation Details

### Univer initialization (`src/components/editor/useUniverInstance.ts`)

- Use `createUniver` from `@univerjs/presets` with `UniverSheetsCorePreset`
- Pass `header: !readOnly, toolbar: !readOnly, footer: !readOnly, contextMenu: !readOnly` for editable vs read-only modes
- Import CSS: `@univerjs/preset-sheets-core/lib/index.css`
- Locale: `LocaleType.RU_RU` with `UniverPresetSheetsCoreRuRU`
- Always call `api.dispose()` in the `useEffect` cleanup

### Univer Facade API

- Cell manipulation goes through `workbook.getActiveSheet().getSelection().getRange()`
- Merge: `fRange.merge()`
- Bold: `fRange.setFontWeight('bold')`
- Alignment: `fRange.setHorizontalAlignment(align)`
- Binding is stored in `cell.custom.binding` (Univer's custom cell metadata)

### JSON-spec ↔ IWorkbookData mapping (`src/core/spec/specMapper.ts`)

- Single sheet ID: `'conclusion_sheet'`
- Workbook ID: `'conclusion_workbook'`
- Sheet dimensions: 60 rows × 43 columns (up to column AQ)
- Cell references use A1 notation; helpers `a1ToRowCol`, `a1RangeToMergeRange` live in specMapper
- Bindings shown as `[path]` placeholders in editor cells; resolved to real values at Preview/render time

### XLSX rendering (`src/core/xlsx/xlsxRenderer.ts`)

- Calls `resolveBlockRefs` first, then iterates `resolvedSpec.cells` and `resolvedSpec.regions`
- Value resolution order: `literal` → `binding` (via `getByPath`) → `template` (string interpolation with `{path}` tokens)
- Returns a `Blob` for browser download

### Mocks (no backend)

- `src/core/mocks/fieldCatalog.mock.ts` — groups: `meta`, `weld`, `quality`, `summary`; sources: `computed`, `manual`
- `src/core/mocks/conclusionData.mock.ts` — test data matching Field Catalog paths
- `src/core/mocks/tableBlocks.mock.ts` — mock `ConclusionTableBlock` for block_ref expansion
- `src/core/mocks/baseTemplates.mock.ts` — 2–3 `IWorkbookData` objects as starter templates
- Template persistence: `localStorage` (no server)

### PrimeReact component isolation

All PrimeReact components that interact with Univer are isolated in `src/components/editor/` and `src/components/fieldCatalog/`. Common wrappers live in `src/components/common/ui/`. This boundary makes a future PrimeReact → PrimeUI migration cheaper.

## MVP Scope Boundaries

**In scope:** template creation/editing, cell binding, table regions, JSON-spec save/load, preview, .xlsx export.

**Out of scope:** backend, auth, real Field Catalog API, MinIO, issued conclusions, drag-and-drop block reordering, multi-tenant, version history.
