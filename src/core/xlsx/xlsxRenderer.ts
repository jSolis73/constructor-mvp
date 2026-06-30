import ExcelJS from 'exceljs'
import type { JsonSpec, SpecCell, SpecStyle } from '../spec/types'
import type { ConclusionData } from '../mocks/conclusionData.mock'
import { resolveBlockRefs } from '../blocks/resolveBlockRefs'
import { getByPath } from '../spec/pathUtils'

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
  if (style.bold || style.italic || style.fontSize || style.fontFamily || style.fontColor) {
    cell.font = {
      bold: style.bold,
      italic: style.italic,
      size: style.fontSize,
      name: style.fontFamily,
      color: style.fontColor ? { argb: style.fontColor.replace('#', 'FF') } : undefined,
    }
  }
  if (style.horizontalAlign) {
    cell.alignment = {
      ...cell.alignment,
      horizontal: style.horizontalAlign,
      wrapText: style.wrapText,
    }
  }
  if (style.bgColor) {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: style.bgColor.replace('#', 'FF') },
    }
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

  ws.pageSetup.margins = {
    left: spec.page.margins.left,
    right: spec.page.margins.right,
    top: spec.page.margins.top,
    bottom: spec.page.margins.bottom,
    header: 0.3,
    footer: 0.3,
  }

  // Merge cells first
  const merged = new Set<string>()
  for (const specCell of resolvedSpec.cells) {
    if (specCell.merge) {
      try {
        ws.mergeCells(specCell.merge)
        merged.add(specCell.merge)
      } catch {
        // already merged or invalid range — skip
      }
    }
  }

  // Write values and styles
  for (const specCell of resolvedSpec.cells) {
    const xlsxCell = ws.getCell(specCell.ref)
    xlsxCell.value = resolveValue(specCell.value, data)
    applyStyle(xlsxCell, specCell.style)
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
