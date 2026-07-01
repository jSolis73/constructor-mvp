import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useTemplateStore } from '../../store/templateStore'
import {
  getBlockGeometry,
  getBlockScreenRect,
  getCellScreenRect,
  screenPosToCellIndex,
  detectCanvasOffset,
  isDropValid,
  type OverlayScrollState,
  type CanvasOffset,
  type BlockGeometry,
} from './blockOverlay.utils'

interface Props {
  containerRef: RefObject<HTMLDivElement>
}

interface DragState {
  regionId: string
  ghostRow: number
  ghostCol: number
  origTitleRow: number
  origAnchorCol: number
  isValid: boolean
}

// Sheet-UI FWorksheet interface (methods mixed in by UniverSheetsCorePreset)
interface SheetWithUI {
  getSkeleton: () => unknown
  getScrollState: () => OverlayScrollState
  onScroll: (cb: () => void) => { dispose: () => void }
}

export function BlockDragOverlay({ containerRef }: Props) {
  const { currentSpec, workbook, moveRegion } = useTemplateStore()

  const skeletonRef    = useRef<unknown>(null)
  const scrollStateRef = useRef<OverlayScrollState | null>(null)
  const canvasOffsetRef = useRef<CanvasOffset>({ x: 0, y: 0 })
  const [renderTick, setRenderTick] = useState(0)   // bumped on skeleton/scroll changes to force re-render
  const [drag, setDrag] = useState<DragState | null>(null)

  // Keep a stable ref to currentSpec for closures inside drag handlers
  const currentSpecRef = useRef(currentSpec)
  useEffect(() => { currentSpecRef.current = currentSpec }, [currentSpec])

  // ── Subscribe to Univer skeleton + scroll ────────────────────────────────
  useEffect(() => {
    if (!workbook) return
    const sheet = workbook.getActiveSheet() as unknown as SheetWithUI

    let disposable: { dispose: () => void } | null = null

    const refresh = () => {
      try {
        const sk = sheet.getSkeleton()
        const sc = sheet.getScrollState()
        if (sk) skeletonRef.current = sk
        if (sc) scrollStateRef.current = { ...sc }
        // Re-detect canvas offset; done on every tick so layout changes (toolbar appear) are caught
        if (containerRef.current) {
          canvasOffsetRef.current = detectCanvasOffset(containerRef.current)
        }
        // Subscribe to scroll once Univer UI is ready
        if (!disposable) {
          try { disposable = sheet.onScroll(refresh) } catch { /* not ready yet */ }
        }
        setRenderTick((n) => n + 1)
      } catch { /* Univer not fully initialized yet */ }
    }

    // Helper: true once canvas is in DOM with real pixel dimensions
    const isCanvasReady = () => {
      if (!containerRef.current) return false
      return Array.from(containerRef.current.querySelectorAll('canvas'))
        .some((c) => c.clientWidth > 0 && c.clientHeight > 0)
    }

    // Poll until skeleton AND canvas are both ready so canvas offset is accurate.
    // Skeleton can appear before the canvas element is laid out; stopping on skeleton
    // alone would capture a wrong (zero) canvas offset.
    let attempts = 0
    const poll = setInterval(() => {
      refresh()
      if ((skeletonRef.current && isCanvasReady()) || ++attempts > 40) clearInterval(poll)
    }, 150)

    return () => {
      clearInterval(poll)
      disposable?.dispose()
    }
  }, [workbook])

  // ── Drag handlers ────────────────────────────────────────────────────────

  function handleDragStart(regionId: string, evt: React.MouseEvent) {
    evt.preventDefault()
    evt.stopPropagation()

    const spec = currentSpecRef.current
    if (!skeletonRef.current || !scrollStateRef.current || !containerRef.current || !spec) return

    const region = spec.regions.find((r) => r.id === regionId)
    if (!region) return
    const geo = getBlockGeometry(region)
    if (!geo) return

    // Record where the user grabbed the block (offset from title-row top-left)
    const containerRect = containerRef.current.getBoundingClientRect()
    const titleRect = getCellScreenRect(skeletonRef.current, scrollStateRef.current, geo.titleRow, geo.anchorCol, canvasOffsetRef.current)
    const grabOffsetX = evt.clientX - containerRect.left - titleRect.left
    const grabOffsetY = evt.clientY - containerRect.top  - titleRect.top

    setDrag({
      regionId,
      ghostRow: geo.titleRow,
      ghostCol: geo.anchorCol,
      origTitleRow: geo.titleRow,
      origAnchorCol: geo.anchorCol,
      isValid: true,
    })
    document.body.style.cursor = 'grabbing'

    function onMove(e: MouseEvent) {
      const container = containerRef.current
      if (!skeletonRef.current || !container) return

      // Read live scroll from Univer (avoids stale closure)
      const sheet = workbook?.getActiveSheet() as unknown as SheetWithUI | undefined
      const liveScroll = sheet?.getScrollState() ?? scrollStateRef.current
      if (!liveScroll) return

      const cRect = container.getBoundingClientRect()
      // Adjust for grab offset so the block top-left tracks the cursor correctly
      const relX = e.clientX - cRect.left - grabOffsetX
      const relY = e.clientY - cRect.top  - grabOffsetY

      const { row, col } = screenPosToCellIndex(skeletonRef.current, liveScroll, relX, relY, canvasOffsetRef.current)
      const valid = isDropValid(regionId, row, col, currentSpecRef.current?.regions ?? [])
      setDrag((prev) => (prev ? { ...prev, ghostRow: row, ghostCol: col, isValid: valid } : null))
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''

      setDrag((prev) => {
        if (prev?.isValid && (prev.ghostRow !== geo.titleRow || prev.ghostCol !== geo.anchorCol)) {
          moveRegion(prev.regionId, prev.ghostRow, prev.ghostCol)
        }
        return null
      })
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // ── Render ───────────────────────────────────────────────────────────────

  // Suppress lint warning — renderTick is intentionally consumed to trigger re-render
  void renderTick

  const sk = skeletonRef.current
  const sc = scrollStateRef.current
  if (!currentSpec || !sk || !sc) return null

  const blocks: Array<{ region: (typeof currentSpec.regions)[number]; geo: BlockGeometry }> = []
  for (const region of currentSpec.regions) {
    const geo = getBlockGeometry(region)
    if (geo) blocks.push({ region, geo })
  }

  if (blocks.length === 0) return null

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 10 }}>

      {/* Block outlines + drag handles */}
      {blocks.map(({ region, geo }) => {
        const co        = canvasOffsetRef.current
        const rect      = getBlockScreenRect(geo, sk, sc, co)
        const titleH    = getCellScreenRect(sk, sc, geo.titleRow, geo.anchorCol, co).height
        const isDragging = drag?.regionId === region.id

        const isField   = region.type === 'field'
        const badgeClass  = isField ? 'block-badge block-badge--field'    : 'block-badge'
        const overlayClass = isField ? 'block-overlay block-overlay--field' : 'block-overlay'
        const handleClass = isField ? 'block-drag-handle block-drag-handle--field' : 'block-drag-handle'
        const label = isField ? (region.label ?? region.binding ?? '') : (region.block_ref ?? '')

        return (
          <div key={geo.regionId}>
            {/* Floating badge above the block — always visible, acts as the drag handle */}
            <div
              className={badgeClass}
              style={{
                left: rect.left,
                top:  rect.top - 20,
                opacity: isDragging ? 0.35 : 1,
              }}
              onMouseDown={(e) => handleDragStart(geo.regionId, e)}
              title="Перетащите, чтобы переместить блок"
            >
              <i className="pi pi-arrows-alt" style={{ fontSize: '10px' }} />
              <span>{label}</span>
            </div>

            {/* Block outline */}
            <div
              className={overlayClass}
              style={{
                left:    rect.left,
                top:     rect.top,
                width:   rect.width,
                height:  rect.height,
                opacity: isDragging ? 0.35 : 1,
              }}
            >
              {/* Drag handle strip inside the title row */}
              <div
                className={handleClass}
                style={{ height: titleH }}
                onMouseDown={(e) => handleDragStart(geo.regionId, e)}
                title="Перетащите, чтобы переместить блок"
              >
                <i className="pi pi-arrows-alt" style={{ fontSize: '11px', flexShrink: 0 }} />
                <span className="block-label">{label}</span>
              </div>
            </div>
          </div>
        )
      })}

      {/* Ghost block while dragging */}
      {drag && (() => {
        const region = currentSpec.regions.find((r) => r.id === drag.regionId)
        if (!region) return null
        const geo = getBlockGeometry(region)
        if (!geo) return null

        // Build a synthetic geometry for the ghost position.
        // anchorRow offset from titleRow: 0 for 'field' regions, 1 for 'table' regions.
        const anchorOffset = geo.anchorRow - geo.titleRow
        const ghostGeo: BlockGeometry = {
          ...geo,
          titleRow:  drag.ghostRow,
          anchorRow: drag.ghostRow + anchorOffset,
          anchorCol: drag.ghostCol,
        }
        const ghostRect = getBlockScreenRect(ghostGeo, sk, sc, canvasOffsetRef.current)

        return (
          <div
            className={`block-ghost ${drag.isValid ? 'block-ghost--valid' : 'block-ghost--invalid'}`}
            style={{
              left:   ghostRect.left,
              top:    ghostRect.top,
              width:  ghostRect.width,
              height: ghostRect.height,
            }}
          />
        )
      })()}
    </div>
  )
}
