import { useEffect, useRef } from 'react'
import { Dialog } from 'primereact/dialog'
import { Button } from 'primereact/button'
import { useTemplateStore } from '../../store/templateStore'
import { mapSpecToWorkbookData } from '../../core/spec/specMapper'
import { resolveBlockRefs } from '../../core/blocks/resolveBlockRefs'
import { renderXlsx, downloadBlob } from '../../core/xlsx/xlsxRenderer'
import { createUniver, LocaleType, merge } from '@univerjs/presets'
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import UniverPresetSheetsCoreRuRU from '@univerjs/preset-sheets-core/locales/ru-RU'
import { getByPath } from '../../core/spec/pathUtils'
import type { ICellData, IWorkbookData } from '@univerjs/core'
import type { ConclusionData } from '../../core/mocks/conclusionData.mock'
import type { FUniver } from '@univerjs/presets'

function resolveBindings(workbookData: ReturnType<typeof mapSpecToWorkbookData>, data: ConclusionData) {
  const sheets = workbookData.sheets ?? {}
  for (const sheetId of Object.keys(sheets)) {
    const sheet = sheets[sheetId]
    const cellData = sheet.cellData ?? {}
    for (const row of Object.keys(cellData)) {
      const rowData = cellData[Number(row)]
      for (const col of Object.keys(rowData)) {
        const cell = rowData[Number(col)] as ICellData & { custom?: Record<string, string> }
        if (!cell?.custom) continue
        const { binding, template, literal } = cell.custom
        if (binding) {
          cell.v = String(getByPath(data, binding) ?? `[${binding}]`)
        } else if (template) {
          cell.v = template.replace(/\{([\w.[\]]+)\}/g, (_: string, path: string) =>
            String(getByPath(data, path) ?? ''),
          )
        } else if (literal) {
          cell.v = literal
        }
      }
    }
  }
  return workbookData
}

interface PreviewDialogProps {
  visible: boolean
  onHide: () => void
}

export function PreviewDialog({ visible, onHide }: PreviewDialogProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const univerRef = useRef<FUniver | null>(null)
  const { currentSpec, conclusionData } = useTemplateStore()

  // Cleanup Univer when dialog closes
  useEffect(() => {
    if (!visible) {
      univerRef.current?.dispose()
      univerRef.current = null
    }
  }, [visible])

  // onShow fires after the dialog animation completes and the container has real dimensions
  const handleShow = () => {
    if (!currentSpec || !containerRef.current) return

    // Dispose previous instance if any
    univerRef.current?.dispose()
    univerRef.current = null

    const resolvedSpec = resolveBlockRefs(currentSpec)
    const workbookData = mapSpecToWorkbookData(resolvedSpec)
    const withData = resolveBindings(workbookData, conclusionData)

    const { univerAPI } = createUniver({
      locale: LocaleType.RU_RU,
      locales: { [LocaleType.RU_RU]: merge({}, UniverPresetSheetsCoreRuRU) },
      presets: [
        UniverSheetsCorePreset({
          container: containerRef.current,
          header: false,
          toolbar: false,
          footer: false,
          contextMenu: false,
        }),
      ],
    })

    ;(univerAPI as unknown as { createWorkbook: (d: IWorkbookData) => unknown }).createWorkbook(withData)
    univerRef.current = univerAPI
  }

  const handleDownload = async () => {
    if (!currentSpec) return
    const blob = await renderXlsx(currentSpec, conclusionData)
    downloadBlob(blob, `${currentSpec.name}.xlsx`)
  }

  const footer = (
    <div className="flex justify-content-end gap-2">
      <Button label="Скачать .xlsx" icon="pi pi-download" onClick={handleDownload} />
      <Button label="Закрыть" icon="pi pi-times" onClick={onHide} outlined />
    </div>
  )

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      onShow={handleShow}
      header="Предпросмотр заключения"
      footer={footer}
      style={{ width: '90vw', height: '90vh' }}
      contentStyle={{ padding: 0, overflow: 'hidden', height: 'calc(90vh - 120px)' }}
      appendTo={document.body}
      maximizable
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </Dialog>
  )
}
