import { useCallback, useEffect } from 'react'
import { useUniverInstance } from './useUniverInstance'
import { useTemplateStore } from '../../store/templateStore'
import { mapSpecToWorkbookData } from '../../core/spec/specMapper'
import { resolveBlockRefs } from '../../core/blocks/resolveBlockRefs'
import { BlockDragOverlay } from './BlockDragOverlay'

export function TemplateEditor() {
  const { currentSpec, setWorkbook, setLastSelection } = useTemplateStore()

  // Resolve regions so table headers/sample rows are visible in the editor
  const initialData = currentSpec ? mapSpecToWorkbookData(resolveBlockRefs(currentSpec)) : undefined

  const { containerRef, workbook } = useUniverInstance({
    readOnly: false,
    initialData,
  })

  useEffect(() => {
    if (workbook) {
      setWorkbook(workbook)
    }
    return () => setWorkbook(null)
  }, [workbook, setWorkbook])

  // Capture selected cell before focus leaves the canvas (toolbar clicks, sidebar, etc.)
  const handlePointerUp = useCallback(() => {
    setTimeout(() => {
      if (!workbook) return
      try {
        const range = workbook.getActiveSheet().getSelection()?.getActiveRange()
        if (range) {
          const r = range.getRange()
          setLastSelection({ row: r.startRow, col: r.startColumn })
        }
      } catch {
        // ignore
      }
    }, 50)
  }, [workbook, setLastSelection])

  return (
    // position: relative so BlockDragOverlay (absolute, inset:0) covers the same area
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%' }}
        onPointerUp={handlePointerUp}
      />
      <BlockDragOverlay containerRef={containerRef} />
    </div>
  )
}
