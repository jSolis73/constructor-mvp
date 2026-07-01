import { create } from 'zustand'
import type { FWorkbook } from '@univerjs/sheets/facade'
import type { JsonSpec } from '../core/spec/types'
import { nanoid } from '../core/utils/nanoid'
import { baseTemplatesMock } from '../core/mocks/baseTemplates.mock'
import { conclusionDataMock } from '../core/mocks/conclusionData.mock'
import { fieldCatalogMock } from '../core/mocks/fieldCatalog.mock'
import { tableBlocksMock } from '../core/mocks/tableBlocks.mock'
import { a1ToRowCol, mapWorkbookDataToSpec } from '../core/spec/specMapper'
import { validateSpec } from '../core/spec/specValidator'
import { resolveBlockRefs } from '../core/blocks/resolveBlockRefs'

const STORAGE_KEY = 'conclusion-constructor-templates'

function colToLetter(col: number): string {
  let result = ''
  let c = col + 1
  while (c > 0) {
    const rem = (c - 1) % 26
    result = String.fromCharCode(65 + rem) + result
    c = Math.floor((c - 1) / 26)
  }
  return result
}

function rowColToRef(row: number, col: number): string {
  return `${colToLetter(col)}${row + 1}`
}

export interface SavedTemplate {
  id: string
  name: string
  savedAt: string
  spec: JsonSpec
}

function migrateSpec(raw: unknown): JsonSpec {
  const s = raw as Record<string, unknown>
  const rawRegions = Array.isArray(s.regions) ? (s.regions as unknown[]) : []
  const migratedRegions = rawRegions.map((r) => {
    const rr = r as Record<string, unknown>
    const rawCols = Array.isArray(rr.columns) ? (rr.columns as unknown[]) : []
    return {
      ...rr,
      anchor: (rr.anchor as string | undefined) ?? (rr.startRef as string | undefined) ?? 'A1',
      columns: rawCols.map((c) => {
        const cc = c as Record<string, unknown>
        return {
          ...cc,
          header: (cc.header as string | undefined) ?? (cc.title as string | undefined) ?? '',
          binding: (cc.binding as string | undefined) ?? (cc.path as string | undefined) ?? '',
        }
      }),
    }
  })
  return {
    id: (s.id as string) ?? nanoid(),
    name: (s.name as string) ?? 'Шаблон',
    version: (s.version as number) ?? 1,
    page: (s.page as JsonSpec['page']) ?? { format: 'A4', orientation: 'portrait', margins: { left: 20, right: 10, top: 15, bottom: 15 } },
    cells: Array.isArray(s.cells) ? (s.cells as JsonSpec['cells']) : [],
    regions: migratedRegions as JsonSpec['regions'],
    footer_cells: Array.isArray(s.footer_cells) ? (s.footer_cells as JsonSpec['footer_cells']) : [],
  }
}

function loadFromStorage(): SavedTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const templates = raw ? (JSON.parse(raw) as SavedTemplate[]) : []
    return templates.map((t) => ({ ...t, spec: migrateSpec(t.spec as unknown) }))
  } catch {
    return []
  }
}

function saveToStorage(templates: SavedTemplate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
}

interface TemplateState {
  currentSpec: JsonSpec | null
  workbook: FWorkbook | null
  savedTemplates: SavedTemplate[]
  conclusionData: typeof conclusionDataMock
  lastSelection: { row: number; col: number } | null
  /** Increments on every load/import to force TemplateEditor remount */
  specEpoch: number

  setWorkbook: (wb: FWorkbook | null) => void
  setCurrentSpec: (spec: JsonSpec) => void
  setLastSelection: (sel: { row: number; col: number } | null) => void

  newTemplate: (baseId: string) => void
  saveTemplate: () => void
  loadTemplate: (id: string) => void
  deleteTemplate: (id: string) => void

  applyBindingToSelection: (path: string) => void
  applyLabeledBinding: (path: string, title: string) => void
  insertTableRegion: (blockRef: string) => void
  moveRegion: (regionId: string, newTitleRow: number, newAnchorCol: number) => void
  exportSpecJson: () => void
  importSpecJson: (json: unknown) => { ok: boolean; error?: string }
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  currentSpec: null,
  workbook: null,
  savedTemplates: loadFromStorage(),
  conclusionData: conclusionDataMock,
  lastSelection: null,
  specEpoch: 0,

  setWorkbook: (wb) => set({ workbook: wb }),
  setCurrentSpec: (spec) => set({ currentSpec: spec }),
  setLastSelection: (sel) => set({ lastSelection: sel }),

