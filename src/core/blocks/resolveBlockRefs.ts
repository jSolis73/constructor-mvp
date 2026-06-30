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
    const block = tableBlocksMock.find((b) => b.path === region.block_ref || b.item_uuid === region.block_ref)
    if (!block) continue

    const { row: startRow, col: startCol } = a1ToRowCol(region.startRef)

    // header row
    region.columns.forEach((col, ci) => {
      extraCells.push({
        ref: rowColToA1(startRow, startCol + ci),
        value: { literal: col.title },
        style: { bold: true, horizontalAlign: 'center' },
      })
    })

    // data rows
    block.rows.forEach((rowData, ri) => {
      region.columns.forEach((col, ci) => {
        const pathKey = col.path.replace(/^.*\[\]\./, '')
        const val = rowData[pathKey]
        extraCells.push({
          ref: rowColToA1(startRow + 1 + ri, startCol + ci),
          value: { literal: val != null ? String(val) : '' },
          style: {},
        })
      })
    })
  }

  return { ...spec, cells: [...spec.cells, ...extraCells] }
}
