import { useCallback, useEffect } from 'react'
import { useUniverInstance } from './useUniverInstance'
import { useTemplateStore } from '../../store/templateStore'
import { mapSpecToWorkbookData } from '../../core/spec/specMapper'

export function TemplateEditor() {
  const { currentSpec, setWorkbook, setLastSelection } = useTemplateStore()

  const initialData = currentSpec ? mapSpecToWorkbookData(currentSpec) : undefined

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
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
      onPointerUp={handlePointerUp}
    />
  )
}
