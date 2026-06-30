import { create } from 'zustand'
import type { FWorkbook } from '@univerjs/sheets/facade'
import type { JsonSpec } from '../core/spec/types'
import { nanoid } from '../core/utils/nanoid'
import { baseTemplatesMock } from '../core/mocks/baseTemplates.mock'
import { conclusionDataMock } from '../core/mocks/conclusionData.mock'
import { fieldCatalogMock } from '../core/mocks/fieldCatalog.mock'
import { mapWorkbookDataToSpec } from '../core/spec/specMapper'
import { validateSpec } from '../core/spec/specValidator'

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

function loadFromStorage(): SavedTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SavedTemplate[]) : []
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

  setWorkbook: (wb: FWorkbook | null) => void
  setCurrentSpec: (spec: JsonSpec) => void
  setLastSelection: (sel: { row: number; col: number } | null) => void

  newTemplate: (baseId: string) => void
  saveTemplate: () => void
  loadTemplate: (id: string) => void
  deleteTemplate: (id: string) => void

  applyBindingToSelection: (path: string) => void
  insertTableRegion: (blockRef: string) => void
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  currentSpec: null,
  workbook: null,
  savedTemplates: loadFromStorage(),
  conclusionData: conclusionDataMock,
  lastSelection: null,

  setWorkbook: (wb) => set({ workbook: wb }),
  setCurrentSpec: (spec) => set({ currentSpec: spec }),
  setLastSelection: (sel) => set({ lastSelection: sel }),

  newTemplate: (baseId) => {
    const found = baseTemplatesMock.find((t) => t.id === baseId)
    if (!found) return
    const spec: JsonSpec = { ...found.spec, id: nanoid() }
    set({ currentSpec: spec })
  },

  saveTemplate: () => {
    const { currentSpec, workbook, savedTemplates } = get()
    if (!currentSpec) return

    let spec = currentSpec

    if (workbook) {
      try {
        const wbData = (workbook as unknown as { save: () => unknown }).save?.()
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
    if (found) set({ currentSpec: found.spec })
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

  insertTableRegion: (blockRef) => {
    const { workbook, currentSpec, conclusionData, lastSelection } = get()
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

      const newRegion = {
        id: nanoid(),
        startRef,
        block_ref: blockRef,
        columns: table.columns.map((c) => ({ path: c.path, title: c.title })),
      }

      const newSpec: JsonSpec = {
        ...currentSpec,
        regions: [...currentSpec.regions, newRegion],
      }

      // Sample data from first row of conclusionData for the given blockRef
      const tableData = (conclusionData as Record<string, unknown>)[blockRef]
      const firstRow = Array.isArray(tableData) ? (tableData[0] as Record<string, unknown>) : null

      // Write header row + sample data row into Univer
      table.columns.forEach((col, ci) => {
        // Header
        const headerCell = sheet.getRange(rowColToRef(startRow, startColumn + ci))
        headerCell.setValue({ v: col.title, custom: { literal: col.title } })
        headerCell.setFontWeight('bold')
        headerCell.setHorizontalAlignment('center')

        // Sample row: real mock value if available, otherwise binding placeholder
        const pathKey = col.path.replace(/^.*\[\]\./, '')
        const val = firstRow?.[pathKey]
        const sampleCell = sheet.getRange(rowColToRef(startRow + 1, startColumn + ci))
        if (val != null) {
          sampleCell.setValue({ v: String(val), custom: { literal: String(val) } })
        } else {
          sampleCell.setValue({ v: `[${col.path}]`, custom: { binding: col.path } })
        }
      })

      set({ currentSpec: newSpec })
    } catch {
      // no selection
    }
  },
}))
