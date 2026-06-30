import { createUniver, LocaleType, merge } from '@univerjs/presets'
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import UniverPresetSheetsCoreRuRU from '@univerjs/preset-sheets-core/locales/ru-RU'
import '@univerjs/preset-sheets-core/lib/index.css'
import { useEffect, useRef, useState } from 'react'
import type { FUniver } from '@univerjs/presets'
import type { FWorkbook } from '@univerjs/sheets/facade'
import type { IWorkbookData } from '@univerjs/core'

interface UseUniverOptions {
  readOnly?: boolean
  initialData?: Partial<IWorkbookData>
}

export function useUniverInstance({ readOnly = false, initialData }: UseUniverOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [univerAPI, setUniverAPI] = useState<FUniver | null>(null)
  const [workbook, setWorkbook] = useState<FWorkbook | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const { univerAPI: api } = createUniver({
      locale: LocaleType.RU_RU,
      locales: {
        [LocaleType.RU_RU]: merge({}, UniverPresetSheetsCoreRuRU),
      },
      presets: [
        UniverSheetsCorePreset({
          container: containerRef.current,
          header: !readOnly,
          toolbar: !readOnly,
          footer: readOnly ? false : {},
          contextMenu: !readOnly,
        }),
      ],
    })

    const defaultData: Partial<IWorkbookData> = {
      id: 'conclusion_workbook',
      name: 'Заключение',
      sheetOrder: ['conclusion_sheet'],
      sheets: {
        conclusion_sheet: {
          id: 'conclusion_sheet',
          name: 'Заключение',
          rowCount: 60,
          columnCount: 43,
        },
      },
    }

    const wb = (api as unknown as { createWorkbook: (d: Partial<IWorkbookData>) => FWorkbook }).createWorkbook(
      initialData ?? defaultData,
    )

    setUniverAPI(api)
    setWorkbook(wb)

    return () => {
      api.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { containerRef, univerAPI, workbook }
}
