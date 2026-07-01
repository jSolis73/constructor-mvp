import type { IWorkbookData, ICellData, IStyleData, IRange } from '@univerjs/core'
import type { JsonSpec, SpecCell, SpecStyle } from './types'

const SHEET_ID = 'conclusion_sheet'
const WORKBOOK_ID = 'conclusion_workbook'

// ─── A1 helpers ──────────────────────────────────────────────────────────────

export function a1ToRowCol(a1: string): { row: number; col: number } {
  const match = /^([A-Z]+)(\d+)$/.exec(a1.toUpperCase())
  if (!match) throw new Error(`Invalid A1 ref: ${a1}`)
  const col = match[1].split('').reduce((acc, ch) => acc * 26 + ch.charCodeAt(0) - 64, 0) - 1
  const row = parseInt(match[2], 10) - 1
  return { row, col }
}

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

function rowColToA1(row: number, col: number): string {
  return `${colToLetter(col)}${row + 1}`
}

function a1RangeToMergeRange(a1Range: string): IRange {
  const [start, end] = a1Range.split(':')
  const s = a1ToRowCol(start)
  const e = a1ToRowCol(end)
  return {
    startRow: s.row,
    startColumn: s.col,
    endRow: e.row,
    endColumn: e.col,
  }
}

// ─── Style mapping ────────────────────────────────────────────────────────────

function mapStyleToUniver(style?: SpecStyle): IStyleData | undefined {
  if (!style) return undefined
  const s: IStyleData = {}
  if (style.bold !== undefined) s.bl = style.bold ? 1 : 0
  if (style.italic !== undefined) s.it = style.italic ? 1 : 0
  if (style.size) s.fs = style.size
  if (style.font) s.ff = style.font
  if (style.wrap !== undefined) s.tb = style.wrap ? 3 : 1
  if (style.align) {
    const alignMap: Record<string, number> = { left: 1, center: 2, right: 3 }
    s.ht = alignMap[style.align]
  }
  if (style.vertical_align) {
    const vAlignMap: Record<string, number> = { top: 1, middle: 2, bottom: 3 }
    s.vt = vAlignMap[style.vertical_align]
  }
  return s
}

function mapStyleFromUniver(s?: IStyleData): SpecStyle | undefined {
  if (!s) return undefined
  const style: SpecStyle = {}
  if (s.bl !== undefined) style.bold = s.bl === 1
  if (s.it !== undefined) style.italic = s.it === 1
  if (s.fs) style.size = s.fs
  if (s.ff) style.font = s.ff
  if (s.tb !== undefined) style.wrap = s.tb === 3
  if (s.ht != null) {
    const alignMap: Record<number, 'left' | 'center' | 'right'> = { 1: 'left', 2: 'center', 3: 'right' }
    style.align = alignMap[s.ht]
  }
  if (s.vt != null) {
    const vAlignMap: Record<number, 'top' | 'middle' | 'bottom'> = { 1: 'top', 2: 'middle', 3: 'bottom' }
    style.vertical_align = vAlignMap[s.vt]
  }
  return style
}

// ─── Display value in editor ──────────────────────────────────────────────────

function resolveDisplayValue(cell: SpecCell): string {
  if (cell.value.literal) return cell.value.literal
  if (cell.value.binding) return `[${cell.value.binding}]`
  if (cell.value.template) return cell.value.template
  return ''
}

// ─── spec → IWorkbookData ─────────────────────────────────────────────────────

export function mapSpecToWorkbookData(spec: JsonSpec): IWorkbookData {
  const cellData: Record<number, Record<number, ICellData>> = {}
  const mergeData: IRange[] = []

  for (const cell of spec.cells) {
    const { row, col } = a1ToRowCol(cell.ref)
    cellData[row] ??= {}
    cellData[row][col] = {
      v: resolveDisplayValue(cell),
      custom: {
        binding: cell.value.binding,
        template: cell.value.template,
        literal: cell.value.literal,
      },
      s: mapStyleToUniver(cell.style),
    }
    if (cell.merge) {
      mergeData.push(a1RangeToMergeRange(cell.merge))
    }
  }

  return {
    id: WORKBOOK_ID,
    sheetOrder: [SHEET_ID],
    name: spec.name,
    appVersion: '0.25.1',
    locale: 'ruRU' as never,
    styles: {},
    sheets: {
      [SHEET_ID]: {
        id: SHEET_ID,
        name: spec.name,
        rowCount: 60,
        columnCount: 43,
        cellData,
        mergeData,
      },
    },
  } as IWorkbookData
}

// ─── IWorkbookData → spec ─────────────────────────────────────────────────────

export function mapWorkbookDataToSpec(data: IWorkbookData, prevSpec: JsonSpec): JsonSpec {
  const sheet = data.sheets?.[SHEET_ID]
  if (!sheet) return prevSpec

  const cellData = sheet.cellData ?? {}
  const mergeData: IRange[] = (sheet.mergeData as IRange[] | undefined) ?? []

  const mergeByStart: Record<string, string> = {}
  for (const m of mergeData) {
    const key = `${m.startRow}:${m.startColumn}`
    mergeByStart[key] = `${rowColToA1(m.startRow, m.startColumn)}:${rowColToA1(m.endRow, m.endColumn)}`
  }

  const cells: SpecCell[] = []
  for (const rowStr of Object.keys(cellData)) {
    const row = parseInt(rowStr, 10)
    const rowData = cellData[row]
    for (const colStr of Object.keys(rowData)) {
      const col = parseInt(colStr, 10)
      const cell = rowData[col]
      if (!cell) continue

      const ref = rowColToA1(row, col)
      const custom = cell.custom as Record<string, string | undefined> | undefined

      const value = {
        literal: custom?.literal,
        binding: custom?.binding,
        template: custom?.template,
      }

      if (!value.literal && !value.binding && !value.template) {
        const raw = cell.v
        if (raw !== undefined && raw !== null && raw !== '') {
          value.literal = String(raw)
        }
      }

      if (!value.literal && !value.binding && !value.template) continue

      const specCell: SpecCell = {
        ref,
        value,
        style: mapStyleFromUniver(cell.s as IStyleData | undefined),
      }

      const mergeKey = `${row}:${col}`
      if (mergeByStart[mergeKey]) {
        specCell.merge = mergeByStart[mergeKey]
      }

      cells.push(specCell)
    }
  }

  return { ...prevSpec, cells }
}
