import { a1ToRowCol } from '../../core/spec/specMapper'
import { tableBlocksMock } from '../../core/mocks/tableBlocks.mock'
import type { SpecRegion } from '../../core/spec/types'

// ── Types ──────────────────────────────────────────────────────────────────

export interface BlockGeometry {
  regionId: string
  titleRow: number   // anchorRow - 1
  anchorRow: number
  anchorCol: number
  numCols: number
  totalRows: number  // title (1) + header (1) + dataRows (≥1)
}

export interface CellRect {
  left: number
  top: number
  width: number
  height: number
}

export interface OverlayScrollState {
  sheetViewStartRow: number
  sheetViewStartColumn: number
  offsetX: number
  offsetY: number
}

// Minimal interface of the Univer SpreadsheetSkeleton we rely on
interface Skel {
  getCellByIndex: (row: number, col: number) => { startX: number; startY: number; endX: number; endY: number }
}

// ── Block geometry ─────────────────────────────────────────────────────────

export function getBlockGeometry(region: SpecRegion): BlockGeometry | null {
  if (!region.id) return null
  try {
    const { row: anchorRow, col: anchorCol } = a1ToRowCol(region.anchor)

    if (region.type === 'field') {
      // Scalar labeled binding: 1 row × 2 cols (label + value), no separate title row
      return {
        regionId: region.id,
        titleRow: anchorRow,
        anchorRow,
        anchorCol,
        numCols: 2,
        totalRows: 1,
      }
    }

    if (!region.block_ref) return null
    if (anchorRow < 1) return null  // need at least one row above for the title
    const numCols = Math.max(region.columns?.length ?? 1, 1)
    const blockData = tableBlocksMock.find(
      (b) => b.path === region.block_ref || b.item_uuid === region.block_ref,
    )
    const numDataRows = Math.max(blockData?.rows.length ?? 0, 1)
    return {
      regionId: region.id,
      titleRow: anchorRow - 1,
      anchorRow,
      anchorCol,
      numCols,
      totalRows: numDataRows + 2,  // title + header + data rows
    }
  } catch {
    return null
  }
}

// ── Screen ↔ canvas coordinate helpers ────────────────────────────────────
//
//  Univer's canvas coordinate system:
//    getCellByIndex(0, 0).startX  = rowHeaderWidth  (fixed row-number column)
//    getCellByIndex(0, 0).startY  = colHeaderHeight (fixed col-letter row)
//
//  Screen position of a cell (relative to the container div):
//    screenX = cell.startX − scrollAnchor.startX + rowHeaderWidth − offsetX
//    screenY = cell.startY − scrollAnchor.startY + colHeaderHeight − offsetY
//
//  where scrollAnchor = getCellByIndex(sheetViewStartRow, sheetViewStartColumn)

export interface CanvasOffset { x: number; y: number }

// Detect where the main Univer canvas element sits inside the container div.
// getCellByIndex() returns coordinates in canvas space; the canvas itself is
// offset from the container top by the toolbar / formula-bar height.
export function detectCanvasOffset(container: HTMLElement): CanvasOffset {
  const canvases = Array.from(container.querySelectorAll('canvas'))
  if (canvases.length === 0) return { x: 0, y: 0 }

  // Pick the canvas with the largest client area — that is the main grid canvas.
  const main = canvases.reduce<HTMLCanvasElement>((best, c) =>
    c.clientWidth * c.clientHeight > best.clientWidth * best.clientHeight ? c : best,
  canvases[0])

  const cRect  = main.getBoundingClientRect()
  const pRect  = container.getBoundingClientRect()
  return { x: cRect.left - pRect.left, y: cRect.top - pRect.top }
}

export function getCellScreenRect(
  skeleton: unknown,
  scrollState: OverlayScrollState,
  row: number,
  col: number,
  canvasOffset: CanvasOffset = { x: 0, y: 0 },
): CellRect {
  const sk = skeleton as Skel
  const cell   = sk.getCellByIndex(row, col)
  const anchor = sk.getCellByIndex(scrollState.sheetViewStartRow, scrollState.sheetViewStartColumn)
  const origin = sk.getCellByIndex(0, 0)   // origin.startX = rowHeaderWidth, origin.startY = colHeaderHeight
  return {
    left:   cell.startX - anchor.startX + origin.startX - scrollState.offsetX + canvasOffset.x,
    top:    cell.startY - anchor.startY + origin.startY - scrollState.offsetY + canvasOffset.y,
    width:  cell.endX - cell.startX,
    height: cell.endY - cell.startY,
  }
}