  newTemplate: (baseId) => {
    const found = baseTemplatesMock.find((t) => t.id === baseId)
    if (!found) return
    const spec: JsonSpec = { ...found.spec, id: nanoid() }
    set((s) => ({ currentSpec: spec, specEpoch: s.specEpoch + 1 }))
  },

  saveTemplate: () => {
    const { currentSpec, workbook, savedTemplates } = get()
    if (!currentSpec) return

    let spec = currentSpec

    if (workbook) {
      try {
        const wbData = workbook.getSnapshot()
        if (wbData) {
          spec = mapWorkbookDataToSpec(wbData as never, currentSpec)
        }
      } catch {
        // use currentSpec as-is
      }
    }

    const validation = validateSpec(spec)
    if (!validation.success) {
      console.warn('[templateStore] Spec validation warnings:', validation.error.issues)
    }

    const existing = savedTemplates.find((t) => t.id === spec.id)
    const entry: SavedTemplate = {
      id: spec.id,
      name: spec.name,
      savedAt: new Date().toISOString(),
      spec,
    }

    const next = existing
      ? savedTemplates.map((t) => (t.id === spec.id ? entry : t))
      : [...savedTemplates, entry]

    saveToStorage(next)
    set({ savedTemplates: next, currentSpec: spec })
  },

  loadTemplate: (id) => {
    const { savedTemplates } = get()
    const found = savedTemplates.find((t) => t.id === id)
    if (found) set((s) => ({ currentSpec: found.spec, specEpoch: s.specEpoch + 1 }))
  },

  deleteTemplate: (id) => {
    const next = get().savedTemplates.filter((t) => t.id !== id)
    saveToStorage(next)
    set({ savedTemplates: next })
  },

  applyBindingToSelection: (path) => {
    const { workbook, lastSelection } = get()
    if (!workbook) return
    try {
      const sheet = workbook.getActiveSheet()
      const liveRange = sheet.getSelection()?.getActiveRange()
      if (liveRange) {
        liveRange.setValue({ v: `[${path}]`, custom: { binding: path } })
      } else if (lastSelection) {
        const ref = rowColToRef(lastSelection.row, lastSelection.col)
        sheet.getRange(ref).setValue({ v: `[${path}]`, custom: { binding: path } })
      }
    } catch {
      // no selection
    }
  },

  applyLabeledBinding: (path, title) => {
    const { workbook, lastSelection, currentSpec } = get()
    if (!workbook || !currentSpec) return
    try {
      const sheet = workbook.getActiveSheet()
      const liveRange = sheet.getSelection()?.getActiveRange()

      let row: number
      let col: number
      if (liveRange) {
        const r = liveRange.getRange()
        row = r.startRow
        col = r.startColumn
      } else if (lastSelection) {
        row = lastSelection.row
        col = lastSelection.col
      } else {
        return
      }

      // Label cell — bold, with colon
      const labelCell = sheet.getRange(rowColToRef(row, col))
      labelCell.setValue({ v: `${title}:`, custom: { literal: `${title}:` } })
      labelCell.setFontWeight('bold')

      // Value cell — binding, one column to the right
      const valueCell = sheet.getRange(rowColToRef(row, col + 1))
      valueCell.setValue({ v: `[${path}]`, custom: { binding: path } })

      // Track in spec so it can be dragged/moved
      const labelRef = rowColToRef(row, col)
      const valueRef = rowColToRef(row, col + 1)
      const newRegion = {
        id: nanoid(),
        type: 'field' as const,
        anchor: labelRef,
        binding: path,
        label: title,
      }
      const labelSpecCell = { ref: labelRef, value: { literal: `${title}:` }, style: { bold: true } }
      const valueSpecCell = { ref: valueRef, value: { binding: path } }
      const newSpec: JsonSpec = {
        ...currentSpec,
        cells: [...currentSpec.cells, labelSpecCell, valueSpecCell],
        regions: [...currentSpec.regions, newRegion],
      }
      set({ currentSpec: newSpec })
    } catch {
      // no selection
    }
  },

