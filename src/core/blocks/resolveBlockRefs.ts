import type { JsonSpec, SpecCell } from '../spec/types'
import { tableBlocksMock } from '../mocks/tableBlocks.mock'
import { a1ToRowCol } from '../spec/specMapper'

function rowColToA1(row: number, col: number): string {
  let result = ''
  let c = col + 1
  while (c > 0) {
    const rem = (c - 1) % 26
    result = String.fromCharCode(65 + rem) + result
    c = Math.floor((c - 1) / 26)
  }
  return `${result}${row + 1}`
}

export function resolveBlockRefs(spec: JsonSpec): JsonSpec {
  if (!spec.regions || spec.regions.length === 0) return spec

  const extraCells: SpecCell[] = []

  for (const region of spec.regions) {
    if (!region.block_ref) continue
    const block = tableBlocksMock.find(
      (b) => b.path === region.block_ref || b.item_uuid === region.block_ref,
    )
    if (!block) continue

    const columns = region.columns ?? []
    const { row: startRow, col: startCol } = a1ToRowCol(region.anchor)

    // header row
    columns.forEach((col, ci) => {
      extraCells.push({
        ref: rowColToA1(startRow, startCol + ci),
        value: { literal: col.header },
        style: { bold: true, align: col.align ?? 'center' },
      })
    })

    // data rows — use indexed bindings so the editor shows [path] placeholders
    // and the preview/xlsx renderer resolves them via getByPath(data, 'intervals[0].number')
    block.rows.forEach((_rowData, ri) => {
      columns.forEach((col, ci) => {
        const binding = col.binding.replace('[]', `[${ri}]`)
        extraCells.push({
          ref: rowColToA1(startRow + 1 + ri, startCol + ci),
          value: { binding },
          style: col.align ? { align: col.align } : {},
        })
      })
    })
  }

  return { ...spec, cells: [...spec.cells, ...extraCells] }
}