export function getBlockScreenRect(
  geo: BlockGeometry,
  skeleton: unknown,
  scrollState: OverlayScrollState,
  canvasOffset: CanvasOffset = { x: 0, y: 0 },
): CellRect {
  const topLeft     = getCellScreenRect(skeleton, scrollState, geo.titleRow, geo.anchorCol, canvasOffset)
  const bottomRight = getCellScreenRect(
    skeleton,
    scrollState,
    geo.titleRow + geo.totalRows - 1,
    geo.anchorCol + geo.numCols - 1,
    canvasOffset,
  )
  return {
    left:   topLeft.left,
    top:    topLeft.top,
    width:  bottomRight.left + bottomRight.width  - topLeft.left,
    height: bottomRight.top  + bottomRight.height - topLeft.top,
  }
}

// ── Reverse mapping: screen position → cell index ─────────────────────────
//
//  relX/relY are relative to the container div.
//  First subtract canvasOffset so they're in canvas-relative coordinates,
//  then invert getCellScreenRect:
//    canvasX = (relX - canvasOffset.x) + anchor.startX - origin.startX + offsetX

export function screenPosToCellIndex(
  skeleton: unknown,
  scrollState: OverlayScrollState,
  relX: number,
  relY: number,
  canvasOffset: CanvasOffset = { x: 0, y: 0 },
): { row: number; col: number } {
  const sk     = skeleton as Skel
  const anchor = sk.getCellByIndex(scrollState.sheetViewStartRow, scrollState.sheetViewStartColumn)
  const origin = sk.getCellByIndex(0, 0)

  const canvasX = (relX - canvasOffset.x) + anchor.startX - origin.startX + scrollState.offsetX
  const canvasY = (relY - canvasOffset.y) + anchor.startY - origin.startY + scrollState.offsetY

  let foundCol = 42
  for (let col = 0; col < 43; col++) {
    if (canvasX < sk.getCellByIndex(0, col).endX) { foundCol = col; break }
  }

  let foundRow = 59
  for (let row = 0; row < 60; row++) {
    if (canvasY < sk.getCellByIndex(row, 0).endY) { foundRow = row; break }
  }

  return { row: Math.max(0, foundRow), col: Math.max(0, foundCol) }
}

// ── Drop validation ────────────────────────────────────────────────────────

const SHEET_MAX_ROW = 59
const SHEET_MAX_COL = 42

function rectsOverlap(
  a: { r1: number; c1: number; r2: number; c2: number },
  b: { r1: number; c1: number; r2: number; c2: number },
): boolean {
  return !(a.r2 < b.r1 || a.r1 > b.r2 || a.c2 < b.c1 || a.c1 > b.c2)
}

export function isDropValid(
  draggingRegionId: string,
  newTitleRow: number,
  newAnchorCol: number,
  regions: SpecRegion[],
): boolean {
  const dragging = regions.find((r) => r.id === draggingRegionId)
  if (!dragging) return false
  const geo = getBlockGeometry(dragging)
  if (!geo) return false

  const newBounds = {
    r1: newTitleRow,
    c1: newAnchorCol,
    r2: newTitleRow + geo.totalRows - 1,
    c2: newAnchorCol + geo.numCols - 1,
  }

  // Page bounds check
  if (newTitleRow < 0 || newBounds.r2 > SHEET_MAX_ROW || newAnchorCol < 0 || newBounds.c2 > SHEET_MAX_COL) {
    return false
  }

  // Collision with every other block
  for (const region of regions) {
    if (region.id === draggingRegionId) continue
    const g = getBlockGeometry(region)
    if (!g) continue
    const other = {
      r1: g.titleRow,
      c1: g.anchorCol,
      r2: g.titleRow + g.totalRows - 1,
      c2: g.anchorCol + g.numCols - 1,
    }
    if (rectsOverlap(newBounds, other)) return false
  }

  return true
}