  insertTableRegion: (blockRef) => {
    const { workbook, currentSpec, lastSelection } = get()
    if (!workbook || !currentSpec) return
    try {
      const sheet = workbook.getActiveSheet()

      // Live selection preferred; fall back to last known selection; default A1
      const liveRange = sheet.getSelection()?.getActiveRange()
      let startRow = lastSelection?.row ?? 0
      let startColumn = lastSelection?.col ?? 0
      if (liveRange) {
        const rd = liveRange.getRange()
        startRow = rd.startRow
        startColumn = rd.startColumn
      }
      const startRef = rowColToRef(startRow, startColumn)

      const table = fieldCatalogMock.tables.find((t) => t.path === blockRef)
      if (!table) return

      const colCount = table.columns.length
      // anchor = column-header row (one below the title row)
      const anchorRef = rowColToRef(startRow + 1, startColumn)
      const titleMergeEnd = rowColToRef(startRow, startColumn + colCount - 1)
      const titleMergeRange = colCount > 1 ? `${startRef}:${titleMergeEnd}` : undefined

      // Title cell is stored in spec.cells so it round-trips through JSON-spec
      const titleSpecCell = {
        ref: startRef,
        merge: titleMergeRange,
        value: { literal: table.title },
        style: { bold: true, align: 'center' as const },
      }

      const newRegion = {
        id: nanoid(),
        anchor: anchorRef,
        block_ref: blockRef,
        type: 'table' as const,
        binding: blockRef,
        columns: table.columns.map((c) => ({ header: c.title, binding: c.path })),
      }

      const newSpec: JsonSpec = {
        ...currentSpec,
        cells: [...currentSpec.cells, titleSpecCell],
        regions: [...currentSpec.regions, newRegion],
      }

      // Write title row into Univer (merged, bold, centered)
      const titleCell = sheet.getRange(startRef)
      titleCell.setValue({ v: table.title, custom: { literal: table.title } })
      titleCell.setFontWeight('bold')
      titleCell.setHorizontalAlignment('center')
      if (colCount > 1) {
        sheet.getRange(`${startRef}:${titleMergeEnd}`).merge()
      }

      // Write column headers + binding-reference sample row
      table.columns.forEach((col, ci) => {
        const headerCell = sheet.getRange(rowColToRef(startRow + 1, startColumn + ci))
        headerCell.setValue({ v: col.title, custom: { literal: col.title } })
        headerCell.setFontWeight('bold')
        headerCell.setHorizontalAlignment('center')

        const sampleCell = sheet.getRange(rowColToRef(startRow + 2, startColumn + ci))
        sampleCell.setValue({ v: `[${col.path}]`, custom: { binding: col.path } })
      })

      set({ currentSpec: newSpec })
    } catch {
      // no selection
    }
  },

