import ExcelJS from 'exceljs'
import type { JsonSpec, SpecCell, SpecStyle, FooterCell } from '../spec/types'
import type { ConclusionData } from '../mocks/conclusionData.mock'
import { resolveBlockRefs } from '../blocks/resolveBlockRefs'
import { getByPath } from '../spec/pathUtils'

const MM_TO_INCH = 1 / 25.4

function toBorderStyle(v?: string): ExcelJS.BorderStyle | undefined {
  if (!v || v === 'none') return undefined
  if (v === 'thin') return 'thin'
  if (v === 'medium') return 'medium'
  if (v === 'thick') return 'thick'
  return 'thin'
}

function resolveValue(value: SpecCell['value'], data: ConclusionData): string {
  if (value.literal) return value.literal
  if (value.binding) return String(getByPath(data, value.binding) ?? '')
  if (value.template) {
    return value.template.replace(/\{([\w.[\]]+)\}/g, (_, path: string) =>
      String(getByPath(data, path) ?? ''),
    )
  }
  return ''
}

function applyStyle(cell: ExcelJS.Cell, style?: SpecStyle) {
  if (!style) return

  if (style.bold !== undefined || style.italic !== undefined || style.underline !== undefined || style.size || style.font) {
    cell.font = {
      bold: style.bold,
      italic: style.italic,
      underline: style.underline ? 'single' : undefined,
      size: style.size,
      name: style.font,
    }
  }

  if (style.align || style.vertical_align || style.wrap !== undefined) {
    cell.alignment = {
      horizontal: style.align,
      vertical: style.vertical_align === 'middle' ? 'middle' : style.vertical_align,
      wrapText: style.wrap,
    }
  }

  // Border handling: 'all' is shorthand for all four sides
  const isAll = style.border === 'all'
  const bTop = toBorderStyle(isAll ? 'thin' : (style.border_top ?? style.border))
  const bBottom = toBorderStyle(isAll ? 'thin' : (style.border_bottom ?? style.border))
  const bLeft = toBorderStyle(isAll ? 'thin' : (style.border_left ?? style.border))
  const bRight = toBorderStyle(isAll ? 'thin' : (style.border_right ?? style.border))

  if (bTop || bBottom || bLeft || bRight) {
    cell.border = {
      top: bTop ? { style: bTop } : undefined,
      bottom: bBottom ? { style: bBottom } : undefined,
      left: bLeft ? { style: bLeft } : undefined,
      right: bRight ? { style: bRight } : undefined,
    }
  }
}

function renderCells(ws: ExcelJS.Worksheet, cells: (SpecCell | FooterCell)[], data: ConclusionData) {
  // Merge first
  for (const c of cells) {
    if (c.merge) {
      try { ws.mergeCells(c.merge) } catch { /* already merged */ }
    }
  }
  // Values and styles
  for (const c of cells) {
    const xlsxCell = ws.getCell(c.ref)
    xlsxCell.value = resolveValue(c.value, data)
    applyStyle(xlsxCell, c.style)
  }
}

export async function renderXlsx(spec: JsonSpec, data: ConclusionData): Promise<Blob> {
  const resolvedSpec = resolveBlockRefs(spec)

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Конструктор заключений MVP'

  const ws = wb.addWorksheet(spec.name, {
    pageSetup: {
      paperSize: spec.page.format === 'A4' ? 9 : 8 as number,
      orientation: spec.page.orientation,
    },
  })

  // Margins are stored in mm, ExcelJS needs inches
  const m = spec.page.margins
  ws.pageSetup.margins = {
    left: m.left * MM_TO_INCH,
    right: m.right * MM_TO_INCH,
    top: m.top * MM_TO_INCH,
    bottom: m.bottom * MM_TO_INCH,
    header: 0.3,
    footer: 0.3,
  }

  renderCells(ws, resolvedSpec.cells, data)

  // footer_cells: render as static cells (dynamic positioning not supported in MVP)
  if (resolvedSpec.footer_cells?.length) {
    renderCells(ws, resolvedSpec.footer_cells, data)
  }

  const buffer = await wb.xlsx.writeBuffer()
  return new Blob([buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