  moveRegion: (regionId, newTitleRow, newAnchorCol) => {
    const { workbook, currentSpec } = get()
    if (!workbook || !currentSpec) return

    try {
      const sheet = workbook.getActiveSheet()
      const regionIdx = currentSpec.regions.findIndex((r) => r.id === regionId)
      if (regionIdx < 0) return

      const region = currentSpec.regions[regionIdx]
      const { row: oldAnchorRow, col: oldAnchorCol } = a1ToRowCol(region.anchor)

      // ── Scalar field (labeled binding) ──────────────────────────────────
      if (region.type === 'field') {
        const FIELD_COLS = 2
        const deltaRow = newTitleRow - oldAnchorRow
        const deltaCol = newAnchorCol - oldAnchorCol
        if (deltaRow === 0 && deltaCol === 0) return

        // Clear old cells
        for (let c = 0; c < FIELD_COLS; c++) {
          try { sheet.getRange(rowColToRef(oldAnchorRow, oldAnchorCol + c)).clearContent() } catch { /* ignore */ }
        }

        // Shift spec cells that belong to this field
        const inOldField = (r: number, c: number) =>
          r === oldAnchorRow && c >= oldAnchorCol && c < oldAnchorCol + FIELD_COLS

        const newCells = currentSpec.cells.map((cell) => {
          try {
            const { row, col } = a1ToRowCol(cell.ref)
            if (!inOldField(row, col)) return cell
            return { ...cell, ref: rowColToRef(row + deltaRow, col + deltaCol) }
          } catch { return cell }
        })

        const newAnchorRef = rowColToRef(newTitleRow, newAnchorCol)
        const newRegions = currentSpec.regions.map((r, i) =>
          i === regionIdx ? { ...r, anchor: newAnchorRef } : r,
        )
        const newSpec: JsonSpec = { ...currentSpec, cells: newCells, regions: newRegions }

        // Write moved cells into Univer
        for (const cell of newSpec.cells) {
          try {
            const { row, col } = a1ToRowCol(cell.ref)
            if (row !== newTitleRow || col < newAnchorCol || col >= newAnchorCol + FIELD_COLS) continue
            const fRange = sheet.getRange(cell.ref)
            const displayVal = cell.value.literal ?? (cell.value.binding ? `[${cell.value.binding}]` : '')
            fRange.setValue({ v: displayVal, custom: { binding: cell.value.binding, literal: cell.value.literal } })
            if (cell.style?.bold) fRange.setFontWeight('bold')
          } catch { /* ignore */ }
        }

        set({ currentSpec: newSpec })
        return
      }

      // ── Table block ─────────────────────────────────────────────────────
      const numCols = Math.max(region.columns?.length ?? 1, 1)

      const blockData = tableBlocksMock.find(
        (b) => b.path === region.block_ref || b.item_uuid === region.block_ref,
      )
      const numDataRows = Math.max(blockData?.rows.length ?? 0, 1)

      const oldTitleRow  = oldAnchorRow - 1
      const totalRows    = numDataRows + 2   // title + header + data rows
      const newAnchorRow = newTitleRow + 1
      const deltaRow     = newTitleRow - oldTitleRow
      const deltaCol     = newAnchorCol - oldAnchorCol

      if (deltaRow === 0 && deltaCol === 0) return

      // 1. Break apart merges in old area, then clear content
      for (let r = oldTitleRow; r < oldTitleRow + totalRows; r++) {
        try {
          const rowRange = `${rowColToRef(r, oldAnchorCol)}:${rowColToRef(r, oldAnchorCol + numCols - 1)}`
          sheet.getRange(rowRange).breakApart()
        } catch { /* ignore if no merge */ }
      }
      for (let r = oldTitleRow; r < oldTitleRow + totalRows; r++) {
        for (let c = oldAnchorCol; c < oldAnchorCol + numCols; c++) {
          try { sheet.getRange(rowColToRef(r, c)).clearContent() } catch { /* ignore */ }
        }
      }

      // 2. Compute updated spec: shift cells that fall inside the old block bounds
      const inOldBlock = (row: number, col: number) =>
        row >= oldTitleRow &&
        row < oldTitleRow + totalRows &&
        col >= oldAnchorCol &&
        col < oldAnchorCol + numCols

      const newCells = currentSpec.cells.map((cell) => {
        try {
          const { row, col } = a1ToRowCol(cell.ref)
          if (!inOldBlock(row, col)) return cell

          const nr = row + deltaRow
          const nc = col + deltaCol
          let newMerge = cell.merge
          if (cell.merge) {
            const [ms, me] = cell.merge.split(':')
            const s = a1ToRowCol(ms)
            const e = a1ToRowCol(me)
            newMerge = `${rowColToRef(s.row + deltaRow, s.col + deltaCol)}:${rowColToRef(e.row + deltaRow, e.col + deltaCol)}`
          }
          return { ...cell, ref: rowColToRef(nr, nc), merge: newMerge }
        } catch {
          return cell
        }
      })

      const newAnchorRef = rowColToRef(newAnchorRow, newAnchorCol)
      const newRegions   = currentSpec.regions.map((r, i) =>
        i === regionIdx ? { ...r, anchor: newAnchorRef } : r,
      )
      const newSpec: JsonSpec = { ...currentSpec, cells: newCells, regions: newRegions }

      // 3. Write resolved cells for the new block area into Univer
      const resolvedSpec = resolveBlockRefs(newSpec)
      const inNewBlock = (row: number, col: number) =>
        row >= newTitleRow &&
        row < newTitleRow + totalRows &&
        col >= newAnchorCol &&
        col < newAnchorCol + numCols

      for (const cell of resolvedSpec.cells) {
        try {
          const { row, col } = a1ToRowCol(cell.ref)
          if (!inNewBlock(row, col)) continue

          const fRange = sheet.getRange(cell.ref)
          const displayVal =
            cell.value.literal ?? (cell.value.binding ? `[${cell.value.binding}]` : '')
          fRange.setValue({
            v: displayVal,
            custom: {
              binding: cell.value.binding,
              literal: cell.value.literal,
              template: cell.value.template,
            },
          })
          if (cell.style?.bold) fRange.setFontWeight('bold')
          if (cell.style?.align) fRange.setHorizontalAlignment(cell.style.align as never)
          if (cell.merge) {
            try { sheet.getRange(cell.merge).merge() } catch { /* ignore */ }
          }
        } catch { /* ignore individual cell errors */ }
      }

      set({ currentSpec: newSpec })
    } catch (err) {
      console.error('[templateStore] moveRegion error:', err)
    }
  },

  exportSpecJson: () => {
    const { currentSpec } = get()
    if (!currentSpec) return
    const json = JSON.stringify(currentSpec, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentSpec.name}.json`
    a.click()
    URL.revokeObjectURL(url)
  },

  importSpecJson: (json) => {
    const result = validateSpec(json)
    if (!result.success) {
      const msg = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
      return { ok: false, error: msg }
    }
    set((s) => ({ currentSpec: result.data, specEpoch: s.specEpoch + 1 }))
    return { ok: true }
  },
}))
